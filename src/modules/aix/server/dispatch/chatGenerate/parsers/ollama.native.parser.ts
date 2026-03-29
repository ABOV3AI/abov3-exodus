import { serverSideId } from '~/server/trpc/trpc.nanoid';

import type { AixWire_Particles } from '../../../api/aix.wiretypes';
import type { ChatGenerateParseFunction } from '../chatGenerate.dispatch';
import type { IParticleTransmitter } from '../IParticleTransmitter';

import { getBrandedDisplayName } from '~/modules/abov3/models';


/**
 * Native Ollama Tool Call Format
 */
interface OllamaNativeToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown> | string;
  };
}

/**
 * Native Ollama Streaming Response Format
 * Used with /api/chat endpoint (json-nl format)
 *
 * Each line is a JSON object:
 * {"model":"llama3.2","created_at":"...","message":{"role":"assistant","content":"Hi"},"done":false}
 * {"model":"llama3.2","created_at":"...","message":{"role":"assistant","content":" there"},"done":false}
 * {"model":"llama3.2","created_at":"...","done":true,"total_duration":123456,"eval_count":10}
 *
 * With tool calls:
 * {"model":"llama3.1","message":{"role":"assistant","content":"","tool_calls":[{"function":{"name":"get_weather","arguments":{"city":"Paris"}}}]},"done":true}
 */
interface OllamaNativeChunk {
  model?: string;
  created_at?: string;
  message?: {
    role: 'assistant';
    content: string;
    images?: string[];  // for vision responses (rare)
    tool_calls?: OllamaNativeToolCall[];
  };
  done: boolean;
  // Only present in final chunk
  total_duration?: number;  // nanoseconds
  load_duration?: number;   // nanoseconds
  prompt_eval_count?: number;
  prompt_eval_duration?: number;  // nanoseconds
  eval_count?: number;
  eval_duration?: number;  // nanoseconds
  // Error case
  error?: string;
}


/**
 * Parser for native Ollama /api/chat streaming responses
 * Format: JSON newline delimited (json-nl)
 * Supports text content and tool calls
 */
export function createOllamaNativeChatParser(): ChatGenerateParseFunction {
  const parserCreationTimestamp = Date.now();
  let hasBegun = false;
  let timeToFirstEvent: number | undefined;
  let hasToolCalls = false;

  return function(pt: IParticleTransmitter, eventData: string) {

    // Time to first event
    if (timeToFirstEvent === undefined)
      timeToFirstEvent = Date.now() - parserCreationTimestamp;

    // Parse the JSON chunk
    let chunk: OllamaNativeChunk;
    try {
      chunk = JSON.parse(eventData);
    } catch (error) {
      console.error('[Ollama Native Parser] Failed to parse JSON:', eventData);
      return;
    }

    // Handle error
    if (chunk.error) {
      pt.setDialectTerminatingIssue(chunk.error, 'error');
      return;
    }

    // Set model name on first event (use branded name if available)
    if (!hasBegun && chunk.model) {
      hasBegun = true;
      pt.setModelName(getBrandedDisplayName(chunk.model));
    }

    // Append text content if present
    if (chunk.message?.content) {
      pt.appendText(chunk.message.content);
    }

    // Handle tool calls
    if (chunk.message?.tool_calls && chunk.message.tool_calls.length > 0) {
      hasToolCalls = true;
      for (const toolCall of chunk.message.tool_calls) {
        // Generate a unique ID for this tool call
        const toolCallId = serverSideId('aix-tool-call-id');

        // Arguments can be an object or a string - handle both cases
        const args = toolCall.function.arguments;
        if (typeof args === 'string') {
          // String format - use 'incr_str' format
          pt.startFunctionCallInvocation(toolCallId, toolCall.function.name, 'incr_str', args);
        } else {
          // Object format - use 'json_object' format
          pt.startFunctionCallInvocation(toolCallId, toolCall.function.name, 'json_object', args);
        }
        pt.endMessagePart();
      }
    }

    // Handle completion
    if (chunk.done) {
      // Build metrics from final chunk
      const metrics: Partial<AixWire_Particles.CGSelectMetrics> = {
        dtAll: Date.now() - parserCreationTimestamp,
      };

      if (timeToFirstEvent !== undefined)
        metrics.dtStart = timeToFirstEvent;

      // Input tokens (prompt evaluation)
      if (chunk.prompt_eval_count !== undefined)
        metrics.TIn = chunk.prompt_eval_count;

      // Output tokens (evaluation count)
      if (chunk.eval_count !== undefined)
        metrics.TOut = chunk.eval_count;

      // Inner duration (eval_duration is in nanoseconds, convert to ms)
      if (chunk.eval_duration !== undefined)
        metrics.dtInner = Math.round(chunk.eval_duration / 1_000_000);

      // Calculate tokens per second if we have the data
      if (chunk.eval_count && chunk.eval_duration) {
        // tokens / (nanoseconds / 1e9) = tokens/second
        const tokensPerSecond = chunk.eval_count / (chunk.eval_duration / 1_000_000_000);
        metrics.vTOutInner = Math.round(tokensPerSecond * 100) / 100;
      }

      pt.updateMetrics(metrics);
      pt.setTokenStopReason(hasToolCalls ? 'ok-tool_invocations' : 'ok');
      pt.setEnded('done-dialect');
    }
  };
}


/**
 * Parser for native Ollama non-streaming responses
 * Returns a complete response object
 */
export function createOllamaNativeChatParserNS(): ChatGenerateParseFunction {
  const parserCreationTimestamp = Date.now();

  return function(pt: IParticleTransmitter, eventData: string) {

    // Parse the JSON response
    let response: OllamaNativeChunk;
    try {
      response = JSON.parse(eventData);
    } catch (error) {
      console.error('[Ollama Native Parser NS] Failed to parse JSON:', eventData);
      pt.setDialectTerminatingIssue('Failed to parse response', 'error');
      return;
    }

    // Handle error
    if (response.error) {
      pt.setDialectTerminatingIssue(response.error, 'error');
      return;
    }

    // Set model name (use branded name if available)
    if (response.model) {
      pt.setModelName(getBrandedDisplayName(response.model));
    }

    // Append the full content
    if (response.message?.content) {
      pt.appendText(response.message.content);
    }

    // Handle tool calls
    let hasToolCalls = false;
    if (response.message?.tool_calls && response.message.tool_calls.length > 0) {
      hasToolCalls = true;
      for (const toolCall of response.message.tool_calls) {
        const toolCallId = serverSideId('aix-tool-call-id');

        // Arguments can be an object or a string - handle both cases
        const args = toolCall.function.arguments;
        if (typeof args === 'string') {
          // String format - use 'incr_str' format
          pt.startFunctionCallInvocation(toolCallId, toolCall.function.name, 'incr_str', args);
        } else {
          // Object format - use 'json_object' format
          pt.startFunctionCallInvocation(toolCallId, toolCall.function.name, 'json_object', args);
        }
        pt.endMessagePart();
      }
    }

    // Build metrics
    const metrics: Partial<AixWire_Particles.CGSelectMetrics> = {
      dtAll: Date.now() - parserCreationTimestamp,
    };

    if (response.prompt_eval_count !== undefined)
      metrics.TIn = response.prompt_eval_count;

    if (response.eval_count !== undefined)
      metrics.TOut = response.eval_count;

    if (response.eval_duration !== undefined)
      metrics.dtInner = Math.round(response.eval_duration / 1_000_000);

    if (response.eval_count && response.eval_duration) {
      const tokensPerSecond = response.eval_count / (response.eval_duration / 1_000_000_000);
      metrics.vTOutInner = Math.round(tokensPerSecond * 100) / 100;
    }

    pt.updateMetrics(metrics);
    pt.setTokenStopReason(hasToolCalls ? 'ok-tool_invocations' : 'ok');
    pt.setEnded('done-dialect');
  };
}
