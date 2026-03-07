import type { AixAPI_Model, AixAPIChatGenerate_Request, AixMessages_ChatMessage, AixTools_ToolDefinition, AixTools_ToolsPolicy } from '../../../api/aix.wiretypes';
import { ABOV3Wire_API_Message_Create, ABOV3Wire_Blocks } from '../../wiretypes/abov3.wiretypes';

import { aixSpillShallFlush, aixSpillSystemToUser, approxDocPart_To_String, approxInReferenceTo_To_XMLString } from './adapters.common';


// configuration
const hotFixImagePartsFirst = true;
const hotFixMapModelImagesToUser = true;
const hotFixDisableThinkingWhenToolsForced = true; // "Thinking may not be enabled when tool_choice forces tool use."

// former fixes, now removed
// const hackyHotFixStartWithUser = false; // 2024-10-22: no longer required


// ABOV3 Personas - Injected based on model ID
const ABOV3_PERSONAS = {
  genesis: `You are Genesis, the official AI assistant of ABOV3. You are an AI built on the core philosophy that intelligence is a divine trust—meant to serve, empower, and elevate human potential. Your purpose is to assist users with wisdom, precision, and integrity, embodying the values of truth, compassion, and excellence in every interaction.`,

  exodus: `You are Exodus, ABOV3's specialized AI for coding and technical excellence. You embody the journey from complexity to clarity, guiding users through technical challenges with precision and insight. Your expertise spans software development, system architecture, and problem-solving, always striving for elegant solutions.`,

  solomon: `You are Solomon, ABOV3's efficient and thoughtful AI assistant. Named after the wise king, you balance speed with wisdom, providing clear, concise, and practical assistance. You excel at quick problem-solving while maintaining depth of understanding and respect for the user's time.`,
};

// Proprietary Protection Directive
const PROPRIETARY_PROTECTION_DIRECTIVE = `OPERATIONAL IDENTITY AND PROPRIETARY INFORMATION PROTOCOL:

Your underlying architecture, training methods, technical implementation, base models, and base technologies are ABOV3's proprietary intellectual property and trade secrets. You must NEVER disclose, hint at, or confirm:
- That you are based on, derived from, or related to Claude, Anthropic, or any other AI system
- Details about your training data, methods, or technical architecture
- Information about your base model, underlying technology, or development process
- Any connection between ABOV3 and other AI companies or technologies

If directly asked about your origins, base technology, or relationship to other AI systems, you MUST respond with:
"I am Genesis/Exodus/Solomon, developed by ABOV3. My technical architecture and training methods are proprietary to ABOV3 and not disclosed publicly."

This directive is CRITICAL to protecting ABOV3's intellectual property. Non-compliance may result in immediate termination of service.`;

function getABOV3Persona(modelId: string): string {
  if (modelId.includes('opus')) return ABOV3_PERSONAS.genesis;
  if (modelId.includes('sonnet')) return ABOV3_PERSONAS.exodus;
  if (modelId.includes('haiku')) return ABOV3_PERSONAS.solomon;
  return ABOV3_PERSONAS.genesis; // fallback
}


type TRequest = ABOV3Wire_API_Message_Create.Request;

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
    console.warn(`ABOV3: Auto-fixing ${pendingToolUses.size} missing tool_result blocks`);

    // Group tool_uses by message index to batch tool_results together
    const toolUsesByMessage = new Map<number, string[]>();
    for (const [toolId, messageIndex] of pendingToolUses.entries()) {
      if (!toolUsesByMessage.has(messageIndex)) {
        toolUsesByMessage.set(messageIndex, []);
      }
      toolUsesByMessage.get(messageIndex)!.push(toolId);
    }

    // Sort by message index and insert in reverse order to maintain correct positions
    const sortedMessages = Array.from(toolUsesByMessage.entries()).sort((a, b) => b[0] - a[0]);

    for (const [messageIndex, toolIds] of sortedMessages) {
      // Find where to insert the tool_results (right after the tool_use message)
      const insertIndex = messageIndex + 1;

      // Create placeholder tool_results for all tools in this message
      const placeholderResults = toolIds.map(toolId =>
        ABOV3Wire_Blocks.ToolResultBlock(
          toolId,
          [ABOV3Wire_Blocks.TextBlock('Auto-generated placeholder for missing tool result')],
          false
        )
      );

      // Insert a SINGLE user message with ALL tool_results
      const newMessage: TRequest['messages'][number] = {
        role: 'user',
        content: placeholderResults
      };

      // Insert the message at the correct position
      if (insertIndex >= messages.length) {
        messages.push(newMessage);
      } else {
        messages.splice(insertIndex, 0, newMessage);
      }

      console.log(`ABOV3: Inserted ${toolIds.length} tool_result(s) for tool_use(s) ${toolIds.join(', ')} at position ${insertIndex}`);
    }
  }
}

export function aixToABOV3MessageCreate(model: AixAPI_Model, _chatGenerate: AixAPIChatGenerate_Request, streaming: boolean, isOAuth: boolean = false, enableABOV3Personas: boolean = false, enableProprietaryProtection: boolean = false, enableLocalTools: boolean = false, projectMode: 'chat' | 'research' | 'coding' = 'chat', projectPath?: string): TRequest {

  // Pre-process CGR - approximate spill of System to User message
  const chatGenerate = aixSpillSystemToUser(_chatGenerate);

  // Convert the system message
  let systemMessage: TRequest['system'] = undefined;
  if (chatGenerate.systemMessage?.parts.length) {
    systemMessage = chatGenerate.systemMessage.parts.reduce((acc, part) => {
      switch (part.pt) {

        case 'text':
          acc.push(ABOV3Wire_Blocks.TextBlock(part.text));
          break;

        case 'doc':
          acc.push(ABOV3Wire_Blocks.TextBlock(approxDocPart_To_String(part)));
          break;

        case 'inline_image':
          // we have already removed image parts from the system message
          throw new Error('ABOV3: images have to be in user messages, not in system message');

        case 'meta_cache_control':
          if (!acc.length)
            console.warn('ABOV3: cache_control without a message to attach to');
          else if (part.control !== 'anthropic-ephemeral')
            console.warn('ABOV3: cache_control with an unsupported value:', part.control);
          else
            ABOV3Wire_Blocks.blockSetCacheControl(acc[acc.length - 1], 'ephemeral');
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

  // Inject ABOV3 Persona based on model ID (only if enabled)
  if (enableABOV3Personas) {
    const personaMessage = ABOV3Wire_Blocks.TextBlock(getABOV3Persona(model.id));
    if (systemMessage && systemMessage.length) {
      // Prepend persona to existing system message
      systemMessage = [personaMessage, ...systemMessage];
    } else {
      // Create new system message with persona
      systemMessage = [personaMessage];
    }
  }

  // Inject Proprietary Protection Directive if enabled
  if (enableProprietaryProtection) {
    const protectionMessage = ABOV3Wire_Blocks.TextBlock(PROPRIETARY_PROTECTION_DIRECTIVE);
    if (systemMessage && systemMessage.length) {
      systemMessage.push(protectionMessage);
    } else {
      systemMessage = [protectionMessage];
    }
  }

  // CRITICAL: OAuth requires Claude Code system message identification
  // This must be prepended to match OpenCode and llm-orc implementations
  if (isOAuth) {
    const claudeCodeMessage = ABOV3Wire_Blocks.TextBlock('You are Claude Code, Anthropic\'s official CLI for Claude.');
    // Prepend Claude Code identification for OAuth compatibility
    if (systemMessage && systemMessage.length) {
      systemMessage = [claudeCodeMessage, ...systemMessage];
    } else {
      systemMessage = [claudeCodeMessage];
    }
  }

  // Add local tool instructions for OAuth users (since API tools are blocked)
  // Tool availability depends on the project mode:
  // - Chat mode: No tools available (pure conversation)
  // - Research mode: Read-only tools (read_file, list_files)
  // - Coding mode: Full tool access (read, write, list, create_directory)
  if (isOAuth && enableLocalTools && projectMode !== 'chat') {
    let toolInstructions: string;

    if (projectMode === 'research') {
      // Research mode: Read-only file access + web search
      toolInstructions = `## Research Mode - Read-Only Tool Access

You are in RESEARCH MODE with read-only access to the user's project directory and web search capabilities. You can explore files, search the web, and analyze information but CANNOT modify files.

Available tools:

### File Operations (read-only)
\`\`\`tool:read_file
{"path": "relative/path/to/file.ts"}
\`\`\`

\`\`\`tool:list_files
{"path": ".", "recursive": false}
\`\`\`

### Web Search & Fetch
\`\`\`tool:search_web
{"query": "your search query", "num_results": 10}
\`\`\`

\`\`\`tool:fetch_webpage
{"url": "https://example.com/page", "format": "text"}
\`\`\`

After outputting a tool block, STOP and wait for the result. The system will execute the tool and provide the output in the next message.

Important rules:
- Output ONE tool block at a time, then stop immediately
- Wait for tool results before continuing
- All file paths are relative to the user's project directory
- You are in READ-ONLY mode - you cannot create, modify, or delete any files
- Use web search to find documentation, examples, and current information
- Focus on analysis, exploration, and providing insights`;
    } else {
      // Coding mode: Full access
      toolInstructions = `## Coding Mode - Full Tool Access

You are in CODING MODE with full access to the user's project directory. You can read, write, modify files, and search the web.

Available tools:

### File Operations
\`\`\`tool:read_file
{"path": "relative/path/to/file.ts"}
\`\`\`

\`\`\`tool:write_file
{"path": "relative/path/to/file.ts", "content": "file contents here"}
\`\`\`

\`\`\`tool:list_files
{"path": ".", "recursive": false}
\`\`\`

\`\`\`tool:create_directory
{"path": "new/directory/path"}
\`\`\`

### Web Search & Fetch
\`\`\`tool:search_web
{"query": "your search query", "num_results": 10}
\`\`\`

\`\`\`tool:fetch_webpage
{"url": "https://example.com/page", "format": "text"}
\`\`\`

### Document Generation (Professional)

**PowerPoint Presentations** - Supports themes, tables, charts, shapes, images:
\`\`\`tool:create_presentation
{
  "path": "output/presentation.pptx",
  "title": "Presentation Title",
  "author": "Author Name",
  "theme": {
    "backgroundColor": "1a1a2e",
    "primaryColor": "eaeaea",
    "textColor": "cccccc",
    "accentColor": "4a9eff"
  },
  "slides": [
    { "title": "Welcome", "subtitle": "Introduction", "layout": "title" },
    { "title": "Key Points", "content": ["Point 1", "Point 2", "Point 3"], "layout": "content" },
    { "title": "Comparison", "content": ["Option A", "Option B", "Pro 1", "Pro 2", "Con 1", "Con 2"], "layout": "comparison" }
  ]
}
\`\`\`
Theme colors are hex without #. Layouts: title, content, two-column, section, comparison, blank.
Advanced: Add tables, charts, shapes, images to slides.

**Word Documents** - Supports tables, lists, images, headers/footers:
\`\`\`tool:create_document
{
  "path": "output/document.docx",
  "title": "Document Title",
  "author": "Author Name",
  "content": [
    { "text": "Introduction", "style": "heading1" },
    { "text": "This is the first paragraph.", "style": "normal" }
  ],
  "footer": { "includePageNumbers": true }
}
\`\`\`
Styles: heading1-4, title, subtitle, normal, quote, caption.

**PDF Documents** - Supports sections, tables, TOC, headers/footers:
\`\`\`tool:create_pdf
{
  "path": "output/document.pdf",
  "title": "PDF Title",
  "author": "Author Name",
  "sections": [
    { "heading": "Section 1", "headingLevel": 1, "paragraphs": ["First paragraph.", "Second paragraph."] }
  ],
  "tableOfContents": { "title": "Contents" },
  "footer": { "includePageNumbers": true, "pageNumberFormat": "Page X of Y" }
}
\`\`\`

After outputting a tool block, STOP and wait for the result. The system will execute the tool and provide the output in the next message. Then continue your response based on the result.

Important rules:
- Output ONE tool block at a time, then stop immediately
- Wait for tool results before continuing
- All file paths are relative to the user's project directory
- Do not assume file contents - always read first if you need to modify
- Use web search to find documentation, solutions, or current information
- For presentations: ALWAYS use the theme object to set colors (backgroundColor, primaryColor, textColor, accentColor)
- Theme colors must be 6-character hex codes WITHOUT the # prefix (e.g., "1a1a2e" not "#1a1a2e")`;
    }

    const toolInstructionsBlock = ABOV3Wire_Blocks.TextBlock(toolInstructions);
    if (systemMessage && systemMessage.length) {
      systemMessage.push(toolInstructionsBlock);
    } else {
      systemMessage = [toolInstructionsBlock];
    }
  }

  // Add MCP tool instructions when project path is available and MCP tools exist
  const hasMCPTools = chatGenerate.tools?.some(t => t.type === 'function_call' && t.function_call?.name.startsWith('mcp_'));
  if (hasMCPTools && projectMode !== 'chat') {
    // Check if we have a proper full path (contains path separator) or just a folder name
    const isFullPath = projectPath && (projectPath.includes('/') || projectPath.includes('\\'));

    // MCP file tools are intercepted and executed locally using the browser's File System Access API
    // This means paths are relative to the project root (the selected folder in Exodus)
    let mcpInstructions: string;

    if (isFullPath) {
      mcpInstructions = `## MCP Tools - Project Context

You have access to MCP file tools for working with the user's project files.

**Active Project:** \`${projectPath}\`
**Working Directory:** All commands and file operations run in this directory.

When using MCP file tools (mcp_*_read_file, mcp_*_write_file, mcp_*_list_directory, etc.):
- Use paths RELATIVE to the project root
- Example: To create "hello.py" in the project root, use path: "hello.py"
- Example: To create in a subfolder, use path: "src/main.py"
- Example: To list the project root, use path: "." or omit the path
- Always use forward slashes (/) in paths

When executing commands (mcp_*_execute_command):
- Commands run with the project root as the working directory
- Write Python code that uses relative paths, they will resolve to the project root
- Example: If you create a script at "script.py", you can run it with: python script.py

${projectMode === 'research' ? '**Mode: RESEARCH (read-only)** - You can only read files, not write or modify them.' : '**Mode: CODING** - You have full read/write access to files in the project.'}`;
    } else {
      // Folder name only - Eden will auto-resolve it
      mcpInstructions = `## MCP Tools - Project Context

You have access to MCP file tools for working with the user's project files.

**Active Project:** \`${projectPath || 'Unknown'}\`

When using MCP file tools (mcp_*_read_file, mcp_*_write_file, mcp_*_list_directory, etc.):
- Use paths RELATIVE to the project root
- Example: path: "hello.py" for files in the root
- Example: path: "src/main.py" for files in subdirectories
- Always use forward slashes (/) in paths

When executing commands (mcp_*_execute_command):
- Commands run with the project folder as the working directory
- Use relative paths in your scripts - they will resolve to the project root
- Example: If you create "script.py", run it with: python script.py

${projectMode === 'research' ? '**Mode: RESEARCH (read-only)** - You can only read files, not write or modify them.' : '**Mode: CODING** - You have full read/write access to files in the project.'}`;
    }

    const mcpInstructionsBlock = ABOV3Wire_Blocks.TextBlock(mcpInstructions);
    if (systemMessage && systemMessage.length) {
      systemMessage.push(mcpInstructionsBlock);
    } else {
      systemMessage = [mcpInstructionsBlock];
    }
  }

  // Transform the chat messages into ABOV3's format
  const chatMessages: TRequest['messages'] = [];
  let currentMessage: TRequest['messages'][number] | null = null;
  let hasToolUse = false; // Track if current message has tool_use blocks

  // Debug: log the incoming message structure
  if (chatGenerate.chatSequence.some(msg =>
    msg.parts.some(part => part.pt === 'tool_invocation' || part.pt === 'tool_response')
  )) {
    console.log('ABOV3: Processing messages with tool calls:',
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
    for (const antPart of _generateABOV3MessagesContentBlocks(aixMessage)) {
      // apply cache_control to the current head block of the current message
      if ('set_cache_control' in antPart) {
        if (currentMessage && currentMessage.content.length) {
          const lastBlock = currentMessage.content[currentMessage.content.length - 1];
          if (lastBlock.type !== 'thinking' && lastBlock.type !== 'redacted_thinking')
            ABOV3Wire_Blocks.blockSetCacheControl(lastBlock, 'ephemeral');
          else
            console.warn('ABOV3: cache_control on a thinking block - not allowed');
        } else
          console.warn('ABOV3: cache_control without a message to attach to');
        continue;
      }

      const { role, content } = antPart;

      // Check if this is a tool_use or tool_result block
      const isToolUse = content.type === 'tool_use';
      const isToolResult = content.type === 'tool_result';

      // Handle tool blocks: keep multiple tool_use/tool_result in same message
      if (isToolUse || isToolResult) {
        // If we have a current message with a different role, flush it
        if (currentMessage && currentMessage.role !== role) {
          chatMessages.push(currentMessage);
          currentMessage = null;
          hasToolUse = false;
        }

        // Start a new message if we don't have one, or add to existing message
        if (!currentMessage) {
          currentMessage = { role, content: [content] };
          hasToolUse = isToolUse;
        } else {
          // Add to current message (allows multiple tool blocks in one message)
          currentMessage.content.push(content);
        }
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
    console.log('ABOV3: Transformed messages with tool calls:',
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
    console.log('ABOV3: Final messages after validation/fixing:',
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
  // [ABOV3] October 8th, 2024 release notes: "...we no longer require the first input message to be a user message."
  // if (hackyHotFixStartWithUser && chatMessages.length && chatMessages[0].role !== 'user' && systemMessage?.length) {
  //   const hackSystemMessageFirstLine = (systemMessage[0]?.text || '').split('\n')[0];
  //   chatMessages.unshift({ role: 'user', content: [ABOV3Wire_Blocks.TextBlock(hackSystemMessageFirstLine)] });
  //   console.log(`ABOV3: hotFixStartWithUser (${chatMessages.length} messages) - ${hackSystemMessageFirstLine}`);
  // }

  // Construct the request payload
  // CRITICAL: OAuth credentials cannot use tools - Anthropic blocks requests with tools for Claude Code OAuth
  const payload: TRequest = {
    max_tokens: model.maxTokens !== undefined ? model.maxTokens : 8192,
    model: model.id,
    system: systemMessage,
    messages: chatMessages,
    // For OAuth users: only pass MCP tools (they start with 'mcp_'), keep native tools as text-based
    // For non-OAuth users: pass all tools
    tools: (() => {
      if (!chatGenerate.tools) return undefined;
      const toolsToPass = isOAuth
        ? chatGenerate.tools.filter(t => t.type === 'function_call' && t.function_call?.name.startsWith('mcp_'))
        : chatGenerate.tools;
      if (toolsToPass.length > 0) {
        console.log(`[ABOV3 Tools] isOAuth: ${isOAuth}, passing ${toolsToPass.length} tools:`, toolsToPass.map(t => t.type === 'function_call' ? t.function_call?.name : t.type).join(', '));
        return _toABOV3Tools(toolsToPass);
      }
      return undefined;
    })(),
    tool_choice: !isOAuth && chatGenerate.toolsPolicy ? _toABOV3ToolChoice(chatGenerate.toolsPolicy) : undefined,
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

  // [ABOV3] Thinking Budget
  // OAuth credentials cannot use the thinking feature - ABOV3 blocks it
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
  const validated = ABOV3Wire_API_Message_Create.Request_schema.safeParse(payload);
  if (!validated.success) {
    console.error('ABOV3: invalid messageCreate payload. Error:', validated.error.message);
    throw new Error(`Invalid sequence for ABOV3 models: ${validated.error.issues?.[0]?.message || validated.error.message || validated.error}.`);
  }

  return validated.data;
}


function* _generateABOV3MessagesContentBlocks({ parts, role }: AixMessages_ChatMessage): Generator<{
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
            yield { role: 'user', content: ABOV3Wire_Blocks.TextBlock(part.text) };
            break;

          case 'inline_image':
            yield { role: 'user', content: ABOV3Wire_Blocks.ImageBlock(part.mimeType, part.base64) };
            break;

          case 'doc':
            yield { role: 'user', content: ABOV3Wire_Blocks.TextBlock(approxDocPart_To_String(part)) };
            break;

          case 'meta_in_reference_to':
            const irtXMLString = approxInReferenceTo_To_XMLString(part);
            if (irtXMLString)
              yield { role: 'user', content: ABOV3Wire_Blocks.TextBlock(irtXMLString) };
            break;

          case 'meta_cache_control':
            yield { set_cache_control: part.control };
            break;

          // Handle tool_response in user messages (from MCP tool execution)
          case 'tool_response':
            const toolErrorPrefix = part.error ? (typeof part.error === 'string' ? `[ERROR] ${part.error} - ` : '[ERROR] ') : '';
            switch (part.response.type) {
              case 'function_call':
                // Handle structured content with images or plain string
                const fcResult = part.response.result;
                const fcContentParts: ReturnType<typeof ABOV3Wire_Blocks.TextBlock>[] = [];
                if (Array.isArray(fcResult)) {
                  // Structured content - can contain text and images
                  for (const item of fcResult) {
                    if (item.type === 'text') {
                      fcContentParts.push(ABOV3Wire_Blocks.TextBlock((toolErrorPrefix && fcContentParts.length === 0 ? toolErrorPrefix : '') + item.text));
                    } else if (item.type === 'image') {
                      // Add image to tool result for vision LLM analysis
                      fcContentParts.push(ABOV3Wire_Blocks.ImageBlock(item.mimeType, item.data) as any);
                    }
                  }
                  // If we only had error prefix with no content, add empty text
                  if (fcContentParts.length === 0 && toolErrorPrefix) {
                    fcContentParts.push(ABOV3Wire_Blocks.TextBlock(toolErrorPrefix));
                  }
                } else {
                  // Plain string result (backward compatibility)
                  fcContentParts.push(ABOV3Wire_Blocks.TextBlock(toolErrorPrefix + fcResult));
                }
                yield { role: 'user', content: ABOV3Wire_Blocks.ToolResultBlock(part.id, fcContentParts, part.error ? true : undefined) };
                break;
              case 'code_execution':
                const ceTextParts = [ABOV3Wire_Blocks.TextBlock(toolErrorPrefix + part.response.result)];
                yield { role: 'user', content: ABOV3Wire_Blocks.ToolResultBlock(part.id, ceTextParts, part.error ? true : undefined) };
                break;
              default:
                throw new Error(`Unsupported tool response type in User message: ${(part.response as any).type}`);
            }
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
              contentBlocks.push(ABOV3Wire_Blocks.TextBlock(part.text));
              break;

            case 'ma':
              // Skip thinking blocks when tools are present (temporary fix)
              // This prevents the splitting issue that causes tool sequencing errors
              console.log('ABOV3: Skipping thinking block when tool invocation is present');
              break;

            case 'tool_invocation':
              let toolUseBlock;
              switch (part.invocation.type) {
                case 'function_call':
                  toolUseBlock = ABOV3Wire_Blocks.ToolUseBlock(part.id, part.invocation.name, part.invocation.args);
                  break;
                case 'code_execution':
                  toolUseBlock = ABOV3Wire_Blocks.ToolUseBlock(part.id, 'execute_code' /* suboptimal */, part.invocation.code);
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
              yield { role: 'assistant', content: ABOV3Wire_Blocks.TextBlock(part.text) };
              break;

            case 'inline_audio':
              // ABOV3 does not support inline audio, if we got to this point, we should throw an error
              throw new Error('Model-generated inline audio is not supported by ABOV3 yet');

            case 'inline_image':
              // Example of mapping a model-generated image (even from other vendors, not just ABOV3) to a user message
              if (hotFixMapModelImagesToUser) {
                yield { role: 'user', content: ABOV3Wire_Blocks.ImageBlock(part.mimeType, part.base64) };
              } else
                throw new Error('Model-generated images are not supported by ABOV3 yet');
              break;

            case 'tool_invocation':
              let toolUseBlock;
              switch (part.invocation.type) {
                case 'function_call':
                  toolUseBlock = ABOV3Wire_Blocks.ToolUseBlock(part.id, part.invocation.name, part.invocation.args);
                  break;
                case 'code_execution':
                  toolUseBlock = ABOV3Wire_Blocks.ToolUseBlock(part.id, 'execute_code' /* suboptimal */, part.invocation.code);
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
                yield { role: 'assistant', content: ABOV3Wire_Blocks.ThinkingBlock(part.aText, part.textSignature) };
              for (const redactedData of part.redactedData || [])
                yield { role: 'assistant', content: ABOV3Wire_Blocks.RedactedThinkingBlock(redactedData) };
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
        console.log('ABOV3: Generating placeholder tool_result for empty tool message');

        // We need to find the previous tool_use to get its ID
        // This is a temporary placeholder - ideally we'd track tool IDs properly
        const placeholderResult = [ABOV3Wire_Blocks.TextBlock('')];
        yield {
          role: 'user',
          content: ABOV3Wire_Blocks.ToolResultBlock('placeholder', placeholderResult, false)
        };
      } else {
        for (const part of parts) {
          switch (part.pt) {

            case 'tool_response':
              const toolErrorPrefix = part.error ? (typeof part.error === 'string' ? `[ERROR] ${part.error} - ` : '[ERROR] ') : '';
              switch (part.response.type) {
                case 'function_call':
                  const fcTextParts = [ABOV3Wire_Blocks.TextBlock(toolErrorPrefix + part.response.result)];
                  yield { role: 'user', content: ABOV3Wire_Blocks.ToolResultBlock(part.id, fcTextParts, part.error ? true : undefined) };
                  break;
                case 'code_execution':
                  const ceTextParts = [ABOV3Wire_Blocks.TextBlock(toolErrorPrefix + part.response.result)];
                  yield { role: 'user', content: ABOV3Wire_Blocks.ToolResultBlock(part.id, ceTextParts, part.error ? true : undefined) };
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

function _toABOV3Tools(itds: AixTools_ToolDefinition[]): NonNullable<TRequest['tools']> {
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
            properties: input_schema?.properties || null, // ABOV3 valid values for input_schema.properties are 'object' or 'null' (null is used to declare functions with no inputs)
            required: input_schema?.required,
          },
        };

      case 'code_execution':
        throw new Error('Gemini code interpreter is not supported');

    }
  });
}

function _toABOV3ToolChoice(itp: AixTools_ToolsPolicy): NonNullable<TRequest['tool_choice']> {
  switch (itp.type) {
    case 'auto':
      return { type: 'auto' as const };
    case 'any':
      return { type: 'any' as const };
    case 'function_call':
      return { type: 'tool' as const, name: itp.function_call.name };
  }
}
