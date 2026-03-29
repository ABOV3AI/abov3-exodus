/**
 * Context Manager for AIX
 *
 * Provides automatic context truncation to prevent "prompt too long" errors.
 * Stores important context from truncated messages in PostgreSQL (NepheshMemory)
 * and retrieves relevant memories for injection into system prompts.
 *
 * This is completely transparent to users - context is managed server-side.
 */

import type {
  AixAPIChatGenerate_Request,
  AixMessages_ChatMessage,
  AixMessages_SystemMessage,
} from '../../api/aix.wiretypes';


// Token estimation constants (conservative estimates)
const CHARS_PER_TOKEN_ESTIMATE = 4; // ~4 chars per token on average
const MIN_CONTENT_LENGTH_FOR_MEMORY = 50; // Only store meaningful content
const MEMORY_INJECTION_PREFIX = '\n\n[Previous conversation context from memory]\n';
const MEMORY_SEPARATOR = '\n---\n';


/**
 * Result of context truncation
 */
export interface ContextTruncationResult {
  request: AixAPIChatGenerate_Request;
  truncatedCount: number;
  storedMemoryCount: number;
  originalTokens: number;
  finalTokens: number;
}

/**
 * Result of memory retrieval
 */
export interface RetrievedMemory {
  content: string;
  source: string | null;
  timestamp: Date;
}


/**
 * Estimate tokens for a string
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}


/**
 * Estimate tokens for a single message
 */
export function estimateMessageTokens(message: AixMessages_ChatMessage): number {
  let tokens = 4; // Role overhead
  for (const part of message.parts) {
    // TextPart has { pt: 'text', text: string }
    if ('pt' in part && 'text' in part && (part as any).pt === 'text') {
      tokens += estimateTokens((part as any).text || '');
    } else if ('pt' in part) {
      const pt = (part as any).pt;
      if (pt === 'doc') {
        tokens += estimateTokens((part as any).data?.text || '');
      } else if (pt === 'tool_response') {
        tokens += estimateTokens((part as any).response?.result || '');
      } else if (pt === 'tool_invocation') {
        tokens += estimateTokens((part as any).invocation?.args || '');
      }
    }
  }
  return tokens;
}


/**
 * Extract tool_invocation IDs from a message
 */
export function getToolInvocationIds(message: AixMessages_ChatMessage): string[] {
  const ids: string[] = [];
  for (const part of message.parts) {
    if ('pt' in part && (part as any).pt === 'tool_invocation' && 'id' in part) {
      ids.push((part as any).id);
    }
  }
  return ids;
}


/**
 * Extract tool_response IDs from a message
 */
export function getToolResponseIds(message: AixMessages_ChatMessage): string[] {
  const ids: string[] = [];
  for (const part of message.parts) {
    if ('pt' in part && (part as any).pt === 'tool_response' && 'id' in part) {
      ids.push((part as any).id);
    }
  }
  return ids;
}


/**
 * Build a map of tool call pairs (invocation -> response message indices)
 * Returns: Map<toolId, { invocationIndex: number, responseIndex: number | null }>
 */
export function buildToolPairMap(messages: AixMessages_ChatMessage[]): Map<string, { invocationIndex: number; responseIndex: number | null }> {
  const toolPairs = new Map<string, { invocationIndex: number; responseIndex: number | null }>();

  // First pass: find all tool invocations
  for (let i = 0; i < messages.length; i++) {
    const invocationIds = getToolInvocationIds(messages[i]);
    for (const id of invocationIds) {
      toolPairs.set(id, { invocationIndex: i, responseIndex: null });
    }
  }

  // Second pass: match tool responses
  for (let i = 0; i < messages.length; i++) {
    const responseIds = getToolResponseIds(messages[i]);
    for (const id of responseIds) {
      const pair = toolPairs.get(id);
      if (pair) {
        pair.responseIndex = i;
      }
    }
  }

  return toolPairs;
}


/**
 * Check if removing a message at given index would orphan any tool responses
 * Returns indices of messages that must also be removed to maintain tool pairing
 */
export function getOrphanedToolResponseIndices(
  messageIndex: number,
  messages: AixMessages_ChatMessage[],
  toolPairs: Map<string, { invocationIndex: number; responseIndex: number | null }>,
): number[] {
  const orphanedIndices: number[] = [];

  // Get tool invocation IDs in the message being removed
  const invocationIds = getToolInvocationIds(messages[messageIndex]);

  // For each invocation, check if there's a response that would be orphaned
  for (const id of invocationIds) {
    const pair = toolPairs.get(id);
    if (pair && pair.responseIndex !== null && pair.responseIndex > messageIndex) {
      orphanedIndices.push(pair.responseIndex);
    }
  }

  return orphanedIndices;
}


/**
 * Estimate tokens for a system message
 */
export function estimateSystemMessageTokens(systemMessage: AixMessages_SystemMessage | null): number {
  if (!systemMessage) return 0;
  let tokens = 4; // System overhead
  for (const part of systemMessage.parts) {
    // TextPart has { pt: 'text', text: string }
    if ('pt' in part && 'text' in part && (part as any).pt === 'text') {
      tokens += estimateTokens((part as any).text || '');
    } else if ('pt' in part && (part as any).pt === 'doc') {
      tokens += estimateTokens((part as any).data?.text || '');
    }
  }
  return tokens;
}


/**
 * Estimate total tokens for a chat generate request
 */
export function estimateRequestTokens(request: AixAPIChatGenerate_Request): number {
  let tokens = estimateSystemMessageTokens(request.systemMessage);
  for (const message of request.chatSequence) {
    tokens += estimateMessageTokens(message);
  }
  return tokens;
}


/**
 * Extract text content from a message for storage
 */
export function extractTextFromMessage(message: AixMessages_ChatMessage): string {
  const texts: string[] = [];
  for (const part of message.parts) {
    if ('pt' in part) {
      const pt = (part as any).pt;
      if (pt === 'text' && 'text' in part) {
        texts.push((part as any).text || '');
      } else if (pt === 'doc') {
        const docPart = part as any;
        if (docPart.l1Title) texts.push(`[${docPart.l1Title}]`);
        if (docPart.data?.text) texts.push(docPart.data.text);
      }
    }
  }
  return texts.join('\n').trim();
}


/**
 * Truncate context to fit within token limit
 * Removes oldest messages first while preserving:
 * - Conversation coherence
 * - Tool call pairs (tool_invocation + tool_response must be removed together)
 */
export async function truncateContext(
  request: AixAPIChatGenerate_Request,
  maxTokens: number,
  conversationId: string | undefined,
  storeMemoriesCallback?: (content: string, conversationId: string) => Promise<void>,
): Promise<ContextTruncationResult> {
  const originalTokens = estimateRequestTokens(request);

  // If already within limits, return unchanged
  if (originalTokens <= maxTokens) {
    return {
      request,
      truncatedCount: 0,
      storedMemoryCount: 0,
      originalTokens,
      finalTokens: originalTokens,
    };
  }

  console.log(`[ContextManager] Context overflow: ${originalTokens} tokens > ${maxTokens} max. Truncating...`);

  // Clone the message sequence and track indices to remove
  const messages = [...request.chatSequence];
  const indicesToRemove = new Set<number>();
  let currentTokens = originalTokens;
  let storedMemoryCount = 0;

  // Build tool pair map to track invocation/response relationships
  const toolPairs = buildToolPairMap(messages);

  // Reserve tokens for system message
  const systemTokens = estimateSystemMessageTokens(request.systemMessage);

  // Remove oldest messages until we fit (keep at least the last 2 messages)
  // We iterate from the front, marking messages for removal
  let candidateIndex = 0;

  while (currentTokens > maxTokens && candidateIndex < messages.length - 2) {
    // Skip if already marked for removal
    if (indicesToRemove.has(candidateIndex)) {
      candidateIndex++;
      continue;
    }

    const message = messages[candidateIndex];
    const messageTokens = estimateMessageTokens(message);

    // Mark this message for removal
    indicesToRemove.add(candidateIndex);
    currentTokens -= messageTokens;

    // Check if this message has tool invocations that would orphan tool responses
    const orphanedResponseIndices = getOrphanedToolResponseIndices(candidateIndex, messages, toolPairs);

    // Also mark orphaned tool response messages for removal
    for (const orphanedIndex of orphanedResponseIndices) {
      if (!indicesToRemove.has(orphanedIndex)) {
        indicesToRemove.add(orphanedIndex);
        currentTokens -= estimateMessageTokens(messages[orphanedIndex]);
        console.log(`[ContextManager] Also removing orphaned tool_response at index ${orphanedIndex} to maintain pairing`);
      }
    }

    // Store meaningful content in memory if callback provided
    if (storeMemoriesCallback && conversationId) {
      const content = extractTextFromMessage(message);
      if (content.length >= MIN_CONTENT_LENGTH_FOR_MEMORY) {
        try {
          await storeMemoriesCallback(content, conversationId);
          storedMemoryCount++;
        } catch (e) {
          console.warn('[ContextManager] Failed to store memory:', e);
        }
      }
    }

    candidateIndex++;
  }

  // Build final sequence by filtering out removed indices
  const truncatedSequence = messages.filter((_, index) => !indicesToRemove.has(index));
  const truncatedCount = indicesToRemove.size;

  console.log(`[ContextManager] Truncated ${truncatedCount} messages (preserving tool pairs), stored ${storedMemoryCount} memories. Final tokens: ${currentTokens}`);

  return {
    request: {
      ...request,
      chatSequence: truncatedSequence,
    },
    truncatedCount,
    storedMemoryCount,
    originalTokens,
    finalTokens: currentTokens,
  };
}


/**
 * Inject memories into system message
 */
export function injectMemoriesIntoSystem(
  systemMessage: AixMessages_SystemMessage | null,
  memories: RetrievedMemory[],
): AixMessages_SystemMessage {
  if (memories.length === 0) {
    return systemMessage || { parts: [] };
  }

  // Format memories
  const memoryText = memories
    .map((m, i) => {
      const source = m.source ? ` (${m.source})` : '';
      const date = m.timestamp instanceof Date
        ? m.timestamp.toLocaleDateString()
        : new Date(m.timestamp).toLocaleDateString();
      return `[${i + 1}${source}, ${date}]: ${m.content}`;
    })
    .join(MEMORY_SEPARATOR);

  const injectedText = MEMORY_INJECTION_PREFIX + memoryText;

  // If no existing system message, create one
  if (!systemMessage || systemMessage.parts.length === 0) {
    return {
      parts: [{ pt: 'text', text: injectedText }],
    };
  }

  // Append to last text part or add new part
  const parts = [...systemMessage.parts];
  const lastPart = parts[parts.length - 1];

  if (lastPart && 'pt' in lastPart && lastPart.pt === 'text') {
    // Append to existing text part
    parts[parts.length - 1] = {
      ...lastPart,
      text: (lastPart as any).text + injectedText,
    };
  } else {
    // Add new text part
    parts.push({ pt: 'text', text: injectedText } as any);
  }

  return { parts };
}


/**
 * Get default context limit for a model
 * Falls back to conservative defaults if model context window unknown
 */
export function getModelContextLimit(modelId: string, explicitContextWindow?: number): number {
  // Use explicit context window if provided
  if (explicitContextWindow && explicitContextWindow > 0) {
    return explicitContextWindow;
  }

  // Conservative defaults based on model patterns
  const modelLower = modelId.toLowerCase();

  // Large context models
  if (modelLower.includes('claude-3') || modelLower.includes('claude-opus') || modelLower.includes('claude-sonnet')) {
    return 200000;
  }
  if (modelLower.includes('gemini-1.5') || modelLower.includes('gemini-2')) {
    return 1000000;
  }
  if (modelLower.includes('gpt-4-turbo') || modelLower.includes('gpt-4o')) {
    return 128000;
  }

  // Medium context models
  if (modelLower.includes('gpt-4')) {
    return 32000;
  }
  if (modelLower.includes('gpt-3.5')) {
    return 16000;
  }

  // ABOV3 models
  if (modelLower.includes('genesis') || modelLower.includes('exodus') || modelLower.includes('elohim') || modelLower.includes('solomon')) {
    return 128000;
  }

  // Default fallback - conservative 32K
  return 32000;
}


/**
 * Calculate safe token limit with buffer
 */
export function calculateSafeTokenLimit(contextWindow: number, bufferPercent: number = 0.1): number {
  const buffer = Math.floor(contextWindow * bufferPercent);
  return contextWindow - buffer;
}
