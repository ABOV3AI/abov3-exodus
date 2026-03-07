/**
 * Nephesh tRPC Router - API endpoints for autonomous agent profiles
 *
 * NOTE: Currently using in-memory mock data for development.
 * TODO: Replace with Prisma database calls once schema is migrated.
 */

import * as z from 'zod/v4';
import { TRPCError } from '@trpc/server';

import { createTRPCRouter, nepheshProcedure } from '~/server/trpc/trpc.server';
import { SUBSCRIPTION_LIMITS, type SubscriptionTier, type NepheshProfile, type NepheshJob } from '../nephesh.types';

//
// In-memory mock data store (replaced by Prisma later)
//

const mockProfiles: Map<string, NepheshProfile> = new Map();
const mockJobs: Map<string, NepheshJob> = new Map();

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

//
// Validation Schemas
//

const ToolPermissionsSchema = z.object({
  fileOps: z.boolean(),
  web: z.boolean(),
  codeExec: z.boolean(),
  mcp: z.boolean(),
  customTools: z.array(z.string()),
});

const ChannelBindingsSchema = z.object({
  telegram: z.object({
    chatId: z.string(),
    botToken: z.string().optional(),
  }).optional(),
  whatsapp: z.object({
    phoneNumber: z.string(),
    accessToken: z.string().optional(),
  }).optional(),
  slack: z.object({
    channelId: z.string(),
    botToken: z.string().optional(),
  }).optional(),
  discord: z.object({
    channelId: z.string(),
    botToken: z.string().optional(),
  }).optional(),
});

//
// Nephesh Router
//

export const nepheshRouter = createTRPCRouter({

  //
  // Profile Management
  //

  /**
   * List all profiles for the authenticated user
   */
  listProfiles: nepheshProcedure
    .query(({ ctx }) => {
      const userProfiles = Array.from(mockProfiles.values())
        .filter(p => p.userId === ctx.userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return userProfiles;
    }),

  /**
   * Get a specific profile by ID
   */
  getProfile: nepheshProcedure
    .input(z.object({ profileId: z.string() }))
    .query(({ ctx, input }) => {
      const profile = mockProfiles.get(input.profileId);

      // Verify ownership
      if (profile && profile.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      return profile || null;
    }),

  /**
   * Create a new profile
   */
  createProfile: nepheshProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      systemMessage: z.string().min(1),
      llmId: z.string(),
      temperature: z.number().min(0).max(2).default(0.7),
      maxTokens: z.number().min(100).max(32000).default(2048),
      enabledSkills: z.array(z.string()).default([]),
      enabledTools: ToolPermissionsSchema.default({
        fileOps: false,
        web: true,
        codeExec: false,
        mcp: false,
        customTools: [],
      }),
      memoryEnabled: z.boolean().default(true),
      memoryMaxItems: z.number().min(100).max(10000).default(1000),
      channelBindings: ChannelBindingsSchema.default({}),
      tier: z.enum(['FREE', 'COMMERCIAL', 'ENTERPRISE']).default('FREE'),
    }))
    .mutation(({ ctx, input }) => {
      // Check subscription tier limits
      const existingProfilesCount = Array.from(mockProfiles.values())
        .filter(p => p.userId === ctx.userId).length;

      const tierLimit = SUBSCRIPTION_LIMITS[input.tier as SubscriptionTier].profiles;
      if (existingProfilesCount >= tierLimit) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Profile limit reached for ${input.tier} tier (${tierLimit} max)`,
        });
      }

      // Create profile
      const profile: NepheshProfile = {
        id: generateId(),
        userId: ctx.userId,
        name: input.name,
        description: input.description || null,
        systemMessage: input.systemMessage,
        enabled: true,
        llmId: input.llmId,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        enabledSkills: input.enabledSkills,
        enabledTools: input.enabledTools,
        memoryEnabled: input.memoryEnabled,
        memoryMaxItems: input.memoryMaxItems,
        channelBindings: input.channelBindings,
        tier: input.tier as SubscriptionTier,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockProfiles.set(profile.id, profile);
      return profile;
    }),

  /**
   * Update an existing profile
   */
  updateProfile: nepheshProcedure
    .input(z.object({
      profileId: z.string(),
      updates: z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        systemMessage: z.string().min(1).optional(),
        llmId: z.string().optional(),
        temperature: z.number().min(0).max(2).optional(),
        maxTokens: z.number().min(100).max(32000).optional(),
        enabledSkills: z.array(z.string()).optional(),
        enabledTools: ToolPermissionsSchema.optional(),
        memoryEnabled: z.boolean().optional(),
        memoryMaxItems: z.number().min(100).max(10000).optional(),
        channelBindings: ChannelBindingsSchema.optional(),
      }),
    }))
    .mutation(({ ctx, input }) => {
      // Verify ownership
      const existing = mockProfiles.get(input.profileId);

      if (!existing || existing.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      // Update profile
      const profile: NepheshProfile = {
        ...existing,
        ...input.updates,
        updatedAt: new Date().toISOString(),
      };

      mockProfiles.set(profile.id, profile);
      return profile;
    }),

  /**
   * Delete a profile
   */
  deleteProfile: nepheshProcedure
    .input(z.object({ profileId: z.string() }))
    .mutation(({ ctx, input }) => {
      // Verify ownership
      const existing = mockProfiles.get(input.profileId);

      if (!existing || existing.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      // Delete profile and associated jobs
      mockProfiles.delete(input.profileId);
      for (const [jobId, job] of mockJobs) {
        if (job.profileId === input.profileId) {
          mockJobs.delete(jobId);
        }
      }

      return { success: true };
    }),

  /**
   * Toggle profile enabled/disabled
   */
  toggleProfile: nepheshProcedure
    .input(z.object({
      profileId: z.string(),
      enabled: z.boolean(),
    }))
    .mutation(({ ctx, input }) => {
      // Verify ownership
      const existing = mockProfiles.get(input.profileId);

      if (!existing || existing.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      // Update enabled status
      const profile: NepheshProfile = {
        ...existing,
        enabled: input.enabled,
        updatedAt: new Date().toISOString(),
      };

      mockProfiles.set(profile.id, profile);
      return profile;
    }),

  //
  // Job Management
  //

  /**
   * List jobs for a profile or all user profiles
   */
  listJobs: nepheshProcedure
    .input(z.object({
      profileId: z.string().optional(),
      status: z.enum(['IDLE', 'QUEUED', 'RUNNING', 'COMPLETED', 'ERROR']).optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(({ ctx, input }) => {
      // Get user's profile IDs
      const userProfileIds = new Set(
        Array.from(mockProfiles.values())
          .filter(p => p.userId === ctx.userId)
          .map(p => p.id)
      );

      // Filter jobs
      let jobs = Array.from(mockJobs.values())
        .filter(j => userProfileIds.has(j.profileId));

      // Filter by profile if specified
      if (input.profileId) {
        if (!userProfileIds.has(input.profileId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        jobs = jobs.filter(j => j.profileId === input.profileId);
      }

      // Filter by status if specified
      if (input.status) {
        jobs = jobs.filter(j => j.status === input.status);
      }

      // Sort and limit
      jobs = jobs
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, input.limit);

      // Add profile info
      return jobs.map(job => ({
        ...job,
        profile: mockProfiles.get(job.profileId),
      }));
    }),

  /**
   * Create a manual job (execution happens client-side)
   */
  createJob: nepheshProcedure
    .input(z.object({
      profileId: z.string(),
      prompt: z.string().min(1),
      name: z.string().default('Manual Task'),
    }))
    .mutation(({ ctx, input }) => {
      // Verify ownership and load profile
      const profile = mockProfiles.get(input.profileId);

      if (!profile || profile.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      if (!profile.enabled) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Profile is disabled' });
      }

      // Create job record in QUEUED state
      const job: NepheshJob = {
        id: generateId(),
        profileId: input.profileId,
        name: input.name,
        type: 'MANUAL',
        status: 'QUEUED',
        inputPrompt: input.prompt,
        progress: 0,
        currentStep: null,
        resultMessages: null,
        heartbeatSkill: null,
        lastHeartbeat: null,
        nextHeartbeat: null,
        logs: [],
        executionCount: 0,
        totalTokens: 0,
        error: null,
        retryCount: 0,
        maxRetries: 3,
        schedule: null,
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
      };

      mockJobs.set(job.id, job);
      return job;
    }),

  /**
   * Update job status and results (called by client after execution)
   */
  updateJob: nepheshProcedure
    .input(z.object({
      jobId: z.string(),
      status: z.enum(['IDLE', 'QUEUED', 'RUNNING', 'COMPLETED', 'ERROR']),
      resultMessages: z.any().optional(),
      totalTokens: z.number().optional(),
      error: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      // Get job and verify ownership
      const job = mockJobs.get(input.jobId);
      if (!job) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' });
      }

      const profile = mockProfiles.get(job.profileId);
      if (!profile || profile.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      // Update job
      const updatedJob: NepheshJob = {
        ...job,
        status: input.status,
        resultMessages: input.resultMessages || job.resultMessages,
        totalTokens: input.totalTokens || job.totalTokens,
        error: input.error || job.error,
        completedAt: (input.status === 'COMPLETED' || input.status === 'ERROR')
          ? new Date().toISOString()
          : job.completedAt,
        startedAt: input.status === 'RUNNING'
          ? new Date().toISOString()
          : job.startedAt,
        executionCount: input.status === 'COMPLETED'
          ? job.executionCount + 1
          : job.executionCount,
      };

      mockJobs.set(updatedJob.id, updatedJob);
      return updatedJob;
    }),

  /**
   * Cancel a running job (cancellation logic happens client-side)
   */
  cancelJob: nepheshProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(({ ctx, input }) => {
      // Get job and verify ownership
      const job = mockJobs.get(input.jobId);
      if (!job) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' });
      }

      const profile = mockProfiles.get(job.profileId);
      if (!profile || profile.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      // Update job status
      const updatedJob: NepheshJob = {
        ...job,
        status: 'ERROR',
        error: 'Cancelled by user',
        completedAt: new Date().toISOString(),
      };

      mockJobs.set(updatedJob.id, updatedJob);
      return updatedJob;
    }),

  /**
   * Get profile statistics
   */
  getProfileStats: nepheshProcedure
    .input(z.object({ profileId: z.string() }))
    .query(({ ctx, input }) => {
      // Verify ownership
      const profile = mockProfiles.get(input.profileId);

      if (!profile || profile.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      // Calculate stats from jobs
      const profileJobs = Array.from(mockJobs.values())
        .filter(j => j.profileId === input.profileId);

      const totalJobs = profileJobs.length;
      const completedJobs = profileJobs.filter(j => j.status === 'COMPLETED').length;
      const failedJobs = profileJobs.filter(j => j.status === 'ERROR').length;
      const totalTokens = profileJobs.reduce((sum, j) => sum + (j.totalTokens || 0), 0);

      // Get last execution
      const sortedJobs = profileJobs
        .filter(j => j.completedAt)
        .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

      return {
        profileId: input.profileId,
        totalJobs,
        completedJobs,
        failedJobs,
        totalTokens,
        estimatedCost: 0, // TODO: Calculate based on model pricing
        lastExecution: sortedJobs[0]?.completedAt || null,
        memoryCount: 0, // Mock: no memory items yet
        memoryUsage: 0,
      };
    }),

});
