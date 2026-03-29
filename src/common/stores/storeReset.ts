/**
 * Store Reset Utility
 *
 * Provides functions to reset all Zustand stores to their initial state.
 * Used when:
 * - User logs out (clear all user data)
 * - User switches accounts (reset before loading new user's data)
 * - Data corruption recovery
 *
 * CRITICAL: For multi-user deployment, we must reset ALL stores on logout
 * to prevent data leakage between users on the same browser.
 */

import { del } from 'idb-keyval';

import { useChatStore } from './chat/store-chats';
import { createDConversation } from './chat/chat.conversation';
import { useUserFeatures } from './store-user-features';
import { useModelsStore } from './llms/store-llms';
import { useUIPreferencesStore } from './store-ui';
import { useFolderStore } from './folders/store-chat-folders';
import { useMCPServersStore } from './store-mcp-servers';
import { useAppChatStore } from '~/apps/chat/store-app-chat';
import { useToolsStore } from '~/modules/tools/store-tools';
import { useTTSPreferencesStore } from '~/modules/tts/store-tts-preferences';
import { useElevenlabsStore } from '~/modules/elevenlabs/store-module-elevenlabs';
import { useGoogleSearchStore } from '~/modules/google/store-module-google';
import { useTextToImageStore } from '~/modules/t2i/store-module-t2i';
import { useDalleStore } from '~/modules/t2i/dalle/store-module-dalle';
import { useAppPersonasStore } from '~/apps/personas/store-app-personas';
import { usePurposeStore } from '~/apps/chat/components/persona-selector/store-purposes';

// Additional stores for complete user isolation
import { useProjectsStore } from '~/apps/projects/store-projects';
import { useUXLabsStore } from './store-ux-labs';
import { usePaulineStore } from '~/modules/pauline/store-module-pauline';
import { useWebToolsStore } from '~/modules/web-tools/store-web-tools';
import { useAppCallStore } from '~/apps/call/state/store-app-call';
import { useBrowseStore } from '~/modules/browse/store-module-browsing';
import { useNetworkModeStore } from './store-network-mode';
import { useAppChatPanesStore } from '~/apps/chat/components/panes/store-panes-manager';
import { useShareLinkStore } from '~/modules/trade/link/store-share-link';
import { useClientWorkspaceStore } from './workspace/store-client-workspace';
import { useTrainingStoreImpl } from '~/apps/training/store-training';
import { useFlowCoreStore } from '~/apps/flowcore/store-flowcore';
import { useFlowCoreStoreEnhanced } from '~/apps/flowcore/store-flowcore-enhanced';


/**
 * Reset the chat store to initial state with one empty conversation
 */
export function resetChatStore(): void {
  const defaultConversation = createDConversation();
  useChatStore.setState({
    conversations: [defaultConversation],
  });
  console.log('[StoreReset] Chat store reset');
}


/**
 * Reset the LLM store to initial state (no models, no services)
 */
export function resetLlmsStore(): void {
  useModelsStore.setState({
    llms: [],
    sources: [],
    confServiceId: null,
    modelAssignments: {},
  });
  console.log('[StoreReset] LLMs store reset');
}


/**
 * Reset the user features store (permissions, avatar, etc.)
 */
export function resetUserFeaturesStore(): void {
  useUserFeatures.getState().clearFeatures();
  console.log('[StoreReset] User features store reset');
}


/**
 * Reset the UI preferences store to defaults
 */
export function resetUiPreferencesStore(): void {
  useUIPreferencesStore.setState({
    preferredLanguage: 'en-US',
    centerMode: 'full',
    complexityMode: 'pro',
    contentScaling: 'sm',
    disableMarkdown: false,
    doubleClickToEdit: false,
    enterIsNewline: false,
    renderCodeLineNumbers: false,
    renderCodeSoftWrap: false,
    showPersonaFinder: false,
    showModelsHidden: false,
    composerQuickButton: 'prism',
    aixInspector: false,
    dismissals: {},
    actionCounters: {},
    panelGroupCollapseStates: {},
  });
  console.log('[StoreReset] UI preferences store reset');
}


/**
 * Reset the folders store to initial state
 */
export function resetFoldersStore(): void {
  useFolderStore.setState({ folders: [] });
  console.log('[StoreReset] Folders store reset');
}


/**
 * Reset the MCP servers store to initial state
 */
export function resetMCPServersStore(): void {
  useMCPServersStore.setState({ servers: [] });
  console.log('[StoreReset] MCP servers store reset');
}


/**
 * Reset the chat app settings store to defaults
 */
export function resetAppChatStore(): void {
  useAppChatStore.setState({
    autoSpeak: 'off',
    autoSuggestDiagrams: false,
    autoSuggestHTMLUI: false,
    autoSuggestQuestions: false,
    autoTitleChat: true,
    showTextDiff: false,
    showSystemMessages: false,
    micTimeoutMs: 5000,
  });
  console.log('[StoreReset] App chat store reset');
}


/**
 * Reset the tools settings store to defaults
 */
export function resetToolsStore(): void {
  useToolsStore.setState({
    enableFileOps: true,
    enableCodeExec: true,
    enableWeb: true,
    enableOffice: true,
    enableImage: true,
    enableData: true,
    enableDiagram: true,
    enableGit: false,
    enableTesting: true,
    enableUtility: true,
    executionTimeout: 30000,
    maxMemory: 50 * 1024 * 1024,
    rateLimit: 100,
    maxConcurrent: 5,
    allowFileDeletion: false,
    allowGitCommit: false,
    showProgress: true,
    logToolCalls: false,
  });
  console.log('[StoreReset] Tools store reset');
}


/**
 * Reset TTS preferences to defaults
 */
export function resetTTSPreferencesStore(): void {
  useTTSPreferencesStore.setState({
    preferredProvider: 'pauline',
  });
  console.log('[StoreReset] TTS preferences store reset');
}


/**
 * Reset ElevenLabs settings to defaults
 */
export function resetElevenlabsStore(): void {
  useElevenlabsStore.setState({
    elevenLabsApiKey: '',
    elevenLabsVoiceId: '',
  });
  console.log('[StoreReset] ElevenLabs store reset');
}


/**
 * Reset Google Search settings to defaults
 */
export function resetGoogleSearchStore(): void {
  useGoogleSearchStore.setState({
    googleCloudApiKey: '',
    googleCSEId: '',
  });
  console.log('[StoreReset] Google Search store reset');
}


/**
 * Reset T2I settings to defaults
 */
export function resetT2IStore(): void {
  useTextToImageStore.setState({});
  console.log('[StoreReset] T2I store reset');
}


/**
 * Reset DALL-E settings to defaults
 */
export function resetDalleStore(): void {
  useDalleStore.setState({
    dalleModelId: null,
    dalleNoRewrite: false,
    // gpt-image-1 settings
    dalleSizeGI: '1024x1024',
    dalleQualityGI: 'high',
    dalleBackgroundGI: 'auto',
    dalleOutputFormatGI: 'webp',
    dalleOutputCompressionGI: 100,
    dalleModerationGI: 'low',
    // DALL-E 3 settings
    dalleSizeD3: '1024x1024',
    dalleQualityD3: 'hd',
    dalleStyleD3: 'vivid',
    // DALL-E 2 settings
    dalleSizeD2: '1024x1024',
  });
  console.log('[StoreReset] DALL-E store reset');
}


/**
 * Reset personas store to initial state
 */
export function resetPersonasStore(): void {
  useAppPersonasStore.setState({ simplePersonas: [] });
  console.log('[StoreReset] Personas store reset');
}


/**
 * Reset purposes store to defaults
 */
export function resetPurposesStore(): void {
  usePurposeStore.setState({ hiddenPurposeIDs: [] });
  console.log('[StoreReset] Purposes store reset');
}


// ===== Additional Reset Functions for Complete User Isolation =====


/**
 * Reset projects store to initial state
 */
export function resetProjectsStore(): void {
  useProjectsStore.setState({
    projects: [],
    activeProjectId: null,
    mode: 'research',
    lastActiveProjectId: null,
    lastCodingProjectId: null,
    lastResearchProjectId: null,
  });
  console.log('[StoreReset] Projects store reset');
}


/**
 * Reset UX Labs flags to defaults
 */
export function resetUXLabsStore(): void {
  useUXLabsStore.setState({
    labsAttachScreenCapture: false,
    labsCameraDesktop: false,
    labsChatBarAlt: false,
    labsEnhanceCodeBlocks: false,
    labsEnhanceCodeLiveFile: false,
    labsHighPerformance: false,
    labsShowCost: true,
    labsAutoHideComposer: false,
    labsShowShortcutBar: false,
    labsDevMode: false,
    labsDevNoStreaming: false,
  });
  console.log('[StoreReset] UX Labs store reset');
}


/**
 * Reset Pauline TTS settings to defaults
 */
export function resetPaulineStore(): void {
  usePaulineStore.setState({
    paulineEndpoint: 'http://localhost:8080',
    paulineVoiceId: 'Emily.wav',
    paulineSpeed: 1.0,
    paulineTempo: 0.95,
    customVoices: [],
  });
  console.log('[StoreReset] Pauline store reset');
}


/**
 * Reset Web tools settings to defaults
 */
export function resetWebToolsStore(): void {
  useWebToolsStore.setState({
    searchProvider: 'google',
    searxngInstance: '',
    enableScraping: false,
    maxDownloadSizeMB: 10,
  });
  console.log('[StoreReset] Web tools store reset');
}


/**
 * Reset Call app settings to defaults
 */
export function resetCallAppStore(): void {
  useAppCallStore.setState({
    grayUI: false,
    showConversations: false,
    showSupport: true,
  });
  console.log('[StoreReset] Call app store reset');
}


/**
 * Reset Browse module settings to defaults
 */
export function resetBrowseStore(): void {
  useBrowseStore.setState({
    wssEndpoint: '',
    pageTransform: 'text',
    enableComposerAttach: true,
    enableReactTool: true,
    enablePersonaTool: true,
  });
  console.log('[StoreReset] Browse store reset');
}


/**
 * Reset Network mode to default (online)
 */
export function resetNetworkModeStore(): void {
  useNetworkModeStore.setState({ networkMode: 'online' });
  console.log('[StoreReset] Network mode store reset');
}


/**
 * Reset Chat panes to single empty pane
 */
export function resetPanesStore(): void {
  useAppChatPanesStore.setState({
    chatPanes: [],
    chatPaneFocusIndex: null,
  });
  console.log('[StoreReset] Panes store reset');
}


/**
 * Reset Share links store
 */
export function resetShareLinksStore(): void {
  useShareLinkStore.setState({
    chatLinkItems: [],
    linkStorageOwnerId: undefined,
  });
  console.log('[StoreReset] Share links store reset');
}


/**
 * Reset Workspace store
 */
export function resetWorkspaceStore(): void {
  useClientWorkspaceStore.setState({
    liveFilesByWorkspace: {},
  });
  console.log('[StoreReset] Workspace store reset');
}


/**
 * Reset Training store
 */
export function resetTrainingStore(): void {
  useTrainingStoreImpl.setState({
    jobs: [],
    activeJobId: null,
    datasets: [],
    edenServerUrl: 'http://127.0.0.1:3100',
    edenServerConnected: false,
    edenServerName: null,
    edenAvailableTools: [],
    viewMode: 'wizard',
    wizardStep: 'requirements',
    wizardDraft: null,
  });
  console.log('[StoreReset] Training store reset');
}


/**
 * Reset FlowCore store
 */
export function resetFlowCoreStore(): void {
  useFlowCoreStore.setState({
    workflows: [],
    currentWorkflowId: null,
    nodes: [],
    edges: [],
    selectedNodeId: null,
  });
  console.log('[StoreReset] FlowCore store reset');
}


/**
 * Reset FlowCore Enhanced store
 */
export function resetFlowCoreEnhancedStore(): void {
  useFlowCoreStoreEnhanced.setState({
    workflows: [],
    currentWorkflowId: null,
    nodes: [],
    edges: [],
    selectedNodeId: null,
    executionContext: null,
    isExecuting: false,
    serverSyncEnabled: false,
    isSyncing: false,
    lastSyncTime: null,
  });
  console.log('[StoreReset] FlowCore Enhanced store reset');
}


/**
 * Clear IndexedDB entries for all user stores
 * This ensures data doesn't persist between users on the same browser
 */
export async function clearIndexedDBStores(): Promise<void> {
  const keysToDelete = [
    // Core stores
    'app-chats',
    'app-models',
    'app-ui',
    // App settings stores
    'app-folders',
    'app-purpose',
    'app-mcp-servers',
    'app-app-chat',
    'app-app-personas',
    'app-tools-settings',
    'app-tts-preferences',
    // Module stores
    'app-module-elevenlabs',
    'app-module-google-search',
    'app-module-t2i',
    'app-module-dalle',
    'app-module-pauline',
    'app-module-browse',
    // Additional stores for complete user isolation
    'app-ux-labs',
    'app-state',
    'app-projects',
    'app-web-tools',
    'app-app-call',
    'app-network-mode',
    'app-app-chat-panes-2',
    'app-sharing',
    'agi-client-workspace',
    // Workflow stores (IndexedDB)
    'app-training',
    'app-flowcore',
    'app-flowcore-enhanced',
  ];

  console.log('[StoreReset] Clearing IndexedDB stores:', keysToDelete);

  for (const key of keysToDelete) {
    try {
      await del(key);
    } catch (e) {
      console.warn(`[StoreReset] Failed to delete ${key}:`, e);
    }
  }

  console.log('[StoreReset] IndexedDB stores cleared');
}


/**
 * Reset all user-specific stores
 * Call this on logout to clear all user data from memory AND storage
 */
export async function resetAllUserStores(): Promise<void> {
  console.log('[StoreReset] Resetting all user stores...');

  // Reset core stores
  resetChatStore();
  resetLlmsStore();
  resetUserFeaturesStore();
  resetUiPreferencesStore();

  // Reset app settings stores
  resetFoldersStore();
  resetMCPServersStore();
  resetAppChatStore();
  resetToolsStore();
  resetTTSPreferencesStore();
  resetElevenlabsStore();
  resetGoogleSearchStore();
  resetT2IStore();
  resetDalleStore();
  resetPersonasStore();
  resetPurposesStore();

  // Reset additional stores for complete user isolation
  resetProjectsStore();
  resetUXLabsStore();
  resetPaulineStore();
  resetWebToolsStore();
  resetCallAppStore();
  resetBrowseStore();
  resetNetworkModeStore();
  resetPanesStore();
  resetShareLinksStore();
  resetWorkspaceStore();

  // Reset workflow stores
  resetTrainingStore();
  resetFlowCoreStore();
  resetFlowCoreEnhancedStore();

  // Clear IndexedDB to prevent data leakage
  await clearIndexedDBStores();

  console.log('[StoreReset] All user stores reset complete');
}


/**
 * Reset stores and clear IndexedDB for complete user data removal
 * Use this for full logout cleanup
 */
export async function resetAllUserStoresAndStorage(): Promise<void> {
  await resetAllUserStores();
}
