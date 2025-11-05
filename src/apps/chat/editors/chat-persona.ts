import { AixChatGenerateContent_DMessage, aixChatGenerateContent_DMessage_FromConversation } from '~/modules/aix/client/aix.client';
import { autoChatFollowUps } from '~/modules/aifn/auto-chat-follow-ups/autoChatFollowUps';
import { autoConversationTitle } from '~/modules/aifn/autotitle/autoTitle';

import { DConversationId, splitSystemMessageFromHistory } from '~/common/stores/chat/chat.conversation';
import type { DLLMId } from '~/common/stores/llms/llms.types';
import { findLLMOrThrow } from '~/common/stores/llms/store-llms';
import { AudioGenerator } from '~/common/util/audio/AudioGenerator';
import { ConversationsManager } from '~/common/chat-overlay/ConversationsManager';
import { createDMessageFromFragments, DMessage, MESSAGE_FLAG_NOTIFY_COMPLETE, messageWasInterruptedAtStart } from '~/common/stores/chat/chat.message';
import { getUXLabsHighPerformance } from '~/common/stores/store-ux-labs';

import { PersonaChatMessageSpeak } from './persona/PersonaChatMessageSpeak';
import { getChatAutoAI, getIsNotificationEnabledForModel } from '../store-app-chat';
import { getInstantAppChatPanesCount } from '../components/panes/store-panes-manager';

// Tools integration - unified system
import { useProjectsStore } from '~/apps/projects/store-projects';
import { getEnabledAIXTools } from '~/modules/tools/tools.registry';
import { executeToolCall } from '~/modules/tools/tools.executor';
import type { AixTools_ToolDefinition } from '~/modules/aix/server/api/aix.wiretypes';
import { create_FunctionCallResponse_ContentFragment, createTextContentFragment } from '~/common/stores/chat/chat.fragments';

// OAuth token refresh for Anthropic
import { ensureAnthropicOAuthFresh } from '~/modules/llms/vendors/anthropic/anthropic.token-refresh';


// configuration
export const CHATGENERATE_RESPONSE_PLACEHOLDER = '...'; // 💫 ..., 🖊️ ...


export interface PersonaProcessorInterface {
  handleMessage(accumulatedMessage: AixChatGenerateContent_DMessage, messageComplete: boolean): void;
}


/**
 * The main "chat" function.
 * @returns `true` if the operation was successful, `false` otherwise.
 */
export async function runPersonaOnConversationHead(
  assistantLlmId: DLLMId,
  conversationId: DConversationId,
): Promise<boolean> {

  const cHandler = ConversationsManager.getHandler(conversationId);

  const _history = cHandler.historyViewHeadOrThrow('runPersonaOnConversationHead') as Readonly<DMessage[]>;
  if (_history.length === 0)
    return false;

  // split pre dynamic-personas
  let { chatSystemInstruction, chatHistory } = splitSystemMessageFromHistory(_history);

  // assistant response placeholder
  const isNotifyEnabled = getIsNotificationEnabledForModel(assistantLlmId);
  const { assistantMessageId } = cHandler.messageAppendAssistantPlaceholder(
    CHATGENERATE_RESPONSE_PLACEHOLDER,
    {
      purposeId: chatSystemInstruction?.purposeId,
      generator: { mgt: 'named', name: assistantLlmId },
      ...(isNotifyEnabled ? { userFlags: [MESSAGE_FLAG_NOTIFY_COMPLETE] } : {}),
    },
  );

  const parallelViewCount = getUXLabsHighPerformance() ? 0 : getInstantAppChatPanesCount();

  // ai follow-up operations (fire/forget)
  const { autoSpeak, autoSuggestDiagrams, autoSuggestHTMLUI, autoSuggestQuestions, autoTitleChat, chatKeepLastThinkingOnly } = getChatAutoAI();

  // AutoSpeak
  const autoSpeaker: PersonaProcessorInterface | null = autoSpeak !== 'off' ? new PersonaChatMessageSpeak(autoSpeak) : null;

  // when an abort controller is set, the UI switches to the "stop" mode
  const abortController = new AbortController();
  cHandler.setAbortController(abortController, 'chat-persona');

  // Get all enabled tools from the registry
  // This includes file ops (if project active), web tools, and any other enabled categories
  const activeProject = useProjectsStore.getState().getActiveProject();

  // TEMPORARY: Disable tools for Anthropic models to prevent errors from old conversations
  // Tools work correctly in fresh conversations, but old conversations have malformed tool history in IndexedDB
  // Users should start fresh conversations to use tools with Anthropic
  const llm = findLLMOrThrow(assistantLlmId);
  const isAnthropicModel = llm.vId === 'anthropic';
  const tools: AixTools_ToolDefinition[] | undefined = isAnthropicModel ? undefined : getEnabledAIXTools();

  // Ensure Anthropic OAuth token is fresh before making API call
  try {
    await ensureAnthropicOAuthFresh(true); // throwOnFailure = true to show user the error
  } catch (error: any) {
    // If token refresh fails, show error and abort
    const errorMessage = error.message || 'OAuth token refresh failed';
    cHandler.messageEdit(assistantMessageId, {
      fragments: [createTextContentFragment(`❌ ${errorMessage}`)],
      pendingIncomplete: false,
    }, true, false);
    cHandler.clearAbortController('chat-persona');
    return false;
  }

  // stream the assistant's messages directly to the state store
  const messageStatus = await aixChatGenerateContent_DMessage_FromConversation(
    assistantLlmId,
    chatSystemInstruction,
    chatHistory,
    'conversation',
    conversationId,
    { abortSignal: abortController.signal, throttleParallelThreads: parallelViewCount },
    (messageOverwrite: AixChatGenerateContent_DMessage, messageComplete: boolean) => {

      // Note: there was an abort check here, but it removed the last packet, which contained the cause and final text.
      // if (abortController.signal.aborted)
      //   console.warn('runPersonaOnConversationHead: Aborted', { conversationId, assistantLlmId, messageOverwrite });

      // deep copy the object to avoid partial updates
      let deepCopy = structuredClone(messageOverwrite);

      // [Cosmetic Logic] if the content hasn't come yet, don't replace the fragments to still show the placeholder
      if (!messageComplete && deepCopy.pendingIncomplete && deepCopy.fragments?.length === 0)
        delete (deepCopy as any).fragments;

      // update the message
      cHandler.messageEdit(assistantMessageId, deepCopy, messageComplete, false);

      // if requested, speak the message
      autoSpeaker?.handleMessage(messageOverwrite, messageComplete);

      // if (messageComplete)
      //   AudioGenerator.basicAstralChimes({ volume: 0.4 }, 0, 2, 250);
    },
    tools, // Pass file operation tools if active project exists
  );

  // final message update (needed only in case of error)
  const lastDeepCopy = structuredClone(messageStatus.lastDMessage);
  if (messageStatus.outcome === 'errored')
    cHandler.messageEdit(assistantMessageId, lastDeepCopy, true, false);

  // special case: if the last message was aborted and had no content, delete it
  if (messageWasInterruptedAtStart(lastDeepCopy)) {
    cHandler.messagesDelete([assistantMessageId]);
    // NOTE: ok to exit here, as the abort was already done
    return false;
  }

  // notify when complete, if set
  if (cHandler.messageHasUserFlag(assistantMessageId, MESSAGE_FLAG_NOTIFY_COMPLETE)) {
    cHandler.messageSetUserFlag(assistantMessageId, MESSAGE_FLAG_NOTIFY_COMPLETE, false, false);
    AudioGenerator.chatNotifyResponse();
  }

  // Handle tool invocations if present (unified system for all tools)
  if (lastDeepCopy.fragments) {
    // Execute tool invocations and create tool response message
    const toolResponseFragments = await Promise.all(
      lastDeepCopy.fragments.map(async (frag) => {
        // Type guard to check if this is a tool invocation fragment
        const part = frag.part;
        if (part.pt !== 'tool_invocation') return null;
        if (part.invocation.type !== 'function_call') return null;

        const invocation = part.invocation;
        try {
          // Execute using unified tool system
          const result = await executeToolCall(
            invocation.name,
            invocation.args,
            {
              projectHandle: activeProject?.handle || undefined,
              conversationId,
              messageId: assistantMessageId,
              abortSignal: abortController.signal,
            }
          );

          return create_FunctionCallResponse_ContentFragment(
            part.id,
            result.error || false,
            invocation.name,
            result.result || '',
            'client'
          );
        } catch (error: any) {
          return create_FunctionCallResponse_ContentFragment(
            part.id,
            error.message || 'Tool execution failed',
            invocation.name,
            '',
            'client'
          );
        }
      })
    );

    // Filter out null results and append tool response message
    const validResponses = toolResponseFragments.filter(f => f !== null);
    if (validResponses.length > 0) {
      // Create and append tool response message as a user message
      // (tool responses are sent back to the AI as user messages)
      const toolResponseMessage = createDMessageFromFragments('user', validResponses);
      cHandler.messageAppend(toolResponseMessage);

      // Trigger continuation with tool results
      // We'll do this by calling runPersonaOnConversationHead again recursively
      // but we need to prevent infinite loops, so we'll only do this if the AI requested tools
      await runPersonaOnConversationHead(assistantLlmId, conversationId);
      return true; // Return early as the recursive call will handle the rest
    }
  }

  // check if aborted
  const hasBeenAborted = abortController.signal.aborted;

  // clear to send, again
  // FIXME: race condition? (for sure!)
  cHandler.clearAbortController('chat-persona');

  if (autoTitleChat) {
    // fire/forget, this will only set the title if it's not already set
    void autoConversationTitle(conversationId, false);
  }

  if (!hasBeenAborted && (autoSuggestDiagrams || autoSuggestHTMLUI || autoSuggestQuestions))
    void autoChatFollowUps(conversationId, assistantMessageId, autoSuggestDiagrams, autoSuggestHTMLUI, autoSuggestQuestions);

  if (chatKeepLastThinkingOnly)
    cHandler.historyKeepLastThinkingOnly();

  // return true if this succeeded
  return messageStatus.outcome === 'success';
}
