import * as React from 'react';
import { Box, Typography, Sheet, Input, Button, FormControl, FormLabel } from '@mui/joy';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';

import { useFlowCoreStore } from '../store-flowcore';

export function PropertiesPanel() {
  const { selectedNodeId, nodes, updateNode, deleteNode, currentWorkflowId } = useFlowCoreStore();

  const selectedNode = nodes.find(node => node.id === selectedNodeId);

  if (!currentWorkflowId) {
    return (
      <Sheet
        sx={{
          width: 300,
          borderLeft: '1px solid',
          borderColor: 'divider',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <InfoRoundedIcon sx={{ fontSize: 48, color: 'text.tertiary', mb: 2 }} />
        <Typography level='body-sm' sx={{ color: 'text.secondary', textAlign: 'center' }}>
          No workflow selected
        </Typography>
      </Sheet>
    );
  }

  if (!selectedNode) {
    return (
      <Sheet
        sx={{
          width: 300,
          borderLeft: '1px solid',
          borderColor: 'divider',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Typography level='body-sm' sx={{ color: 'text.secondary', textAlign: 'center', mt: 4 }}>
          Select a node to view properties
        </Typography>
      </Sheet>
    );
  }

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNode(selectedNode.id, {
      data: {
        ...selectedNode.data,
        label: e.target.value,
      },
    });
  };

  const handleDelete = () => {
    deleteNode(selectedNode.id);
  };

  return (
    <Sheet
      sx={{
        width: 300,
        borderLeft: '1px solid',
        borderColor: 'divider',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflow: 'auto',
      }}
    >
      <Typography level='title-lg'>Node Properties</Typography>

      {/* Node Name */}
      <FormControl>
        <FormLabel>Name</FormLabel>
        <Input
          value={selectedNode.data?.label || ''}
          onChange={handleLabelChange}
          placeholder='Node name'
        />
      </FormControl>

      {/* Node Type */}
      <FormControl>
        <FormLabel>Type</FormLabel>
        <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
          {selectedNode.data?.type || 'default'}
        </Typography>
      </FormControl>

      {/* Node ID */}
      <FormControl>
        <FormLabel>ID</FormLabel>
        <Typography level='body-xs' sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
          {selectedNode.id}
        </Typography>
      </FormControl>

      {/* Configuration Section */}
      <Box sx={{ flex: 1 }} />

      {/* Actions */}
      <Button
        startDecorator={<DeleteRoundedIcon />}
        color='danger'
        variant='outlined'
        onClick={handleDelete}
      >
        Delete Node
      </Button>
    </Sheet>
  );
}
