import { NextResponse } from 'next/server';
import { prismaDb } from '~/server/prisma/prismaDb';
import { isJobQueueHealthy } from '~/server/queue/job-queue';

/**
 * Health Check Endpoint
 *
 * Used by Kubernetes liveness/readiness probes and monitoring to verify:
 * - Application is running
 * - Database connection is working (if configured)
 * - Job queue is operational (if configured)
 */
export async function GET() {
  try {
    const health: {
      status: 'ok' | 'degraded' | 'error';
      timestamp: string;
      database?: 'connected' | 'disconnected' | 'not_configured';
      jobQueue?: 'connected' | 'disconnected' | 'not_configured';
      error?: string;
    } = {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };

    // Check database connection if configured
    const databaseUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;

    if (databaseUrl) {
      try {
        // Simple query to verify database connection
        await prismaDb.$queryRaw`SELECT 1`;
        health.database = 'connected';
      } catch (dbError) {
        console.error('Health check: Database connection failed', dbError);
        health.database = 'disconnected';
        health.status = 'degraded';
        health.error = 'Database connection failed';
      }
    } else {
      health.database = 'not_configured';
      // Not an error - app works without database using browser storage
    }

    // Check job queue health (for Nephesh background jobs)
    if (databaseUrl) {
      try {
        const queueHealthy = await isJobQueueHealthy();
        health.jobQueue = queueHealthy ? 'connected' : 'disconnected';
        if (!queueHealthy && health.status === 'ok') {
          health.status = 'degraded';
          health.error = (health.error ? health.error + '; ' : '') + 'Job queue not operational';
        }
      } catch (queueError) {
        console.error('Health check: Job queue check failed', queueError);
        health.jobQueue = 'disconnected';
        if (health.status === 'ok') {
          health.status = 'degraded';
          health.error = (health.error ? health.error + '; ' : '') + 'Job queue check failed';
        }
      }
    } else {
      health.jobQueue = 'not_configured';
    }

    const statusCode = health.status === 'ok' ? 200 : health.status === 'degraded' ? 503 : 500;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
