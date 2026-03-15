/**
 * Job Cancellation System
 *
 * Provides a mechanism for jobs to check if they've been cancelled
 * and abort execution gracefully.
 */

import { prismaDb } from '~/server/prisma/prismaDb';

// In-memory map of active job abort controllers
const activeJobs = new Map<string, AbortController>();

/**
 * Register a job as active with an abort controller
 */
export function registerActiveJob(jobId: string): AbortController {
  const controller = new AbortController();
  activeJobs.set(jobId, controller);
  return controller;
}

/**
 * Unregister a job when it completes or fails
 */
export function unregisterActiveJob(jobId: string): void {
  activeJobs.delete(jobId);
}

/**
 * Cancel a running job by ID
 */
export function cancelActiveJob(jobId: string): boolean {
  const controller = activeJobs.get(jobId);
  if (controller) {
    controller.abort();
    activeJobs.delete(jobId);
    return true;
  }
  return false;
}

/**
 * Check if a job has been cancelled in the database
 * This allows for external cancellation requests
 */
export async function checkJobCancellation(jobId: string): Promise<boolean> {
  const job = await prismaDb.nepheshJob.findUnique({
    where: { id: jobId },
    select: { status: true, error: true },
  });

  // Job is cancelled if status is ERROR and error contains "Cancelled"
  return job?.status === 'ERROR' && job.error?.includes('Cancelled by user') || false;
}

/**
 * Get number of active jobs
 */
export function getActiveJobCount(): number {
  return activeJobs.size;
}

/**
 * Get list of active job IDs
 */
export function getActiveJobIds(): string[] {
  return Array.from(activeJobs.keys());
}

/**
 * Cancel all active jobs (used during shutdown)
 */
export function cancelAllActiveJobs(): void {
  console.log(`[JobCancellation] Cancelling ${activeJobs.size} active jobs...`);
  for (const [jobId, controller] of activeJobs) {
    controller.abort();
    console.log(`[JobCancellation] Cancelled job ${jobId}`);
  }
  activeJobs.clear();
}
