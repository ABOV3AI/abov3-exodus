/**
 * Prometheus Metrics Endpoint
 *
 * Exposes application metrics in Prometheus format for monitoring and alerting.
 *
 * GET /api/metrics
 *
 * Metrics exposed:
 * - nephesh_job_queue_depth - Number of jobs waiting in queue
 * - nephesh_active_jobs - Number of currently executing jobs
 * - nephesh_scheduler_heartbeat_jobs - Number of active heartbeat jobs
 * - nephesh_scheduler_scheduled_jobs - Number of active scheduled jobs
 * - nephesh_profiles_total - Total number of enabled profiles
 * - nephesh_jobs_completed_total - Total jobs completed (counter)
 * - nephesh_jobs_failed_total - Total jobs failed (counter)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prismaDb } from '~/server/prisma/prismaDb';
import { getQueueStats } from '~/server/queue/job-queue';
import { getSchedulerStats } from '~/server/workers/nephesh-scheduler';
import { getActiveJobCount } from '~/server/workers/job-cancellation';

export async function GET(request: NextRequest) {
  try {
    // Gather metrics from various sources
    const [
      queueStats,
      schedulerStats,
      activeJobCount,
      enabledProfiles,
      completedJobs,
      failedJobs,
      queuedJobs,
    ] = await Promise.all([
      getQueueStats().catch(() => ({ created: 0, active: 0, completed: 0, failed: 0 })),
      getSchedulerStats(),
      getActiveJobCount(),
      prismaDb.nepheshProfile.count({ where: { enabled: true } }),
      prismaDb.nepheshJob.count({ where: { status: 'COMPLETED' } }),
      prismaDb.nepheshJob.count({ where: { status: 'ERROR' } }),
      prismaDb.nepheshJob.count({ where: { status: 'QUEUED' } }),
    ]);

    // Format metrics in Prometheus exposition format
    const metrics = [
      '# HELP nephesh_job_queue_depth Number of jobs waiting in queue',
      '# TYPE nephesh_job_queue_depth gauge',
      `nephesh_job_queue_depth ${queuedJobs}`,
      '',
      '# HELP nephesh_active_jobs Number of currently executing jobs',
      '# TYPE nephesh_active_jobs gauge',
      `nephesh_active_jobs ${activeJobCount}`,
      '',
      '# HELP nephesh_scheduler_heartbeat_running Scheduler heartbeat status (1 = running, 0 = stopped)',
      '# TYPE nephesh_scheduler_heartbeat_running gauge',
      `nephesh_scheduler_heartbeat_running ${schedulerStats.heartbeatRunning ? 1 : 0}`,
      '',
      '# HELP nephesh_scheduler_scheduled_jobs Number of active scheduled jobs',
      '# TYPE nephesh_scheduler_scheduled_jobs gauge',
      `nephesh_scheduler_scheduled_jobs ${schedulerStats.activeScheduledJobs}`,
      '',
      '# HELP nephesh_profiles_total Total number of enabled profiles',
      '# TYPE nephesh_profiles_total gauge',
      `nephesh_profiles_total ${enabledProfiles}`,
      '',
      '# HELP nephesh_jobs_completed_total Total jobs completed',
      '# TYPE nephesh_jobs_completed_total counter',
      `nephesh_jobs_completed_total ${completedJobs}`,
      '',
      '# HELP nephesh_jobs_failed_total Total jobs failed',
      '# TYPE nephesh_jobs_failed_total counter',
      `nephesh_jobs_failed_total ${failedJobs}`,
      '',
      '# HELP nephesh_pgboss_queue_stats pg-boss queue statistics',
      '# TYPE nephesh_pgboss_created gauge',
      `nephesh_pgboss_created ${queueStats.created || 0}`,
      '# TYPE nephesh_pgboss_active gauge',
      `nephesh_pgboss_active ${queueStats.active || 0}`,
      '# TYPE nephesh_pgboss_completed counter',
      `nephesh_pgboss_completed ${queueStats.completed || 0}`,
      '# TYPE nephesh_pgboss_failed counter',
      `nephesh_pgboss_failed ${queueStats.failed || 0}`,
      '',
    ].join('\n');

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('[Metrics] Error generating metrics:', error);

    // Return error metric
    const errorMetrics = [
      '# HELP nephesh_metrics_error Metrics collection error',
      '# TYPE nephesh_metrics_error gauge',
      'nephesh_metrics_error 1',
    ].join('\n');

    return new NextResponse(errorMetrics, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      },
    });
  }
}
