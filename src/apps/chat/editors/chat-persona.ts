import { AixChatGenerateContent_DMessage, aixChatGenerateContent_DMessage_FromConversation } from '~/modules/aix/client/aix.client';
import { autoChatFollowUps } from '~/modules/aifn/auto-chat-follow-ups/autoChatFollowUps';
import { autoConversationTitle } from '~/modules/aifn/autotitle/autoTitle';

import { DConversationId, splitSystemMessageFromHistory } from '~/common/stores/chat/chat.conversation';
import type { DLLMId } from '~/common/stores/llms/llms.types';
import { AudioGenerator } from '~/common/util/audio/AudioGenerator';
import { ConversationsManager } from '~/common/chat-overlay/ConversationsManager';
import { createDMessageFromFragments, DMessage, MESSAGE_FLAG_NOTIFY_COMPLETE, messageWasInterruptedAtStart } from '~/common/stores/chat/chat.message';
import { getUXLabsHighPerformance } from '~/common/stores/store-ux-labs';

import { PersonaChatMessageSpeak } from './persona/PersonaChatMessageSpeak';
import { getChatAutoAI, getIsNotificationEnabledForModel } from '../store-app-chat';
import { getInstantAppChatPanesCount } from '../components/panes/store-panes-manager';

// File operations integration
import { useProjectsStore } from '~/apps/projects/store-projects';
import { FILE_OPERATIONS_TOOLS } from '~/modules/fileops/fileops.tools';
import { executeFileOperation } from '~/modules/fileops/fileops.executor';
import type { AixTools_ToolDefinition } from '~/modules/aix/server/api/aix.wiretypes';
import { create_FunctionCallResponse_ContentFragment, isToolInvocationPart } from '~/common/stores/chat/chat.fragments';


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

  // Check if there's an active project - if so, add file operation tools
  const activeProject = useProjectsStore.getState().getActiveProject();
  const tools: AixTools_ToolDefinition[] | undefined = activeProject?.handle ? FILE_OPERATIONS_TOOLS : undefined;

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

  // Handle file operation tool invocations if present
  if (activeProject?.handle && lastDeepCopy.fragments) {
    const fileOperationTools = ['read_file', 'write_file', 'list_files', 'create_directory'];

    // Execute tool invocations and create tool response message
    const toolResponseFragments = await Promise.all(
      lastDeepCopy.fragments.map(async (frag) => {
        // Type guard to check if this is a tool invocation fragment
        const part = frag.part;
        if (part.pt !== 'tool_invocation') return null;
        if (part.invocation.type !== 'function_call') return null;
        if (!fileOperationTools.includes(part.invocation.name)) return null;

        const invocation = part.invocation;
        try {
          const result = await executeFileOperation(
            invocation.name,
            invocation.args,
            activeProject.handle!
          );

          return create_FunctionCallResponse_ContentFragment(
            part.id,
            result.error || false,
            invocation.name,
            result.result,
            'client'
          );
        } catch (error: any) {
          return create_FunctionCallResponse_ContentFragment(
            part.id,
            error.message || 'File operation failed',
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
