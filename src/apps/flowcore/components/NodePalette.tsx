import * as React from 'react';
import { Box, Typography, Sheet, Chip } from '@mui/joy';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import InputRoundedIcon from '@mui/icons-material/InputRounded';
import OutputRoundedIcon from '@mui/icons-material/OutputRounded';

import { useFlowCoreStore } from '../store-flowcore';

const nodeCategories = [
  {
    id: 'tools',
    label: 'Tools',
    icon: <BuildRoundedIcon />,
    nodes: [
      { id: 'http', label: 'HTTP Request', type: 'tool' },
      { id: 'websearch', label: 'Web Search', type: 'tool' },
      { id: 'fileread', label: 'File Read', type: 'tool' },
      { id: 'filewrite', label: 'File Write', type: 'tool' },
    ],
  },
  {
    id: 'ai',
    label: 'AI',
    icon: <SmartToyRoundedIcon />,
    nodes: [
      { id: 'llm', label: 'LLM Chat', type: 'ai' },
      { id: 'summarize', label: 'Summarize', type: 'ai' },
      { id: 'extract', label: 'Extract Data', type: 'ai' },
    ],
  },
  {
    id: 'logic',
    label: 'Logic',
    icon: <BoltRoundedIcon />,
    nodes: [
      { id: 'condition', label: 'If/Then/Else', type: 'logic' },
      { id: 'loop', label: 'Loop', type: 'logic' },
      { id: 'merge', label: 'Merge', type: 'logic' },
    ],
  },
  {
    id: 'trigger',
    label: 'Triggers',
    icon: <InputRoundedIcon />,
    nodes: [
      { id: 'manual', label: 'Manual', type: 'trigger' },
      { id: 'schedule', label: 'Schedule', type: 'trigger' },
      { id: 'webhook', label: 'Webhook', type: 'trigger' },
    ],
  },
  {
    id: 'output',
    label: 'Outputs',
    icon: <OutputRoundedIcon />,
    nodes: [
      { id: 'result', label: 'Return Result', type: 'output' },
      { id: 'notification', label: 'Send Notification', type: 'output' },
    ],
  },
];

export function NodePalette() {
  const { addNode, nodes } = useFlowCoreStore();

  const handleDragStart = (event: React.DragEvent, nodeType: string, nodeLabel: string) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, label: nodeLabel }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleAddNode = (nodeType: string, nodeLabel: string) => {
    const newNode = {
      id: `${nodeType}-${Date.now()}`,
      type: 'default',
      position: { x: 250 + nodes.length * 20, y: 100 + nodes.length * 20 },
      data: {
        label: nodeLabel,
        type: nodeType,
        config: {},
      },
    };
    addNode(newNode);
  };

  return (
    <Sheet
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        p: 2,
        display: 'flex',
        gap: 3,
        overflowX: 'auto',
      }}
    >
      {nodeCategories.map((category) => (
        <Box key={category.id} sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 200 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            {category.icon}
            <Typography level='title-sm'>{category.label}</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {category.nodes.map((node) => (
              <Chip
                key={node.id}
                variant='outlined'
                size='sm'
                draggable
                onDragStart={(e) => handleDragStart(e, node.type, node.label)}
                onClick={() => handleAddNode(node.type, node.label)}
                sx={{
                  cursor: 'grab',
                  '&:active': { cursor: 'grabbing' },
                }}
              >
                {node.label}
              </Chip>
            ))}
          </Box>
        </Box>
      ))}
    </Sheet>
  );
}
