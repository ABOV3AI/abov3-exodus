/**
 * Nephesh tRPC Router - API endpoints for autonomous agent profiles
 *
 * Database-backed implementation using Prisma for persistent storage.
 */

import * as z from 'zod/v4';
import { TRPCError } from '@trpc/server';

import { createTRPCRouter, nepheshProcedure } from '~/server/trpc/trpc.server';
import { prismaDb } from '~/server/prisma/prismaDb';
import { SUBSCRIPTION_LIMITS, type SubscriptionTier } from '../nephesh.types';
// Dynamic import to avoid bundling Node.js modules in Edge Runtime
// import { enqueueExecuteJob, getQueueStats } from '~/server/queue/job-queue';
import { cancelActiveJob } from '~/server/workers/job-cancellation';
import type { NepheshProfile as PrismaNepheshProfile, NepheshJob as PrismaNepheshJob, JobType, JobStatus } from '@prisma/client';

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
    .query(async ({ ctx }) => {
      const profiles = await prismaDb.nepheshProfile.findMany({
        where: { userId: ctx.userId },
        orderBy: { createdAt: 'desc' },
      });
      return profiles;
    }),

  /**
   * Get a specific profile by ID
   */
  getProfile: nepheshProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const profile = await prismaDb.nepheshProfile.findFirst({
        where: {
          id: input.profileId,
          userId: ctx.userId, // Security: verify ownership
        },
      });

      return profile;
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
    .mutation(async ({ ctx, input }) => {
      // Check subscription tier limits
      const existingProfilesCount = await prismaDb.nepheshProfile.count({
        where: { userId: ctx.userId },
      });

      const tierLimit = SUBSCRIPTION_LIMITS[input.tier as SubscriptionTier].profiles;
      if (existingProfilesCount >= tierLimit) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Profile limit reached for ${input.tier} tier (${tierLimit} max)`,
        });
      }

      // Create profile
      const profile = await prismaDb.nepheshProfile.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          description: input.description,
          systemMessage: input.systemMessage,
          enabled: true,
          llmId: input.llmId,
          temperature: input.temperature,
          maxTokens: input.maxTokens,
          enabledSkills: input.enabledSkills,
          enabledTools: input.enabledTools as any, // Prisma handles JSON
          memoryEnabled: input.memoryEnabled,
          memoryMaxItems: input.memoryMaxItems,
          channelBindings: input.channelBindings as any, // Prisma handles JSON
          tier: input.tier as SubscriptionTier,
        },
      });

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
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await prismaDb.nepheshProfile.findFirst({
        where: {
          id: input.profileId,
          userId: ctx.userId,
        },
      });

      if (!existing) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      // Update profile
      const profile = await prismaDb.nepheshProfile.update({
        where: { id: input.profileId },
        data: {
          ...input.updates,
          enabledTools: input.updates.enabledTools as any,
          channelBindings: input.updates.channelBindings as any,
        },
      });

      return profile;
    }),

  /**
   * Delete a profile
   */
  deleteProfile: nepheshProcedure
    .input(z.object({ profileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await prismaDb.nepheshProfile.findFirst({
        where: {
          id: input.profileId,
          userId: ctx.userId,
        },
      });

      if (!existing) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      // Delete profile (cascade deletes jobs, memories, channels)
      await prismaDb.nepheshProfile.delete({
        where: { id: input.profileId },
      });

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
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await prismaDb.nepheshProfile.findFirst({
        where: {
          id: input.profileId,
          userId: ctx.userId,
        },
      });

      if (!existing) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      // Update enabled status
      const profile = await prismaDb.nepheshProfile.update({
        where: { id: input.profileId },
        data: { enabled: input.enabled },
      });

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
    .query(async ({ ctx, input }) => {
      // Build where clause
      const where: any = {
        profile: {
          userId: ctx.userId, // Security: only user's jobs
        },
      };

      // Filter by profile if specified
      if (input.profileId) {
        // Verify ownership
        const profile = await prismaDb.nepheshProfile.findFirst({
          where: {
            id: input.profileId,
            userId: ctx.userId,
          },
        });

        if (!profile) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }

        where.profileId = input.profileId;
      }

      // Filter by status if specified
      if (input.status) {
        where.status = input.status;
      }

      // Fetch jobs with profile info
      const jobs = await prismaDb.nepheshJob.findMany({
        where,
        include: {
          profile: true,
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      });

      return jobs;
    }),

  /**
   * Create a manual job (will be executed by background worker)
   */
  createJob: nepheshProcedure
    .input(z.object({
      profileId: z.string(),
      prompt: z.string().min(1),
      name: z.string().default('Manual Task'),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership and load profile
      const profile = await prismaDb.nepheshProfile.findFirst({
        where: {
          id: input.profileId,
          userId: ctx.userId,
        },
      });

      if (!profile) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      if (!profile.enabled) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Profile is disabled' });
      }

      // Create job record in QUEUED state
      const job = await prismaDb.nepheshJob.create({
        data: {
          profileId: input.profileId,
          name: input.name,
          type: 'MANUAL',
          status: 'QUEUED',
          inputPrompt: input.prompt,
          progress: 0,
        },
      });

      // Enqueue job for background execution
      try {
        const { enqueueExecuteJob } = await import('~/server/queue/job-queue');
        await enqueueExecuteJob({
          jobId: job.id,
          profileId: profile.id,
          userId: ctx.userId,
        });
      } catch (error) {
        // If enqueueing fails, mark job as error
        await prismaDb.nepheshJob.update({
          where: { id: job.id },
          data: {
            status: 'ERROR',
            error: `Failed to enqueue job: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to queue job for execution',
        });
      }

      return job;
    }),

  /**
   * Update job status and results (called by background worker)
   */
  updateJob: nepheshProcedure
    .input(z.object({
      jobId: z.string(),
      status: z.enum(['IDLE', 'QUEUED', 'RUNNING', 'COMPLETED', 'ERROR']),
      progress: z.number().min(0).max(100).optional(),
      currentStep: z.string().optional(),
      resultMessages: z.any().optional(),
      totalTokens: z.number().optional(),
      error: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get job and verify ownership
      const job = await prismaDb.nepheshJob.findFirst({
        where: { id: input.jobId },
        include: { profile: true },
      });

      if (!job) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' });
      }

      if (job.profile.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      // Update job
      const updatedJob = await prismaDb.nepheshJob.update({
        where: { id: input.jobId },
        data: {
          status: input.status,
          progress: input.progress,
          currentStep: input.currentStep,
          resultMessages: input.resultMessages as any,
          totalTokens: input.totalTokens,
          error: input.error,
          completedAt: (input.status === 'COMPLETED' || input.status === 'ERROR')
            ? new Date()
            : undefined,
          startedAt: input.status === 'RUNNING' && !job.startedAt
            ? new Date()
            : undefined,
          executionCount: input.status === 'COMPLETED'
            ? { increment: 1 }
            : undefined,
        },
      });

      return updatedJob;
    }),

  /**
   * Cancel a running job
   */
  cancelJob: nepheshProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get job and verify ownership
      const job = await prismaDb.nepheshJob.findFirst({
        where: { id: input.jobId },
        include: { profile: true },
      });

      if (!job) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' });
      }

      if (job.profile.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      // Signal worker to abort (if job is currently running)
      const wasAborted = cancelActiveJob(input.jobId);

      // Update job status in database
      const updatedJob = await prismaDb.nepheshJob.update({
        where: { id: input.jobId },
        data: {
          status: 'ERROR',
          error: 'Cancelled by user',
          completedAt: new Date(),
        },
      });

      if (wasAborted) {
        console.log(`[Nephesh] Successfully aborted running job ${input.jobId}`);
      } else {
        console.log(`[Nephesh] Job ${input.jobId} was not running, marked as cancelled in database`);
      }

      return updatedJob;
    }),

  /**
   * Get profile statistics
   */
  getProfileStats: nepheshProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const profile = await prismaDb.nepheshProfile.findFirst({
        where: {
          id: input.profileId,
          userId: ctx.userId,
        },
      });

      if (!profile) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      // Calculate stats from jobs
      const [totalJobs, completedJobs, failedJobs, tokenAggregation, lastExecution, memoryCount] = await Promise.all([
        prismaDb.nepheshJob.count({
          where: { profileId: input.profileId },
        }),
        prismaDb.nepheshJob.count({
          where: { profileId: input.profileId, status: 'COMPLETED' },
        }),
        prismaDb.nepheshJob.count({
          where: { profileId: input.profileId, status: 'ERROR' },
        }),
        prismaDb.nepheshJob.aggregate({
          where: { profileId: input.profileId },
          _sum: { totalTokens: true },
        }),
        prismaDb.nepheshJob.findFirst({
          where: {
            profileId: input.profileId,
            completedAt: { not: null },
          },
          orderBy: { completedAt: 'desc' },
          select: { completedAt: true },
        }),
        prismaDb.nepheshMemory.count({
          where: { profileId: input.profileId },
        }),
      ]);

      const totalTokens = tokenAggregation._sum.totalTokens || 0;

      return {
        profileId: input.profileId,
        totalJobs,
        completedJobs,
        failedJobs,
        totalTokens,
        estimatedCost: 0, // TODO: Calculate based on model pricing
        lastExecution: lastExecution?.completedAt?.toISOString() || null,
        memoryCount,
        memoryUsage: 0, // TODO: Calculate memory size
      };
    }),

  /**
   * Get job queue statistics (admin only)
   */
  getQueueStats: nepheshProcedure
    .query(async () => {
      try {
        const { getQueueStats } = await import('~/server/queue/job-queue');
        const stats = await getQueueStats();
        return stats;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get queue statistics',
        });
      }
    }),

});
