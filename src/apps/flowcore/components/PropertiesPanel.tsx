import * as React from 'react';
import { Box, Typography, Sheet, Input, Button, FormControl, FormLabel, Divider, Chip } from '@mui/joy';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';

import { useFlowCoreStoreEnhanced as useFlowCoreStore } from '../store-flowcore-enhanced';
import { ToolNodeConfig } from './config/ToolNodeConfig';
import { AINodeConfig } from './config/AINodeConfig';
import { LogicNodeConfig } from './config/LogicNodeConfig';
import { TriggerNodeConfig } from './config/TriggerNodeConfig';
import { OutputNodeConfig } from './config/OutputNodeConfig';

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
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <InfoRoundedIcon sx={{ fontSize: 48, color: 'text.tertiary', mb: 2 }} />
        <Typography level='body-sm' sx={{ color: 'text.secondary', textAlign: 'center' }}>
          Select a node to configure
        </Typography>
      </Sheet>
    );
  }

  const nodeType = selectedNode.data?.type;
  const nodeLabel = selectedNode.data?.label || 'Unknown Node';

  const handleLabelChange = (newLabel: string) => {
    updateNode(selectedNode.id, {
      data: {
        ...selectedNode.data,
        label: newLabel,
      },
    });
  };

  const handleDelete = () => {
    deleteNode(selectedNode.id);
  };

  return (
    <Sheet
      sx={{
        width: 350,
        borderLeft: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography level='title-md'>Node Properties</Typography>
          <Chip size="sm" variant="soft" sx={{ mt: 0.5 }}>
            {nodeType}
          </Chip>
        </Box>
        <Button
          size="sm"
          variant="soft"
          color="danger"
          startDecorator={<DeleteRoundedIcon />}
          onClick={handleDelete}
        >
          Delete
        </Button>
      </Box>

      {/* Scrollable Content */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {/* Basic Info */}
        <FormControl>
          <FormLabel>Node Label</FormLabel>
          <Input
            value={nodeLabel}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="Enter node label"
          />
        </FormControl>

        <FormControl>
          <FormLabel>Node ID</FormLabel>
          <Input
            value={selectedNode.id}
            readOnly
            slotProps={{
              input: {
                sx: { fontFamily: 'monospace', fontSize: 'xs' },
              },
            }}
          />
        </FormControl>

        <Divider />

        {/* Type-specific Configuration */}
        {nodeType === 'tool' && (
          <ToolNodeConfig node={selectedNode} onChange={updateNode} />
        )}

        {nodeType === 'ai' && (
          <AINodeConfig node={selectedNode} onChange={updateNode} />
        )}

        {nodeType === 'logic' && (
          <LogicNodeConfig node={selectedNode} onChange={updateNode} />
        )}

        {nodeType === 'trigger' && (
          <TriggerNodeConfig node={selectedNode} onChange={updateNode} />
        )}

        {nodeType === 'output' && (
          <OutputNodeConfig node={selectedNode} onChange={updateNode} />
        )}

        {/* Unknown node type */}
        {!['tool', 'ai', 'logic', 'trigger', 'output'].includes(nodeType) && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              No configuration available for this node type
            </Typography>
          </Box>
        )}
      </Box>
    </Sheet>
  );
}
