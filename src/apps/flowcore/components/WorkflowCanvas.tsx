import * as React from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, Typography, Button } from '@mui/joy';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';

import { useFlowCoreStoreEnhanced } from '../store-flowcore-enhanced';
import { ExecutionViewer } from './ExecutionViewer';

// Custom node components will be imported here
// For now, we'll use default nodes

export function WorkflowCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    currentWorkflowId,
    createWorkflow,
    workflows,
    executionContext,
  } = useFlowCoreStoreEnhanced();

  const currentNodeId = executionContext?.currentNodeId;

  const handleNodeClick = React.useCallback(
    (_event: React.MouseEvent, node: any) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const handlePaneClick = React.useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // Apply execution highlighting to nodes
  const highlightedNodes = React.useMemo(() => {
    if (!currentNodeId) return nodes;

    return nodes.map((node) => ({
      ...node,
      style: {
        ...node.style,
        ...(node.id === currentNodeId && {
          border: '3px solid #1976d2',
          boxShadow: '0 0 15px rgba(25, 118, 210, 0.5)',
        }),
        ...(executionContext?.nodeResults.has(node.id) && node.id !== currentNodeId && {
          border: '2px solid #2e7d32',
          backgroundColor: '#e8f5e9',
        }),
        ...(executionContext?.errors.some((e) => e.nodeId === node.id) && {
          border: '2px solid #d32f2f',
          backgroundColor: '#ffebee',
        }),
      },
    }));
  }, [nodes, currentNodeId, executionContext]);

  // Show empty state if no workflow is selected
  if (!currentWorkflowId) {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.level1',
        }}
      >
        <Box
          sx={{
            textAlign: 'center',
            maxWidth: 400,
            p: 4,
          }}
        >
          <AccountTreeRoundedIcon sx={{ fontSize: 64, color: 'text.tertiary', mb: 2 }} />
          <Typography level='h3' sx={{ mb: 1 }}>
            No Workflow Selected
          </Typography>
          <Typography level='body-md' sx={{ color: 'text.secondary', mb: 3 }}>
            Create a new workflow or select an existing one from the sidebar to start building your automation.
          </Typography>
          <Button
            startDecorator={<AddRoundedIcon />}
            onClick={() => createWorkflow(`Workflow ${workflows.length + 1}`)}
            size='lg'
          >
            Create New Workflow
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, position: 'relative', bgcolor: 'background.level1' }}>
      <ReactFlow
        nodes={highlightedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
        attributionPosition='bottom-left'
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
        />
        <Controls />
        <MiniMap
          style={{
            height: 120,
          }}
          zoomable
          pannable
        />
      </ReactFlow>
      <ExecutionViewer />
    </Box>
  );
}
