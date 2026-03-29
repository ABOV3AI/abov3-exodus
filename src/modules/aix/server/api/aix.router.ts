import * as z from 'zod/v4';

import { createEmptyReadableStream, createServerDebugWireEvents, safeErrorString, serverCapitalizeFirstLetter } from '~/server/wire';
import { createTRPCRouter, publicProcedure } from '~/server/trpc/trpc.server';
import { fetchResponseOrTRPCThrow } from '~/server/trpc/trpc.router.fetchers';

import { AixDemuxers } from '../dispatch/stream.demuxers';
import { AixAPI_Context_ChatGenerate, AixWire_API, AixWire_API_ChatContentGenerate, AixWire_Particles } from './aix.wiretypes';
import { ChatGenerateTransmitter } from '../dispatch/chatGenerate/ChatGenerateTransmitter';
import { PerformanceProfiler } from '../dispatch/PerformanceProfiler';
import { createChatGenerateDispatch } from '../dispatch/chatGenerate/chatGenerate.dispatch';
import { heartbeatsWhileAwaiting } from '../dispatch/heartbeatsWhileAwaiting';
import {
  truncateContext,
  injectMemoriesIntoSystem,
  estimateRequestTokens,
  getModelContextLimit,
  calculateSafeTokenLimit,
  type RetrievedMemory,
} from '../dispatch/chatGenerate/context-manager';


/**
 * Security - only allow certain operations in development builds (i.e. not in any production builds by default):
 *  1. dispatch Headers: hide sensitive data such as keys
 *  2. Performance profiling: visible in the AIX debugger when requested on development builds
 *  3. 'DEV_URL: ...' in error messages to show the problematic upstream URL
 *  4. onComment on SSE streams
 */
export const AIX_SECURITY_ONLY_IN_DEV_BUILDS = process.env.NODE_ENV === 'development';

/**
 * Production-allowed contexts for AIX inspector.
 * These are the only contexts that can be captured in production builds for security.
 */
const AIX_INSPECTOR_ALLOWED_CONTEXTS: (AixAPI_Context_ChatGenerate['name'] | string)[] = [
  'prism-followup',
  'prism-gather',
  'prism-scatter',
  'chat-react-turn',
  'conversation',
  'scratch-chat',
] as const;


const chatGenerateContentInputSchema = z.object({
  access: AixWire_API.Access_schema,
  model: AixWire_API.Model_schema,
  chatGenerate: AixWire_API_ChatContentGenerate.Request_schema,
  context: AixWire_API.ContextChatGenerate_schema,
  streaming: z.boolean(),
  connectionOptions: AixWire_API.ConnectionOptions_schema.optional(),
});


/**
 * Chat content generation implementation.
 * Extracted for reusability and composability while maintaining full type inference.
 *
 * Can be called directly from server-side code or wrapped in retry logic, batching, etc.
 */
export async function* chatGenerateContentImpl(
  input: z.infer<typeof chatGenerateContentInputSchema>,
  ctx: { reqSignal: AbortSignal }, // ChatGenerateContentContext
): AsyncGenerator<AixWire_Particles.ChatGenerateOp, void> {

  // Intake derived state
  const intakeAbortSignal = ctx.reqSignal;
  let { access, model, chatGenerate, streaming: aixStreaming, connectionOptions } = input;

  // ABOV3 now uses its own adapter with persona support
  // Tools are stripped in the adapter when OAuth is used

  const accessDialect = access.dialect;
  // Use "ABOV3" as the display name for ARK Cloud (api.abov3.ai)
  const isArkCloud = accessDialect === 'ollama' && 'ollamaHost' in access && (access as any).ollamaHost?.includes('api.abov3.ai');
  const prettyDialect = isArkCloud ? 'ABOV3' : serverCapitalizeFirstLetter(accessDialect);

  // Applies per-model streaming suppression; added for o3 without verification
  const streaming = model.forceNoStream ? false : aixStreaming;


  // Context Management: Automatic truncation to prevent "prompt too long" errors
  // This is transparent to users - context is managed server-side
  const contextWindow = getModelContextLimit(model.id, model.maxTokens);
  const maxContextTokens = calculateSafeTokenLimit(contextWindow, 0.1); // 10% buffer
  const currentTokens = estimateRequestTokens(chatGenerate);

  if (currentTokens > maxContextTokens) {
    // Extract conversation ID from context if available
    const conversationId = input.context.name === 'conversation' ? input.context.ref : undefined;

    // Memory storage callback - stores truncated content in NepheshMemory
    const storeMemoryCallback = conversationId
      ? async (content: string, convId: string) => {
          try {
            // Dynamic import to avoid circular dependencies and keep edge-compatible
            const { addMemory } = await import('~/modules/nephesh/memory/memory-service');
            // Use a default profile ID for context memories (can be enhanced later)
            await addMemory('context-manager', content, 'conversation', 5, convId);
          } catch (e) {
            console.warn('[AIX ContextManager] Failed to store memory:', e);
          }
        }
      : undefined;

    // Truncate context to fit within limits
    const truncationResult = await truncateContext(
      chatGenerate,
      maxContextTokens,
      conversationId,
      storeMemoryCallback,
    );

    // Use the truncated request
    chatGenerate = truncationResult.request;

    // Log truncation for debugging
    if (truncationResult.truncatedCount > 0) {
      console.log(
        `[AIX ContextManager] Truncated ${truncationResult.truncatedCount} messages ` +
        `(${truncationResult.originalTokens} -> ${truncationResult.finalTokens} tokens) ` +
        `for ${prettyDialect}. Stored ${truncationResult.storedMemoryCount} memories.`
      );
    }

    // Retrieve relevant memories and inject into system message (if conversation context)
    if (conversationId && truncationResult.storedMemoryCount > 0) {
      try {
        const { searchMemory } = await import('~/modules/nephesh/memory/memory-service');
        // Get recent message content for similarity search
        const recentContent = chatGenerate.chatSequence
          .slice(-3)
          .map(m => {
            const parts = m.parts || [];
            return parts
              .filter((p: any) => p.pt === 'text')
              .map((p: any) => p.text || '')
              .join(' ');
          })
          .join(' ');

        if (recentContent.length > 20) {
          const memories = await searchMemory('context-manager', recentContent, 3);
          if (memories.length > 0) {
            const retrievedMemories: RetrievedMemory[] = memories.map(m => ({
              content: m.summary || m.content,
              source: m.source,
              timestamp: m.timestamp,
            }));

            chatGenerate = {
              ...chatGenerate,
              systemMessage: injectMemoriesIntoSystem(chatGenerate.systemMessage, retrievedMemories),
            };

            console.log(`[AIX ContextManager] Injected ${retrievedMemories.length} memories into system message`);
          }
        }
      } catch (e) {
        // Non-critical - continue without memory injection
        console.warn('[AIX ContextManager] Memory retrieval failed:', e);
      }
    }
  }


  // Intake Transmitters
  const chatGenerateTx = new ChatGenerateTransmitter(prettyDialect, connectionOptions?.throttlePartTransmitter);


  // Request Echo, if allowed
  const echoDispatchRequest = !!input.connectionOptions?.debugDispatchRequest && (AIX_SECURITY_ONLY_IN_DEV_BUILDS || AIX_INSPECTOR_ALLOWED_CONTEXTS.includes(input.context.name));

  // Profiler, if allowed
  const _profiler = (AIX_SECURITY_ONLY_IN_DEV_BUILDS && echoDispatchRequest && !!input.connectionOptions?.debugProfilePerformance)
    ? new PerformanceProfiler() : null;

  const _profilerCompleted = !_profiler ? null : () => {
    // append to the response, if requested by the client
    if (input.connectionOptions?.debugProfilePerformance)
      chatGenerateTx.addDebugProfilererData(_profiler?.getResultsData());

    // [DEV] uncomment this line to see the profiler table in the server-side console
    // performanceProfilerLog('AIX Router Performance', _profiler?.getResultsData());

    // clear the profiler for the next call, for resident lambdas (the profiling framework is global)
    _profiler?.clearMeasurements();
  };


  // Prepare the dispatch requests
  let dispatch: ReturnType<typeof createChatGenerateDispatch>;
  try {
    dispatch = createChatGenerateDispatch(access, model, chatGenerate, streaming, !!connectionOptions?.enableResumability);
  } catch (error: any) {
    chatGenerateTx.setRpcTerminatingIssue('dispatch-prepare', `**[AIX Configuration Issue] ${prettyDialect}**: ${safeErrorString(error) || 'Unknown service preparation error'}`, false);
    yield* chatGenerateTx.flushParticles();
    return; // exit
  }

  // Connect to the dispatch
  let dispatchResponse: Response;
  try {

    // Apply OAuth interceptor for ABOV3 and Anthropic requests
    let finalHeaders = dispatch.request.headers;

    // ABOV3 OAuth/API key interceptor
    if (access.dialect === 'abov3') {
      const { abov3OAuthInterceptor } = await import('~/modules/llms/server/abov3/abov3.router');
      const interceptResult = await abov3OAuthInterceptor(
        access as any, // ABOV3AccessSchema
        dispatch.request.url,
        dispatch.request.headers,
        dispatch.request.body
      );
      finalHeaders = interceptResult.headers;
    }

    // Anthropic OAuth/API key interceptor
    if (access.dialect === 'anthropic') {
      const { anthropicOAuthInterceptor } = await import('~/modules/llms/server/anthropic/anthropic.router');
      const interceptResult = await anthropicOAuthInterceptor(
        access as any, // AnthropicAccessSchema
        dispatch.request.url,
        dispatch.request.headers,
        dispatch.request.body
      );
      finalHeaders = interceptResult.headers;
    }

    // DEBUG: Log final request details before sending to API
    const bodyObj = dispatch.request.body as any;
    const fullBodyJson = JSON.stringify(dispatch.request.body);
    const wasABOV3 = (input.access as any).dialect === 'abov3';

    // Log messages array details
    const messagesInfo = bodyObj?.messages?.map((m: any, i: number) => ({
      index: i,
      role: m.role,
      contentLength: JSON.stringify(m.content).length,
      contentPreview: typeof m.content === 'string'
        ? m.content.substring(0, 100)
        : JSON.stringify(m.content).substring(0, 100),
    }));

    console.log(`[AIX Router] ${access.dialect.toUpperCase()} - Final request details:`, {
      dialect: access.dialect,
      url: dispatch.request.url,
      method: 'POST',
      model: bodyObj?.model,
      maxTokens: bodyObj?.max_tokens,
      bodyLength: fullBodyJson.length,
      wasABOV3,
      messageCount: bodyObj?.messages?.length || 0,
      messages: messagesInfo,
    });

    // [DEV] Debugging the request without requiring a server restart
    if (echoDispatchRequest) {
      chatGenerateTx.addDebugRequest(!AIX_SECURITY_ONLY_IN_DEV_BUILDS, dispatch.request.url, finalHeaders, dispatch.request.body);
      yield* chatGenerateTx.emitParticles();
    }

    // Blocking fetch with heartbeats - combats timeouts, for instance with long Anthriopic requests (>25s on Vercel)
    _profiler?.measureStart('connect');
    dispatchResponse = yield* heartbeatsWhileAwaiting(fetchResponseOrTRPCThrow({
      url: dispatch.request.url,
      method: 'POST',
      headers: finalHeaders,
      body: dispatch.request.body,
      signal: intakeAbortSignal,
      name: `Aix.${prettyDialect}`,
      throwWithoutName: true,
    }));
    _profiler?.measureEnd('connect');

  } catch (error: any) {
    // Handle expected dispatch abortion while the first fetch hasn't even completed
    if (error && error?.name === 'TRPCError' && intakeAbortSignal.aborted) {
      chatGenerateTx.setEnded('done-dispatch-aborted');
      yield* chatGenerateTx.flushParticles();
      return; // exit
    }

    // Handle AI Service connection error
    const dispatchFetchError = safeErrorString(error) + (error?.cause ? ' · ' + JSON.stringify(error.cause) : '');
    const extraDevMessage = AIX_SECURITY_ONLY_IN_DEV_BUILDS ? ` - [DEV_URL: ${dispatch.request.url}]` : '';

    const showOnConsoleForNonCustomServers = access.dialect !== 'openai' || !access.oaiHost;
    chatGenerateTx.setRpcTerminatingIssue('dispatch-fetch', `**[Service Issue] ${prettyDialect}**: ${dispatchFetchError}${extraDevMessage}`, showOnConsoleForNonCustomServers);
    yield* chatGenerateTx.flushParticles();
    return; // exit
  }


  // [NON-STREAMING] Read the full response and send operations down the intake
  const serverDebugIncomingPackets = createServerDebugWireEvents();
  if (!streaming) {
    let dispatchBody: string | undefined = undefined;
    try {
      // Read the full response body with heartbeats
      _profiler?.measureStart('read-full');
      dispatchBody = yield* heartbeatsWhileAwaiting(dispatchResponse.text());
      _profiler?.measureEnd('read-full');
      serverDebugIncomingPackets?.onMessage(dispatchBody);

      // Parse the response in full
      dispatch.chatGenerateParse(chatGenerateTx, dispatchBody);
      chatGenerateTx.setEnded('done-dispatch-closed');

    } catch (error: any) {
      if (dispatchBody === undefined)
        chatGenerateTx.setRpcTerminatingIssue('dispatch-read', `**[Reading Issue] ${prettyDialect}**: ${safeErrorString(error) || 'Unknown stream reading error'}`, true);
      else
        chatGenerateTx.setRpcTerminatingIssue('dispatch-parse', ` **[Parsing Issue] ${prettyDialect}**: ${safeErrorString(error) || 'Unknown stream parsing error'}.\nInput data: ${dispatchBody}.\nPlease open a support ticket on GitHub.`, true);
    }
    _profilerCompleted?.();
    yield* chatGenerateTx.flushParticles();
    return; // exit
  }


  // STREAM the response to the client
  const dispatchReader = (dispatchResponse.body || createEmptyReadableStream()).getReader();
  const dispatchDecoder = new TextDecoder('utf-8', { fatal: false /* malformed data -> “ ” (U+FFFD) */ });
  const dispatchDemuxer = AixDemuxers.createStreamDemuxer(dispatch.demuxerFormat);
  const dispatchParser = dispatch.chatGenerateParse;

  // Data pump: AI Service -- (dispatch) --> Server -- (intake) --> Client
  do {

    // Read AI Service chunk
    let dispatchChunk: string;
    try {
      _profiler?.measureStart('read');
      const { done, value } = yield* heartbeatsWhileAwaiting(dispatchReader.read());
      _profiler?.measureEnd('read');

      // Handle normal dispatch stream closure (no more data, AI Service closed the stream)
      if (done) {
        chatGenerateTx.setEnded('done-dispatch-closed');
        break; // outer do {}
      }

      // Decode the chunk - does Not throw (see the constructor for why)
      _profiler?.measureStart('decode');
      dispatchChunk = dispatchDecoder.decode(value, { stream: true });
      _profiler?.measureEnd('decode');
    } catch (error: any) {
      // Handle expected dispatch stream abortion - nothing to do, as the intake is already closed
      // TODO: check if 'AbortError' is also a cause. Seems like ResponseAborted is NextJS vs signal driven.
      if (error && error?.name === 'ResponseAborted') {
        chatGenerateTx.setEnded('done-dispatch-aborted');
        break; // outer do {}
      }

      // Handle abnormal stream termination
      chatGenerateTx.setRpcTerminatingIssue('dispatch-read', `**[Streaming Issue] ${prettyDialect}**: ${safeErrorString(error) || 'Unknown stream reading error'}`, true);
      break; // outer do {}
    }


    // Demux the chunk into 0 or more events
    _profiler?.measureStart('demux');
    const demuxedEvents = dispatchDemuxer.demux(dispatchChunk);
    _profiler?.measureEnd('demux');

    for (const demuxedItem of demuxedEvents) {
      serverDebugIncomingPackets?.onMessage(demuxedItem);

      // ignore events post termination
      if (chatGenerateTx.isEnded) {
        // DEV-only message to fix dispatch protocol parsing -- warning on, because this is important and a sign of a bug
        console.warn('[chatGenerateContent] Received event after termination:', demuxedItem);
        break; // inner for {}
      }

      // ignore superfluos stream events
      if (demuxedItem.type !== 'event')
        continue; // inner for {}

      // [OpenAI] Special: stream termination marker
      if (demuxedItem.data === '[DONE]') {
        chatGenerateTx.setEnded('done-dialect');
        break; // inner for {}, then outer do
      }

      try {
        _profiler?.measureStart('parse');
        dispatchParser(chatGenerateTx, demuxedItem.data, demuxedItem.name);
        _profiler?.measureEnd('parse');
        if (!chatGenerateTx.isEnded)
          yield* chatGenerateTx.emitParticles();
      } catch (error: any) {
        // Handle parsing issue (likely a schema break); print it to the console as well
        chatGenerateTx.setRpcTerminatingIssue('dispatch-parse', ` **[Service Parsing Issue] ${prettyDialect}**: ${safeErrorString(error) || 'Unknown stream parsing error'}.\nInput data: ${demuxedItem.data}.\nPlease open a support ticket on GitHub.`, false);
        break; // inner for {}, then outer do
      }
    }

  } while (!chatGenerateTx.isEnded);

  _profilerCompleted?.();

  // Flush everything that's left; if we're here we have encountered a clean end condition,
  // or an error that has already been queued up for this last flush
  yield* chatGenerateTx.flushParticles();

}


export const aixRouter = createTRPCRouter({

  /**
   * Chat content generation, streaming, multipart.
   * Architecture: Client <-- (intake) --> Server <-- (dispatch) --> AI Service
   */
  chatGenerateContent: publicProcedure
    .input(chatGenerateContentInputSchema)
    .mutation(async function* ({ input, ctx }) {

      // thin wrapper for future retry logic, etc.
      yield* chatGenerateContentImpl(input, { reqSignal: ctx.reqSignal });

    }),

});
