/**
 * Nephesh Job Executor - Client-side job execution
 * Handles running jobs using ProfileHandler and updating job status
 */

'use client';

import { profilesManager } from '~/modules/nephesh/profiles/ProfilesManager';
import type { NepheshProfile, NepheshJob } from '~/modules/nephesh/nephesh.types';
import { apiAsyncNode } from '~/common/util/trpc.client';

/**
 * Execute a job client-side using ProfileHandler
 */
export async function executeJobClientSide(
  profile: NepheshProfile,
  job: NepheshJob,
  onProgress?: (message: string) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update job to RUNNING
    await apiAsyncNode.nephesh.updateJob.mutate({
      jobId: job.id,
      status: 'RUNNING',
    });

    onProgress?.('Starting execution...');

    // Get or create handler
    const handler = profilesManager.getHandler(profile);

    // Execute task
    const result = await handler.executeTask({
      prompt: job.inputPrompt || '',
      jobId: job.id,
    });

    onProgress?.('Execution complete, saving results...');

    // Update job with results
    await apiAsyncNode.nephesh.updateJob.mutate({
      jobId: job.id,
      status: result.error ? 'ERROR' : 'COMPLETED',
      resultMessages: result.messages as any,
      totalTokens: result.tokens,
      error: result.error,
    });

    return { success: !result.error, error: result.error };

  } catch (error: any) {
    // Update job with error
    await apiAsyncNode.nephesh.updateJob.mutate({
      jobId: job.id,
      status: 'ERROR',
      error: error.message || 'Unknown error',
    });

    return { success: false, error: error.message };
  }
}

/**
 * Cancel a running job client-side
 */
export function cancelJobClientSide(profileId: string): void {
  const handler = profilesManager.getHandlerById(profileId);
  if (handler) {
    handler.cancelExecution();
  }
}
