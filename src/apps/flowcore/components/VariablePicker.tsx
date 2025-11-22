import * as React from 'react';
import { Box, Button, Input, List, ListItem, ListItemButton, ListItemContent, Typography, Sheet, Chip, IconButton } from '@mui/joy';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import DataObjectIcon from '@mui/icons-material/DataObject';
import FunctionsIcon from '@mui/icons-material/Functions';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';

import { VariableInterpolator } from '../runtime/variable-interpolator';
import type { ExecutionContext as VarContext } from '../runtime/variable-interpolator';

interface VariablePickerProps {
  context: VarContext | null;
  onSelect: (variable: string) => void;
  onClose?: () => void;
}

export function VariablePicker({ context, onSelect, onClose }: VariablePickerProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');

  const availableVariables = React.useMemo(() => {
    if (!context) return [];
    return VariableInterpolator.getAvailableVariables(context);
  }, [context]);

  const categorizedVariables = React.useMemo(() => {
    const categories: Record<string, string[]> = {
      trigger: [],
      nodes: [],
      variables: [],
      input: [],
    };

    for (const variable of availableVariables) {
      if (variable.startsWith('trigger.')) {
        categories.trigger.push(variable);
      } else if (variable.startsWith('nodes.')) {
        categories.nodes.push(variable);
      } else if (variable.startsWith('variables.')) {
        categories.variables.push(variable);
      } else if (variable.startsWith('input.')) {
        categories.input.push(variable);
      }
    }

    return categories;
  }, [availableVariables]);

  const filteredVariables = React.useMemo(() => {
    let vars = availableVariables;

    // Filter by category
    if (selectedCategory !== 'all') {
      vars = categorizedVariables[selectedCategory] || [];
    }

    // Filter by search term
    if (searchTerm) {
      vars = vars.filter(v => v.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    return vars;
  }, [availableVariables, categorizedVariables, selectedCategory, searchTerm]);

  const handleSelectVariable = (variable: string) => {
    onSelect(`{{${variable}}}`);
  };

  const categories = [
    { id: 'all', label: 'All Variables', icon: <DataObjectIcon />, count: availableVariables.length },
    { id: 'trigger', label: 'Trigger Data', icon: <PlayCircleIcon />, count: categorizedVariables.trigger.length },
    { id: 'nodes', label: 'Node Results', icon: <FunctionsIcon />, count: categorizedVariables.nodes.length },
    { id: 'variables', label: 'Custom Variables', icon: <DataObjectIcon />, count: categorizedVariables.variables.length },
    { id: 'input', label: 'Input Data', icon: <DataObjectIcon />, count: categorizedVariables.input.length },
  ];

  return (
    <Sheet
      sx={{
        width: 400,
        height: 500,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'md',
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
        <Typography level='title-md'>Variable Picker</Typography>
        {onClose && (
          <IconButton size="sm" variant="plain" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Search */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Input
          placeholder="Search variables..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          startDecorator={<SearchIcon />}
          endDecorator={
            searchTerm && (
              <IconButton size="sm" variant="plain" onClick={() => setSearchTerm('')}>
                <CloseIcon />
              </IconButton>
            )
          }
        />
      </Box>

      {/* Category Chips */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        {categories.map((category) => (
          <Chip
            key={category.id}
            variant={selectedCategory === category.id ? 'solid' : 'soft'}
            color={selectedCategory === category.id ? 'primary' : 'neutral'}
            onClick={() => setSelectedCategory(category.id)}
            startDecorator={category.icon}
            sx={{ cursor: 'pointer' }}
          >
            {category.label} ({category.count})
          </Chip>
        ))}
      </Box>

      {/* Variable List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {!context ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <DataObjectIcon sx={{ fontSize: 48, color: 'text.tertiary', mb: 2 }} />
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              No execution context available
            </Typography>
            <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 1 }}>
              Run the workflow to see available variables
            </Typography>
          </Box>
        ) : filteredVariables.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <DataObjectIcon sx={{ fontSize: 48, color: 'text.tertiary', mb: 2 }} />
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              {searchTerm ? 'No variables match your search' : 'No variables available'}
            </Typography>
          </Box>
        ) : (
          <List>
            {filteredVariables.map((variable) => (
              <ListItem key={variable}>
                <ListItemButton onClick={() => handleSelectVariable(variable)}>
                  <ListItemContent>
                    <Typography level='body-sm' sx={{ fontFamily: 'monospace' }}>
                      {`{{${variable}}}`}
                    </Typography>
                    <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                      {getVariableDescription(variable)}
                    </Typography>
                  </ListItemContent>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Footer with common patterns */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.level1',
        }}
      >
        <Typography level='body-xs' sx={{ fontWeight: 'bold', mb: 1 }}>
          Common Patterns:
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography level='body-xs' sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
            {`{{nodes.nodeId.result}}`} - Node output
          </Typography>
          <Typography level='body-xs' sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
            {`{{trigger.payload.data}}`} - Trigger data
          </Typography>
          <Typography level='body-xs' sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
            {`{{variables.itemIndex}}`} - Loop variables
          </Typography>
        </Box>
      </Box>
    </Sheet>
  );
}

function getVariableDescription(variable: string): string {
  if (variable.startsWith('trigger.')) {
    return 'Data from workflow trigger';
  }
  if (variable.startsWith('nodes.') && variable.includes('.result')) {
    return 'Output from a previous node';
  }
  if (variable.startsWith('nodes.') && variable.includes('.status')) {
    return 'Execution status of a node';
  }
  if (variable.startsWith('variables.')) {
    return 'Custom workflow variable';
  }
  if (variable.startsWith('input.')) {
    return 'Input data provided at runtime';
  }
  return 'Workflow data';
}
