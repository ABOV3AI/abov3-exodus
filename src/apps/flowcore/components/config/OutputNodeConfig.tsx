import * as React from 'react';
import { Box, FormControl, FormLabel, Input, Select, Option, Textarea, Typography } from '@mui/joy';
import type { Node } from 'reactflow';

interface OutputNodeConfigProps {
  node: Node;
  onChange: (nodeId: string, data: Partial<Node>) => void;
}

export function OutputNodeConfig({ node, onChange }: OutputNodeConfigProps) {
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

  // Return Result configuration
  if (label === 'Return Result') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography level='title-md'>Return Result Configuration</Typography>

        <FormControl>
          <FormLabel>Output Format</FormLabel>
          <Select
            value={config.outputFormat || 'auto'}
            onChange={(_, value) => updateConfig('outputFormat', value)}
          >
            <Option value="auto">Auto (preserve structure)</Option>
            <Option value="json">JSON</Option>
            <Option value="text">Plain Text</Option>
            <Option value="formatted">Formatted Text</Option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Custom Format Template (optional)</FormLabel>
          <Textarea
            placeholder="Result: {{nodes.llm.result.response}}"
            value={config.formatTemplate || ''}
            onChange={(e) => updateConfig('formatTemplate', e.target.value)}
            minRows={4}
          />
          <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
            Use variables to customize the output format
          </Typography>
        </FormControl>

        <Box sx={{ bgcolor: 'background.level1', p: 2, borderRadius: 'sm' }}>
          <Typography level='body-sm'>
            <strong>Return Result:</strong> This node marks the end of the workflow and returns the final output.
          </Typography>
        </Box>
      </Box>
    );
  }

  // Send Notification configuration
  if (label === 'Send Notification') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography level='title-md'>Send Notification Configuration</Typography>

        <FormControl>
          <FormLabel>Notification Type</FormLabel>
          <Select
            value={config.notificationType || 'webhook'}
            onChange={(_, value) => updateConfig('notificationType', value)}
          >
            <Option value="webhook">Webhook</Option>
            <Option value="email">Email (future)</Option>
            <Option value="slack">Slack (future)</Option>
            <Option value="discord">Discord (future)</Option>
          </Select>
        </FormControl>

        {config.notificationType === 'webhook' && (
          <>
            <FormControl>
              <FormLabel>Webhook URL</FormLabel>
              <Input
                placeholder="https://hooks.example.com/notify"
                value={config.webhookUrl || ''}
                onChange={(e) => updateConfig('webhookUrl', e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Message</FormLabel>
              <Textarea
                placeholder="Workflow completed: {{nodes.llm.result.response}}"
                value={config.message || ''}
                onChange={(e) => updateConfig('message', e.target.value)}
                minRows={4}
              />
              <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
                Use variables to include workflow results in the notification
              </Typography>
            </FormControl>
          </>
        )}

        <Box sx={{ bgcolor: 'background.level1', p: 2, borderRadius: 'sm' }}>
          <Typography level='body-sm'>
            <strong>Send Notification:</strong> Sends a notification when this node executes.
          </Typography>
        </Box>
      </Box>
    );
  }

  // Generic output config
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography level='title-md'>Output Configuration</Typography>
      <Typography level='body-sm' color="neutral">
        Configuration for {label}
      </Typography>
    </Box>
  );
}
