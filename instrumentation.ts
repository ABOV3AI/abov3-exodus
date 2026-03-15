/**
 * Next.js Instrumentation Hook
 *
 * This file runs once when the server starts up (Node.js runtime only).
 * Used to initialize background services like the job queue.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on Node.js server (not in Edge runtime or browser)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Server] Initializing server services...');

    try {
      // Initialize job queue
      const { initializeJobQueue } = await import('./src/server/queue/job-queue');
      await initializeJobQueue();
      console.log('[Server] ✅ Job queue initialized');

      // Start Nephesh worker
      const { startNepheshWorker } = await import('./src/server/workers/nephesh-worker');
      await startNepheshWorker();
      console.log('[Server] ✅ Nephesh worker started');

      // Start Nephesh scheduler
      const { startNepheshScheduler } = await import('./src/server/workers/nephesh-scheduler');
      await startNepheshScheduler();
      console.log('[Server] ✅ Nephesh scheduler started');

      // Graceful shutdown
      const shutdownHandler = async () => {
        console.log('[Server] Received shutdown signal, cleaning up...');

        // Stop scheduler first (no more jobs enqueued)
        const { stopNepheshScheduler } = await import('./src/server/workers/nephesh-scheduler');
        await stopNepheshScheduler();

        // Stop worker (finish processing current jobs)
        const { stopNepheshWorker } = await import('./src/server/workers/nephesh-worker');
        await stopNepheshWorker();

        // Then shutdown queue
        const { shutdownJobQueue } = await import('./src/server/queue/job-queue');
        await shutdownJobQueue();

        process.exit(0);
      };

      process.on('SIGTERM', shutdownHandler);
      process.on('SIGINT', shutdownHandler);

    } catch (error) {
      console.error('[Server] ❌ Failed to initialize services:', error);
      // Don't crash the server, but log the error
      // Services will fail gracefully when accessed
    }

    console.log('[Server] ✅ All services initialized');
  }
}
