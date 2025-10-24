import type { AixAPI_Model, AixAPIChatGenerate_Request, AixMessages_ChatMessage, AixTools_ToolDefinition, AixTools_ToolsPolicy } from '../../../api/aix.wiretypes';
import { AnthropicWire_API_Message_Create, AnthropicWire_Blocks } from '../../wiretypes/anthropic.wiretypes';

import { aixSpillShallFlush, aixSpillSystemToUser, approxDocPart_To_String, approxInReferenceTo_To_XMLString } from './adapters.common';


// configuration
const hotFixImagePartsFirst = true;
const hotFixMapModelImagesToUser = true;
const hotFixDisableThinkingWhenToolsForced = true; // "Thinking may not be enabled when tool_choice forces tool use."

// former fixes, now removed
// const hackyHotFixStartWithUser = false; // 2024-10-22: no longer required


type TRequest = AnthropicWire_API_Message_Create.Request;

/**
 * Validates and auto-fixes tool_use/tool_result sequencing.
 * Automatically inserts missing tool_result blocks when needed.
 */
function validateAndFixToolSequencing(messages: TRequest['messages']): void {
  const pendingToolUses = new Map<string, number>(); // tool_id -> message index
  const missingToolResults: Array<{ toolId: string; afterIndex: number }> = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    // Check each content block in the message
    for (const content of message.content) {
      if (content.type === 'tool_use') {
        // Track this tool_use
        const toolId = content.id;
        if (pendingToolUses.has(toolId)) {
          console.warn(`Duplicate tool_use with id "${toolId}" found at message ${i}`);
        }
        pendingToolUses.set(toolId, i);
      } else if (content.type === 'tool_result') {
        // Check if this tool_result matches a pending tool_use
        const toolId = content.tool_use_id;
        const toolUseIndex = pendingToolUses.get(toolId);

        if (toolUseIndex === undefined) {
          console.warn(`tool_result with id "${toolId}" found at message ${i} without preceding tool_use`);
        } else {
          // Clear this tool_use as it has been matched
          pendingToolUses.delete(toolId);
        }
      }
    }
  }

  // Auto-fix: Insert missing tool_results for unmatched tool_uses
  if (pendingToolUses.size > 0) {
    console.warn(`Anthropic: Auto-fixing ${pendingToolUses.size} missing tool_result blocks`);

    // Sort by message index to insert in the correct order
    const sortedToolUses = Array.from(pendingToolUses.entries()).sort((a, b) => a[1] - b[1]);

    for (const [toolId, messageIndex] of sortedToolUses) {
      // Find where to insert the tool_result
      const insertIndex = messageIndex + 1;

      // Create a placeholder tool_result
      const placeholderResult = AnthropicWire_Blocks.ToolResultBlock(
        toolId,
        [AnthropicWire_Blocks.TextBlock('Auto-generated placeholder for missing tool result')],
        false
      );

      // Insert a new user message with the tool_result
      const newMessage: TRequest['messages'][number] = {
        role: 'user',
        content: [placeholderResult]
      };

      // Insert the message at the correct position
      if (insertIndex >= messages.length) {
        messages.push(newMessage);
      } else {
        messages.splice(insertIndex, 0, newMessage);
      }

      console.log(`Anthropic: Inserted tool_result for tool_use ${toolId} at position ${insertIndex}`);
    }
  }
}

export function aixToAnthropicMessageCreate(model: AixAPI_Model, _chatGenerate: AixAPIChatGenerate_Request, streaming: boolean, isOAuth: boolean = false): TRequest {

  // Pre-process CGR - approximate spill of System to User message
  const chatGenerate = aixSpillSystemToUser(_chatGenerate);

  // Convert the system message
  let systemMessage: TRequest['system'] = undefined;
  if (chatGenerate.systemMessage?.parts.length) {
    systemMessage = chatGenerate.systemMessage.parts.reduce((acc, part) => {
      switch (part.pt) {

        case 'text':
          acc.push(AnthropicWire_Blocks.TextBlock(part.text));
          break;

        case 'doc':
          acc.push(AnthropicWire_Blocks.TextBlock(approxDocPart_To_String(part)));
          break;

        case 'inline_image':
          // we have already removed image parts from the system message
          throw new Error('Anthropic: images have to be in user messages, not in system message');

        case 'meta_cache_control':
          if (!acc.length)
            console.warn('Anthropic: cache_control without a message to attach to');
          else if (part.control !== 'anthropic-ephemeral')
            console.warn('Anthropic: cache_control with an unsupported value:', part.control);
          else
            AnthropicWire_Blocks.blockSetCacheControl(acc[acc.length - 1], 'ephemeral');
          break;

        default:
          const _exhaustiveCheck: never = part;
          throw new Error(`Unsupported part type in System message: ${(part as any).pt}`);
      }
      return acc;
    }, [] as Exclude<TRequest['system'], undefined>);

    // unset system message if empty
    if (!systemMessage.length)
      systemMessage = undefined;
  }

  // CRITICAL: OAuth requires Claude Code system message identification
  // This must be prepended to match OpenCode and llm-orc implementations
  if (isOAuth) {
    const claudeCodeMessage = AnthropicWire_Blocks.TextBlock('You are Claude Code, Anthropic\'s official CLI for Claude.');
    if (systemMessage && systemMessage.length) {
      // Prepend to existing system message
      systemMessage = [claudeCodeMessage, ...systemMessage];
    } else {
      // Create new system message
      systemMessage = [claudeCodeMessage];
    }
  }

  // Transform the chat messages into Anthropic's format
  const chatMessages: TRequest['messages'] = [];
  let currentMessage: TRequest['messages'][number] | null = null;
  let hasToolUse = false; // Track if current message has tool_use blocks

  // Debug: log the incoming message structure
  if (chatGenerate.chatSequence.some(msg =>
    msg.parts.some(part => part.pt === 'tool_invocation' || part.pt === 'tool_response')
  )) {
    console.log('Anthropic: Processing messages with tool calls:',
      chatGenerate.chatSequence.map((msg, i) => ({
        index: i,
        role: msg.role,
        parts: msg.parts.map(p => {
          if (p.pt === 'tool_invocation') return `tool_invocation(id=${p.id})`;
          if (p.pt === 'tool_response') return `tool_response(id=${p.id})`;
          return p.pt;
        })
      }))
    );
  }

  for (const aixMessage of chatGenerate.chatSequence) {
    for (const antPart of _generateAnthropicMessagesContentBlocks(aixMessage)) {
      // apply cache_control to the current head block of the current message
      if ('set_cache_control' in antPart) {
        if (currentMessage && currentMessage.content.length) {
          const lastBlock = currentMessage.content[currentMessage.content.length - 1];
          if (lastBlock.type !== 'thinking' && lastBlock.type !== 'redacted_thinking')
            AnthropicWire_Blocks.blockSetCacheControl(lastBlock, 'ephemeral');
          else
            console.warn('Anthropic: cache_control on a thinking block - not allowed');
        } else
          console.warn('Anthropic: cache_control without a message to attach to');
        continue;
      }

      const { role, content } = antPart;

      // Check if this is a tool_use or tool_result block
      const isToolUse = content.type === 'tool_use';
      const isToolResult = content.type === 'tool_result';

      // Force message boundary for tool blocks to ensure proper sequencing
      if (isToolUse || isToolResult) {
        // If we have a current message, flush it before starting a new one
        if (currentMessage) {
          chatMessages.push(currentMessage);
          currentMessage = null;
          hasToolUse = false;
        }
        // Start a new message for this tool block
        currentMessage = { role, content: [content] };
        hasToolUse = isToolUse;
        // Immediately flush tool messages to maintain strict sequencing
        chatMessages.push(currentMessage);
        currentMessage = null;
        hasToolUse = false;
        continue;
      }

      // For non-tool blocks, use normal batching logic
      // But don't batch with messages that had tool_use blocks
      if (!currentMessage || currentMessage.role !== role || hasToolUse) {
        if (currentMessage)
          chatMessages.push(currentMessage);
        currentMessage = { role, content: [] };
        hasToolUse = false;
      }
      currentMessage.content.push(content);
    }

    // Flush: interrupt batching within the same-role and finalize the current message
    if (aixSpillShallFlush(aixMessage) && currentMessage) {
      chatMessages.push(currentMessage);
      currentMessage = null;
      hasToolUse = false;
    }
  }
  if (currentMessage)
    chatMessages.push(currentMessage);

  // Debug: log the transformed message structure if it contains tool calls
  const hasToolMessages = chatMessages.some(msg =>
    msg.content.some(c => c.type === 'tool_use' || c.type === 'tool_result')
  );
  if (hasToolMessages) {
    console.log('Anthropic: Transformed messages with tool calls:',
      chatMessages.map((msg, i) => ({
        index: i,
        role: msg.role,
        contentTypes: msg.content.map(c => {
          if (c.type === 'tool_use') return `tool_use(id=${c.id})`;
          if (c.type === 'tool_result') return `tool_result(id=${c.tool_use_id})`;
          return c.type;
        })
      }))
    );
  }

  // Validate and auto-fix tool_use/tool_result sequencing
  validateAndFixToolSequencing(chatMessages);

  // Debug: log the final message structure after validation/fixing
  if (hasToolMessages) {
    console.log('Anthropic: Final messages after validation/fixing:',
      chatMessages.map((msg, i) => ({
        index: i,
        role: msg.role,
        contentTypes: msg.content.map(c => {
          if (c.type === 'tool_use') return `tool_use(id=${c.id})`;
          if (c.type === 'tool_result') return `tool_result(id=${c.tool_use_id})`;
          return c.type;
        })
      }))
    );
  }

  // If the first (user) message is missing, copy the first line of the system message
  // [Anthropic] October 8th, 2024 release notes: "...we no longer require the first input message to be a user message."
  // if (hackyHotFixStartWithUser && chatMessages.length && chatMessages[0].role !== 'user' && systemMessage?.length) {
  //   const hackSystemMessageFirstLine = (systemMessage[0]?.text || '').split('\n')[0];
  //   chatMessages.unshift({ role: 'user', content: [AnthropicWire_Blocks.TextBlock(hackSystemMessageFirstLine)] });
  //   console.log(`Anthropic: hotFixStartWithUser (${chatMessages.length} messages) - ${hackSystemMessageFirstLine}`);
  // }

  // Construct the request payload
  const payload: TRequest = {
    max_tokens: model.maxTokens !== undefined ? model.maxTokens : 8192,
    model: model.id,
    system: systemMessage,
    messages: chatMessages,
    tools: chatGenerate.tools && _toAnthropicTools(chatGenerate.tools),
    tool_choice: chatGenerate.toolsPolicy && _toAnthropicToolChoice(chatGenerate.toolsPolicy),
    // metadata: { user_id: ... }
    // stop_sequences: undefined,
    stream: streaming,
    ...(model.temperature !== null ? { temperature: model.temperature !== undefined ? model.temperature : undefined } : {}),
    // top_k: undefined,
    // top_p: undefined,
  };

  // Top-P instead of temperature
  if (model.topP !== undefined) {
    payload.top_p = model.topP;
    delete payload.temperature;
  }

  // [Anthropic] Thinking Budget
  // OAuth credentials cannot use the thinking feature - Anthropic blocks it
  const areToolCallsRequired = payload.tool_choice && typeof payload.tool_choice === 'object' && (payload.tool_choice.type === 'any' || payload.tool_choice.type === 'tool');
  const canUseThinking = !isOAuth && (!areToolCallsRequired || !hotFixDisableThinkingWhenToolsForced);
  if (model.vndAntThinkingBudget !== undefined && canUseThinking) {
    payload.thinking = model.vndAntThinkingBudget !== null ? {
      type: 'enabled',
      budget_tokens: model.vndAntThinkingBudget < payload.max_tokens ? model.vndAntThinkingBudget : payload.max_tokens - 1,
    } : {
      type: 'disabled',
    };
    delete payload.temperature;
  }

  // --- Tools ---

  // Allow/deny auto-adding hosted tools when custom tools are present
  // const hasCustomTools = chatGenerate.tools?.some(t => t.type === 'function_call');
  // const hasRestrictivePolicy = chatGenerate.toolsPolicy?.type === 'any' || chatGenerate.toolsPolicy?.type === 'function_call';
  // const skipHostedToolsDueToCustomTools = hasCustomTools && hasRestrictivePolicy;

  // Hosted tools
  // ...


  // Preemptive error detection with server-side payload validation before sending it upstream
  const validated = AnthropicWire_API_Message_Create.Request_schema.safeParse(payload);
  if (!validated.success) {
    console.error('Anthropic: invalid messageCreate payload. Error:', validated.error.message);
    throw new Error(`Invalid sequence for Anthropic models: ${validated.error.issues?.[0]?.message || validated.error.message || validated.error}.`);
  }

  return validated.data;
}


function* _generateAnthropicMessagesContentBlocks({ parts, role }: AixMessages_ChatMessage): Generator<{
  role: 'user' | 'assistant',
  content: TRequest['messages'][number]['content'][number]
} | {
  set_cache_control: 'anthropic-ephemeral'
}> {
  if (parts.length < 1) return; // skip empty messages

  if (hotFixImagePartsFirst) {
    parts.sort((a, b) => {
      if (a.pt === 'inline_image' && b.pt !== 'inline_image') return -1;
      if (a.pt !== 'inline_image' && b.pt === 'inline_image') return 1;
      return 0;
    });
  }

  switch (role) {

    case 'user':
      for (const part of parts) {
        switch (part.pt) {

          case 'text':
            yield { role: 'user', content: AnthropicWire_Blocks.TextBlock(part.text) };
            break;

          case 'inline_image':
            yield { role: 'user', content: AnthropicWire_Blocks.ImageBlock(part.mimeType, part.base64) };
            break;

          case 'doc':
            yield { role: 'user', content: AnthropicWire_Blocks.TextBlock(approxDocPart_To_String(part)) };
            break;

          case 'meta_in_reference_to':
            const irtXMLString = approxInReferenceTo_To_XMLString(part);
            if (irtXMLString)
              yield { role: 'user', content: AnthropicWire_Blocks.TextBlock(irtXMLString) };
            break;

          case 'meta_cache_control':
            yield { set_cache_control: part.control };
            break;

          default:
            throw new Error(`Unsupported part type in User message: ${(part as any).pt}`);
        }
      }
      break;

    case 'model':
      // Check if this message contains both thinking and tool invocations
      const hasThinking = parts.some(p => p.pt === 'ma');
      const hasToolInvocation = parts.some(p => p.pt === 'tool_invocation');

      // If we have both thinking and tool invocation, we need to handle them together
      if (hasThinking && hasToolInvocation) {
        // Collect all content blocks for this message
        const contentBlocks: TRequest['messages'][number]['content'] = [];

        for (const part of parts) {
          switch (part.pt) {
            case 'text':
              contentBlocks.push(AnthropicWire_Blocks.TextBlock(part.text));
              break;

            case 'ma':
              // Skip thinking blocks when tools are present (temporary fix)
              // This prevents the splitting issue that causes tool sequencing errors
              console.log('Anthropic: Skipping thinking block when tool invocation is present');
              break;

            case 'tool_invocation':
              let toolUseBlock;
              switch (part.invocation.type) {
                case 'function_call':
                  toolUseBlock = AnthropicWire_Blocks.ToolUseBlock(part.id, part.invocation.name, part.invocation.args);
                  break;
                case 'code_execution':
                  toolUseBlock = AnthropicWire_Blocks.ToolUseBlock(part.id, 'execute_code' /* suboptimal */, part.invocation.code);
                  break;
                default:
                  const _exhaustiveCheck: never = part.invocation;
                  throw new Error(`Unsupported tool call type in Model message: ${(part.invocation as any).type}`);
              }
              contentBlocks.push(toolUseBlock);
              break;

            case 'meta_cache_control':
              // Handle cache control separately
              break;

            default:
              // Skip other part types when combining
              break;
          }
        }

        // Yield all content blocks together as a single message
        if (contentBlocks.length > 0) {
          yield { role: 'assistant', content: contentBlocks[0] };
          for (let i = 1; i < contentBlocks.length; i++) {
            yield { role: 'assistant', content: contentBlocks[i] };
          }
        }

        // Handle cache control after content
        for (const part of parts) {
          if (part.pt === 'meta_cache_control') {
            yield { set_cache_control: part.control };
          }
        }
      } else {
        // Original logic for messages without both thinking and tools
        for (const part of parts) {
          switch (part.pt) {

            case 'text':
              yield { role: 'assistant', content: AnthropicWire_Blocks.TextBlock(part.text) };
              break;

            case 'inline_audio':
              // Anthropic does not support inline audio, if we got to this point, we should throw an error
              throw new Error('Model-generated inline audio is not supported by Anthropic yet');

            case 'inline_image':
              // Example of mapping a model-generated image (even from other vendors, not just Anthropic) to a user message
              if (hotFixMapModelImagesToUser) {
                yield { role: 'user', content: AnthropicWire_Blocks.ImageBlock(part.mimeType, part.base64) };
              } else
                throw new Error('Model-generated images are not supported by Anthropic yet');
              break;

            case 'tool_invocation':
              let toolUseBlock;
              switch (part.invocation.type) {
                case 'function_call':
                  toolUseBlock = AnthropicWire_Blocks.ToolUseBlock(part.id, part.invocation.name, part.invocation.args);
                  break;
                case 'code_execution':
                  toolUseBlock = AnthropicWire_Blocks.ToolUseBlock(part.id, 'execute_code' /* suboptimal */, part.invocation.code);
                  break;
                default:
                  const _exhaustiveCheck: never = part.invocation;
                  throw new Error(`Unsupported tool call type in Model message: ${(part.invocation as any).type}`);
              }
              yield { role: 'assistant', content: toolUseBlock };
              break;

            case 'ma':
              if (!part.aText && !part.textSignature && !part.redactedData)
                throw new Error('Extended Thinking data is missing');
              if (part.aText && part.textSignature)
                yield { role: 'assistant', content: AnthropicWire_Blocks.ThinkingBlock(part.aText, part.textSignature) };
              for (const redactedData of part.redactedData || [])
                yield { role: 'assistant', content: AnthropicWire_Blocks.RedactedThinkingBlock(redactedData) };
              break;

            case 'meta_cache_control':
              yield { set_cache_control: part.control };
              break;

            default:
              const _exhaustiveCheck: never = part;
              throw new Error(`Unsupported part type in Model message: ${(part as any).pt}`);
          }
        }
      }
      break;

    case 'tool':
      // Check if this is an empty tool response message
      const hasToolResponse = parts.some(p => p.pt === 'tool_response');

      if (!hasToolResponse && parts.length === 0) {
        // This is an empty tool message - we need to generate a placeholder
        // This happens when OAuth responses have thinking blocks with tool invocations
        console.log('Anthropic: Generating placeholder tool_result for empty tool message');

        // We need to find the previous tool_use to get its ID
        // This is a temporary placeholder - ideally we'd track tool IDs properly
        const placeholderResult = [AnthropicWire_Blocks.TextBlock('')];
        yield {
          role: 'user',
          content: AnthropicWire_Blocks.ToolResultBlock('placeholder', placeholderResult, false)
        };
      } else {
        for (const part of parts) {
          switch (part.pt) {

            case 'tool_response':
              const toolErrorPrefix = part.error ? (typeof part.error === 'string' ? `[ERROR] ${part.error} - ` : '[ERROR] ') : '';
              switch (part.response.type) {
                case 'function_call':
                  const fcTextParts = [AnthropicWire_Blocks.TextBlock(toolErrorPrefix + part.response.result)];
                  yield { role: 'user', content: AnthropicWire_Blocks.ToolResultBlock(part.id, fcTextParts, part.error ? true : undefined) };
                  break;
                case 'code_execution':
                  const ceTextParts = [AnthropicWire_Blocks.TextBlock(toolErrorPrefix + part.response.result)];
                  yield { role: 'user', content: AnthropicWire_Blocks.ToolResultBlock(part.id, ceTextParts, part.error ? true : undefined) };
                  break;
                default:
                  throw new Error(`Unsupported tool response type in Tool message: ${(part as any).pt}`);
              }
              break;

            case 'meta_cache_control':
              // ignored in tools
              break;

            default:
              const _exhaustiveCheck: never = part;
              throw new Error(`Unsupported part type in Tool message: ${(part as any).pt}`);
          }
        }
      }
      break;
  }
}

function _toAnthropicTools(itds: AixTools_ToolDefinition[]): NonNullable<TRequest['tools']> {
  return itds.map(itd => {
    switch (itd.type) {

      case 'function_call':
        const { name, description, input_schema } = itd.function_call;
        return {
          type: 'custom', // we could not set it, but it helps our typesystem with discrimination
          name,
          description,
          input_schema: {
            type: 'object',
            properties: input_schema?.properties || null, // Anthropic valid values for input_schema.properties are 'object' or 'null' (null is used to declare functions with no inputs)
            required: input_schema?.required,
          },
        };

      case 'code_execution':
        throw new Error('Gemini code interpreter is not supported');

    }
  });
}

function _toAnthropicToolChoice(itp: AixTools_ToolsPolicy): NonNullable<TRequest['tool_choice']> {
  switch (itp.type) {
    case 'auto':
      return { type: 'auto' as const };
    case 'any':
      return { type: 'any' as const };
    case 'function_call':
      return { type: 'tool' as const, name: itp.function_call.name };
  }
}
