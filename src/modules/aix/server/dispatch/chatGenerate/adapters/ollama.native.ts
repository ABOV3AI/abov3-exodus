import type { AixAPI_Model, AixAPIChatGenerate_Request, AixTools_ToolDefinition } from '../../../api/aix.wiretypes';
import { isABOV3Model, resolveToOllamaModel, prepareSystemMessage } from '~/modules/abov3/models';


/**
 * Native Ollama Tool Definition Format
 */
interface OllamaNativeTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters?: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

/**
 * Native Ollama Chat Message Format
 *
 * Note: For tool response messages, Ollama requires `tool_name` to correlate
 * the response with the original tool call. Without this, some models
 * (like Mistral, Devstral) will fail to recognize tool responses.
 */
interface OllamaNativeMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  images?: string[];  // base64 encoded images for vision models
  tool_calls?: Array<{
    function: {
      name: string;
      arguments: Record<string, unknown>;
    };
  }>;
  tool_name?: string;  // Required for 'tool' role messages - the function name being responded to
}

/**
 * Native Ollama Chat API Request Format
 * Used for /api/chat endpoint (not the OpenAI-compatible /v1/chat/completions)
 */
export interface OllamaNativeChat_Request {
  model: string;
  messages: OllamaNativeMessage[];
  tools?: OllamaNativeTool[];
  stream?: boolean;
  format?: 'json';  // for JSON output mode
  options?: {
    temperature?: number;
    num_predict?: number;  // max tokens
    seed?: number;
    top_k?: number;
    top_p?: number;
  };
  keep_alive?: string;  // e.g. '5m'
}


/**
 * Convert AIX tools to native Ollama tool format
 */
function _toOllamaTools(tools: AixTools_ToolDefinition[]): OllamaNativeTool[] {
  return tools
    .filter(tool => tool.type === 'function_call')
    .map(tool => {
      if (tool.type !== 'function_call') throw new Error('Unexpected tool type');
      const fc = tool.function_call;
      return {
        type: 'function' as const,
        function: {
          name: fc.name,
          description: fc.description,
          ...(fc.input_schema && {
            parameters: {
              type: 'object' as const,
              properties: fc.input_schema.properties,
              ...(fc.input_schema.required && { required: fc.input_schema.required }),
            },
          }),
        },
      };
    });
}


/**
 * Convert AIX chat request to native Ollama /api/chat format
 * Supports text, images, tool definitions, tool calls, and tool responses
 */
export function aixToOllamaNativeChat(
  model: AixAPI_Model,
  chatGenerate: AixAPIChatGenerate_Request,
  jsonOutput: boolean,
  streaming: boolean,
): OllamaNativeChat_Request {

  // Convert messages
  const messages: OllamaNativeMessage[] = [];

  // Track tool call ID → function name mapping for correlating tool responses
  // This is needed because tool responses must include tool_name for Ollama
  const toolCallIdToName: Map<string, string> = new Map();

  // Add system messages first (with identity protocol for ABOV3 branded models)
  let existingSystemContent = '';
  if (chatGenerate.systemMessage) {
    const systemParts = chatGenerate.systemMessage.parts;
    for (const part of systemParts) {
      if (part.pt === 'text')
        existingSystemContent += part.text;
    }
  }

  // Prepare system message with identity protocol injection for branded ABOV3 models
  const finalSystemContent = prepareSystemMessage(model.id, existingSystemContent);
  if (finalSystemContent) {
    messages.push({
      role: 'system',
      content: finalSystemContent,
    });
  }

  // Add chat messages
  for (const message of chatGenerate.chatSequence) {
    // Handle user messages
    if (message.role === 'user') {
      let content = '';
      const images: string[] = [];
      const toolResponses: Array<{ id: string; result: string; name?: string }> = [];

      for (const part of message.parts) {
        switch (part.pt) {
          case 'text':
            content += part.text;
            break;
          case 'inline_image':
            // Native Ollama expects base64 without data URL prefix
            if (part.base64.startsWith('data:')) {
              const base64Data = part.base64.split(',')[1];
              if (base64Data) images.push(base64Data);
            } else {
              images.push(part.base64);
            }
            break;
          case 'doc':
            // Convert doc parts to text (l1Title is optional, data.text has the content)
            const docTitle = part.l1Title || part.ref;
            const docText = part.data?.text || '';
            content += `\n\n[Document: ${docTitle}]\n${docText}\n`;
            break;
          case 'tool_response':
            // Collect tool responses to add as separate tool messages
            if (part.response.type === 'function_call') {
              toolResponses.push({
                id: part.id,
                result: part.response.result,
                name: part.response._name,  // Include the function name if available
              });
            }
            break;
        }
      }

      // Add user message if there's content
      if (content || images.length > 0) {
        messages.push({
          role: 'user',
          content: content || '',
          ...(images.length > 0 && { images }),
        });
      }

      // Add tool response messages (Ollama expects separate 'tool' role messages)
      for (const tr of toolResponses) {
        // Get function name from response or look up from our ID map
        const toolName = tr.name || toolCallIdToName.get(tr.id) || 'unknown';
        messages.push({
          role: 'tool',
          content: tr.result,
          tool_name: toolName,  // Required by Ollama for tool response correlation
        });
      }
    }

    // Handle model/assistant messages
    else if (message.role === 'model') {
      let content = '';
      const toolCalls: Array<{ function: { name: string; arguments: Record<string, unknown> } }> = [];

      for (const part of message.parts) {
        switch (part.pt) {
          case 'text':
            content += part.text;
            break;
          case 'tool_invocation':
            // Handle tool invocations (function calls made by the model)
            if (part.invocation.type === 'function_call') {
              // Track ID → name mapping for correlating tool responses
              toolCallIdToName.set(part.id, part.invocation.name);

              let args: Record<string, unknown> = {};
              try {
                // Args can be a JSON string or already parsed
                args = typeof part.invocation.args === 'string'
                  ? JSON.parse(part.invocation.args || '{}')
                  : part.invocation.args || {};
              } catch {
                // If parsing fails, wrap in a generic object
                args = { _raw: part.invocation.args };
              }
              toolCalls.push({
                function: {
                  name: part.invocation.name,
                  arguments: args,
                },
              });
            }
            break;
          case 'inline_image':
            // Assistant responses with images are rare but handle them
            break;
          case 'ma':
            // Thinking/reasoning blocks - can include as text or skip
            // content += `\n<thinking>${part.aText}</thinking>\n`;
            break;
        }
      }

      // Add assistant message
      if (content || toolCalls.length > 0) {
        messages.push({
          role: 'assistant',
          content: content || '',
          ...(toolCalls.length > 0 && { tool_calls: toolCalls }),
        });
      }
    }

    // Handle tool messages (responses)
    else if (message.role === 'tool') {
      for (const part of message.parts) {
        if (part.pt === 'tool_response' && part.response.type === 'function_call') {
          // Get function name from response._name or look up from our ID map
          const toolName = part.response._name || toolCallIdToName.get(part.id) || 'unknown';
          messages.push({
            role: 'tool',
            content: part.response.result,
            tool_name: toolName,  // Required by Ollama for tool response correlation
          });
        }
      }
    }
  }

  // Build request - resolve ABOV3 model ID to actual Ollama model string
  const request: OllamaNativeChat_Request = {
    model: resolveToOllamaModel(model.id),
    messages,
    stream: streaming,
    ...(jsonOutput && { format: 'json' }),
  };

  // Add tools if present and model supports them
  if (chatGenerate.tools?.length && model.supportsFunctionCalling) {
    const ollamaTools = _toOllamaTools(chatGenerate.tools);
    if (ollamaTools.length > 0) {
      request.tools = ollamaTools;
    }
  }

  // Add options if any model parameters are set
  const options: OllamaNativeChat_Request['options'] = {};
  if (model.temperature !== undefined && model.temperature !== null)
    options.temperature = model.temperature;
  if (model.maxTokens !== undefined && model.maxTokens !== null)
    options.num_predict = model.maxTokens;

  if (Object.keys(options).length > 0) {
    request.options = options;
  }

  return request;
}
