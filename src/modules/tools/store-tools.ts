/**
 * Zustand store for tools settings
 * Controls which tool categories are enabled and execution limits
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';


export interface ToolsState {
  // Per-category enables
  enableFileOps: boolean;
  enableCodeExec: boolean;
  enableWeb: boolean;
  enableOffice: boolean;
  enableImage: boolean;
  enableData: boolean;
  enableDiagram: boolean;
  enableGit: boolean;
  enableTesting: boolean;
  enableUtility: boolean;

  // Text-based tools (MCP approach) for models without native function calling
  enableTextBasedTools: boolean;

  // Execution limits
  executionTimeout: number; // milliseconds
  maxMemory: number; // bytes
  rateLimit: number; // calls per minute
  maxConcurrent: number; // parallel executions

  // Dangerous operations (require explicit opt-in)
  allowFileDeletion: boolean;
  allowGitCommit: boolean;

  // Debug & monitoring
  showProgress: boolean;
  logToolCalls: boolean;

  // Actions
  setEnableFileOps: (enable: boolean) => void;
  setEnableCodeExec: (enable: boolean) => void;
  setEnableWeb: (enable: boolean) => void;
  setEnableOffice: (enable: boolean) => void;
  setEnableImage: (enable: boolean) => void;
  setEnableData: (enable: boolean) => void;
  setEnableDiagram: (enable: boolean) => void;
  setEnableGit: (enable: boolean) => void;
  setEnableTesting: (enable: boolean) => void;
  setEnableUtility: (enable: boolean) => void;

  setEnableTextBasedTools: (enable: boolean) => void;

  setExecutionTimeout: (timeout: number) => void;
  setMaxMemory: (memory: number) => void;
  setRateLimit: (limit: number) => void;
  setMaxConcurrent: (max: number) => void;

  setAllowFileDeletion: (allow: boolean) => void;
  setAllowGitCommit: (allow: boolean) => void;

  setShowProgress: (show: boolean) => void;
  setLogToolCalls: (log: boolean) => void;
}


export const useToolsStore = create<ToolsState>()(
  persist(
    (set) => ({
      // All enabled by default except git (experimental)
      enableFileOps: true,
      enableCodeExec: true,
      enableWeb: true,
      enableOffice: true,
      enableImage: true,
      enableData: true,
      enableDiagram: true,
      enableGit: false, // Experimental - off by default
      enableTesting: true,
      enableUtility: true,

      // Text-based tools enabled by default (fallback for models without native FC)
      enableTextBasedTools: true,

      // Sensible defaults
      executionTimeout: 30000, // 30 seconds (increased for network operations)
      maxMemory: 50 * 1024 * 1024, // 50MB
      rateLimit: 100, // 100 calls per minute
      maxConcurrent: 5,

      // Dangerous operations disabled by default
      allowFileDeletion: false,
      allowGitCommit: false,

      // Debug enabled by default
      showProgress: true,
      logToolCalls: false,

      // Actions
      setEnableFileOps: (enable) => set({ enableFileOps: enable }),
      setEnableCodeExec: (enable) => set({ enableCodeExec: enable }),
      setEnableWeb: (enable) => set({ enableWeb: enable }),
      setEnableOffice: (enable) => set({ enableOffice: enable }),
      setEnableImage: (enable) => set({ enableImage: enable }),
      setEnableData: (enable) => set({ enableData: enable }),
      setEnableDiagram: (enable) => set({ enableDiagram: enable }),
      setEnableGit: (enable) => set({ enableGit: enable }),
      setEnableTesting: (enable) => set({ enableTesting: enable }),
      setEnableUtility: (enable) => set({ enableUtility: enable }),

      setEnableTextBasedTools: (enable) => set({ enableTextBasedTools: enable }),

      setExecutionTimeout: (timeout) => set({ executionTimeout: timeout }),
      setMaxMemory: (memory) => set({ maxMemory: memory }),
      setRateLimit: (limit) => set({ rateLimit: limit }),
      setMaxConcurrent: (max) => set({ maxConcurrent: max }),

      setAllowFileDeletion: (allow) => set({ allowFileDeletion: allow }),
      setAllowGitCommit: (allow) => set({ allowGitCommit: allow }),

      setShowProgress: (show) => set({ showProgress: show }),
      setLogToolCalls: (log) => set({ logToolCalls: log }),
    }),
    {
      name: 'app-tools-settings',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        // v1 -> v2: Add enableTextBasedTools (default true)
        if (version < 2) {
          return {
            ...persistedState,
            enableTextBasedTools: true,
          };
        }
        return persistedState;
      },
    }
  )
);
