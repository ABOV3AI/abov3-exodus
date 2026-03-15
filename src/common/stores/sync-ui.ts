/**
 * UI Settings Sync Manager
 *
 * Handles synchronization of UI preferences between client and server.
 * This enables:
 * - Cross-device UI settings sync
 * - User-specific preferences
 */

import { apiAsyncNode } from '~/common/util/trpc.client';
import { useUIPreferencesStore } from './store-ui';


// Debounce timer for save operations
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 3000; // Wait 3 seconds after last change


/**
 * Sync UI settings from server to local store
 * Called when user logs in
 */
export async function syncUiSettingsFromServer(): Promise<void> {
  console.log('[UI Sync] Loading UI settings from server...');

  try {
    const settings = await apiAsyncNode.sync.getSettings.query();

    if (!settings || !settings.uiSettings) {
      console.log('[UI Sync] No saved UI settings on server, keeping local settings');
      return;
    }

    const uiSettings = settings.uiSettings as any;

    // Restore UI preferences (only the user-configurable ones)
    const currentState = useUIPreferencesStore.getState();

    useUIPreferencesStore.setState({
      preferredLanguage: uiSettings.preferredLanguage ?? currentState.preferredLanguage,
      centerMode: uiSettings.centerMode ?? currentState.centerMode,
      complexityMode: uiSettings.complexityMode ?? currentState.complexityMode,
      contentScaling: uiSettings.contentScaling ?? currentState.contentScaling,
      disableMarkdown: uiSettings.disableMarkdown ?? currentState.disableMarkdown,
      doubleClickToEdit: uiSettings.doubleClickToEdit ?? currentState.doubleClickToEdit,
      enterIsNewline: uiSettings.enterIsNewline ?? currentState.enterIsNewline,
      renderCodeLineNumbers: uiSettings.renderCodeLineNumbers ?? currentState.renderCodeLineNumbers,
      renderCodeSoftWrap: uiSettings.renderCodeSoftWrap ?? currentState.renderCodeSoftWrap,
      showPersonaFinder: uiSettings.showPersonaFinder ?? currentState.showPersonaFinder,
      showModelsHidden: uiSettings.showModelsHidden ?? currentState.showModelsHidden,
      composerQuickButton: uiSettings.composerQuickButton ?? currentState.composerQuickButton,
    });

    console.log('[UI Sync] UI settings sync complete');
  } catch (error) {
    console.error('[UI Sync] Failed to load UI settings:', error);
    // Don't throw - user can still use default settings
  }
}


/**
 * Save UI settings to server
 */
export async function saveUiSettingsToServer(): Promise<void> {
  const state = useUIPreferencesStore.getState();

  // Only save user-configurable preferences, not transient state
  const uiSettings = {
    preferredLanguage: state.preferredLanguage,
    centerMode: state.centerMode,
    complexityMode: state.complexityMode,
    contentScaling: state.contentScaling,
    disableMarkdown: state.disableMarkdown,
    doubleClickToEdit: state.doubleClickToEdit,
    enterIsNewline: state.enterIsNewline,
    renderCodeLineNumbers: state.renderCodeLineNumbers,
    renderCodeSoftWrap: state.renderCodeSoftWrap,
    showPersonaFinder: state.showPersonaFinder,
    showModelsHidden: state.showModelsHidden,
    composerQuickButton: state.composerQuickButton,
  };

  try {
    await apiAsyncNode.sync.saveSettings.mutate({ uiSettings });
    console.log('[UI Sync] Saved UI settings to server');
  } catch (error) {
    console.error('[UI Sync] Failed to save UI settings:', error);
  }
}


/**
 * Trigger a debounced save of UI settings
 * Call this whenever UI settings change
 */
export function debouncedSaveUiSettings(): void {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }

  saveDebounceTimer = setTimeout(() => {
    void saveUiSettingsToServer();
  }, SAVE_DEBOUNCE_MS);
}


// ===== Store Subscription for Auto-Sync =====

let unsubscribe: (() => void) | null = null;

/**
 * Subscribe to UI store changes and auto-sync to server
 */
export function enableUiAutoSync(): void {
  if (unsubscribe) {
    console.log('[UI Sync] Auto-sync already enabled');
    return;
  }

  console.log('[UI Sync] Enabling auto-sync...');

  // Track previous values to detect actual changes
  let prevState = useUIPreferencesStore.getState();

  // Subscribe to store changes
  unsubscribe = useUIPreferencesStore.subscribe((state) => {
    // Check if any synced settings changed
    const settingsChanged =
      state.preferredLanguage !== prevState.preferredLanguage ||
      state.centerMode !== prevState.centerMode ||
      state.complexityMode !== prevState.complexityMode ||
      state.contentScaling !== prevState.contentScaling ||
      state.disableMarkdown !== prevState.disableMarkdown ||
      state.doubleClickToEdit !== prevState.doubleClickToEdit ||
      state.enterIsNewline !== prevState.enterIsNewline ||
      state.renderCodeLineNumbers !== prevState.renderCodeLineNumbers ||
      state.renderCodeSoftWrap !== prevState.renderCodeSoftWrap ||
      state.showPersonaFinder !== prevState.showPersonaFinder ||
      state.showModelsHidden !== prevState.showModelsHidden ||
      state.composerQuickButton !== prevState.composerQuickButton;

    if (settingsChanged) {
      console.log('[UI Sync] Settings changed, scheduling save...');
      debouncedSaveUiSettings();
    }

    prevState = state;
  });

  console.log('[UI Sync] Auto-sync enabled');
}


/**
 * Disable UI auto-sync
 */
export function disableUiAutoSync(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }
  console.log('[UI Sync] Auto-sync disabled');
}
