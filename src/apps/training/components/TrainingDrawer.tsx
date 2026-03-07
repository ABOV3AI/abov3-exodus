/**
 * Training Drawer Component
 *
 * Sidebar drawer showing training job list and Eden server status.
 */

import * as React from 'react';

import { Box, Chip, IconButton, List, ListItem, ListItemButton, ListItemContent, ListItemDecorator, Sheet, Typography } from '@mui/joy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudIcon from '@mui/icons-material/Cloud';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import DeleteIcon from '@mui/icons-material/Delete';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import SchoolIcon from '@mui/icons-material/School';

import { useEdenServer, useTrainingJobs, trainingActions } from '../store-training';
import type { TrainingJob, TrainingStatus } from '../training.types';


function getStatusIcon(status: TrainingStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon color='success' />;
    case 'error':
      return <ErrorIcon color='error' />;
    case 'idle':
    case 'paused':
      return <HourglassEmptyIcon color='disabled' />;
    default:
      return <PlayCircleIcon color='primary' />;
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


function TrainingJobItem(props: {
  job: TrainingJob;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { job, isActive, onSelect, onDelete } = props;

  const handleDelete = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  }, [onDelete]);

  return (
    <ListItem
      endAction={
        <IconButton
          size='sm'
          variant='plain'
          color='neutral'
          onClick={handleDelete}
        >
          <DeleteIcon />
        </IconButton>
      }
    >
      <ListItemButton
        selected={isActive}
        onClick={onSelect}
        sx={{ borderRadius: 'sm' }}
      >
        <ListItemDecorator>
          {getStatusIcon(job.status)}
        </ListItemDecorator>
        <ListItemContent>
          <Typography level='title-sm' noWrap>
            {job.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            <Chip
              size='sm'
              variant='soft'
              color={getStatusColor(job.status)}
            >
              {job.status}
            </Chip>
            {job.status !== 'idle' && job.status !== 'completed' && job.status !== 'error' && (
              <Typography level='body-xs' color='neutral'>
                {job.progress}%
              </Typography>
            )}
          </Box>
        </ListItemContent>
      </ListItemButton>
    </ListItem>
  );
}


export function TrainingDrawer() {

  // Store state
  const { jobs, activeJobId } = useTrainingJobs();
  const { edenServerUrl, edenServerConnected, edenServerName, edenAvailableTools } = useEdenServer();

  // Sort jobs by creation date (newest first)
  const sortedJobs = React.useMemo(
    () => [...jobs].sort((a, b) => b.createdAt - a.createdAt),
    [jobs]
  );

  // Handlers
  const handleSelectJob = React.useCallback((jobId: string) => {
    trainingActions.setActiveJob(jobId);
  }, []);

  const handleDeleteJob = React.useCallback((jobId: string) => {
    if (confirm('Are you sure you want to delete this training job?')) {
      trainingActions.deleteJob(jobId);
    }
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SchoolIcon />
        <Typography level='title-lg'>Training</Typography>
      </Box>

      {/* Eden Server Status */}
      <Sheet
        variant='soft'
        color={edenServerConnected ? 'success' : 'neutral'}
        sx={{
          mx: 2,
          mb: 2,
          p: 1.5,
          borderRadius: 'sm',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {edenServerConnected ? (
            <CloudIcon color='success' />
          ) : (
            <CloudOffIcon color='disabled' />
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography level='body-sm' fontWeight='md'>
              {edenServerName || 'Eden Server'}
            </Typography>
            <Typography level='body-xs' noWrap sx={{ color: 'text.tertiary' }}>
              {edenServerConnected ? `${edenAvailableTools.length} training tools` : 'Not connected'}
            </Typography>
          </Box>
          <Chip
            size='sm'
            variant='soft'
            color={edenServerConnected ? 'success' : 'neutral'}
          >
            {edenServerConnected ? 'Live' : 'Offline'}
          </Chip>
        </Box>
      </Sheet>

      {/* Jobs list */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 1 }}>
        {sortedJobs.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography level='body-sm' color='neutral'>
              No training jobs yet
            </Typography>
          </Box>
        ) : (
          <List size='sm'>
            {sortedJobs.map(job => (
              <TrainingJobItem
                key={job.id}
                job={job}
                isActive={job.id === activeJobId}
                onSelect={() => handleSelectJob(job.id)}
                onDelete={() => handleDeleteJob(job.id)}
              />
            ))}
          </List>
        )}
      </Box>

    </Box>
  );
}
