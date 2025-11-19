import * as React from 'react';
import {
  Modal,
  ModalDialog,
  ModalClose,
  Typography,
  Box,
  List,
  ListItem,
  ListItemContent,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Sheet,
} from '@mui/joy';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import { useFlowCoreStoreEnhanced } from '../store-flowcore-enhanced';
import type { WorkflowExecution } from '../flowcore.types';

interface ExecutionHistoryProps {
  open: boolean;
  onClose: () => void;
  workflowId: string;
}

export function ExecutionHistory({ open, onClose, workflowId }: ExecutionHistoryProps) {
  const workflows = useFlowCoreStoreEnhanced((state) => state.workflows);
  const workflow = workflows.find((w) => w.id === workflowId);

  const executions = workflow?.executions || [];

  const formatDuration = (start: Date | undefined, end: Date | undefined) => {
    if (!start || !end) return 'N/A';
    const ms = end.getTime() - start.getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{
          maxWidth: 700,
          width: '90vw',
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <ModalClose />
        <Typography level="h4" startDecorator={<HistoryIcon />}>
          Execution History
        </Typography>
        <Typography level="body-sm" sx={{ mb: 2 }}>
          {workflow?.name || 'Workflow'} - {executions.length} execution(s)
        </Typography>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {executions.length === 0 ? (
            <Sheet variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 'md' }}>
              <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                No executions yet. Run the workflow to see execution history.
              </Typography>
            </Sheet>
          ) : (
            <List>
              {executions.map((execution) => (
                <ListItem key={execution.id}>
                  <Accordion sx={{ width: '100%' }}>
                    <AccordionSummary>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                        {execution.status === 'completed' ? (
                          <CheckCircleIcon color="success" />
                        ) : execution.status === 'failed' ? (
                          <ErrorIcon color="error" />
                        ) : (
                          <PlayArrowIcon color="primary" />
                        )}

                        <ListItemContent>
                          <Typography level="title-sm">
                            {new Date(execution.startTime).toLocaleString()}
                          </Typography>
                          <Typography level="body-xs" sx={{ color: 'text.secondary' }}>
                            ID: {execution.id.slice(-8)}
                            {' • '}
                            Duration: {formatDuration(execution.startTime ? new Date(execution.startTime) : undefined, execution.endTime ? new Date(execution.endTime) : undefined)}
                          </Typography>
                        </ListItemContent>

                        <Chip
                          size="sm"
                          color={
                            execution.status === 'completed' ? 'success' :
                            execution.status === 'failed' ? 'danger' :
                            execution.status === 'running' ? 'primary' : 'neutral'
                          }
                        >
                          {execution.status}
                        </Chip>
                      </Box>
                    </AccordionSummary>

                    <AccordionDetails>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Error */}
                        {execution.error && (
                          <Box>
                            <Typography level="body-sm" fontWeight="bold" color="danger">
                              Error:
                            </Typography>
                            <Typography level="body-xs" sx={{ color: 'danger.plainColor', fontFamily: 'monospace' }}>
                              {execution.error}
                            </Typography>
                          </Box>
                        )}

                        {/* Results */}
                        {execution.results && Object.keys(execution.results).length > 0 && (
                          <Box>
                            <Typography level="body-sm" fontWeight="bold">
                              Results:
                            </Typography>
                            <Sheet variant="outlined" sx={{ p: 1, borderRadius: 'sm', mt: 0.5 }}>
                              <Typography level="body-xs" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                {JSON.stringify(execution.results, null, 2)}
                              </Typography>
                            </Sheet>
                          </Box>
                        )}

                        {/* Timing */}
                        <Box>
                          <Typography level="body-sm" fontWeight="bold">
                            Timing:
                          </Typography>
                          <Typography level="body-xs" sx={{ color: 'text.secondary' }}>
                            Started: {execution.startTime ? new Date(execution.startTime).toLocaleString() : 'N/A'}
                          </Typography>
                          <Typography level="body-xs" sx={{ color: 'text.secondary' }}>
                            Ended: {execution.endTime ? new Date(execution.endTime).toLocaleString() : 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </ModalDialog>
    </Modal>
  );
}
