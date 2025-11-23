import * as React from 'react';
import { Box, FormControl, FormLabel, Input, Select, Option, Textarea, Typography, RadioGroup, Radio } from '@mui/joy';
import type { Node } from 'reactflow';

interface LogicNodeConfigProps {
  node: Node;
  onChange: (nodeId: string, data: Partial<Node>) => void;
}

export function LogicNodeConfig({ node, onChange }: LogicNodeConfigProps) {
  const config = node.data?.config || {};
  const label = node.data?.label || '';

  const updateConfig = (key: string, value: any) => {
    onChange(node.id, {
      data: {
        ...node.data,
        config: {
          ...config,
          [key]: value,
        },
      },
    });
  };

  // If/Then/Else configuration
  if (label.includes('If') || label.includes('Condition')) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography level='title-md'>Conditional Configuration</Typography>

        <FormControl>
          <FormLabel>Condition Type</FormLabel>
          <RadioGroup
            value={config.conditionType || 'comparison'}
            onChange={(e) => updateConfig('conditionType', e.target.value)}
          >
            <Radio value="comparison" label="Comparison" />
            <Radio value="boolean" label="Boolean Expression" />
          </RadioGroup>
        </FormControl>

        {config.conditionType === 'boolean' ? (
          <FormControl>
            <FormLabel>Boolean Expression</FormLabel>
            <Textarea
              placeholder="{{nodes.nodeId.result.success}}"
              value={config.condition || ''}
              onChange={(e) => updateConfig('condition', e.target.value)}
              minRows={3}
            />
            <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
              Enter a boolean variable reference
            </Typography>
          </FormControl>
        ) : (
          <>
            <FormControl>
              <FormLabel>Left Operand</FormLabel>
              <Input
                placeholder="{{nodes.nodeId.result.value}}"
                value={config.leftOperand || ''}
                onChange={(e) => updateConfig('leftOperand', e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Operator</FormLabel>
              <Select
                value={config.operator || '=='}
                onChange={(_, value) => updateConfig('operator', value)}
              >
                <Option value="==">Equals (==)</Option>
                <Option value="!=">Not Equals (!=)</Option>
                <Option value=">">Greater Than (&gt;)</Option>
                <Option value=">=">Greater or Equal (&gt;=)</Option>
                <Option value="<">Less Than (&lt;)</Option>
                <Option value="<=">Less or Equal (&lt;=)</Option>
                <Option value="contains">Contains</Option>
                <Option value="starts_with">Starts With</Option>
                <Option value="ends_with">Ends With</Option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Right Operand</FormLabel>
              <Input
                placeholder="100 or 'success'"
                value={config.rightOperand || ''}
                onChange={(e) => updateConfig('rightOperand', e.target.value)}
              />
            </FormControl>
          </>
        )}

        <Box sx={{ bgcolor: 'background.level1', p: 2, borderRadius: 'sm' }}>
          <Typography level='body-sm' sx={{ mb: 1 }}>
            <strong>Note:</strong> Connect outgoing edges and label them:
          </Typography>
          <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
            • Label one edge as &quot;true&quot; or &quot;yes&quot; for the true branch
          </Typography>
          <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
            • Label another as &quot;false&quot; or &quot;no&quot; for the false branch
          </Typography>
        </Box>
      </Box>
    );
  }

  // Loop configuration
  if (label.includes('Loop') || label.includes('Iterate')) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography level='title-md'>Loop Configuration</Typography>

        <FormControl>
          <FormLabel>Array to Iterate</FormLabel>
          <Textarea
            placeholder="{{nodes.search.result.items}}"
            value={config.array || ''}
            onChange={(e) => updateConfig('array', e.target.value)}
            minRows={3}
          />
          <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
            Reference to an array from a previous node
          </Typography>
        </FormControl>

        <FormControl>
          <FormLabel>Loop Variable Name</FormLabel>
          <Input
            placeholder="item"
            value={config.loopVariable || 'item'}
            onChange={(e) => updateConfig('loopVariable', e.target.value)}
          />
          <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
            Access current item with {`{{variables.${config.loopVariable || 'item'}}}`}
          </Typography>
        </FormControl>

        <FormControl>
          <FormLabel>Max Iterations (Safety Limit)</FormLabel>
          <Input
            type="number"
            value={config.maxIterations || 100}
            onChange={(e) => updateConfig('maxIterations', parseInt(e.target.value, 10))}
            slotProps={{ input: { min: 1, max: 1000 } }}
          />
          <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
            Prevents infinite loops
          </Typography>
        </FormControl>

        <Box sx={{ bgcolor: 'background.level1', p: 2, borderRadius: 'sm' }}>
          <Typography level='body-sm'>
            <strong>Loop Body:</strong> Connect nodes after this loop node to execute them for each iteration.
          </Typography>
        </Box>
      </Box>
    );
  }

  // Merge configuration
  if (label.includes('Merge') || label.includes('Combine')) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography level='title-md'>Merge Configuration</Typography>

        <FormControl>
          <FormLabel>Merge Strategy</FormLabel>
          <Select
            value={config.strategy || 'combine'}
            onChange={(_, value) => updateConfig('strategy', value)}
          >
            <Option value="combine">Combine All Results</Option>
            <Option value="first">Take First Result</Option>
            <Option value="last">Take Last Result</Option>
            <Option value="concatenate">Concatenate Arrays</Option>
          </Select>
        </FormControl>

        <Box sx={{ bgcolor: 'background.level1', p: 2, borderRadius: 'sm' }}>
          <Typography level='body-sm' sx={{ mb: 1 }}>
            <strong>Note:</strong> This node merges results from multiple incoming branches.
          </Typography>
          <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
            Connect multiple nodes to this merge node to combine their outputs.
          </Typography>
        </Box>
      </Box>
    );
  }

  // Generic logic config
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography level='title-md'>Logic Configuration</Typography>
      <Typography level='body-sm' color="neutral">
        Configuration for {label}
      </Typography>
    </Box>
  );
}
