import * as React from 'react';
import { Box, Typography, Sheet, LinearProgress, List, ListItem, ListItemDecorator, IconButton, Chip } from '@mui/joy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CloseIcon from '@mui/icons-material/Close';

import { useFlowCoreStoreEnhanced } from '../store-flowcore-enhanced';
import type { ExecutionContext } from '../flowcore.types';

export function ExecutionViewer() {
  const executionContext = useFlowCoreStoreEnhanced((state) => state.executionContext);
  const isExecuting = useFlowCoreStoreEnhanced((state) => state.isExecuting);
  const stopExecution = useFlowCoreStoreEnhanced((state) => state.stopExecution);

  if (!executionContext && !isExecuting) return null;

  return (
    <Sheet
      variant="outlined"
      sx={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: 400,
        maxHeight: 500,
        borderRadius: 'md',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        zIndex: 1000,
        boxShadow: 'lg',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PlayArrowIcon color="primary" />
          <Typography level="title-md">Workflow Execution</Typography>
        </Box>
        <IconButton size="sm" onClick={stopExecution}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Status */}
      {executionContext && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              color={
                executionContext.status === 'running' ? 'primary' :
                executionContext.status === 'completed' ? 'success' :
                executionContext.status === 'failed' ? 'danger' : 'neutral'
              }
              size="sm"
            >
              {executionContext.status.toUpperCase()}
            </Chip>
            <Typography level="body-sm">
              Execution ID: {executionContext.executionId.slice(-8)}
            </Typography>
          </Box>

          {/* Progress */}
          {executionContext.status === 'running' && (
            <Box>
              <Typography level="body-sm" sx={{ mb: 1 }}>
                Current Node: {executionContext.currentNodeId || 'Initializing...'}
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {/* Node Results */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <Typography level="body-sm" fontWeight="bold" sx={{ mb: 1 }}>
              Node Results ({executionContext.nodeResults.size})
            </Typography>
            <List size="sm">
              {Array.from(executionContext.nodeResults.entries()).map(([nodeId, result]) => (
                <ListItem key={nodeId}>
                  <ListItemDecorator>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemDecorator>
                  <Box sx={{ flex: 1 }}>
                    <Typography level="body-xs" fontWeight="bold">{nodeId}</Typography>
                    <Typography level="body-xs" sx={{ color: 'text.secondary' }}>
                      {typeof result === 'object' ? JSON.stringify(result, null, 2).slice(0, 100) + '...' : String(result)}
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
          </Box>

          {/* Errors */}
          {executionContext.errors.length > 0 && (
            <Box>
              <Typography level="body-sm" fontWeight="bold" color="danger" sx={{ mb: 1 }}>
                Errors ({executionContext.errors.length})
              </Typography>
              <List size="sm">
                {executionContext.errors.map((error, idx) => (
                  <ListItem key={idx}>
                    <ListItemDecorator>
                      <ErrorIcon color="error" fontSize="small" />
                    </ListItemDecorator>
                    <Box>
                      <Typography level="body-xs" fontWeight="bold">{error.nodeId}</Typography>
                      <Typography level="body-xs" color="danger">{error.message}</Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Completion Time */}
          {executionContext.status === 'completed' && (
            <Typography level="body-sm" sx={{ color: 'success.plainColor' }}>
              ✓ Completed at {new Date().toLocaleTimeString()}
            </Typography>
          )}
        </>
      )}
    </Sheet>
  );
}
