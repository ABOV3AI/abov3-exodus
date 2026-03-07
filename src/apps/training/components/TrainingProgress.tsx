/**
 * Training Progress Component
 *
 * Displays real-time progress and logs for an active training job.
 */

import * as React from 'react';

import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Sheet,
  Stack,
  Typography,
} from '@mui/joy';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReplayIcon from '@mui/icons-material/Replay';
import WarningIcon from '@mui/icons-material/Warning';

import { trainingActions } from '../store-training';
import { resumeTrainingJob, startTrainingJob } from '../training.executor';
import type { TrainingJob, TrainingLogEntry, TrainingStatus } from '../training.types';
import { TrainingDataPreview } from './TrainingDataPreview';


function StatusBadge(props: { status: TrainingStatus }) {
  const { status } = props;

  const config: Record<TrainingStatus, { color: 'success' | 'danger' | 'warning' | 'primary' | 'neutral'; label: string }> = {
    idle: { color: 'neutral', label: 'Idle' },
    generating: { color: 'primary', label: 'Generating Data' },
    validating: { color: 'primary', label: 'Validating' },
    training: { color: 'primary', label: 'Training' },
    evaluating: { color: 'primary', label: 'Evaluating' },
    exporting: { color: 'primary', label: 'Exporting' },
    deploying: { color: 'primary', label: 'Deploying' },
    completed: { color: 'success', label: 'Completed' },
    paused: { color: 'warning', label: 'Paused' },
    error: { color: 'danger', label: 'Error' },
  };

  const { color, label } = config[status];

  return (
    <Chip
      variant='soft'
      color={color}
      size='lg'
      startDecorator={
        status === 'completed' ? <CheckCircleIcon /> :
          status === 'error' ? <ErrorIcon /> :
            status === 'paused' ? <PauseIcon /> :
              <CircularProgress size='sm' thickness={2} />
      }
    >
      {label}
    </Chip>
  );
}


function LogEntry(props: { entry: TrainingLogEntry }) {
  const { entry } = props;

  const icon = {
    info: <InfoIcon fontSize='small' color='info' />,
    warn: <WarningIcon fontSize='small' color='warning' />,
    error: <ErrorIcon fontSize='small' color='error' />,
    debug: <InfoIcon fontSize='small' color='disabled' />,
  }[entry.level];

  const color = {
    info: 'text.primary',
    warn: 'warning.plainColor',
    error: 'danger.plainColor',
    debug: 'text.tertiary',
  }[entry.level];

  return (
    <Box sx={{ display: 'flex', gap: 1, py: 0.5 }}>
      {icon}
      <Typography level='body-xs' sx={{ color, fontFamily: 'monospace' }}>
        <Box component='span' sx={{ color: 'text.tertiary', mr: 1 }}>
          {new Date(entry.timestamp).toLocaleTimeString()}
        </Box>
        {entry.message}
      </Typography>
    </Box>
  );
}


export function TrainingProgress(props: { job: TrainingJob }) {
  const { job } = props;

  // Auto-scroll logs
  const logsEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [job.logs.length]);

  // Action handlers
  const handlePause = React.useCallback(() => {
    trainingActions.updateJobStatus(job.id, 'paused');
    trainingActions.appendLog(job.id, 'info', 'Training paused by user');
  }, [job.id]);

  const handleResume = React.useCallback(() => {
    // Use the proper resume function that handles checkpoints
    resumeTrainingJob(job.id);
  }, [job.id]);

  const handleCancel = React.useCallback(() => {
    if (confirm('Are you sure you want to cancel this training job?')) {
      trainingActions.updateJobStatus(job.id, 'error');
      trainingActions.updateJob(job.id, { error: 'Cancelled by user' });
      trainingActions.appendLog(job.id, 'warn', 'Training cancelled by user');
    }
  }, [job.id]);

  const handleRestart = React.useCallback(() => {
    // Reset job state
    trainingActions.updateJob(job.id, {
      status: 'idle',
      progress: 0,
      currentStep: undefined,
      error: undefined,
      errorDetails: undefined,
      startedAt: undefined,
      completedAt: undefined,
      logs: [], // Clear logs for fresh start
    });
    trainingActions.appendLog(job.id, 'info', 'Training job restarted by user');

    // Start the training again (handles errors internally)
    startTrainingJob(job.id);
  }, [job.id]);

  const isActive = !['idle', 'completed', 'error', 'paused'].includes(job.status);

  return (
    <Stack spacing={3}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography level='h4'>{job.name}</Typography>
          <Typography level='body-sm' color='neutral' sx={{ mt: 0.5 }}>
            Started: {job.startedAt ? new Date(job.startedAt).toLocaleString() : 'Not started'}
          </Typography>
        </Box>
        <StatusBadge status={job.status} />
      </Box>

      {/* Progress */}
      <Card variant='outlined'>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography level='body-sm' fontWeight='md'>
              {job.currentStep || 'Preparing...'}
            </Typography>
            <Typography level='body-sm' fontWeight='lg'>
              {job.progress}%
            </Typography>
          </Box>
          <LinearProgress
            determinate
            value={job.progress}
            sx={{ height: 8, borderRadius: 'sm' }}
          />
        </Box>

        {/* Action buttons */}
        {(isActive || job.status === 'paused') && (
          <>
            <Divider />
            <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
              {job.status === 'paused' ? (
                <Button
                  variant='soft'
                  color='primary'
                  startDecorator={<PlayArrowIcon />}
                  onClick={handleResume}
                >
                  Resume
                </Button>
              ) : (
                <Button
                  variant='soft'
                  color='neutral'
                  startDecorator={<PauseIcon />}
                  onClick={handlePause}
                  disabled={job.status === 'generating'} // Can't pause during data generation
                >
                  Pause
                </Button>
              )}
              <Button
                variant='soft'
                color='danger'
                startDecorator={<CancelIcon />}
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </Box>
          </>
        )}
      </Card>

      {/* Metrics (when available) */}
      {job.metrics && (Object.keys(job.metrics).length > 0) && (
        <Card variant='outlined'>
          <Typography level='title-md' sx={{ p: 2, pb: 1 }}>
            Training Metrics
          </Typography>
          <Divider />
          <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
            {job.metrics.trainingLoss !== undefined && (
              <Box>
                <Typography level='body-xs' color='neutral'>Training Loss</Typography>
                <Typography level='title-lg'>{job.metrics.trainingLoss.toFixed(4)}</Typography>
              </Box>
            )}
            {job.metrics.validationLoss !== undefined && (
              <Box>
                <Typography level='body-xs' color='neutral'>Validation Loss</Typography>
                <Typography level='title-lg'>{job.metrics.validationLoss.toFixed(4)}</Typography>
              </Box>
            )}
            {job.metrics.perplexity !== undefined && (
              <Box>
                <Typography level='body-xs' color='neutral'>Perplexity</Typography>
                <Typography level='title-lg'>{job.metrics.perplexity.toFixed(2)}</Typography>
              </Box>
            )}
            {job.metrics.tokensPerSecond !== undefined && (
              <Box>
                <Typography level='body-xs' color='neutral'>Tokens/sec</Typography>
                <Typography level='title-lg'>{job.metrics.tokensPerSecond.toFixed(0)}</Typography>
              </Box>
            )}
            {job.metrics.peakMemoryMB !== undefined && (
              <Box>
                <Typography level='body-xs' color='neutral'>Peak Memory</Typography>
                <Typography level='title-lg'>{(job.metrics.peakMemoryMB / 1024).toFixed(1)} GB</Typography>
              </Box>
            )}
            {job.metrics.totalTimeSeconds !== undefined && (
              <Box>
                <Typography level='body-xs' color='neutral'>Total Time</Typography>
                <Typography level='title-lg'>
                  {Math.floor(job.metrics.totalTimeSeconds / 60)}m {Math.floor(job.metrics.totalTimeSeconds % 60)}s
                </Typography>
              </Box>
            )}
          </Box>
        </Card>
      )}

      {/* Training Data Preview - shows after data generation */}
      {(job.status !== 'idle' && job.progress >= 30) && (
        <TrainingDataPreview jobId={job.id} />
      )}

      {/* Error display */}
      {job.status === 'error' && (
        <Card variant='soft' color='danger'>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
              <Box>
                <Typography level='title-sm' color='danger' startDecorator={<ErrorIcon />}>
                  {job.error ? 'Error' : 'Training Stopped'}
                </Typography>
                <Typography level='body-sm' sx={{ mt: 1 }}>
                  {job.error || 'Training was stopped unexpectedly. You can restart the job to try again.'}
                </Typography>
                {job.errorDetails && (
                  <Typography level='body-xs' sx={{ mt: 1, fontFamily: 'monospace' }}>
                    {job.errorDetails}
                  </Typography>
                )}
              </Box>
              <Button
                variant='solid'
                color='primary'
                size='sm'
                startDecorator={<ReplayIcon />}
                onClick={handleRestart}
              >
                Restart
              </Button>
            </Box>
          </Box>
        </Card>
      )}

      {/* Completion info */}
      {job.status === 'completed' && (
        <Card variant='soft' color='success'>
          <Box sx={{ p: 2 }}>
            <Typography level='title-sm' startDecorator={<CheckCircleIcon />}>
              Training Complete
            </Typography>
            <Typography level='body-sm' sx={{ mt: 1 }}>
              {job.completedAt && (
                <>Completed at {new Date(job.completedAt).toLocaleString()}</>
              )}
            </Typography>

            {/* Output files section */}
            <Box sx={{ mt: 2 }}>
              {job.outputPath && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Typography level='body-xs' sx={{ fontFamily: 'monospace', flex: 1 }}>
                    Model: {job.outputPath}
                  </Typography>
                  <Button
                    size='sm'
                    variant='outlined'
                    color='success'
                    startDecorator={<DownloadIcon />}
                    onClick={() => {
                      // Copy path to clipboard as download location
                      navigator.clipboard.writeText(job.outputPath!);
                      alert(`Model path copied to clipboard:\n${job.outputPath}`);
                    }}
                  >
                    Copy Path
                  </Button>
                </Box>
              )}

              {job.ggufPath && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Typography level='body-xs' sx={{ fontFamily: 'monospace', flex: 1 }}>
                    GGUF: {job.ggufPath}
                  </Typography>
                  <Button
                    size='sm'
                    variant='solid'
                    color='success'
                    startDecorator={<DownloadIcon />}
                    onClick={() => {
                      // For now, copy path - in future could trigger file download
                      navigator.clipboard.writeText(job.ggufPath!);
                      alert(`GGUF path copied to clipboard:\n${job.ggufPath}\n\nYou can use this model with Ark-SLM or other GGUF-compatible tools.`);
                    }}
                  >
                    Copy GGUF Path
                  </Button>
                </Box>
              )}

              {/* Show dataset path for data-only mode */}
              {job.config.generateDataOnly && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Typography level='body-xs' sx={{ fontFamily: 'monospace', flex: 1 }}>
                    Dataset: training_data_{job.id}.jsonl
                  </Typography>
                  <Button
                    size='sm'
                    variant='solid'
                    color='primary'
                    startDecorator={<DownloadIcon />}
                    onClick={() => {
                      const datasetPath = `training_data_${job.id}.jsonl`;
                      navigator.clipboard.writeText(datasetPath);
                      alert(`Dataset filename copied to clipboard:\n${datasetPath}\n\nFind it in Eden's output directory.`);
                    }}
                  >
                    Copy Dataset Path
                  </Button>
                </Box>
              )}
            </Box>

            {job.deployedModelId && (
              <Chip size='sm' color='success' sx={{ mt: 2 }}>
                Deployed to Ark-SLM: {job.deployedModelId}
              </Chip>
            )}
          </Box>
        </Card>
      )}

      {/* Logs */}
      <Card variant='outlined'>
        <Typography level='title-md' sx={{ p: 2, pb: 1 }}>
          Training Logs
        </Typography>
        <Divider />
        <Sheet
          variant='soft'
          sx={{
            m: 1,
            p: 1,
            maxHeight: 300,
            overflow: 'auto',
            borderRadius: 'sm',
            fontFamily: 'monospace',
          }}
        >
          {job.logs.length === 0 ? (
            <Typography level='body-xs' color='neutral' sx={{ fontStyle: 'italic' }}>
              No logs yet...
            </Typography>
          ) : (
            job.logs.map((entry, index) => (
              <LogEntry key={index} entry={entry} />
            ))
          )}
          <div ref={logsEndRef} />
        </Sheet>
      </Card>

    </Stack>
  );
}
