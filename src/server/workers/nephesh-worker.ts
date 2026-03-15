/**
 * Nephesh Background Worker
 *
 * Consumes jobs from the pg-boss queue and executes Nephesh profile tasks.
 * This worker runs continuously in the background, processing jobs as they arrive.
 */

import { getJobQueue, JOB_QUEUES, type ExecuteJobData } from '~/server/queue/job-queue';
import { prismaDb } from '~/server/prisma/prismaDb';
import { registerActiveJob, unregisterActiveJob, checkJobCancellation, cancelAllActiveJobs } from './job-cancellation';
import { aixChatGenerateContent_DMessage } from '~/modules/aix/client/aix.client';
import { aixCreateChatGenerateContext, aixCreateModelFromLLMOptions } from '~/modules/aix/client/aix.client';
import { aixCGR_FromSimpleText } from '~/modules/aix/client/aix.client.chatGenerateRequest';
import { findLLMOrThrow } from '~/common/stores/llms/store-llms';
import { findServiceAccessOrThrow } from '~/modules/llms/vendors/vendor.helpers';
import { getAllModelParameterValues } from '~/common/stores/llms/llms.parameters';
import type { DMessage } from '~/common/stores/chat/chat.message';

// Worker configuration
const WORKER_CONCURRENCY = 2; // Process 2 jobs in parallel
const JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minute timeout per job

/**
 * Start the Nephesh worker
 */
export async function startNepheshWorker(): Promise<void> {
  console.log('[NepheshWorker] Starting background worker...');

  const queue = getJobQueue();

  // Register job handler for execute jobs
  await queue.work(
    JOB_QUEUES.EXECUTE_JOB,
    { teamSize: WORKER_CONCURRENCY, teamConcurrency: WORKER_CONCURRENCY },
    async (job: any) => {
      const data = job.data as ExecuteJobData;
      console.log(`[NepheshWorker] Processing job ${data.jobId} for profile ${data.profileId}`);

      try {
        await executeNepheshJob(data);
        console.log(`[NepheshWorker] ✅ Job ${data.jobId} completed successfully`);
      } catch (error) {
        console.error(`[NepheshWorker] ❌ Job ${data.jobId} failed:`, error);
        throw error; // pg-boss will retry based on retryLimit
      }
    }
  );

  console.log('[NepheshWorker] ✅ Worker started, listening for jobs...');
}

/**
 * Execute a Nephesh job
 */
async function executeNepheshJob(data: ExecuteJobData): Promise<void> {
  const { jobId, profileId, userId } = data;

  // Load job and profile from database
  const job = await prismaDb.nepheshJob.findUnique({
    where: { id: jobId },
    include: { profile: true },
  });

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  if (job.profile.userId !== userId) {
    throw new Error(`Job ${jobId} does not belong to user ${userId}`);
  }

  if (!job.profile.enabled) {
    throw new Error(`Profile ${profileId} is disabled`);
  }

  // Register job with cancellation system
  const abortController = registerActiveJob(jobId);

  // Update job status to RUNNING
  await prismaDb.nepheshJob.update({
    where: { id: jobId },
    data: {
      status: 'RUNNING',
      startedAt: new Date(),
      currentStep: 'Initializing...',
      progress: 0,
    },
  });

  try {
    // Execute the task with timeout and cancellation
    const result = await Promise.race([
      executeTask(job, job.profile, abortController.signal),
      timeout(JOB_TIMEOUT_MS),
      cancellationCheck(jobId),
    ]);

    // Update job with results
    await prismaDb.nepheshJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        resultMessages: result.messages as any, // Prisma Json type
        totalTokens: result.totalTokens,
        progress: 100,
        currentStep: 'Completed',
        executionCount: { increment: 1 },
      },
    });

  } catch (error) {
    // Check if it was a cancellation
    const wasCancelled = abortController.signal.aborted || (error instanceof Error && error.message.includes('Cancelled'));

    // Update job with error
    await prismaDb.nepheshJob.update({
      where: { id: jobId },
      data: {
        status: 'ERROR',
        completedAt: new Date(),
        error: wasCancelled ? 'Cancelled by user' : (error instanceof Error ? error.message : String(error)),
        progress: 0,
        currentStep: 'Failed',
      },
    });

    // Don't retry cancelled jobs
    if (wasCancelled) {
      console.log(`[NepheshWorker] Job ${jobId} was cancelled, not retrying`);
    } else {
      throw error; // Re-throw for pg-boss retry logic
    }

  } finally {
    // Always unregister the job
    unregisterActiveJob(jobId);
  }
}

/**
 * Execute a task using the profile's configuration
 */
async function executeTask(
  job: any,
  profile: any,
  abortSignal: AbortSignal
): Promise<{ messages: DMessage[]; totalTokens: number }> {
  // Get the prompt from job
  const prompt = job.inputPrompt || 'Hello, how can I assist you?';

  // Update progress
  await prismaDb.nepheshJob.update({
    where: { id: job.id },
    data: {
      currentStep: 'Loading LLM configuration...',
      progress: 10,
    },
  });

  // Load LLM configuration
  // Note: This is a simplified implementation. In production, you'd need to:
  // 1. Initialize the LLM store with user's models
  // 2. Handle user-specific API keys
  // 3. Implement proper error handling for missing models

  // For now, we'll use a mock implementation that would need to be replaced
  // with proper user context loading

  console.log(`[NepheshWorker] Executing task for profile ${profile.name}`);
  console.log(`[NepheshWorker] LLM: ${profile.llmId}`);
  console.log(`[NepheshWorker] Prompt: ${prompt.substring(0, 100)}...`);

  // Update progress
  await prismaDb.nepheshJob.update({
    where: { id: job.id },
    data: {
      currentStep: 'Generating response...',
      progress: 30,
    },
  });

  // TODO: Proper AIX integration with user context
  // This requires:
  // 1. Loading user's LLM store state
  // 2. Getting user's API keys from database or environment
  // 3. Creating proper AIX context

  // For now, create a mock response
  const now = Date.now();
  const mockResponse: DMessage = {
    id: `msg-${now}`,
    role: 'assistant',
    fragments: [
      {
        ft: 'content',
        fId: `frag-${now}`,
        part: {
          pt: 'text',
          text: `[Nephesh Job ${job.id}] This is a placeholder response. Full AIX integration will be implemented in the next iteration.`,
        },
      },
    ],
    tokenCount: 50,
    created: now,
    updated: now,
  };

  // Update progress
  await prismaDb.nepheshJob.update({
    where: { id: job.id },
    data: {
      currentStep: 'Processing complete',
      progress: 90,
    },
  });

  return {
    messages: [mockResponse],
    totalTokens: 50,
  };

  /*
  // Full AIX implementation (to be completed):

  // 1. Load user's LLM
  const llm = findLLMOrThrow(profile.llmId);
  const { transportAccess, vendor, serviceSettings } = findServiceAccessOrThrow(llm.sId);

  // 2. Create AIX model
  const llmParameters = getAllModelParameterValues(llm.initialParameters, llm.userParameters);
  llmParameters.llmTemperature = profile.temperature;
  llmParameters.llmResponseTokens = profile.maxTokens;

  const aixModel = aixCreateModelFromLLMOptions(
    llm.interfaces,
    llmParameters,
    undefined,
    profile.llmId,
    profile.enabledTools?.web || false
  );

  // 3. Create chat request
  const systemMessage = profile.systemMessage;
  const chatRequest = aixCGR_FromSimpleText(systemMessage, prompt);

  // 4. Execute with AIX
  const context = aixCreateChatGenerateContext('nephesh-job', job.id);
  const abortController = new AbortController();

  const result = await aixChatGenerateContent_DMessage(
    profile.llmId,
    chatRequest,
    context,
    true, // streaming
    {
      abortSignal: abortController.signal,
      throttleParallelThreads: 0,
    },
    async (update, isDone) => {
      // Update progress based on streaming
      if (!isDone) {
        await prismaDb.nepheshJob.update({
          where: { id: job.id },
          data: {
            progress: Math.min(90, 30 + (update.fragments.length * 10)),
          },
        });
      }
    }
  );

  return {
    messages: [result as any],
    totalTokens: result.generator?.metrics?.TIn || 0 + result.generator?.metrics?.TOut || 0,
  };
  */
}

/**
 * Timeout helper
 */
function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Job timeout after ${ms}ms`)), ms)
  );
}

/**
 * Cancellation check helper
 * Polls the database every 5 seconds to check if job was cancelled
 */
async function cancellationCheck(jobId: string): Promise<never> {
  return new Promise((_, reject) => {
    const interval = setInterval(async () => {
      const cancelled = await checkJobCancellation(jobId);
      if (cancelled) {
        clearInterval(interval);
        reject(new Error('Job cancelled by user'));
      }
    }, 5000); // Check every 5 seconds
  });
}

/**
 * Stop the Nephesh worker
 */
export async function stopNepheshWorker(): Promise<void> {
  console.log('[NepheshWorker] Stopping worker...');

  // Cancel all active jobs
  cancelAllActiveJobs();

  // pg-boss handles worker cleanup when queue is stopped
  console.log('[NepheshWorker] ✅ Worker stopped');
}
