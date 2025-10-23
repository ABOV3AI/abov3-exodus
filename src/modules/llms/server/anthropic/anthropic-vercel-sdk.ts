/**
 * Uses Vercel AI SDK with custom fetch for OAuth - EXACT copy of Genesis CodeForger approach
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import type { AnthropicAccessSchema } from './anthropic.router';


/**
 * Stream chat using Vercel AI SDK - Genesis CodeForger's exact approach
 */
export async function streamChatWithVercelSDK(
  access: AnthropicAccessSchema,
  modelId: string,
  requestBody: any,
): Promise<ReadableStream> {
  if (!access.oauthAccessToken) {
    throw new Error('OAuth access token required');
  }

  // EXACT copy from Genesis CodeForger - creates Anthropic provider with custom fetch
  const anthropic = createAnthropic({
    apiKey: "", // Empty API key like Genesis
    headers: {
      "anthropic-beta": "oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14",
    },
    async fetch(input: any, init: any = {}) {
      // Create new headers object with OAuth token
      const headers = new Headers(init.headers || {});
      headers.set("authorization", `Bearer ${access.oauthAccessToken}`);
      headers.set(
        "anthropic-beta",
        "oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14"
      );
      // Remove x-api-key if present
      headers.delete("x-api-key");

      return fetch(input, {
        ...init,
        headers,
      });
    },
  });

  // Use streamText like Genesis does
  const model = anthropic(modelId);

  // Convert system prompt to string if it's an array (Big-AGI sends it as an array)
  let systemPrompt = requestBody.system;
  if (Array.isArray(systemPrompt)) {
    systemPrompt = systemPrompt.map((item: any) => {
      if (typeof item === 'string') return item;
      if (item?.type === 'text' && item?.text) return item.text;
      return '';
    }).join('\n');
  }

  const result = await streamText({
    model,
    messages: requestBody.messages,
    system: systemPrompt,
    maxTokens: requestBody.max_tokens,
    temperature: requestBody.temperature,
    topP: requestBody.top_p,
    topK: requestBody.top_k,
    tools: requestBody.tools,
    toolChoice: requestBody.tool_choice,
  });

  // Convert Vercel AI SDK stream to raw SSE stream that matches Anthropic's format
  const reader = result.textStream.getReader();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      // Send initial SSE events that match Anthropic's format
      controller.enqueue(encoder.encode(`event: message_start\ndata: {"type":"message_start","message":{"id":"msg_${Date.now()}","type":"message","role":"assistant","content":[],"model":"${modelId}","stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":0,"output_tokens":0}}}\n\n`));
      controller.enqueue(encoder.encode(`event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n`));

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Send text delta event
          const textDelta = JSON.stringify({
            type: "content_block_delta",
            index: 0,
            delta: { type: "text_delta", text: value }
          });
          controller.enqueue(encoder.encode(`event: content_block_delta\ndata: ${textDelta}\n\n`));
        }

        // Send closing events
        controller.enqueue(encoder.encode(`event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n`));
        controller.enqueue(encoder.encode(`event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":0}}\n\n`));
        controller.enqueue(encoder.encode(`event: message_stop\ndata: {"type":"message_stop"}\n\n`));
      } catch (error) {
        console.error('[anthropic-vercel-sdk] Stream error:', error);
        controller.error(error);
      } finally {
        controller.close();
      }
    },
  });
}


/**
 * Non-streaming chat completion using Vercel AI SDK
 */
export async function generateChatWithVercelSDK(
  access: AnthropicAccessSchema,
  modelId: string,
  requestBody: any,
): Promise<any> {
  const anthropic = createAnthropicSDK(access);
  const model = anthropic(modelId);

  const params = convertToVercelSDKFormat(requestBody);

  const result = await generateText({
    model,
    ...params,
  });

  // Convert Vercel AI SDK response to Anthropic format
  return {
    id: `msg_${Date.now()}`,
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: result.text,
      },
    ],
    model: modelId,
    stop_reason: result.finishReason || 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: result.usage?.promptTokens || 0,
      output_tokens: result.usage?.completionTokens || 0,
    },
  };
}
