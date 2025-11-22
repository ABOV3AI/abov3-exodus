/**
 * FlowCore tRPC Client
 * Client-side API functions for workflow persistence and collaboration
 */

import { apiAsyncNode } from '~/common/util/trpc.client';
import type { Workflow, WorkflowExecution } from './flowcore.types';

/**
 * Workflow CRUD Operations
 */

export async function createWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>) {
  return await apiAsyncNode.flowcore.createWorkflow.mutate(workflow);
}

export async function getWorkflow(id: string) {
  return await apiAsyncNode.flowcore.getWorkflow.query({ id });
}

export async function listWorkflows(params?: {
  ownerId?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}) {
  return await apiAsyncNode.flowcore.listWorkflows.query(params || {});
}

export async function updateWorkflow(id: string, data: Partial<Workflow>) {
  return await apiAsyncNode.flowcore.updateWorkflow.mutate({ id, data });
}

export async function deleteWorkflow(id: string) {
  return await apiAsyncNode.flowcore.deleteWorkflow.mutate({ id });
}

/**
 * Execution Tracking
 */

export async function saveExecution(execution: WorkflowExecution) {
  return await apiAsyncNode.flowcore.saveExecution.mutate(execution);
}

export async function getExecutions(workflowId: string, limit?: number) {
  return await apiAsyncNode.flowcore.getExecutions.query({ workflowId, limit });
}

/**
 * Collaboration Features
 */

export async function shareWorkflow(workflowId: string, userIds: string[]) {
  return await apiAsyncNode.flowcore.shareWorkflow.mutate({ workflowId, userIds });
}

export async function forkWorkflow(workflowId: string, ownerId: string) {
  return await apiAsyncNode.flowcore.forkWorkflow.mutate({ workflowId, ownerId });
}

/**
 * Marketplace
 */

export async function publishToMarketplace(params: {
  workflowId: string;
  category: string;
  description: string;
  tags: string[];
}) {
  return await apiAsyncNode.flowcore.publishToMarketplace.mutate(params);
}

export async function browseMarketplace(params?: {
  category?: string;
  tags?: string[];
  search?: string;
  sortBy?: 'popular' | 'recent' | 'rating';
  limit?: number;
  offset?: number;
}) {
  return await apiAsyncNode.flowcore.browseMarketplace.query(params || {});
}

export async function likeWorkflow(workflowId: string, userId: string) {
  return await apiAsyncNode.flowcore.likeWorkflow.mutate({ workflowId, userId });
}

/**
 * Analytics
 */

export async function getAnalytics(params: {
  workflowId: string;
  startDate?: Date;
  endDate?: Date;
}) {
  return await apiAsyncNode.flowcore.getAnalytics.query(params);
}

export async function getOverallStats() {
  return await apiAsyncNode.flowcore.getOverallStats.query();
}

/**
 * Helper: Sync workflow to server
 */
export async function syncWorkflowToServer(workflow: Workflow) {
  const existing = await getWorkflow(workflow.id);

  if (existing) {
    return await updateWorkflow(workflow.id, workflow);
  } else {
    return await createWorkflow(workflow);
  }
}

/**
 * Helper: Load workflow from server
 */
export async function loadWorkflowFromServer(workflowId: string): Promise<Workflow | null> {
  return await getWorkflow(workflowId);
}
