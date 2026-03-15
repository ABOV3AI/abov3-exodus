/**
 * Workflow Sync Manager
 *
 * Handles synchronization of workflow-related data between client and server.
 * This includes:
 * - Training jobs and datasets
 * - FlowCore workflow definitions
 *
 * These stores use IndexedDB for larger data and need special handling.
 */

import { apiAsyncNode } from '~/common/util/trpc.client';

// Import workflow stores
import { useTrainingStoreImpl } from '~/apps/training/store-training';
import { useFlowCoreStore } from '~/apps/flowcore/store-flowcore';
import { useFlowCoreStoreEnhanced } from '~/apps/flowcore/store-flowcore-enhanced';


// Debounce timer for save operations
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 5000; // Longer debounce for larger data


/**
 * Collect all workflow data from stores
 */
function collectWorkflowData(): Record<string, any> {
  const trainingState = useTrainingStoreImpl.getState();
  const flowcoreState = useFlowCoreStore.getState();
  const flowcoreEnhancedState = useFlowCoreStoreEnhanced.getState();

  return {
    // Training data
    training: {
      jobs: trainingState.jobs,
      datasets: trainingState.datasets,
      edenServerUrl: trainingState.edenServerUrl,
      defaultConfig: trainingState.defaultConfig,
    },

    // FlowCore workflows (basic)
    flowcore: {
      workflows: flowcoreState.workflows,
    },

    // FlowCore enhanced workflows
    flowcoreEnhanced: {
      workflows: flowcoreEnhancedState.workflows,
      serverSyncEnabled: flowcoreEnhancedState.serverSyncEnabled,
    },
  };
}


/**
 * Apply workflow data from server to local stores
 */
function applyWorkflowData(workflowData: Record<string, any>): void {
  if (!workflowData) return;

  // Restore training data
  if (workflowData.training) {
    const train = workflowData.training;
    useTrainingStoreImpl.setState({
      ...(train.jobs !== undefined && { jobs: train.jobs }),
      ...(train.datasets !== undefined && { datasets: train.datasets }),
      ...(train.edenServerUrl !== undefined && { edenServerUrl: train.edenServerUrl }),
      ...(train.defaultConfig !== undefined && { defaultConfig: train.defaultConfig }),
    });
    console.log('[Workflow Sync] Restored training data:', train.jobs?.length || 0, 'jobs,', train.datasets?.length || 0, 'datasets');
  }

  // Restore FlowCore workflows
  if (workflowData.flowcore) {
    const fc = workflowData.flowcore;
    useFlowCoreStore.setState({
      ...(fc.workflows !== undefined && { workflows: fc.workflows }),
    });
    console.log('[Workflow Sync] Restored', fc.workflows?.length || 0, 'FlowCore workflows');
  }

  // Restore FlowCore enhanced workflows
  if (workflowData.flowcoreEnhanced) {
    const fce = workflowData.flowcoreEnhanced;
    useFlowCoreStoreEnhanced.setState({
      ...(fce.workflows !== undefined && { workflows: fce.workflows }),
      ...(fce.serverSyncEnabled !== undefined && { serverSyncEnabled: fce.serverSyncEnabled }),
    });
    console.log('[Workflow Sync] Restored', fce.workflows?.length || 0, 'FlowCore enhanced workflows');
  }
}


/**
 * Sync workflow data from server to local stores
 * Called when user logs in
 */
export async function syncWorkflowsFromServer(): Promise<void> {
  console.log('[Workflow Sync] Loading workflow data from server...');

  try {
    const settings = await apiAsyncNode.sync.getSettings.query();

    if (!settings || !settings.workflowData) {
      console.log('[Workflow Sync] No saved workflow data on server, keeping local data');
      return;
    }

    applyWorkflowData(settings.workflowData as Record<string, any>);
    console.log('[Workflow Sync] Workflow sync complete');
  } catch (error) {
    console.error('[Workflow Sync] Failed to load workflow data:', error);
    // Don't throw - user can still use local data
  }
}


/**
 * Save workflow data to server
 */
export async function saveWorkflowsToServer(): Promise<void> {
  const workflowData = collectWorkflowData();

  try {
    await apiAsyncNode.sync.saveSettings.mutate({ workflowData });
    console.log('[Workflow Sync] Saved workflow data to server');
  } catch (error) {
    console.error('[Workflow Sync] Failed to save workflow data:', error);
  }
}


/**
 * Trigger a debounced save of workflow data
 */
export function debouncedSaveWorkflows(): void {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }

  saveDebounceTimer = setTimeout(() => {
    void saveWorkflowsToServer();
  }, SAVE_DEBOUNCE_MS);
}


// ===== Store Subscriptions for Auto-Sync =====

const unsubscribers: (() => void)[] = [];

/**
 * Subscribe to workflow stores and auto-sync to server
 */
export function enableWorkflowAutoSync(): void {
  if (unsubscribers.length > 0) {
    console.log('[Workflow Sync] Auto-sync already enabled');
    return;
  }

  console.log('[Workflow Sync] Enabling auto-sync...');

  // Subscribe to training store changes
  unsubscribers.push(
    useTrainingStoreImpl.subscribe((state, prevState) => {
      if (
        state.jobs !== prevState.jobs ||
        state.datasets !== prevState.datasets ||
        state.edenServerUrl !== prevState.edenServerUrl ||
        state.defaultConfig !== prevState.defaultConfig
      ) {
        console.log('[Workflow Sync] Training data changed, scheduling save...');
        debouncedSaveWorkflows();
      }
    })
  );

  // Subscribe to FlowCore changes
  unsubscribers.push(
    useFlowCoreStore.subscribe((state, prevState) => {
      if (state.workflows !== prevState.workflows) {
        console.log('[Workflow Sync] FlowCore workflows changed, scheduling save...');
        debouncedSaveWorkflows();
      }
    })
  );

  // Subscribe to FlowCore enhanced changes
  unsubscribers.push(
    useFlowCoreStoreEnhanced.subscribe((state, prevState) => {
      if (
        state.workflows !== prevState.workflows ||
        state.serverSyncEnabled !== prevState.serverSyncEnabled
      ) {
        console.log('[Workflow Sync] FlowCore enhanced workflows changed, scheduling save...');
        debouncedSaveWorkflows();
      }
    })
  );

  console.log('[Workflow Sync] Auto-sync enabled for', unsubscribers.length, 'stores');
}


/**
 * Disable workflow auto-sync
 */
export function disableWorkflowAutoSync(): void {
  unsubscribers.forEach(unsub => unsub());
  unsubscribers.length = 0;

  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }

  console.log('[Workflow Sync] Auto-sync disabled');
}
