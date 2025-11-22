/**
 * FlowCore tRPC Router
 * Server-side API for workflow persistence and collaboration
 */

import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../../trpc/trpc.server';

// Schema definitions
const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  nodes: z.any(), // ReactFlow nodes
  edges: z.any(), // ReactFlow edges
  trigger: z.object({
    type: z.enum(['manual', 'schedule', 'webhook']),
    schedule: z.string().optional(),
    webhookId: z.string().optional(),
  }),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastRun: z.date().optional(),
  executions: z.array(z.any()),
  // Collaboration fields
  ownerId: z.string().optional(),
  sharedWith: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  forkCount: z.number().optional(),
  likeCount: z.number().optional(),
});

const ExecutionSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  startTime: z.date(),
  endTime: z.date().optional(),
  status: z.enum(['running', 'completed', 'failed', 'cancelled']),
  error: z.string().optional(),
  results: z.record(z.any()),
  logs: z.any().optional(),
  metrics: z.object({
    duration: z.number(),
    nodesExecuted: z.number(),
    tokensUsed: z.number().optional(),
  }).optional(),
});

// In-memory storage (replace with real database in production)
const workflows = new Map<string, any>();
const executions = new Map<string, any[]>();
const marketplace = new Map<string, any>();
const analytics = new Map<string, any>();

export const flowcoreRouter = createTRPCRouter({
  // Workflow CRUD operations

  createWorkflow: publicProcedure
    .input(WorkflowSchema.omit({ id: true, createdAt: true, updatedAt: true }))
    .mutation(({ input }) => {
      const id = `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const workflow = {
        ...input,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
        executions: [],
        forkCount: 0,
        likeCount: 0,
      };
      workflows.set(id, workflow);
      return workflow;
    }),

  getWorkflow: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      return workflows.get(input.id) || null;
    }),

  listWorkflows: publicProcedure
    .input(z.object({
      ownerId: z.string().optional(),
      tags: z.array(z.string()).optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }))
    .query(({ input }) => {
      let results = Array.from(workflows.values());

      if (input.ownerId) {
        results = results.filter(w => w.ownerId === input.ownerId);
      }

      if (input.tags && input.tags.length > 0) {
        results = results.filter(w =>
          input.tags!.some(tag => w.tags.includes(tag))
        );
      }

      const total = results.length;
      const offset = input.offset || 0;
      const limit = input.limit || 50;

      results = results.slice(offset, offset + limit);

      return {
        workflows: results,
        total,
        offset,
        limit,
      };
    }),

  updateWorkflow: publicProcedure
    .input(z.object({
      id: z.string(),
      data: WorkflowSchema.partial(),
    }))
    .mutation(({ input }) => {
      const existing = workflows.get(input.id);
      if (!existing) {
        throw new Error('Workflow not found');
      }

      const updated = {
        ...existing,
        ...input.data,
        updatedAt: new Date(),
      };

      workflows.set(input.id, updated);
      return updated;
    }),

  deleteWorkflow: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      const deleted = workflows.delete(input.id);
      executions.delete(input.id);
      return { success: deleted };
    }),

  // Execution tracking

  saveExecution: publicProcedure
    .input(ExecutionSchema)
    .mutation(({ input }) => {
      const workflowExecutions = executions.get(input.workflowId) || [];
      workflowExecutions.push(input);

      // Keep last 100 executions
      if (workflowExecutions.length > 100) {
        workflowExecutions.shift();
      }

      executions.set(input.workflowId, workflowExecutions);

      // Update workflow last run time
      const workflow = workflows.get(input.workflowId);
      if (workflow) {
        workflow.lastRun = input.startTime;
        workflows.set(input.workflowId, workflow);
      }

      return input;
    }),

  getExecutions: publicProcedure
    .input(z.object({
      workflowId: z.string(),
      limit: z.number().optional(),
    }))
    .query(({ input }) => {
      const workflowExecutions = executions.get(input.workflowId) || [];
      const limit = input.limit || 50;
      return workflowExecutions.slice(-limit).reverse();
    }),

  // Collaboration features

  shareWorkflow: publicProcedure
    .input(z.object({
      workflowId: z.string(),
      userIds: z.array(z.string()),
    }))
    .mutation(({ input }) => {
      const workflow = workflows.get(input.workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      workflow.sharedWith = [...new Set([...(workflow.sharedWith || []), ...input.userIds])];
      workflows.set(input.workflowId, workflow);

      return workflow;
    }),

  forkWorkflow: publicProcedure
    .input(z.object({
      workflowId: z.string(),
      ownerId: z.string(),
    }))
    .mutation(({ input }) => {
      const original = workflows.get(input.workflowId);
      if (!original) {
        throw new Error('Workflow not found');
      }

      const id = `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const forked = {
        ...original,
        id,
        name: `${original.name} (Fork)`,
        ownerId: input.ownerId,
        createdAt: new Date(),
        updatedAt: new Date(),
        executions: [],
        forkCount: 0,
        likeCount: 0,
        sharedWith: [],
        isPublic: false,
      };

      workflows.set(id, forked);

      // Increment fork count on original
      original.forkCount = (original.forkCount || 0) + 1;
      workflows.set(input.workflowId, original);

      return forked;
    }),

  // Marketplace

  publishToMarketplace: publicProcedure
    .input(z.object({
      workflowId: z.string(),
      category: z.string(),
      description: z.string(),
      tags: z.array(z.string()),
    }))
    .mutation(({ input }) => {
      const workflow = workflows.get(input.workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const listing = {
        id: input.workflowId,
        workflow,
        category: input.category,
        description: input.description,
        tags: input.tags,
        publishedAt: new Date(),
        downloads: 0,
        rating: 0,
        reviews: [],
      };

      marketplace.set(input.workflowId, listing);
      workflow.isPublic = true;
      workflows.set(input.workflowId, workflow);

      return listing;
    }),

  browseMarketplace: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
      search: z.string().optional(),
      sortBy: z.enum(['popular', 'recent', 'rating']).optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }))
    .query(({ input }) => {
      let results = Array.from(marketplace.values());

      // Filter by category
      if (input.category) {
        results = results.filter(l => l.category === input.category);
      }

      // Filter by tags
      if (input.tags && input.tags.length > 0) {
        results = results.filter(l =>
          input.tags!.some(tag => l.tags.includes(tag))
        );
      }

      // Search
      if (input.search) {
        const search = input.search.toLowerCase();
        results = results.filter(l =>
          l.workflow.name.toLowerCase().includes(search) ||
          l.description.toLowerCase().includes(search)
        );
      }

      // Sort
      const sortBy = input.sortBy || 'popular';
      if (sortBy === 'popular') {
        results.sort((a, b) => b.downloads - a.downloads);
      } else if (sortBy === 'recent') {
        results.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
      } else if (sortBy === 'rating') {
        results.sort((a, b) => b.rating - a.rating);
      }

      const total = results.length;
      const offset = input.offset || 0;
      const limit = input.limit || 20;

      results = results.slice(offset, offset + limit);

      return {
        listings: results,
        total,
        offset,
        limit,
      };
    }),

  likeWorkflow: publicProcedure
    .input(z.object({
      workflowId: z.string(),
      userId: z.string(),
    }))
    .mutation(({ input }) => {
      const workflow = workflows.get(input.workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      workflow.likeCount = (workflow.likeCount || 0) + 1;
      workflows.set(input.workflowId, workflow);

      return workflow;
    }),

  // Analytics

  getAnalytics: publicProcedure
    .input(z.object({
      workflowId: z.string(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(({ input }) => {
      const workflowExecutions = executions.get(input.workflowId) || [];

      let filtered = workflowExecutions;
      if (input.startDate) {
        filtered = filtered.filter(e => e.startTime >= input.startDate!);
      }
      if (input.endDate) {
        filtered = filtered.filter(e => e.startTime <= input.endDate!);
      }

      const totalExecutions = filtered.length;
      const successfulExecutions = filtered.filter(e => e.status === 'completed').length;
      const failedExecutions = filtered.filter(e => e.status === 'failed').length;

      const avgDuration = filtered.length > 0
        ? filtered.reduce((sum, e) => sum + (e.metrics?.duration || 0), 0) / filtered.length
        : 0;

      const totalTokens = filtered.reduce((sum, e) => sum + (e.metrics?.tokensUsed || 0), 0);

      // Execution timeline
      const timeline = filtered.map(e => ({
        timestamp: e.startTime,
        status: e.status,
        duration: e.metrics?.duration,
      }));

      return {
        workflowId: input.workflowId,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
        avgDuration,
        totalTokens,
        timeline,
      };
    }),

  getOverallStats: publicProcedure
    .query(() => {
      const totalWorkflows = workflows.size;
      const totalExecutions = Array.from(executions.values()).reduce((sum, arr) => sum + arr.length, 0);
      const totalMarketplaceListings = marketplace.size;

      return {
        totalWorkflows,
        totalExecutions,
        totalMarketplaceListings,
        timestamp: new Date(),
      };
    }),
});
