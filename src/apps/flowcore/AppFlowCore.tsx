import * as React from 'react';
import { Box } from '@mui/joy';

import { WorkflowToolbar } from './components/WorkflowToolbar';
import { WorkflowList } from './components/WorkflowList';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { NodePalette } from './components/NodePalette';
import { PropertiesPanel } from './components/PropertiesPanel';
import { useFlowCoreStoreEnhanced } from './store-flowcore-enhanced';

export function AppFlowCore() {
  const initializeScheduler = useFlowCoreStoreEnhanced((state) => state.initializeScheduler);

  // Initialize scheduler on mount
  React.useEffect(() => {
    console.log('[FlowCore] Initializing workflow scheduler');
    initializeScheduler();

    return () => {
      // Cleanup scheduler on unmount
      const scheduler = useFlowCoreStoreEnhanced.getState()._scheduler;
      if (scheduler) {
        console.log('[FlowCore] Cleaning up scheduler');
        scheduler.destroy();
      }
    };
  }, [initializeScheduler]);

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
