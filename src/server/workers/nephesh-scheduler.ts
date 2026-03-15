/**
 * Nephesh Scheduler
 *
 * Manages scheduled and heartbeat jobs for autonomous agent execution.
 * - HEARTBEAT jobs: Recurring autonomous tasks (e.g., check inbox every 5 minutes)
 * - SCHEDULED jobs: Cron-based tasks (e.g., daily summary at 9 AM)
 */

import cron from 'node-cron';
import { prismaDb } from '~/server/prisma/prismaDb';
import { enqueueExecuteJob } from '~/server/queue/job-queue';

// Scheduler configuration
const HEARTBEAT_CHECK_INTERVAL = 60 * 1000; // Check every 60 seconds for due heartbeats
const MAX_HEARTBEAT_INTERVAL = 24 * 60 * 60 * 1000; // Max 24 hours between heartbeats

// Active scheduled jobs (cron tasks)
const activeScheduledJobs = new Map<string, cron.ScheduledTask>();

// Heartbeat check interval
let heartbeatInterval: NodeJS.Timeout | null = null;

/**
 * Start the Nephesh scheduler
 */
export async function startNepheshScheduler(): Promise<void> {
  console.log('[NepheshScheduler] Starting scheduler...');

  // Start heartbeat checker
  heartbeatInterval = setInterval(checkHeartbeats, HEARTBEAT_CHECK_INTERVAL);
  console.log('[NepheshScheduler] Heartbeat checker started (every 60s)');

  // Load and schedule all SCHEDULED jobs
  await loadScheduledJobs();

  console.log('[NepheshScheduler] ✅ Scheduler started');
}

/**
 * Stop the Nephesh scheduler
 */
export async function stopNepheshScheduler(): Promise<void> {
  console.log('[NepheshScheduler] Stopping scheduler...');

  // Stop heartbeat checker
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  // Stop all scheduled jobs
  for (const [jobId, task] of activeScheduledJobs) {
    task.stop();
    console.log(`[NepheshScheduler] Stopped scheduled job ${jobId}`);
  }
  activeScheduledJobs.clear();

  console.log('[NepheshScheduler] ✅ Scheduler stopped');
}

/**
 * Check for heartbeat jobs that are due to run
 */
async function checkHeartbeats(): Promise<void> {
  try {
    const now = new Date();

    // Find all HEARTBEAT jobs that are due
    const dueJobs = await prismaDb.nepheshJob.findMany({
      where: {
        type: 'HEARTBEAT',
        status: 'IDLE',
        nextHeartbeat: {
          lte: now,
        },
        profile: {
          enabled: true,
        },
      },
      include: {
        profile: true,
      },
      take: 10, // Limit to 10 jobs per check to avoid overload
    });

    if (dueJobs.length === 0) {
      return;
    }

    console.log(`[NepheshScheduler] Found ${dueJobs.length} due heartbeat jobs`);

    // Enqueue each due job
    for (const job of dueJobs) {
      try {
        // Enqueue the job
        await enqueueExecuteJob({
          jobId: job.id,
          profileId: job.profileId,
          userId: job.profile.userId,
        });

        // Calculate next heartbeat time
        const nextHeartbeat = calculateNextHeartbeat(job.schedule);

        // Update job status
        await prismaDb.nepheshJob.update({
          where: { id: job.id },
          data: {
            status: 'QUEUED',
            lastHeartbeat: now,
            nextHeartbeat,
          },
        });

        console.log(`[NepheshScheduler] Enqueued heartbeat job ${job.id}, next at ${nextHeartbeat?.toISOString()}`);

      } catch (error) {
        console.error(`[NepheshScheduler] Failed to enqueue heartbeat job ${job.id}:`, error);

        // Mark job as error
        await prismaDb.nepheshJob.update({
          where: { id: job.id },
          data: {
            status: 'ERROR',
            error: `Failed to enqueue: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        });
      }
    }

  } catch (error) {
    console.error('[NepheshScheduler] Error checking heartbeats:', error);
  }
}

/**
 * Load all SCHEDULED jobs and register cron tasks
 */
async function loadScheduledJobs(): Promise<void> {
  try {
    // Find all SCHEDULED jobs with enabled profiles
    const scheduledJobs = await prismaDb.nepheshJob.findMany({
      where: {
        type: 'SCHEDULED',
        status: {
          in: ['IDLE', 'QUEUED'], // Only active scheduled jobs
        },
        schedule: {
          not: null,
        },
        profile: {
          enabled: true,
        },
      },
      include: {
        profile: true,
      },
    });

    console.log(`[NepheshScheduler] Found ${scheduledJobs.length} scheduled jobs to register`);

    // Register each scheduled job
    for (const job of scheduledJobs) {
      if (!job.schedule) continue;

      try {
        registerScheduledJob(job.id, job.schedule, job.profileId, job.profile.userId);
      } catch (error) {
        console.error(`[NepheshScheduler] Failed to register scheduled job ${job.id}:`, error);
      }
    }

  } catch (error) {
    console.error('[NepheshScheduler] Error loading scheduled jobs:', error);
  }
}

/**
 * Register a single scheduled job with cron
 */
export function registerScheduledJob(
  jobId: string,
  cronSchedule: string,
  profileId: string,
  userId: string
): void {
  // Validate cron expression
  if (!cron.validate(cronSchedule)) {
    throw new Error(`Invalid cron expression: ${cronSchedule}`);
  }

  // Stop existing task if any
  const existingTask = activeScheduledJobs.get(jobId);
  if (existingTask) {
    existingTask.stop();
    activeScheduledJobs.delete(jobId);
  }

  // Create new cron task
  const task = cron.schedule(cronSchedule, async () => {
    console.log(`[NepheshScheduler] Triggering scheduled job ${jobId}`);

    try {
      // Check if job still exists and profile is enabled
      const job = await prismaDb.nepheshJob.findUnique({
        where: { id: jobId },
        include: { profile: true },
      });

      if (!job) {
        console.log(`[NepheshScheduler] Job ${jobId} no longer exists, unregistering`);
        unregisterScheduledJob(jobId);
        return;
      }

      if (!job.profile.enabled) {
        console.log(`[NepheshScheduler] Profile ${profileId} is disabled, skipping`);
        return;
      }

      // Enqueue the job
      await enqueueExecuteJob({
        jobId,
        profileId,
        userId,
      });

      // Update job status
      await prismaDb.nepheshJob.update({
        where: { id: jobId },
        data: {
          status: 'QUEUED',
          executionCount: { increment: 1 },
        },
      });

      console.log(`[NepheshScheduler] Successfully enqueued scheduled job ${jobId}`);

    } catch (error) {
      console.error(`[NepheshScheduler] Error executing scheduled job ${jobId}:`, error);

      // Update job with error
      await prismaDb.nepheshJob.update({
        where: { id: jobId },
        data: {
          status: 'ERROR',
          error: `Scheduler error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      }).catch(err => {
        console.error(`[NepheshScheduler] Failed to update job ${jobId} with error:`, err);
      });
    }
  }, {
    scheduled: true,
    timezone: 'UTC', // Use UTC for consistency across deployments
  });

  activeScheduledJobs.set(jobId, task);
  console.log(`[NepheshScheduler] Registered scheduled job ${jobId} with cron: ${cronSchedule}`);
}

/**
 * Unregister a scheduled job
 */
export function unregisterScheduledJob(jobId: string): boolean {
  const task = activeScheduledJobs.get(jobId);
  if (task) {
    task.stop();
    activeScheduledJobs.delete(jobId);
    console.log(`[NepheshScheduler] Unregistered scheduled job ${jobId}`);
    return true;
  }
  return false;
}

/**
 * Calculate next heartbeat time based on schedule
 *
 * Schedule can be:
 * - Cron expression: `* /5 * * * *` (every 5 minutes)
 * - Interval in seconds: `300` (every 5 minutes)
 */
function calculateNextHeartbeat(schedule: string | null): Date | null {
  if (!schedule) return null;

  try {
    // Try to parse as interval in seconds
    const intervalSeconds = parseInt(schedule, 10);
    if (!isNaN(intervalSeconds) && intervalSeconds > 0) {
      // Limit to max 24 hours
      const limitedInterval = Math.min(intervalSeconds * 1000, MAX_HEARTBEAT_INTERVAL);
      return new Date(Date.now() + limitedInterval);
    }

    // Try to parse as cron expression
    if (cron.validate(schedule)) {
      // For cron expressions, calculate next occurrence
      // Note: node-cron doesn't expose getNextDate, so we estimate
      // This is a simplified approach - for production, consider using a library like cron-parser

      // Parse common patterns
      const parts = schedule.split(' ');
      if (parts.length >= 5) {
        const minutes = parts[0];

        // Handle simple cases like "*/5 * * * *" (every 5 minutes)
        if (minutes.startsWith('*/')) {
          const interval = parseInt(minutes.substring(2), 10);
          if (!isNaN(interval)) {
            return new Date(Date.now() + interval * 60 * 1000);
          }
        }

        // Handle specific minute like "0 * * * *" (every hour)
        if (minutes === '0') {
          const now = new Date();
          const nextHour = new Date(now);
          nextHour.setHours(now.getHours() + 1, 0, 0, 0);
          return nextHour;
        }
      }

      // Default: check again in 1 hour for complex cron expressions
      return new Date(Date.now() + 60 * 60 * 1000);
    }

    // Invalid schedule
    console.warn(`[NepheshScheduler] Invalid schedule format: ${schedule}`);
    return null;

  } catch (error) {
    console.error(`[NepheshScheduler] Error calculating next heartbeat:`, error);
    return null;
  }
}

/**
 * Get scheduler statistics
 */
export function getSchedulerStats(): {
  heartbeatRunning: boolean;
  activeScheduledJobs: number;
  scheduledJobIds: string[];
} {
  return {
    heartbeatRunning: heartbeatInterval !== null,
    activeScheduledJobs: activeScheduledJobs.size,
    scheduledJobIds: Array.from(activeScheduledJobs.keys()),
  };
}

/**
 * Create a HEARTBEAT job for a profile
 */
export async function createHeartbeatJob(
  profileId: string,
  userId: string,
  skillId: string,
  intervalSeconds: number
): Promise<string> {
  // Calculate first heartbeat time
  const nextHeartbeat = new Date(Date.now() + intervalSeconds * 1000);

  // Create job
  const job = await prismaDb.nepheshJob.create({
    data: {
      profileId,
      name: `Heartbeat: ${skillId}`,
      type: 'HEARTBEAT',
      status: 'IDLE',
      schedule: intervalSeconds.toString(),
      heartbeatSkill: skillId,
      nextHeartbeat,
      progress: 0,
    },
  });

  console.log(`[NepheshScheduler] Created heartbeat job ${job.id} for profile ${profileId}, interval: ${intervalSeconds}s`);

  return job.id;
}

/**
 * Create a SCHEDULED job for a profile
 */
export async function createScheduledJob(
  profileId: string,
  userId: string,
  name: string,
  cronSchedule: string,
  prompt: string
): Promise<string> {
  // Validate cron expression
  if (!cron.validate(cronSchedule)) {
    throw new Error(`Invalid cron expression: ${cronSchedule}`);
  }

  // Create job
  const job = await prismaDb.nepheshJob.create({
    data: {
      profileId,
      name,
      type: 'SCHEDULED',
      status: 'IDLE',
      schedule: cronSchedule,
      inputPrompt: prompt,
      progress: 0,
    },
  });

  // Register with scheduler
  registerScheduledJob(job.id, cronSchedule, profileId, userId);

  console.log(`[NepheshScheduler] Created scheduled job ${job.id} for profile ${profileId}, cron: ${cronSchedule}`);

  return job.id;
}
