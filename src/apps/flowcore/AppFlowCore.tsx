import * as React from 'react';
import { Box, IconButton, Drawer, useMediaQuery, useTheme } from '@mui/joy';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';

import { WorkflowToolbar } from './components/WorkflowToolbar';
import { WorkflowList } from './components/WorkflowList';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { NodePalette } from './components/NodePalette';
import { PropertiesPanel } from './components/PropertiesPanel';

export function AppFlowCore() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [workflowListOpen, setWorkflowListOpen] = React.useState(!isMobile);
  const [propertiesPanelOpen, setPropertiesPanelOpen] = React.useState(!isMobile);

  // Close sidebars on mobile by default
  React.useEffect(() => {
    if (isMobile) {
      setWorkflowListOpen(false);
      setPropertiesPanelOpen(false);
    } else {
      setWorkflowListOpen(true);
      setPropertiesPanelOpen(true);
    }
  }, [isMobile]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Top Toolbar */}
      <WorkflowToolbar />

      {/* Mobile Toggle Buttons */}
      {isMobile && (
        <>
          <IconButton
            size="sm"
            variant="soft"
            onClick={() => setWorkflowListOpen(!workflowListOpen)}
            sx={{
              position: 'absolute',
              top: 72,
              left: 8,
              zIndex: 1000,
            }}
          >
            <MenuIcon />
          </IconButton>
          <IconButton
            size="sm"
            variant="soft"
            onClick={() => setPropertiesPanelOpen(!propertiesPanelOpen)}
            sx={{
              position: 'absolute',
              top: 72,
              right: 8,
              zIndex: 1000,
            }}
          >
            <SettingsIcon />
          </IconButton>
        </>
      )}

      {/* Main Content Area */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar - Workflow List */}
        {isMobile ? (
          <Drawer
            open={workflowListOpen}
            onClose={() => setWorkflowListOpen(false)}
            anchor="left"
            size="sm"
          >
            <WorkflowList />
          </Drawer>
        ) : (
          workflowListOpen && <WorkflowList />
        )}

        {/* Center - Canvas */}
        <WorkflowCanvas />

        {/* Right Sidebar - Properties Panel */}
        {isMobile ? (
          <Drawer
            open={propertiesPanelOpen}
            onClose={() => setPropertiesPanelOpen(false)}
            anchor="right"
            size="md"
          >
            <PropertiesPanel />
          </Drawer>
        ) : (
          propertiesPanelOpen && <PropertiesPanel />
        )}
      </Box>

      {/* Bottom - Node Palette */}
      <NodePalette />
    </Box>
  );
}
