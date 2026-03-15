/**
 * ABOV3 Training Store
 *
 * Zustand store for managing training jobs, datasets, and configuration.
 * Persisted to IndexedDB for durability across sessions.
 */

import * as React from 'react';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { nanoid } from 'nanoid';

import { createIDBPersistStorage } from '~/common/util/idbUtils';
import { getMCPRuntime } from '~/modules/mcp/mcp.runtime';

import type {
  TrainingConfig,
  TrainingDataset,
  TrainingJob,
  TrainingLogEntry,
  TrainingMetrics,
  TrainingStatus,
  TrainingViewMode,
  WizardStep,
} from './training.types';
import { DEFAULT_TRAINING_CONFIG } from './training.types';


// === Store State Interface ===

interface TrainingState {
  // Jobs
  jobs: TrainingJob[];
  activeJobId: string | null;

  // Datasets (stored separately for memory efficiency)
  datasets: TrainingDataset[];

  // Eden Server Configuration
  edenServerUrl: string;
  edenServerConnected: boolean;
  edenServerName: string | null;
  edenAvailableTools: string[];

  // Default Configuration
  defaultConfig: TrainingConfig;

  // UI State
  viewMode: TrainingViewMode;
  wizardStep: WizardStep;

  // Wizard Draft (current job being created)
  wizardDraft: Partial<TrainingJob> | null;
}

interface TrainingActions {
  // Job Management
  createJob: (job: Omit<TrainingJob, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'progress' | 'logs'>) => string;
  updateJob: (id: string, updates: Partial<TrainingJob>) => void;
  updateJobStatus: (id: string, status: TrainingStatus, progress?: number, currentStep?: string) => void;
  deleteJob: (id: string) => void;
  setActiveJob: (id: string | null) => void;

  // Logging
  appendLog: (jobId: string, level: TrainingLogEntry['level'], message: string, data?: Record<string, unknown>) => void;

  // Metrics
  updateJobMetrics: (jobId: string, metrics: Partial<TrainingMetrics>) => void;

  // Dataset Management
  addDataset: (dataset: Omit<TrainingDataset, 'id' | 'createdAt'>) => string;
  updateDataset: (id: string, updates: Partial<TrainingDataset>) => void;
  deleteDataset: (id: string) => void;
  getDatasetByJobId: (jobId: string) => TrainingDataset | undefined;

  // Eden Server
  setEdenServerUrl: (url: string) => void;
  setEdenServerConnected: (connected: boolean) => void;
  checkEdenConnection: () => { connected: boolean; serverName: string | null; availableTools: string[] };

  // Configuration
  setDefaultConfig: (config: Partial<TrainingConfig>) => void;

  // UI State
  setViewMode: (mode: TrainingViewMode) => void;
  setWizardStep: (step: WizardStep) => void;

  // Wizard Draft
  setWizardDraft: (draft: Partial<TrainingJob> | null) => void;
  updateWizardDraft: (updates: Partial<TrainingJob>) => void;
  clearWizardDraft: () => void;
}


// === Store Implementation ===

export const useTrainingStoreImpl = create<TrainingState & TrainingActions>()(
  persist(
    (set, get) => ({

      // === Initial State ===

      jobs: [],
      activeJobId: null,
      datasets: [],
      edenServerUrl: 'http://127.0.0.1:3100',
      edenServerConnected: false,
      edenServerName: null,
      edenAvailableTools: [],
      defaultConfig: DEFAULT_TRAINING_CONFIG,
      viewMode: 'wizard',
      wizardStep: 'requirements',
      wizardDraft: null,


      // === Job Management ===

      createJob: (jobData) => {
        const id = `train_${nanoid(12)}`;
        const now = Date.now();

        const newJob: TrainingJob = {
          ...jobData,
          id,
          status: 'idle',
          progress: 0,
          logs: [],
          createdAt: now,
          updatedAt: now,
        };

        set(state => ({
          jobs: [newJob, ...state.jobs],
          activeJobId: id,
          viewMode: 'progress',
        }));

        return id;
      },

      updateJob: (id, updates) => {
        set(state => ({
          jobs: state.jobs.map(job =>
            job.id === id
              ? { ...job, ...updates, updatedAt: Date.now() }
              : job
          ),
        }));
      },

      updateJobStatus: (id, status, progress, currentStep) => {
        set(state => ({
          jobs: state.jobs.map(job =>
            job.id === id
              ? {
                ...job,
                status,
                progress: progress ?? job.progress,
                currentStep: currentStep ?? job.currentStep,
                updatedAt: Date.now(),
                ...(status === 'training' && !job.startedAt ? { startedAt: Date.now() } : {}),
                ...(status === 'completed' || status === 'error' ? { completedAt: Date.now() } : {}),
              }
              : job
          ),
        }));
      },

      deleteJob: (id) => {
        set(state => ({
          jobs: state.jobs.filter(job => job.id !== id),
          activeJobId: state.activeJobId === id ? null : state.activeJobId,
          // Also delete associated datasets
          datasets: state.datasets.filter(ds => ds.jobId !== id),
        }));
      },

      setActiveJob: (id) => {
        set({ activeJobId: id, viewMode: id ? 'progress' : 'wizard' });
      },


      // === Logging ===

      appendLog: (jobId, level, message, data) => {
        const logEntry: TrainingLogEntry = {
          timestamp: Date.now(),
          level,
          message,
          data,
        };

        set(state => ({
          jobs: state.jobs.map(job =>
            job.id === jobId
              ? { ...job, logs: [...job.logs, logEntry], updatedAt: Date.now() }
              : job
          ),
        }));
      },


      // === Metrics ===

      updateJobMetrics: (jobId, metrics) => {
        set(state => ({
          jobs: state.jobs.map(job =>
            job.id === jobId
              ? {
                ...job,
                metrics: { ...job.metrics, ...metrics },
                updatedAt: Date.now(),
              }
              : job
          ),
        }));
      },


      // === Dataset Management ===

      addDataset: (datasetData) => {
        const id = `dataset_${nanoid(12)}`;
        const now = Date.now();

        const newDataset: TrainingDataset = {
          ...datasetData,
          id,
          createdAt: now,
        };

        set(state => ({
          datasets: [...state.datasets, newDataset],
        }));

        return id;
      },

      updateDataset: (id, updates) => {
        set(state => ({
          datasets: state.datasets.map(ds =>
            ds.id === id ? { ...ds, ...updates } : ds
          ),
        }));
      },

      deleteDataset: (id) => {
        set(state => ({
          datasets: state.datasets.filter(ds => ds.id !== id),
        }));
      },

      getDatasetByJobId: (jobId) => {
        return get().datasets.find(ds => ds.jobId === jobId);
      },


      // === Eden Server ===

      setEdenServerUrl: (url) => {
        set({ edenServerUrl: url });
      },

      setEdenServerConnected: (connected) => {
        set({ edenServerConnected: connected });
      },

      checkEdenConnection: () => {
        const mcpRuntime = getMCPRuntime();
        const servers = mcpRuntime.getRegisteredServers();
        const availableTools = mcpRuntime.getAvailableTools();

        // Look for Eden server (check various naming patterns)
        const edenPatterns = ['eden', 'abov3-eden', 'abov3_eden', 'Eden', 'ABOV3-Eden'];
        let edenServer: { name: string; connected: boolean } | null = null;

        for (const server of servers) {
          const lowerName = server.name.toLowerCase();
          if (edenPatterns.some(pattern => lowerName.includes(pattern.toLowerCase()))) {
            edenServer = server;
            break;
          }
        }

        // Find Eden training tools from available tools
        const edenTools: string[] = [];
        const trainingToolPatterns = [
          'eden_generate_data',
          'eden_validate_dataset',
          'eden_distill_model',
          'eden_train_lora',
          'eden_evaluate_model',
          'eden_export_gguf',
          'eden_deploy_to_ark',
        ];

        for (const tool of availableTools) {
          if (tool.type !== 'function_call') continue;
          const toolName = tool.function_call?.name || '';
          if (trainingToolPatterns.some(pattern => toolName.includes(pattern))) {
            edenTools.push(toolName);
          }
        }

        const connected = edenServer?.connected ?? false;
        const serverName = edenServer?.name ?? null;

        // Update store state
        set({
          edenServerConnected: connected,
          edenServerName: serverName,
          edenAvailableTools: edenTools,
        });

        return {
          connected,
          serverName,
          availableTools: edenTools,
        };
      },


      // === Configuration ===

      setDefaultConfig: (config) => {
        set(state => ({
          defaultConfig: { ...state.defaultConfig, ...config },
        }));
      },


      // === UI State ===

      setViewMode: (mode) => {
        set({ viewMode: mode });
      },

      setWizardStep: (step) => {
        set({ wizardStep: step });
      },


      // === Wizard Draft ===

      setWizardDraft: (draft) => {
        set({ wizardDraft: draft });
      },

      updateWizardDraft: (updates) => {
        set(state => ({
          wizardDraft: state.wizardDraft
            ? { ...state.wizardDraft, ...updates }
            : updates,
        }));
      },

      clearWizardDraft: () => {
        set({ wizardDraft: null, wizardStep: 'requirements' });
      },

    }),
    {
      name: 'app-training',
      storage: createIDBPersistStorage(),
      version: 1,

      // Only persist essential data, not UI state
      partialize: (state) => ({
        jobs: state.jobs,
        datasets: state.datasets,
        edenServerUrl: state.edenServerUrl,
        defaultConfig: state.defaultConfig,
      }),

      // Migration handler for future versions
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;

        if (version === 0) {
          // Initial migration from version 0 to 1
          return {
            ...state,
            version: 1,
          };
        }

        return state;
      },
    },
  ),
);


// === Exported Hooks ===

/**
 * Get all training jobs
 */
export function useTrainingJobs() {
  return useTrainingStoreImpl(useShallow(state => ({
    jobs: state.jobs,
    activeJobId: state.activeJobId,
  })));
}

/**
 * Get a specific training job by ID
 */
export function useTrainingJob(jobId: string | null) {
  return useTrainingStoreImpl(useShallow(state => ({
    job: jobId ? state.jobs.find(j => j.id === jobId) : undefined,
  })));
}

/**
 * Get the active training job
 */
export function useActiveTrainingJob() {
  return useTrainingStoreImpl(useShallow(state => ({
    activeJob: state.activeJobId
      ? state.jobs.find(j => j.id === state.activeJobId)
      : undefined,
  })));
}

/**
 * Get Eden server configuration
 */
export function useEdenServer() {
  return useTrainingStoreImpl(useShallow(state => ({
    edenServerUrl: state.edenServerUrl,
    edenServerConnected: state.edenServerConnected,
    edenServerName: state.edenServerName,
    edenAvailableTools: state.edenAvailableTools,
  })));
}

/**
 * Hook for automatic Eden connection checking
 * Checks connection on mount and every 10 seconds
 */
export function useAutoCheckEdenConnection() {
  React.useEffect(() => {
    // Initial check
    trainingActions.checkEdenConnection();

    // Set up periodic checking every 10 seconds
    const interval = setInterval(() => {
      trainingActions.checkEdenConnection();
    }, 10000);

    return () => clearInterval(interval);
  }, []);
}

/**
 * Get training UI state
 */
export function useTrainingUI() {
  return useTrainingStoreImpl(useShallow(state => ({
    viewMode: state.viewMode,
    wizardStep: state.wizardStep,
    wizardDraft: state.wizardDraft,
  })));
}

/**
 * Get default training configuration
 */
export function useDefaultTrainingConfig() {
  return useTrainingStoreImpl(useShallow(state => state.defaultConfig));
}


// === Exported Actions (for use outside React components) ===

export const trainingActions = {
  // Jobs
  createJob: (job: Parameters<TrainingActions['createJob']>[0]) =>
    useTrainingStoreImpl.getState().createJob(job),
  updateJob: (id: string, updates: Partial<TrainingJob>) =>
    useTrainingStoreImpl.getState().updateJob(id, updates),
  updateJobStatus: (id: string, status: TrainingStatus, progress?: number, currentStep?: string) =>
    useTrainingStoreImpl.getState().updateJobStatus(id, status, progress, currentStep),
  deleteJob: (id: string) =>
    useTrainingStoreImpl.getState().deleteJob(id),
  setActiveJob: (id: string | null) =>
    useTrainingStoreImpl.getState().setActiveJob(id),

  // Logging
  appendLog: (jobId: string, level: TrainingLogEntry['level'], message: string, data?: Record<string, unknown>) =>
    useTrainingStoreImpl.getState().appendLog(jobId, level, message, data),

  // Metrics
  updateJobMetrics: (jobId: string, metrics: Partial<TrainingMetrics>) =>
    useTrainingStoreImpl.getState().updateJobMetrics(jobId, metrics),

  // Datasets
  addDataset: (dataset: Parameters<TrainingActions['addDataset']>[0]) =>
    useTrainingStoreImpl.getState().addDataset(dataset),
  updateDataset: (id: string, updates: Partial<TrainingDataset>) =>
    useTrainingStoreImpl.getState().updateDataset(id, updates),
  deleteDataset: (id: string) =>
    useTrainingStoreImpl.getState().deleteDataset(id),
  getDatasetByJobId: (jobId: string) =>
    useTrainingStoreImpl.getState().getDatasetByJobId(jobId),

  // Eden Server
  setEdenServerUrl: (url: string) =>
    useTrainingStoreImpl.getState().setEdenServerUrl(url),
  setEdenServerConnected: (connected: boolean) =>
    useTrainingStoreImpl.getState().setEdenServerConnected(connected),
  checkEdenConnection: () =>
    useTrainingStoreImpl.getState().checkEdenConnection(),

  // Configuration
  setDefaultConfig: (config: Partial<TrainingConfig>) =>
    useTrainingStoreImpl.getState().setDefaultConfig(config),

  // UI
  setViewMode: (mode: TrainingViewMode) =>
    useTrainingStoreImpl.getState().setViewMode(mode),
  setWizardStep: (step: WizardStep) =>
    useTrainingStoreImpl.getState().setWizardStep(step),

  // Wizard Draft
  setWizardDraft: (draft: Partial<TrainingJob> | null) =>
    useTrainingStoreImpl.getState().setWizardDraft(draft),
  updateWizardDraft: (updates: Partial<TrainingJob>) =>
    useTrainingStoreImpl.getState().updateWizardDraft(updates),
  clearWizardDraft: () =>
    useTrainingStoreImpl.getState().clearWizardDraft(),

  // Direct store access (for edge cases)
  getState: () => useTrainingStoreImpl.getState(),
};
