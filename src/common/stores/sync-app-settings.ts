/**
 * App Settings Sync Manager
 *
 * Handles synchronization of all app-specific settings between client and server.
 * This includes:
 * - Chat folders
 * - MCP server configurations
 * - Personas/purposes
 * - Chat app settings
 * - Tools settings
 * - TTS preferences
 * - Module settings (ElevenLabs, Google, T2I, DALL-E, etc.)
 */

import { apiAsyncNode } from '~/common/util/trpc.client';

// Import all the stores we need to sync
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


// Debounce timer for save operations
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 3000; // Wait 3 seconds after last change


/**
 * Collect all app settings from various stores
 */
function collectAppSettings(): Record<string, any> {
  const toolsState = useToolsStore.getState();
  const dalleState = useDalleStore.getState();

  return {
    // Chat folders
    folders: useFolderStore.getState().folders,

    // MCP servers (only persist config, not runtime state)
    mcpServers: useMCPServersStore.getState().servers.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      url: s.url,
      command: s.command,
      args: s.args,
      authToken: s.authToken,
      enabled: s.enabled,
      addedAt: s.addedAt,
    })),

    // Chat app settings
    chatApp: (() => {
      const state = useAppChatStore.getState();
      return {
        autoSpeak: state.autoSpeak,
        autoSuggestDiagrams: state.autoSuggestDiagrams,
        autoSuggestHTMLUI: state.autoSuggestHTMLUI,
        autoSuggestQuestions: state.autoSuggestQuestions,
        autoTitleChat: state.autoTitleChat,
        showTextDiff: state.showTextDiff,
        showSystemMessages: state.showSystemMessages,
        micTimeoutMs: state.micTimeoutMs,
      };
    })(),

    // Tools settings (per-category enables and limits)
    tools: {
      enableFileOps: toolsState.enableFileOps,
      enableCodeExec: toolsState.enableCodeExec,
      enableWeb: toolsState.enableWeb,
      enableOffice: toolsState.enableOffice,
      enableImage: toolsState.enableImage,
      enableData: toolsState.enableData,
      enableDiagram: toolsState.enableDiagram,
      enableGit: toolsState.enableGit,
      enableTesting: toolsState.enableTesting,
      enableUtility: toolsState.enableUtility,
      executionTimeout: toolsState.executionTimeout,
      maxMemory: toolsState.maxMemory,
      rateLimit: toolsState.rateLimit,
      maxConcurrent: toolsState.maxConcurrent,
      allowFileDeletion: toolsState.allowFileDeletion,
      allowGitCommit: toolsState.allowGitCommit,
      showProgress: toolsState.showProgress,
      logToolCalls: toolsState.logToolCalls,
    },

    // TTS preferences
    tts: {
      preferredProvider: useTTSPreferencesStore.getState().preferredProvider,
    },

    // ElevenLabs settings
    elevenLabs: {
      apiKey: useElevenlabsStore.getState().elevenLabsApiKey,
      voiceId: useElevenlabsStore.getState().elevenLabsVoiceId,
    },

    // Google search settings
    googleSearch: {
      apiKey: useGoogleSearchStore.getState().googleCloudApiKey,
      searchEngineId: useGoogleSearchStore.getState().googleCSEId,
    },

    // T2I settings
    t2i: useTextToImageStore.getState(),

    // DALL-E settings (all model-specific settings)
    dalle: {
      dalleModelId: dalleState.dalleModelId,
      dalleNoRewrite: dalleState.dalleNoRewrite,
      // gpt-image-1 settings
      dalleSizeGI: dalleState.dalleSizeGI,
      dalleQualityGI: dalleState.dalleQualityGI,
      dalleBackgroundGI: dalleState.dalleBackgroundGI,
      dalleOutputFormatGI: dalleState.dalleOutputFormatGI,
      dalleOutputCompressionGI: dalleState.dalleOutputCompressionGI,
      dalleModerationGI: dalleState.dalleModerationGI,
      // DALL-E 3 settings
      dalleSizeD3: dalleState.dalleSizeD3,
      dalleQualityD3: dalleState.dalleQualityD3,
      dalleStyleD3: dalleState.dalleStyleD3,
      // DALL-E 2 settings
      dalleSizeD2: dalleState.dalleSizeD2,
    },

    // Simple personas (created by user)
    simplePersonas: useAppPersonasStore.getState().simplePersonas,

    // Custom purposes/system prompts visibility
    purposes: {
      hiddenPurposeIDs: usePurposeStore.getState().hiddenPurposeIDs,
    },

    // === Additional stores for complete user isolation ===

    // Projects settings (without file handles which can't be serialized)
    projects: (() => {
      const state = useProjectsStore.getState();
      return {
        projects: state.projects.map(p => ({
          id: p.id,
          name: p.name,
          path: p.path,
          fullPath: p.fullPath,
          addedAt: p.addedAt,
          // Note: file handle can't be serialized - device-specific
        })),
        activeProjectId: state.activeProjectId,
        mode: state.mode,
        lastActiveProjectId: state.lastActiveProjectId,
        lastCodingProjectId: state.lastCodingProjectId,
        lastResearchProjectId: state.lastResearchProjectId,
      };
    })(),

    // UX Labs feature flags
    uxLabs: (() => {
      const state = useUXLabsStore.getState();
      return {
        labsAttachScreenCapture: state.labsAttachScreenCapture,
        labsCameraDesktop: state.labsCameraDesktop,
        labsChatBarAlt: state.labsChatBarAlt,
        labsEnhanceCodeBlocks: state.labsEnhanceCodeBlocks,
        labsEnhanceCodeLiveFile: state.labsEnhanceCodeLiveFile,
        labsHighPerformance: state.labsHighPerformance,
        labsShowCost: state.labsShowCost,
        labsAutoHideComposer: state.labsAutoHideComposer,
        labsShowShortcutBar: state.labsShowShortcutBar,
        labsDevMode: state.labsDevMode,
        labsDevNoStreaming: state.labsDevNoStreaming,
      };
    })(),

    // Pauline TTS settings
    pauline: (() => {
      const state = usePaulineStore.getState();
      return {
        paulineEndpoint: state.paulineEndpoint,
        paulineVoiceId: state.paulineVoiceId,
        paulineSpeed: state.paulineSpeed,
        paulineTempo: state.paulineTempo,
        customVoices: state.customVoices,
      };
    })(),

    // Web tools settings
    webTools: (() => {
      const state = useWebToolsStore.getState();
      return {
        searchProvider: state.searchProvider,
        searxngInstance: state.searxngInstance,
        enableScraping: state.enableScraping,
        maxDownloadSizeMB: state.maxDownloadSizeMB,
      };
    })(),

    // Call app settings
    callApp: (() => {
      const state = useAppCallStore.getState();
      return {
        grayUI: state.grayUI,
        showConversations: state.showConversations,
        showSupport: state.showSupport,
      };
    })(),

    // Browse module settings
    browse: (() => {
      const state = useBrowseStore.getState();
      return {
        wssEndpoint: state.wssEndpoint,
        pageTransform: state.pageTransform,
        enableComposerAttach: state.enableComposerAttach,
        enableReactTool: state.enableReactTool,
        enablePersonaTool: state.enablePersonaTool,
      };
    })(),

    // Network mode
    networkMode: useNetworkModeStore.getState().networkMode,

    // Chat panes layout
    chatPanes: (() => {
      const state = useAppChatPanesStore.getState();
      return {
        chatPanes: state.chatPanes,
        chatPaneFocusIndex: state.chatPaneFocusIndex,
      };
    })(),

    // Shared chat links
    shareLinks: (() => {
      const state = useShareLinkStore.getState();
      return {
        chatLinkItems: state.chatLinkItems,
        linkStorageOwnerId: state.linkStorageOwnerId,
      };
    })(),

    // Workspace mappings (without file handles)
    workspace: (() => {
      const state = useClientWorkspaceStore.getState();
      // liveFilesByWorkspace contains file handles which can't be serialized
      // We store the workspace mapping metadata only
      const workspaceKeys = Object.keys(state.liveFilesByWorkspace || {});
      return {
        workspaceIds: workspaceKeys,
        // Note: actual file handles are device-specific and recreated on mount
      };
    })(),
  };
}


/**
 * Apply app settings from server to local stores
 */
function applyAppSettings(appSettings: Record<string, any>): void {
  if (!appSettings) return;

  // Restore folders
  if (appSettings.folders && Array.isArray(appSettings.folders)) {
    useFolderStore.setState({ folders: appSettings.folders });
    console.log('[App Settings Sync] Restored', appSettings.folders.length, 'folders');
  }

  // Restore MCP servers
  if (appSettings.mcpServers && Array.isArray(appSettings.mcpServers)) {
    useMCPServersStore.setState({ servers: appSettings.mcpServers });
    console.log('[App Settings Sync] Restored', appSettings.mcpServers.length, 'MCP servers');
  }

  // Restore chat app settings
  if (appSettings.chatApp) {
    const chat = appSettings.chatApp;
    useAppChatStore.setState({
      ...(chat.autoSpeak !== undefined && { autoSpeak: chat.autoSpeak }),
      ...(chat.autoSuggestDiagrams !== undefined && { autoSuggestDiagrams: chat.autoSuggestDiagrams }),
      ...(chat.autoSuggestHTMLUI !== undefined && { autoSuggestHTMLUI: chat.autoSuggestHTMLUI }),
      ...(chat.autoSuggestQuestions !== undefined && { autoSuggestQuestions: chat.autoSuggestQuestions }),
      ...(chat.autoTitleChat !== undefined && { autoTitleChat: chat.autoTitleChat }),
      ...(chat.showTextDiff !== undefined && { showTextDiff: chat.showTextDiff }),
      ...(chat.showSystemMessages !== undefined && { showSystemMessages: chat.showSystemMessages }),
      ...(chat.micTimeoutMs !== undefined && { micTimeoutMs: chat.micTimeoutMs }),
    });
    console.log('[App Settings Sync] Restored chat app settings');
  }

  // Restore tools settings
  if (appSettings.tools) {
    const tools = appSettings.tools;
    useToolsStore.setState({
      ...(tools.enableFileOps !== undefined && { enableFileOps: tools.enableFileOps }),
      ...(tools.enableCodeExec !== undefined && { enableCodeExec: tools.enableCodeExec }),
      ...(tools.enableWeb !== undefined && { enableWeb: tools.enableWeb }),
      ...(tools.enableOffice !== undefined && { enableOffice: tools.enableOffice }),
      ...(tools.enableImage !== undefined && { enableImage: tools.enableImage }),
      ...(tools.enableData !== undefined && { enableData: tools.enableData }),
      ...(tools.enableDiagram !== undefined && { enableDiagram: tools.enableDiagram }),
      ...(tools.enableGit !== undefined && { enableGit: tools.enableGit }),
      ...(tools.enableTesting !== undefined && { enableTesting: tools.enableTesting }),
      ...(tools.enableUtility !== undefined && { enableUtility: tools.enableUtility }),
      ...(tools.executionTimeout !== undefined && { executionTimeout: tools.executionTimeout }),
      ...(tools.maxMemory !== undefined && { maxMemory: tools.maxMemory }),
      ...(tools.rateLimit !== undefined && { rateLimit: tools.rateLimit }),
      ...(tools.maxConcurrent !== undefined && { maxConcurrent: tools.maxConcurrent }),
      ...(tools.allowFileDeletion !== undefined && { allowFileDeletion: tools.allowFileDeletion }),
      ...(tools.allowGitCommit !== undefined && { allowGitCommit: tools.allowGitCommit }),
      ...(tools.showProgress !== undefined && { showProgress: tools.showProgress }),
      ...(tools.logToolCalls !== undefined && { logToolCalls: tools.logToolCalls }),
    });
    console.log('[App Settings Sync] Restored tools settings');
  }

  // Restore TTS preferences
  if (appSettings.tts) {
    useTTSPreferencesStore.setState({
      ...(appSettings.tts.preferredProvider !== undefined && { preferredProvider: appSettings.tts.preferredProvider }),
    });
    console.log('[App Settings Sync] Restored TTS preferences');
  }

  // Restore ElevenLabs settings
  if (appSettings.elevenLabs) {
    useElevenlabsStore.setState({
      ...(appSettings.elevenLabs.apiKey !== undefined && { elevenLabsApiKey: appSettings.elevenLabs.apiKey }),
      ...(appSettings.elevenLabs.voiceId !== undefined && { elevenLabsVoiceId: appSettings.elevenLabs.voiceId }),
    });
    console.log('[App Settings Sync] Restored ElevenLabs settings');
  }

  // Restore Google search settings
  if (appSettings.googleSearch) {
    useGoogleSearchStore.setState({
      ...(appSettings.googleSearch.apiKey !== undefined && { googleCloudApiKey: appSettings.googleSearch.apiKey }),
      ...(appSettings.googleSearch.searchEngineId !== undefined && { googleCSEId: appSettings.googleSearch.searchEngineId }),
    });
    console.log('[App Settings Sync] Restored Google search settings');
  }

  // Restore T2I settings
  if (appSettings.t2i) {
    useTextToImageStore.setState(appSettings.t2i);
    console.log('[App Settings Sync] Restored T2I settings');
  }

  // Restore DALL-E settings
  if (appSettings.dalle) {
    const dalle = appSettings.dalle;
    useDalleStore.setState({
      ...(dalle.dalleModelId !== undefined && { dalleModelId: dalle.dalleModelId }),
      ...(dalle.dalleNoRewrite !== undefined && { dalleNoRewrite: dalle.dalleNoRewrite }),
      // gpt-image-1 settings
      ...(dalle.dalleSizeGI !== undefined && { dalleSizeGI: dalle.dalleSizeGI }),
      ...(dalle.dalleQualityGI !== undefined && { dalleQualityGI: dalle.dalleQualityGI }),
      ...(dalle.dalleBackgroundGI !== undefined && { dalleBackgroundGI: dalle.dalleBackgroundGI }),
      ...(dalle.dalleOutputFormatGI !== undefined && { dalleOutputFormatGI: dalle.dalleOutputFormatGI }),
      ...(dalle.dalleOutputCompressionGI !== undefined && { dalleOutputCompressionGI: dalle.dalleOutputCompressionGI }),
      ...(dalle.dalleModerationGI !== undefined && { dalleModerationGI: dalle.dalleModerationGI }),
      // DALL-E 3 settings
      ...(dalle.dalleSizeD3 !== undefined && { dalleSizeD3: dalle.dalleSizeD3 }),
      ...(dalle.dalleQualityD3 !== undefined && { dalleQualityD3: dalle.dalleQualityD3 }),
      ...(dalle.dalleStyleD3 !== undefined && { dalleStyleD3: dalle.dalleStyleD3 }),
      // DALL-E 2 settings
      ...(dalle.dalleSizeD2 !== undefined && { dalleSizeD2: dalle.dalleSizeD2 }),
    });
    console.log('[App Settings Sync] Restored DALL-E settings');
  }

  // Restore simple personas
  if (appSettings.simplePersonas && Array.isArray(appSettings.simplePersonas)) {
    useAppPersonasStore.setState({ simplePersonas: appSettings.simplePersonas });
    console.log('[App Settings Sync] Restored', appSettings.simplePersonas.length, 'simple personas');
  }

  // Restore purposes settings
  if (appSettings.purposes) {
    usePurposeStore.setState({
      ...(appSettings.purposes.hiddenPurposeIDs !== undefined && { hiddenPurposeIDs: appSettings.purposes.hiddenPurposeIDs }),
    });
    console.log('[App Settings Sync] Restored purposes settings');
  }

  // === Restore additional stores for complete user isolation ===

  // Restore projects settings
  if (appSettings.projects) {
    const proj = appSettings.projects;
    useProjectsStore.setState({
      ...(proj.projects !== undefined && { projects: proj.projects }),
      ...(proj.activeProjectId !== undefined && { activeProjectId: proj.activeProjectId }),
      ...(proj.mode !== undefined && { mode: proj.mode }),
      ...(proj.lastActiveProjectId !== undefined && { lastActiveProjectId: proj.lastActiveProjectId }),
      ...(proj.lastCodingProjectId !== undefined && { lastCodingProjectId: proj.lastCodingProjectId }),
      ...(proj.lastResearchProjectId !== undefined && { lastResearchProjectId: proj.lastResearchProjectId }),
    });
    console.log('[App Settings Sync] Restored projects settings');
  }

  // Restore UX Labs flags
  if (appSettings.uxLabs) {
    const labs = appSettings.uxLabs;
    useUXLabsStore.setState({
      ...(labs.labsAttachScreenCapture !== undefined && { labsAttachScreenCapture: labs.labsAttachScreenCapture }),
      ...(labs.labsCameraDesktop !== undefined && { labsCameraDesktop: labs.labsCameraDesktop }),
      ...(labs.labsChatBarAlt !== undefined && { labsChatBarAlt: labs.labsChatBarAlt }),
      ...(labs.labsEnhanceCodeBlocks !== undefined && { labsEnhanceCodeBlocks: labs.labsEnhanceCodeBlocks }),
      ...(labs.labsEnhanceCodeLiveFile !== undefined && { labsEnhanceCodeLiveFile: labs.labsEnhanceCodeLiveFile }),
      ...(labs.labsHighPerformance !== undefined && { labsHighPerformance: labs.labsHighPerformance }),
      ...(labs.labsShowCost !== undefined && { labsShowCost: labs.labsShowCost }),
      ...(labs.labsAutoHideComposer !== undefined && { labsAutoHideComposer: labs.labsAutoHideComposer }),
      ...(labs.labsShowShortcutBar !== undefined && { labsShowShortcutBar: labs.labsShowShortcutBar }),
      ...(labs.labsDevMode !== undefined && { labsDevMode: labs.labsDevMode }),
      ...(labs.labsDevNoStreaming !== undefined && { labsDevNoStreaming: labs.labsDevNoStreaming }),
    });
    console.log('[App Settings Sync] Restored UX Labs flags');
  }

  // Restore Pauline TTS settings
  if (appSettings.pauline) {
    const paul = appSettings.pauline;
    usePaulineStore.setState({
      ...(paul.paulineEndpoint !== undefined && { paulineEndpoint: paul.paulineEndpoint }),
      ...(paul.paulineVoiceId !== undefined && { paulineVoiceId: paul.paulineVoiceId }),
      ...(paul.paulineSpeed !== undefined && { paulineSpeed: paul.paulineSpeed }),
      ...(paul.paulineTempo !== undefined && { paulineTempo: paul.paulineTempo }),
      ...(paul.customVoices !== undefined && { customVoices: paul.customVoices }),
    });
    console.log('[App Settings Sync] Restored Pauline TTS settings');
  }

  // Restore Web tools settings
  if (appSettings.webTools) {
    const web = appSettings.webTools;
    useWebToolsStore.setState({
      ...(web.searchProvider !== undefined && { searchProvider: web.searchProvider }),
      ...(web.searxngInstance !== undefined && { searxngInstance: web.searxngInstance }),
      ...(web.enableScraping !== undefined && { enableScraping: web.enableScraping }),
      ...(web.maxDownloadSizeMB !== undefined && { maxDownloadSizeMB: web.maxDownloadSizeMB }),
    });
    console.log('[App Settings Sync] Restored Web tools settings');
  }

  // Restore Call app settings
  if (appSettings.callApp) {
    const call = appSettings.callApp;
    useAppCallStore.setState({
      ...(call.grayUI !== undefined && { grayUI: call.grayUI }),
      ...(call.showConversations !== undefined && { showConversations: call.showConversations }),
      ...(call.showSupport !== undefined && { showSupport: call.showSupport }),
    });
    console.log('[App Settings Sync] Restored Call app settings');
  }

  // Restore Browse module settings
  if (appSettings.browse) {
    const browse = appSettings.browse;
    useBrowseStore.setState({
      ...(browse.wssEndpoint !== undefined && { wssEndpoint: browse.wssEndpoint }),
      ...(browse.pageTransform !== undefined && { pageTransform: browse.pageTransform }),
      ...(browse.enableComposerAttach !== undefined && { enableComposerAttach: browse.enableComposerAttach }),
      ...(browse.enableReactTool !== undefined && { enableReactTool: browse.enableReactTool }),
      ...(browse.enablePersonaTool !== undefined && { enablePersonaTool: browse.enablePersonaTool }),
    });
    console.log('[App Settings Sync] Restored Browse module settings');
  }

  // Restore Network mode
  if (appSettings.networkMode !== undefined) {
    useNetworkModeStore.setState({ networkMode: appSettings.networkMode });
    console.log('[App Settings Sync] Restored Network mode');
  }

  // Restore Chat panes layout
  if (appSettings.chatPanes) {
    const panes = appSettings.chatPanes;
    useAppChatPanesStore.setState({
      ...(panes.chatPanes !== undefined && { chatPanes: panes.chatPanes }),
      ...(panes.chatPaneFocusIndex !== undefined && { chatPaneFocusIndex: panes.chatPaneFocusIndex }),
    });
    console.log('[App Settings Sync] Restored Chat panes layout');
  }

  // Restore Shared chat links
  if (appSettings.shareLinks) {
    const links = appSettings.shareLinks;
    useShareLinkStore.setState({
      ...(links.chatLinkItems !== undefined && { chatLinkItems: links.chatLinkItems }),
      ...(links.linkStorageOwnerId !== undefined && { linkStorageOwnerId: links.linkStorageOwnerId }),
    });
    console.log('[App Settings Sync] Restored Shared chat links');
  }

  // Note: Workspace file handles are device-specific and can't be synced
  // The workspace store will be populated when user opens files on this device
  if (appSettings.workspace) {
    console.log('[App Settings Sync] Workspace metadata noted (file handles are device-specific)');
  }
}


/**
 * Sync app settings from server to local stores
 * Called when user logs in
 */
export async function syncAppSettingsFromServer(): Promise<void> {
  console.log('[App Settings Sync] Loading app settings from server...');

  try {
    const settings = await apiAsyncNode.sync.getSettings.query();

    if (!settings || !settings.appSettings) {
      console.log('[App Settings Sync] No saved app settings on server, keeping local settings');
      return;
    }

    applyAppSettings(settings.appSettings as Record<string, any>);
    console.log('[App Settings Sync] App settings sync complete');
  } catch (error) {
    console.error('[App Settings Sync] Failed to load app settings:', error);
    // Don't throw - user can still use local settings
  }
}


/**
 * Save app settings to server
 */
export async function saveAppSettingsToServer(): Promise<void> {
  const appSettings = collectAppSettings();

  try {
    await apiAsyncNode.sync.saveSettings.mutate({ appSettings });
    console.log('[App Settings Sync] Saved app settings to server');
  } catch (error) {
    console.error('[App Settings Sync] Failed to save app settings:', error);
  }
}


/**
 * Trigger a debounced save of app settings
 */
export function debouncedSaveAppSettings(): void {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }

  saveDebounceTimer = setTimeout(() => {
    void saveAppSettingsToServer();
  }, SAVE_DEBOUNCE_MS);
}


// ===== Store Subscriptions for Auto-Sync =====

const unsubscribers: (() => void)[] = [];

/**
 * Subscribe to all app settings stores and auto-sync to server
 */
export function enableAppSettingsAutoSync(): void {
  if (unsubscribers.length > 0) {
    console.log('[App Settings Sync] Auto-sync already enabled');
    return;
  }

  console.log('[App Settings Sync] Enabling auto-sync...');

  // Subscribe to folder changes
  unsubscribers.push(
    useFolderStore.subscribe((state, prevState) => {
      if (state.folders !== prevState.folders) {
        console.log('[App Settings Sync] Folders changed, scheduling save...');
        debouncedSaveAppSettings();
      }
    })
  );

  // Subscribe to MCP servers changes
  unsubscribers.push(
    useMCPServersStore.subscribe((state, prevState) => {
      // Only sync if server configs changed
      const configChanged = state.servers.some((s, i) => {
        const prev = prevState.servers[i];
        if (!prev) return true;
        return s.name !== prev.name ||
          s.url !== prev.url ||
          s.type !== prev.type ||
          s.enabled !== prev.enabled;
      }) || state.servers.length !== prevState.servers.length;

      if (configChanged) {
        console.log('[App Settings Sync] MCP servers changed, scheduling save...');
        debouncedSaveAppSettings();
      }
    })
  );

  // Subscribe to chat app settings
  unsubscribers.push(
    useAppChatStore.subscribe((state, prevState) => {
      if (
        state.autoSpeak !== prevState.autoSpeak ||
        state.autoSuggestDiagrams !== prevState.autoSuggestDiagrams ||
        state.autoSuggestHTMLUI !== prevState.autoSuggestHTMLUI ||
        state.autoSuggestQuestions !== prevState.autoSuggestQuestions ||
        state.autoTitleChat !== prevState.autoTitleChat ||
        state.showTextDiff !== prevState.showTextDiff ||
        state.showSystemMessages !== prevState.showSystemMessages ||
        state.micTimeoutMs !== prevState.micTimeoutMs
      ) {
        console.log('[App Settings Sync] Chat app settings changed, scheduling save...');
        debouncedSaveAppSettings();
      }
    })
  );

  // Subscribe to tools settings (simplified - any change triggers save)
  unsubscribers.push(
    useToolsStore.subscribe(() => {
      console.log('[App Settings Sync] Tools settings changed, scheduling save...');
      debouncedSaveAppSettings();
    })
  );

  // Subscribe to TTS preferences
  unsubscribers.push(
    useTTSPreferencesStore.subscribe(() => {
      console.log('[App Settings Sync] TTS preferences changed, scheduling save...');
      debouncedSaveAppSettings();
    })
  );

  // Subscribe to ElevenLabs settings
  unsubscribers.push(
    useElevenlabsStore.subscribe((state, prevState) => {
      if (
        state.elevenLabsApiKey !== prevState.elevenLabsApiKey ||
        state.elevenLabsVoiceId !== prevState.elevenLabsVoiceId
      ) {
        console.log('[App Settings Sync] ElevenLabs settings changed, scheduling save...');
        debouncedSaveAppSettings();
      }
    })
  );

  // Subscribe to Google search settings
  unsubscribers.push(
    useGoogleSearchStore.subscribe((state, prevState) => {
      if (
        state.googleCloudApiKey !== prevState.googleCloudApiKey ||
        state.googleCSEId !== prevState.googleCSEId
      ) {
        console.log('[App Settings Sync] Google search settings changed, scheduling save...');
        debouncedSaveAppSettings();
      }
    })
  );

  // Subscribe to T2I settings
  unsubscribers.push(
    useTextToImageStore.subscribe(() => {
      console.log('[App Settings Sync] T2I settings changed, scheduling save...');
      debouncedSaveAppSettings();
    })
  );

  // Subscribe to DALL-E settings
  unsubscribers.push(
    useDalleStore.subscribe(() => {
      console.log('[App Settings Sync] DALL-E settings changed, scheduling save...');
      debouncedSaveAppSettings();
    })
  );

  // Subscribe to simple personas changes
  unsubscribers.push(
    useAppPersonasStore.subscribe((state, prevState) => {
      if (state.simplePersonas !== prevState.simplePersonas) {
        console.log('[App Settings Sync] Simple personas changed, scheduling save...');
        debouncedSaveAppSettings();
      }
    })
  );

  // Subscribe to purposes settings
  unsubscribers.push(
    usePurposeStore.subscribe((state, prevState) => {
      if (state.hiddenPurposeIDs !== prevState.hiddenPurposeIDs) {
        console.log('[App Settings Sync] Purposes settings changed, scheduling save...');
        debouncedSaveAppSettings();
      }
    })
  );

  // === Subscribe to additional stores for complete user isolation ===

  // Subscribe to projects changes
  unsubscribers.push(
    useProjectsStore.subscribe((state, prevState) => {
      if (
        state.projects !== prevState.projects ||
        state.activeProjectId !== prevState.activeProjectId ||
        state.mode !== prevState.mode
      ) {
        console.log('[App Settings Sync] Projects settings changed, scheduling save...');
        debouncedSaveAppSettings();
      }
    })
  );

  // Subscribe to UX Labs changes
  unsubscribers.push(
    useUXLabsStore.subscribe((state, prevState) => {
      if (
        state.labsAttachScreenCapture !== prevState.labsAttachScreenCapture ||
        state.labsCameraDesktop !== prevState.labsCameraDesktop ||
        state.labsChatBarAlt !== prevState.labsChatBarAlt ||
        state.labsEnhanceCodeBlocks !== prevState.labsEnhanceCodeBlocks ||
        state.labsEnhanceCodeLiveFile !== prevState.labsEnhanceCodeLiveFile ||
        state.labsHighPerformance !== prevState.labsHighPerformance ||
        state.labsShowCost !== prevState.labsShowCost ||
        state.labsAutoHideComposer !== prevState.labsAutoHideComposer ||
        state.labsShowShortcutBar !== prevState.labsShowShortcutBar ||
        state.labsDevMode !== prevState.labsDevMode ||
        state.labsDevNoStreaming !== prevState.labsDevNoStreaming
      ) {
        console.log('[App Settings Sync] UX Labs flags changed, scheduling save...');
        debouncedSaveAppSettings();
      }
    })
  );

  // Subscribe to Pauline TTS changes
  unsubscribers.push(
    usePaulineStore.subscribe((state, prevState) => {
      if (
        state.paulineEndpoint !== prevState.paulineEndpoint ||
        state.paulineVoiceId !== prevState.paulineVoiceId ||
        state.paulineSpeed !== prevState.paulineSpeed ||
        state.paulineTempo !== prevState.paulineTempo ||
        state.customVoices !== prevState.customVoices
      ) {
        console.log('[App Settings Sync] Pauline TTS settings changed, scheduling save...');
        debouncedSaveAppSettings();
      }
    })
  );

  // Subscribe to Web tools changes
  unsubscribers.push(
    useWebToolsStore.subscribe((state, prevState) => {
      if (
        state.searchProvider !== prevState.searchProvider ||
        state.searxngInstance !== prevState.searxngInstance ||
        state.enableScraping !== prevState.enableScraping ||
        state.maxDownloadSizeMB !== prevState.maxDownloadSizeMB
      ) {
        console.log('[App Settings Sync] Web tools settings changed, scheduling save...');
        debouncedSaveAppSettings();
      }
    })
  );

  // Subscribe to Call app changes
  unsubscribers.push(
    useAppCallStore.subscribe((state, prevState) => {
      if (
        state.grayUI !== prevState.grayUI ||
        state.showConversations !== prevState.showConversations ||
        state.showSupport !== prevState.showSupport
      ) {
        console.log('[App Settings Sync] Call app settings changed, scheduling save...');
        debouncedSaveAppSettings();
      }
    })
  );

  // Subscribe to Browse module changes
  unsubscribers.push(
    useBrowseStore.subscribe((state, prevState) => {
      if (
        state.wssEndpoint !== prevState.wssEndpoint ||
        state.pageTransform !== prevState.pageTransform ||
        state.enableComposerAttach !== prevState.enableComposerAttach ||
        state.enableReactTool !== prevState.enableReactTool ||
        state.enablePersonaTool !== prevState.enablePersonaTool
      ) {
        console.log('[App Settings Sync] Browse module settings changed, scheduling save...');
        debouncedSaveAppSettings();
      }
    })
  );

  // Subscribe to Network mode changes
  unsubscribers.push(
    useNetworkModeStore.subscribe((state, prevState) => {
      if (state.networkMode !== prevState.networkMode) {
        console.log('[App Settings Sync] Network mode changed, scheduling save...');
        debouncedSaveAppSettings();
      }
    })
  );

  // Subscribe to Chat panes changes
  unsubscribers.push(
    useAppChatPanesStore.subscribe((state, prevState) => {
      if (
        state.chatPanes !== prevState.chatPanes ||
        state.chatPaneFocusIndex !== prevState.chatPaneFocusIndex
      ) {
        console.log('[App Settings Sync] Chat panes layout changed, scheduling save...');
        debouncedSaveAppSettings();
      }
    })
  );

  // Subscribe to Shared chat links changes
  unsubscribers.push(
    useShareLinkStore.subscribe((state, prevState) => {
      if (
        state.chatLinkItems !== prevState.chatLinkItems ||
        state.linkStorageOwnerId !== prevState.linkStorageOwnerId
      ) {
        console.log('[App Settings Sync] Shared chat links changed, scheduling save...');
        debouncedSaveAppSettings();
      }
    })
  );

  // Note: Workspace store not subscribed - file handles are device-specific

  console.log('[App Settings Sync] Auto-sync enabled for', unsubscribers.length, 'stores');
}


/**
 * Disable app settings auto-sync
 */
export function disableAppSettingsAutoSync(): void {
  unsubscribers.forEach(unsub => unsub());
  unsubscribers.length = 0;

  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }

  console.log('[App Settings Sync] Auto-sync disabled');
}
