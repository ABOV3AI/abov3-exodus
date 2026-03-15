/**
 * Chat Sync Manager
 *
 * Handles synchronization of conversations between client (IndexedDB) and server (PostgreSQL).
 * This enables:
 * - Cross-device sync (conversations available on any device)
 * - User data isolation (each user has their own conversations)
 * - Cloud backup of conversations
 *
 * Strategy:
 * - On login: Fetch all conversations from server and merge with local
 * - On conversation change: Debounce and save to server
 * - On logout: Reset local store
 */

import { apiAsyncNode } from '~/common/util/trpc.client';
import { useChatStore } from './store-chats';
import type { DConversation } from './chat.conversation';


// Debounce timer for save operations
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 2000; // Wait 2 seconds after last change before saving

// Track sync state
let isSyncing = false;
let lastSyncTime = 0;


/**
 * Sync all conversations from server to local store
 * Called when user logs in
 */
export async function syncConversationsFromServer(): Promise<void> {
  if (isSyncing) {
    console.log('[Sync] Already syncing, skipping...');
    return;
  }

  isSyncing = true;
  console.log('[Sync] Starting sync from server...');

  try {
    // Fetch all conversations from server
    const serverConversations = await apiAsyncNode.sync.getAllConversations.query();
    console.log(`[Sync] Fetched ${serverConversations.length} conversations from server`);

    if (serverConversations.length === 0) {
      console.log('[Sync] No server conversations, keeping local state');
      return;
    }

    // Convert server format to client format
    const conversations: DConversation[] = serverConversations.map(sc => ({
      id: sc.id,
      messages: sc.messages || [],
      userTitle: sc.userTitle || undefined,
      autoTitle: sc.autoTitle || undefined,
      isArchived: sc.isArchived || undefined,
      userSymbol: sc.userSymbol || undefined,
      systemPurposeId: (sc.systemPurposeId as any) || 'Generic',
      created: sc.created,
      updated: sc.updated,
      tokenCount: sc.tokenCount || 0,
      _abortController: null,
    }));

    // Replace local conversations with server conversations
    // This is a simple "server wins" strategy
    useChatStore.setState({ conversations });

    lastSyncTime = Date.now();
    console.log('[Sync] Sync complete, loaded', conversations.length, 'conversations');
  } catch (error) {
    console.error('[Sync] Failed to sync from server:', error);
    throw error;
  } finally {
    isSyncing = false;
  }
}


/**
 * Save a single conversation to the server
 */
export async function saveConversationToServer(conversation: DConversation): Promise<void> {
  // Don't save incognito conversations
  if (conversation._isIncognito) {
    return;
  }

  try {
    await apiAsyncNode.sync.saveConversation.mutate({
      id: conversation.id,
      messages: conversation.messages,
      userTitle: conversation.userTitle || null,
      autoTitle: conversation.autoTitle || null,
      isArchived: conversation.isArchived || false,
      userSymbol: conversation.userSymbol || null,
      systemPurposeId: conversation.systemPurposeId || null,
      created: conversation.created,
      updated: conversation.updated,
      tokenCount: conversation.tokenCount,
    });
    console.log('[Sync] Saved conversation:', conversation.id);
  } catch (error) {
    console.error('[Sync] Failed to save conversation:', conversation.id, error);
    throw error;
  }
}


/**
 * Save all conversations to server (batch)
 */
export async function saveAllConversationsToServer(): Promise<void> {
  const { conversations } = useChatStore.getState();

  // Filter out incognito conversations
  const toSave = conversations.filter(c => !c._isIncognito);

  if (toSave.length === 0) {
    console.log('[Sync] No conversations to save');
    return;
  }

  try {
    const result = await apiAsyncNode.sync.saveConversations.mutate(
      toSave.map(c => ({
        id: c.id,
        messages: c.messages,
        userTitle: c.userTitle || null,
        autoTitle: c.autoTitle || null,
        isArchived: c.isArchived || false,
        userSymbol: c.userSymbol || null,
        systemPurposeId: c.systemPurposeId || null,
        created: c.created,
        updated: c.updated,
        tokenCount: c.tokenCount,
      }))
    );
    console.log(`[Sync] Saved ${result.successful}/${result.total} conversations`);
    if (result.failed.length > 0) {
      console.warn('[Sync] Some conversations failed to save:', result.failed);
    }
  } catch (error) {
    console.error('[Sync] Failed to batch save conversations:', error);
    throw error;
  }
}


/**
 * Delete a conversation from the server
 */
export async function deleteConversationFromServer(conversationId: string): Promise<void> {
  try {
    await apiAsyncNode.sync.deleteConversation.mutate({ id: conversationId });
    console.log('[Sync] Deleted conversation from server:', conversationId);
  } catch (error) {
    console.error('[Sync] Failed to delete conversation from server:', conversationId, error);
    // Don't throw - local delete should still succeed
  }
}


/**
 * Delete multiple conversations from the server
 */
export async function deleteConversationsFromServer(conversationIds: string[]): Promise<void> {
  try {
    await apiAsyncNode.sync.deleteConversations.mutate({ ids: conversationIds });
    console.log('[Sync] Deleted conversations from server:', conversationIds.length);
  } catch (error) {
    console.error('[Sync] Failed to delete conversations from server:', error);
  }
}


/**
 * Trigger a debounced save of a conversation
 * Call this whenever a conversation is modified
 */
export function debouncedSaveConversation(conversation: DConversation): void {
  if (conversation._isIncognito) {
    return;
  }

  // Clear existing timer
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }

  // Set new timer
  saveDebounceTimer = setTimeout(async () => {
    try {
      await saveConversationToServer(conversation);
    } catch (error) {
      // Error already logged in saveConversationToServer
    }
  }, SAVE_DEBOUNCE_MS);
}


/**
 * Check if sync is currently in progress
 */
export function isSyncInProgress(): boolean {
  return isSyncing;
}


/**
 * Get the last sync timestamp
 */
export function getLastSyncTime(): number {
  return lastSyncTime;
}


// ===== Store Subscription for Auto-Sync =====

let unsubscribe: (() => void) | null = null;

/**
 * Subscribe to chat store changes and auto-sync to server
 * Call this once when the user is authenticated
 */
export function enableAutoSync(): void {
  if (unsubscribe) {
    console.log('[Sync] Auto-sync already enabled');
    return;
  }

  console.log('[Sync] Enabling auto-sync...');

  // Subscribe to store changes
  unsubscribe = useChatStore.subscribe((state, prevState) => {
    // Skip if we're currently syncing (to avoid infinite loops)
    if (isSyncing) return;

    const currentIds = state.conversations.map(c => c.id);
    const prevIds = prevState.conversations.map(c => c.id);

    // Check for deleted conversations
    const deletedIds = prevIds.filter(id => !currentIds.includes(id));
    if (deletedIds.length > 0) {
      console.log('[Sync] Conversations deleted:', deletedIds);
      deleteConversationsFromServer(deletedIds);
    }

    // Check for modified conversations (compare by updated timestamp)
    state.conversations.forEach(conv => {
      const prevConv = prevState.conversations.find(c => c.id === conv.id);
      if (!prevConv) {
        // New conversation
        if (!conv._isIncognito) {
          console.log('[Sync] New conversation:', conv.id);
          debouncedSaveConversation(conv);
        }
      } else if (conv.updated !== prevConv.updated) {
        // Modified conversation
        if (!conv._isIncognito) {
          debouncedSaveConversation(conv);
        }
      }
    });
  });

  console.log('[Sync] Auto-sync enabled');
}


/**
 * Disable auto-sync
 * Call this when the user logs out
 */
export function disableAutoSync(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }
  console.log('[Sync] Auto-sync disabled');
}
