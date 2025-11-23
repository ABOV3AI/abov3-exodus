/**
 * Analytics Dashboard Component
 * Displays workflow execution metrics, success rates, and performance stats
 */

import * as React from 'react';
import { Box, Typography, Sheet, Card, Grid, LinearProgress, Chip, Table, Alert } from '@mui/joy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import TimerIcon from '@mui/icons-material/Timer';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import InfoIcon from '@mui/icons-material/Info';

import type { Workflow, WorkflowExecution } from '../flowcore.types';
import { useFlowCoreStoreEnhanced as useFlowCoreStore } from '../store-flowcore-enhanced';

interface AnalyticsDashboardProps {
  workflow: Workflow;
}

export function AnalyticsDashboard({ workflow }: AnalyticsDashboardProps) {
  const executions = workflow.executions || [];

  // Calculate metrics
  const totalExecutions = executions.length;
  const successfulExecutions = executions.filter(e => e.status === 'completed').length;
  const failedExecutions = executions.filter(e => e.status === 'failed').length;
  const runningExecutions = executions.filter(e => e.status === 'running').length;
  const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

  // Calculate average duration (completed only)
  const completedExecutions = executions.filter(e => e.status === 'completed' && e.endTime);
  const avgDuration = completedExecutions.length > 0
    ? completedExecutions.reduce((sum, e) => {
        const duration = e.endTime && e.startTime
          ? new Date(e.endTime).getTime() - new Date(e.startTime).getTime()
          : 0;
        return sum + duration;
      }, 0) / completedExecutions.length
    : 0;

  // Calculate total tokens used
  const totalTokens = executions.reduce((sum, e) => {
    return sum + ((e as any).metrics?.tokensUsed || 0);
  }, 0);

  // Get recent executions (last 10)
  const recentExecutions = [...executions].reverse().slice(0, 10);

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  // Get status color
  const getStatusColor = (status: WorkflowExecution['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'danger';
      case 'running':
        return 'primary';
      case 'cancelled':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  if (totalExecutions === 0) {
    return (
      <Sheet sx={{ p: 3 }}>
        <Alert color="neutral" variant="soft" startDecorator={<InfoIcon />}>
          <Typography level="body-sm">
            No executions yet. Run this workflow to see analytics.
          </Typography>
        </Alert>
      </Sheet>
    );
  }

  return (
    <Sheet sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography level="h4" sx={{ mb: 1 }}>
          Analytics: {workflow.name}
        </Typography>
        <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
          Execution metrics and performance statistics
        </Typography>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid xs={12} sm={6} md={3}>
          <Card variant="soft" color="neutral">
            <Typography level="body-xs" sx={{ color: 'text.secondary', mb: 0.5 }}>
              Total Executions
            </Typography>
            <Typography level="h3">{totalExecutions}</Typography>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card variant="soft" color="success">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <CheckCircleIcon fontSize="small" />
              <Typography level="body-xs" sx={{ color: 'text.secondary' }}>
                Success Rate
              </Typography>
            </Box>
            <Typography level="h3">{successRate.toFixed(1)}%</Typography>
            <LinearProgress
              determinate
              value={successRate}
              color="success"
              size="sm"
              sx={{ mt: 1 }}
            />
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card variant="soft" color="primary">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <TimerIcon fontSize="small" />
              <Typography level="body-xs" sx={{ color: 'text.secondary' }}>
                Avg Duration
              </Typography>
            </Box>
            <Typography level="h3">{formatDuration(avgDuration)}</Typography>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card variant="soft" color="warning">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <TrendingUpIcon fontSize="small" />
              <Typography level="body-xs" sx={{ color: 'text.secondary' }}>
                Total Tokens
              </Typography>
            </Box>
            <Typography level="h3">{totalTokens.toLocaleString()}</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Status Breakdown */}
      <Card sx={{ mb: 3 }}>
        <Typography level="title-md" sx={{ mb: 2 }}>
          Status Breakdown
        </Typography>
        <Grid container spacing={2}>
          <Grid xs={6} sm={3}>
            <Box>
              <Typography level="body-xs" sx={{ color: 'text.secondary', mb: 0.5 }}>
                Successful
              </Typography>
              <Typography level="h4" sx={{ color: 'success.plainColor' }}>
                {successfulExecutions}
              </Typography>
            </Box>
          </Grid>
          <Grid xs={6} sm={3}>
            <Box>
              <Typography level="body-xs" sx={{ color: 'text.secondary', mb: 0.5 }}>
                Failed
              </Typography>
              <Typography level="h4" sx={{ color: 'danger.plainColor' }}>
                {failedExecutions}
              </Typography>
            </Box>
          </Grid>
          <Grid xs={6} sm={3}>
            <Box>
              <Typography level="body-xs" sx={{ color: 'text.secondary', mb: 0.5 }}>
                Running
              </Typography>
              <Typography level="h4" sx={{ color: 'primary.plainColor' }}>
                {runningExecutions}
              </Typography>
            </Box>
          </Grid>
          <Grid xs={6} sm={3}>
            <Box>
              <Typography level="body-xs" sx={{ color: 'text.secondary', mb: 0.5 }}>
                Cancelled
              </Typography>
              <Typography level="h4" sx={{ color: 'neutral.plainColor' }}>
                {executions.filter(e => e.status === 'cancelled').length}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Card>

      {/* Recent Executions Table */}
      <Card>
        <Typography level="title-md" sx={{ mb: 2 }}>
          Recent Executions
        </Typography>
        <Box sx={{ overflow: 'auto' }}>
          <Table size="sm" stickyHeader>
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Start Time</th>
                <th style={{ width: '20%' }}>Status</th>
                <th style={{ width: '20%' }}>Duration</th>
                <th style={{ width: '15%' }}>Nodes</th>
                <th style={{ width: '15%' }}>Tokens</th>
              </tr>
            </thead>
            <tbody>
              {recentExecutions.map((execution) => {
                const duration = execution.endTime && execution.startTime
                  ? new Date(execution.endTime).getTime() - new Date(execution.startTime).getTime()
                  : 0;

                return (
                  <tr key={execution.id}>
                    <td>
                      <Typography level="body-xs" sx={{ fontFamily: 'monospace' }}>
                        {formatDate(execution.startTime)}
                      </Typography>
                    </td>
                    <td>
                      <Chip
                        size="sm"
                        variant="soft"
                        color={getStatusColor(execution.status)}
                        startDecorator={
                          execution.status === 'completed' ? <CheckCircleIcon /> :
                          execution.status === 'failed' ? <ErrorIcon /> :
                          null
                        }
                      >
                        {execution.status}
                      </Chip>
                    </td>
                    <td>
                      <Typography level="body-sm">
                        {execution.status === 'completed' ? formatDuration(duration) : '-'}
                      </Typography>
                    </td>
                    <td>
                      <Typography level="body-sm">
                        {((execution as any).metrics?.nodesExecuted || '-')}
                      </Typography>
                    </td>
                    <td>
                      <Typography level="body-sm">
                        {((execution as any).metrics?.tokensUsed?.toLocaleString() || '-')}
                      </Typography>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Box>

        {executions.length > 10 && (
          <Typography level="body-xs" sx={{ mt: 2, color: 'text.tertiary', textAlign: 'center' }}>
            Showing {Math.min(10, executions.length)} of {executions.length} executions
          </Typography>
        )}
      </Card>
    </Sheet>
  );
}
