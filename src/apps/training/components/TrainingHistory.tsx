/**
 * Training History Component
 *
 * Displays a list of all training jobs with filtering and sorting.
 */

import * as React from 'react';

import {
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  Input,
  Option,
  Select,
  Stack,
  Table,
  Typography,
} from '@mui/joy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';

import { trainingActions, useTrainingJobs } from '../store-training';
import type { TrainingJob, TrainingStatus } from '../training.types';


function getStatusIcon(status: TrainingStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon fontSize='small' color='success' />;
    case 'error':
      return <ErrorIcon fontSize='small' color='error' />;
    case 'idle':
    case 'paused':
      return <HourglassEmptyIcon fontSize='small' />;
    default:
      return <PlayCircleIcon fontSize='small' color='primary' />;
  }
}

function getStatusColor(status: TrainingStatus): 'success' | 'danger' | 'warning' | 'primary' | 'neutral' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'error':
      return 'danger';
    case 'paused':
      return 'warning';
    case 'idle':
      return 'neutral';
    default:
      return 'primary';
  }
}

function formatDuration(startedAt?: number, completedAt?: number): string {
  if (!startedAt) return '-';
  const end = completedAt || Date.now();
  const durationMs = end - startedAt;
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}


export function TrainingHistory() {

  // Store state
  const { jobs, activeJobId } = useTrainingJobs();

  // Local state for filtering
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<TrainingStatus | 'all'>('all');
  const [sortBy, setSortBy] = React.useState<'date' | 'name' | 'status'>('date');

  // Filter and sort jobs
  const filteredJobs = React.useMemo(() => {
    let result = [...jobs];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(job =>
        job.name.toLowerCase().includes(query) ||
        job.requirements.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(job => job.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.createdAt - a.createdAt;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return result;
  }, [jobs, searchQuery, statusFilter, sortBy]);

  // Handlers
  const handleViewJob = React.useCallback((jobId: string) => {
    trainingActions.setActiveJob(jobId);
  }, []);

  const handleDeleteJob = React.useCallback((jobId: string) => {
    if (confirm('Are you sure you want to delete this training job?')) {
      trainingActions.deleteJob(jobId);
    }
  }, []);

  const handleClearCompleted = React.useCallback(() => {
    if (confirm('Delete all completed training jobs?')) {
      jobs
        .filter(job => job.status === 'completed')
        .forEach(job => trainingActions.deleteJob(job.id));
    }
  }, [jobs]);

  const completedCount = jobs.filter(j => j.status === 'completed').length;

  return (
    <Stack spacing={3}>

      {/* Header with filters */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <Input
          placeholder='Search jobs...'
          startDecorator={<SearchIcon />}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
        />

        <Select
          value={statusFilter}
          onChange={(_e, value) => setStatusFilter(value as TrainingStatus | 'all')}
          sx={{ minWidth: 140 }}
        >
          <Option value='all'>All Status</Option>
          <Option value='completed'>Completed</Option>
          <Option value='training'>In Progress</Option>
          <Option value='error'>Failed</Option>
          <Option value='idle'>Idle</Option>
        </Select>

        <Select
          value={sortBy}
          onChange={(_e, value) => setSortBy(value as 'date' | 'name' | 'status')}
          sx={{ minWidth: 120 }}
        >
          <Option value='date'>By Date</Option>
          <Option value='name'>By Name</Option>
          <Option value='status'>By Status</Option>
        </Select>

        {completedCount > 0 && (
          <Button
            variant='soft'
            color='neutral'
            size='sm'
            onClick={handleClearCompleted}
          >
            Clear Completed ({completedCount})
          </Button>
        )}
      </Box>

      {/* Jobs table */}
      {filteredJobs.length === 0 ? (
        <Card variant='soft' sx={{ p: 4, textAlign: 'center' }}>
          <Typography level='body-lg' color='neutral'>
            {jobs.length === 0 ? 'No training jobs yet' : 'No jobs match your filters'}
          </Typography>
          {jobs.length === 0 && (
            <Typography level='body-sm' color='neutral' sx={{ mt: 1 }}>
              Create a new training job to get started
            </Typography>
          )}
        </Card>
      ) : (
        <Card variant='outlined' sx={{ overflow: 'auto' }}>
          <Table
            stickyHeader
            hoverRow
            sx={{
              '& th': { fontWeight: 'lg' },
              minWidth: 700,
            }}
          >
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Name</th>
                <th style={{ width: '15%' }}>Status</th>
                <th style={{ width: '15%' }}>Progress</th>
                <th style={{ width: '15%' }}>Duration</th>
                <th style={{ width: '15%' }}>Created</th>
                <th style={{ width: '10%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map(job => (
                <JobRow
                  key={job.id}
                  job={job}
                  isActive={job.id === activeJobId}
                  onView={() => handleViewJob(job.id)}
                  onDelete={() => handleDeleteJob(job.id)}
                />
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {/* Summary */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Chip variant='soft' color='neutral'>
          Total: {jobs.length}
        </Chip>
        <Chip variant='soft' color='success'>
          Completed: {jobs.filter(j => j.status === 'completed').length}
        </Chip>
        <Chip variant='soft' color='primary'>
          In Progress: {jobs.filter(j => !['completed', 'error', 'idle', 'paused'].includes(j.status)).length}
        </Chip>
        <Chip variant='soft' color='danger'>
          Failed: {jobs.filter(j => j.status === 'error').length}
        </Chip>
      </Box>

    </Stack>
  );
}


function JobRow(props: {
  job: TrainingJob;
  isActive: boolean;
  onView: () => void;
  onDelete: () => void;
}) {
  const { job, isActive, onView, onDelete } = props;

  return (
    <tr style={{ backgroundColor: isActive ? 'var(--joy-palette-primary-softBg)' : undefined }}>
      <td>
        <Box>
          <Typography level='body-sm' fontWeight='md'>
            {job.name}
          </Typography>
          <Typography level='body-xs' color='neutral' noWrap sx={{ maxWidth: 300 }}>
            {job.requirements.slice(0, 80)}
            {job.requirements.length > 80 ? '...' : ''}
          </Typography>
        </Box>
      </td>
      <td>
        <Chip
          size='sm'
          variant='soft'
          color={getStatusColor(job.status)}
          startDecorator={getStatusIcon(job.status)}
        >
          {job.status}
        </Chip>
      </td>
      <td>
        {job.status === 'completed' ? (
          <Typography level='body-sm' color='success'>100%</Typography>
        ) : job.status === 'error' ? (
          <Typography level='body-sm' color='danger'>Failed</Typography>
        ) : job.status === 'idle' ? (
          <Typography level='body-sm' color='neutral'>-</Typography>
        ) : (
          <Typography level='body-sm'>{job.progress}%</Typography>
        )}
      </td>
      <td>
        <Typography level='body-sm'>
          {formatDuration(job.startedAt, job.completedAt)}
        </Typography>
      </td>
      <td>
        <Typography level='body-xs'>
          {new Date(job.createdAt).toLocaleDateString()}
        </Typography>
      </td>
      <td>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size='sm'
            variant='plain'
            color='primary'
            onClick={onView}
          >
            <VisibilityIcon />
          </IconButton>
          <IconButton
            size='sm'
            variant='plain'
            color='danger'
            onClick={onDelete}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      </td>
    </tr>
  );
}
