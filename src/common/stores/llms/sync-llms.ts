/**
 * LLM Settings Sync Manager
 *
 * Handles synchronization of LLM configurations between client and server.
 * This enables:
 * - Cross-device LLM settings sync
 * - User-specific model configurations
 * - API key persistence per user account
 */

import { apiAsyncNode } from '~/common/util/trpc.client';
import { useModelsStore } from './store-llms';


// Debounce timer for save operations
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 3000; // Wait 3 seconds after last change


/**
 * Sync LLM settings from server to local store
 * Called when user logs in
 */
export async function syncLlmSettingsFromServer(): Promise<void> {
  console.log('[LLM Sync] Loading LLM settings from server...');

  try {
    const settings = await apiAsyncNode.sync.getSettings.query();

    if (!settings || !settings.llmSettings) {
      console.log('[LLM Sync] No saved LLM settings on server, starting fresh');
      return;
    }

    const llmSettings = settings.llmSettings as any;

    // Restore sources (API keys, service configurations)
    if (llmSettings.sources && Array.isArray(llmSettings.sources)) {
      useModelsStore.setState({ sources: llmSettings.sources });
      console.log('[LLM Sync] Restored', llmSettings.sources.length, 'model sources');
    }

    // Restore model assignments
    if (llmSettings.modelAssignments) {
      useModelsStore.setState({ modelAssignments: llmSettings.modelAssignments });
      console.log('[LLM Sync] Restored model assignments');
    }

    // Note: We don't restore llms array - those are fetched from vendors
    // based on the sources (API keys) we just restored

    console.log('[LLM Sync] LLM settings sync complete');
  } catch (error) {
    console.error('[LLM Sync] Failed to load LLM settings:', error);
    // Don't throw - user can still configure models manually
  }
}


/**
 * Save LLM settings to server
 */
export async function saveLlmSettingsToServer(): Promise<void> {
  const state = useModelsStore.getState();

  // Only save user-specific data, not the full llms array
  const llmSettings = {
    sources: state.sources,
    modelAssignments: state.modelAssignments,
  };

  try {
    await apiAsyncNode.sync.saveSettings.mutate({ llmSettings });
    console.log('[LLM Sync] Saved LLM settings to server');
  } catch (error) {
    console.error('[LLM Sync] Failed to save LLM settings:', error);
  }
}


/**
 * Trigger a debounced save of LLM settings
 * Call this whenever LLM settings change
 */
export function debouncedSaveLlmSettings(): void {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }

  saveDebounceTimer = setTimeout(() => {
    void saveLlmSettingsToServer();
  }, SAVE_DEBOUNCE_MS);
}


// ===== Store Subscription for Auto-Sync =====

let unsubscribe: (() => void) | null = null;

/**
 * Subscribe to LLM store changes and auto-sync to server
 */
export function enableLlmAutoSync(): void {
  if (unsubscribe) {
    console.log('[LLM Sync] Auto-sync already enabled');
    return;
  }

  console.log('[LLM Sync] Enabling auto-sync...');

  // Subscribe to store changes
  unsubscribe = useModelsStore.subscribe((state, prevState) => {
    // Check if sources or assignments changed
    const sourcesChanged = state.sources !== prevState.sources;
    const assignmentsChanged = state.modelAssignments !== prevState.modelAssignments;

    if (sourcesChanged || assignmentsChanged) {
      console.log('[LLM Sync] Settings changed, scheduling save...');
      debouncedSaveLlmSettings();
    }
  });

  console.log('[LLM Sync] Auto-sync enabled');
}


/**
 * Disable LLM auto-sync
 */
export function disableLlmAutoSync(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }
  console.log('[LLM Sync] Auto-sync disabled');
}
