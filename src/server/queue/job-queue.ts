/**
 * Job Queue Service - pg-boss integration for Nephesh background jobs
 *
 * pg-boss uses PostgreSQL as the queue backend with SKIP LOCKED for high performance.
 * This service provides a centralized job queue for autonomous agent execution.
 */

// @ts-ignore - pg-boss has complex export types
import PgBoss from 'pg-boss';
import { env } from '~/server/env';

// Job queue names
export const JOB_QUEUES = {
  EXECUTE_JOB: 'nephesh:execute-job',
  HEARTBEAT: 'nephesh:heartbeat',
  SCHEDULED: 'nephesh:scheduled',
  WEBHOOK: 'nephesh:webhook',
} as const;

// Job data types
export interface ExecuteJobData {
  jobId: string;
  profileId: string;
  userId: string;
}

export interface HeartbeatJobData {
  profileId: string;
  skillId: string;
}

export interface WebhookJobData {
  profileId: string;
  platform: 'telegram' | 'whatsapp' | 'slack' | 'discord';
  message: string;
  metadata?: Record<string, any>;
}

// Singleton instance
let jobQueue: PgBoss | null = null;

/**
 * Initialize the job queue (call once at server startup)
 */
export async function initializeJobQueue(): Promise<PgBoss> {
  if (jobQueue) {
    console.log('[JobQueue] Already initialized, returning existing instance');
    return jobQueue;
  }

  const connectionString = env.POSTGRES_PRISMA_URL || env.POSTGRES_URL_NON_POOLING;

  if (!connectionString) {
    throw new Error('[JobQueue] PostgreSQL connection string not configured. Set POSTGRES_PRISMA_URL or POSTGRES_URL_NON_POOLING.');
  }

  console.log('[JobQueue] Initializing pg-boss...');

  jobQueue = new PgBoss({
    connectionString,

    // Schema configuration
    schema: 'pgboss', // Separate schema for pg-boss tables

    // Queue configuration
    archiveCompletedAfterSeconds: 60 * 60 * 24 * 7, // Archive after 7 days
    deleteAfterDays: 30, // Delete archived jobs after 30 days

    // Performance tuning
    newJobCheckInterval: 2000, // Check for new jobs every 2 seconds

    // Retry configuration
    retryLimit: 3, // Max 3 retries per job
    retryDelay: 60, // 60 seconds between retries
    retryBackoff: true, // Exponential backoff

    // Monitoring
    monitorStateIntervalSeconds: 60, // Check queue health every 60 seconds
  });

  // Event listeners for monitoring
  jobQueue.on('error', (error: Error) => {
    console.error('[JobQueue] Error:', error);
  });

  jobQueue.on('maintenance', () => {
    console.log('[JobQueue] Running maintenance tasks');
  });

  // Start the queue
  await jobQueue.start();

  console.log('[JobQueue] ✅ Initialized successfully');

  return jobQueue;
}

/**
 * Get the job queue instance (must be initialized first)
 */
export function getJobQueue(): PgBoss {
  if (!jobQueue) {
    throw new Error('[JobQueue] Not initialized. Call initializeJobQueue() first.');
  }
  return jobQueue;
}

/**
 * Shutdown the job queue gracefully
 */
export async function shutdownJobQueue(): Promise<void> {
  if (!jobQueue) {
    console.log('[JobQueue] Not running, nothing to shutdown');
    return;
  }

  console.log('[JobQueue] Shutting down...');
  await jobQueue.stop({ graceful: true, timeout: 10000 });
  jobQueue = null;
  console.log('[JobQueue] ✅ Shutdown complete');
}

/**
 * Add a job to execute a Nephesh profile task
 */
export async function enqueueExecuteJob(data: ExecuteJobData): Promise<string> {
  const queue = getJobQueue();

  const jobId = await queue.send(JOB_QUEUES.EXECUTE_JOB, data, {
    priority: 10, // Higher priority for manual jobs
    singletonKey: `job-${data.jobId}`, // Prevent duplicate execution
    retryLimit: 3,
  });

  console.log(`[JobQueue] Enqueued execute job: ${jobId} for Nephesh job ${data.jobId}`);
  return jobId!;
}

/**
 * Add a heartbeat job for autonomous execution
 */
export async function enqueueHeartbeatJob(data: HeartbeatJobData, delaySeconds: number = 0): Promise<string> {
  const queue = getJobQueue();

  const jobId = await queue.send(JOB_QUEUES.HEARTBEAT, data, {
    priority: 5, // Lower priority than manual jobs
    startAfter: delaySeconds,
    singletonKey: `heartbeat-${data.profileId}`, // One heartbeat at a time per profile
    retryLimit: 2, // Fewer retries for heartbeats
  });

  console.log(`[JobQueue] Enqueued heartbeat job: ${jobId} for profile ${data.profileId}`);
  return jobId!;
}

/**
 * Add a webhook-triggered job
 */
export async function enqueueWebhookJob(data: WebhookJobData): Promise<string> {
  const queue = getJobQueue();

  const jobId = await queue.send(JOB_QUEUES.WEBHOOK, data, {
    priority: 15, // Highest priority for real-time responses
    retryLimit: 1, // Don't retry webhooks (avoid duplicate messages)
  });

  console.log(`[JobQueue] Enqueued webhook job: ${jobId} for ${data.platform}`);
  return jobId!;
}

/**
 * Cancel a job by ID
 */
export async function cancelJob(jobId: string): Promise<void> {
  const queue = getJobQueue();
  await queue.cancel(jobId);
  console.log(`[JobQueue] Cancelled job: ${jobId}`);
}

/**
 * Get job queue statistics
 */
export async function getQueueStats(): Promise<{
  created: number;
  active: number;
  completed: number;
  failed: number;
}> {
  const queue = getJobQueue();

  const [created, active, completed, failed] = await Promise.all([
    queue.getQueueSize(JOB_QUEUES.EXECUTE_JOB, { state: 'created' }),
    queue.getQueueSize(JOB_QUEUES.EXECUTE_JOB, { state: 'active' }),
    queue.getQueueSize(JOB_QUEUES.EXECUTE_JOB, { state: 'completed' }),
    queue.getQueueSize(JOB_QUEUES.EXECUTE_JOB, { state: 'failed' }),
  ]);

  return { created, active, completed, failed };
}

/**
 * Health check for the job queue
 */
export async function isJobQueueHealthy(): Promise<boolean> {
  try {
    if (!jobQueue) return false;

    // Simple health check: try to get queue size
    await getJobQueue().getQueueSize(JOB_QUEUES.EXECUTE_JOB);
    return true;
  } catch (error) {
    console.error('[JobQueue] Health check failed:', error);
    return false;
  }
}
