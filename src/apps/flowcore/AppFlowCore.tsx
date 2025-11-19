import * as React from 'react';
import { Box } from '@mui/joy';

import { WorkflowToolbar } from './components/WorkflowToolbar';
import { WorkflowList } from './components/WorkflowList';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { NodePalette } from './components/NodePalette';
import { PropertiesPanel } from './components/PropertiesPanel';

export function AppFlowCore() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Top Toolbar */}
      <WorkflowToolbar />

      {/* Main Content Area */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar - Workflow List */}
        <WorkflowList />

        {/* Center - Canvas */}
        <WorkflowCanvas />

        {/* Right Sidebar - Properties Panel */}
        <PropertiesPanel />
      </Box>

      {/* Bottom - Node Palette */}
      <NodePalette />
    </Box>
  );
}
