import * as React from 'react';
import { Box, Button, Sheet, Typography, Accordion, AccordionSummary, AccordionDetails, Chip, IconButton, Divider, Switch, FormControl, FormLabel } from '@mui/joy';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import StopIcon from '@mui/icons-material/Stop';
import BugReportIcon from '@mui/icons-material/BugReport';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ReplayIcon from '@mui/icons-material/Replay';
import InfoIcon from '@mui/icons-material/Info';

import type { ExecutionLog } from '../runtime/execution-logger';

interface ExecutionDebuggerProps {
  executionLog: ExecutionLog | null;
  isPaused: boolean;
  isExecuting: boolean;
  onPause: () => void;
  onResume: () => void;
  onStep: () => void;
  onStop: () => void;
  onClose: () => void;
}

export function ExecutionDebugger({
  executionLog,
  isPaused,
  isExecuting,
  onPause,
  onResume,
  onStep,
  onStop,
  onClose,
}: ExecutionDebuggerProps) {
  const [expandedEntry, setExpandedEntry] = React.useState<string | null>(null);

  const handleDownloadLog = () => {
    if (!executionLog) return;

    const json = JSON.stringify(executionLog, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-execution-${executionLog.executionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon sx={{ color: 'success.500' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: 'danger.500' }} />;
      case 'retry':
        return <ReplayIcon sx={{ color: 'warning.500' }} />;
      case 'info':
        return <InfoIcon sx={{ color: 'neutral.500' }} />;
      default:
        return <InfoIcon />;
    }
  };

  const getTypeColor = (type: string): 'success' | 'danger' | 'warning' | 'neutral' => {
    switch (type) {
      case 'success':
        return 'success';
      case 'error':
        return 'danger';
      case 'retry':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <Sheet
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40vh',
        borderTop: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        bgcolor: 'background.surface',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BugReportIcon sx={{ color: 'primary.500' }} />
          <Typography level='title-md'>Execution Debugger</Typography>

          {executionLog && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip size="sm" variant="soft" color="neutral">
                {executionLog.summary.totalNodes} nodes
              </Chip>
              <Chip size="sm" variant="soft" color="success">
                {executionLog.summary.successfulNodes} success
              </Chip>
              {executionLog.summary.failedNodes > 0 && (
                <Chip size="sm" variant="soft" color="danger">
                  {executionLog.summary.failedNodes} failed
                </Chip>
              )}
              <Chip size="sm" variant="soft" color="neutral">
                {executionLog.summary.totalDuration}ms
              </Chip>
              {executionLog.summary.totalTokens && (
                <Chip size="sm" variant="soft" color="primary">
                  {executionLog.summary.totalTokens} tokens
                </Chip>
              )}
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* Debug Controls */}
          {isExecuting && (
            <>
              {isPaused ? (
                <>
                  <Button
                    size="sm"
                    variant="soft"
                    color="success"
                    startDecorator={<PlayArrowIcon />}
                    onClick={onResume}
                  >
                    Resume
                  </Button>
                  <Button
                    size="sm"
                    variant="soft"
                    color="primary"
                    startDecorator={<SkipNextIcon />}
                    onClick={onStep}
                  >
                    Step
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="soft"
                  color="warning"
                  startDecorator={<PauseIcon />}
                  onClick={onPause}
                >
                  Pause
                </Button>
              )}
              <Button
                size="sm"
                variant="soft"
                color="danger"
                startDecorator={<StopIcon />}
                onClick={onStop}
              >
                Stop
              </Button>
              <Divider orientation="vertical" />
            </>
          )}

          <Button
            size="sm"
            variant="outlined"
            startDecorator={<DownloadIcon />}
            onClick={handleDownloadLog}
            disabled={!executionLog}
          >
            Export
          </Button>

          <IconButton size="sm" variant="plain" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Log Entries */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {!executionLog || executionLog.entries.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <BugReportIcon sx={{ fontSize: 48, color: 'text.tertiary', mb: 2 }} />
            <Typography level='body-md' sx={{ color: 'text.secondary' }}>
              {isExecuting ? 'Waiting for execution logs...' : 'No execution logs available'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {executionLog.entries.map((entry) => (
              <Accordion
                key={entry.id}
                expanded={expandedEntry === entry.id}
                onChange={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
              >
                <AccordionSummary>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    {getTypeIcon(entry.type)}
                    <Box sx={{ flex: 1 }}>
                      <Typography level='body-sm' sx={{ fontWeight: 'bold' }}>
                        {entry.nodeLabel}
                      </Typography>
                      <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                        {entry.message}
                      </Typography>
                    </Box>
                    <Chip size="sm" variant="soft" color={getTypeColor(entry.type)}>
                      {entry.type}
                    </Chip>
                    {entry.duration && (
                      <Chip size="sm" variant="soft" color="neutral">
                        {entry.duration}ms
                      </Chip>
                    )}
                    <Typography level='body-xs' sx={{ color: 'text.tertiary', minWidth: 80 }}>
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ pl: 4 }}>
                    {entry.data && (
                      <Box sx={{ mb: 2 }}>
                        <Typography level='body-sm' sx={{ fontWeight: 'bold', mb: 1 }}>
                          Data:
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            p: 1,
                            bgcolor: 'background.level1',
                            borderRadius: 'sm',
                            fontSize: 'xs',
                            overflow: 'auto',
                            maxHeight: 200,
                          }}
                        >
                          {JSON.stringify(entry.data, null, 2)}
                        </Box>
                      </Box>
                    )}

                    {entry.metadata && (
                      <Box>
                        <Typography level='body-sm' sx={{ fontWeight: 'bold', mb: 1 }}>
                          Metadata:
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {entry.metadata.attemptNumber && (
                            <Typography level='body-xs'>
                              Attempt: {entry.metadata.attemptNumber}
                            </Typography>
                          )}
                          {entry.metadata.httpStatus && (
                            <Typography level='body-xs'>
                              HTTP Status: {entry.metadata.httpStatus}
                            </Typography>
                          )}
                          {entry.metadata.tokenUsage && (
                            <Typography level='body-xs'>
                              Tokens: {entry.metadata.tokenUsage.input} in / {entry.metadata.tokenUsage.output} out
                            </Typography>
                          )}
                          {entry.metadata.errorStack && (
                            <Box
                              component="pre"
                              sx={{
                                mt: 1,
                                p: 1,
                                bgcolor: 'danger.softBg',
                                borderRadius: 'sm',
                                fontSize: 'xs',
                                overflow: 'auto',
                                maxHeight: 150,
                              }}
                            >
                              {entry.metadata.errorStack}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </Box>
    </Sheet>
  );
}
