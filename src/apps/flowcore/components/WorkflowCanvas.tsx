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

  const handleNodeClick = React.useCallback(
    (_event: React.MouseEvent, node: any) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const handlePaneClick = React.useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  return (
    <Box sx={{ flex: 1, position: 'relative', bgcolor: 'background.level1' }}>
      <ReactFlow
        nodes={nodes}
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
    </Box>
  );
}
