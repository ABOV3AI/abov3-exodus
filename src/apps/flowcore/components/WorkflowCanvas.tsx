import * as React from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box } from '@mui/joy';

import { useFlowCoreStore } from '../store-flowcore';
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
  } = useFlowCoreStore();

  // Get execution context for highlighting
  const executionContext = useFlowCoreStoreEnhanced((state) => state.executionContext);
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
