#!/usr/bin/env node
/**
 * Standalone Nephesh Worker
 *
 * This script runs independently of Next.js to avoid bundling issues with pg-boss.
 * It connects directly to the database and processes background jobs.
 */

// Import PgBoss from the pg-boss module (it's exported as a named export)
const { PgBoss } = require('pg-boss');

// Configuration from environment
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING;
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '2', 10);
const JOB_TIMEOUT_MS = parseInt(process.env.JOB_TIMEOUT_MS || '300000', 10);

console.log('==============================================');
console.log('  Nephesh Standalone Worker');
console.log('==============================================');
console.log(`Concurrency: ${WORKER_CONCURRENCY}`);
console.log(`Job Timeout: ${JOB_TIMEOUT_MS}ms`);
console.log('');

// Validate configuration
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL or POSTGRES_URL_NON_POOLING must be set');
  process.exit(1);
}

console.log('[Worker] Initializing pg-boss...');

// Initialize pg-boss
const boss = new PgBoss({
  connectionString: DATABASE_URL,

  // Schema configuration (must match job-queue.ts)
  schema: 'pgboss', // Separate schema for pg-boss tables

  // Retry configuration
  retryLimit: 3,
  retryDelay: 60,
  retryBackoff: true,

  // Queue configuration
  expireInHours: 24,
  archiveCompletedAfterSeconds: 3600,
  deleteArchivedAfterSeconds: 7 * 24 * 3600, // 7 days

  // Monitoring
  monitorStateIntervalSeconds: 60,

  // Supervisor and scheduling
  noSupervisor: false,
  noScheduling: false,
});

// Job handler
async function handleExecuteJob(job) {
  const { jobId, profileId } = job.data;
  console.log(`[Worker] Processing job ${jobId} for profile ${profileId}`);

  try {
    // TODO: Implement actual job execution logic
    // For now, just log that we received the job
    console.log(`[Worker] Job data:`, JSON.stringify(job.data, null, 2));

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log(`[Worker] ✅ Job ${jobId} completed`);
  } catch (error) {
    console.error(`[Worker] ❌ Job ${jobId} failed:`, error);
    throw error;
  }
}

// Start worker
async function start() {
  try {
    console.log('[Worker] Starting pg-boss...');
    await boss.start();
    console.log('[Worker] ✅ pg-boss started successfully');

    // Ensure queue exists before registering handler
    console.log('[Worker] Creating queue "nephesh_execute_job" (if not exists)...');
    await boss.createQueue('nephesh_execute_job');
    console.log('[Worker] ✅ Queue created/verified');

    // Register job handler
    console.log('[Worker] Registering job handler for "nephesh_execute_job"...');
    await boss.work(
      'nephesh_execute_job',
      { teamSize: WORKER_CONCURRENCY, teamConcurrency: WORKER_CONCURRENCY },
      handleExecuteJob
    );

    console.log('[Worker] ✅ Worker started and listening for jobs');
    console.log('');
    console.log('==============================================');
    console.log('  Worker is now active');
    console.log('==============================================');

  } catch (error) {
    console.error('[Worker] ❌ Failed to start worker:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal) {
  console.log('');
  console.log(`[Worker] Received ${signal}, shutting down gracefully...`);
  try {
    await boss.stop();
    console.log('[Worker] ✅ Worker stopped successfully');
    process.exit(0);
  } catch (error) {
    console.error('[Worker] ❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start the worker
start().catch((error) => {
  console.error('[Worker] Fatal error:', error);
  process.exit(1);
});
