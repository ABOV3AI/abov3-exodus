import * as React from 'react';
import { Box, FormControl, FormLabel, Input, Select, Option, Textarea, Typography, Chip } from '@mui/joy';
import type { Node } from 'reactflow';

interface TriggerNodeConfigProps {
  node: Node;
  onChange: (nodeId: string, data: Partial<Node>) => void;
}

const CRON_PRESETS = {
  'Every minute': '* * * * *',
  'Every 5 minutes': '*/5 * * * *',
  'Every hour': '0 * * * *',
  'Every day at 9am': '0 9 * * *',
  'Every day at midnight': '0 0 * * *',
  'Every Monday at 9am': '0 9 * * 1',
  'Every weekday at 9am': '0 9 * * 1-5',
};

export function TriggerNodeConfig({ node, onChange }: TriggerNodeConfigProps) {
  const config = node.data?.config || {};
  const label = node.data?.label || '';
  const [usePreset, setUsePreset] = React.useState(true);

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

  // Manual Trigger configuration
  if (label === 'Manual Trigger') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography level='title-md'>Manual Trigger Configuration</Typography>

        <FormControl>
          <FormLabel>Input Schema (JSON, optional)</FormLabel>
          <Textarea
            placeholder={'{\n  "query": "string",\n  "limit": 10\n}'}
            value={config.inputSchema || ''}
            onChange={(e) => updateConfig('inputSchema', e.target.value)}
            minRows={6}
          />
          <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
            Define expected input structure for manual runs
          </Typography>
        </FormControl>

        <Box sx={{ bgcolor: 'background.level1', p: 2, borderRadius: 'sm' }}>
          <Typography level='body-sm'>
            <strong>Manual Trigger:</strong> Start workflow by clicking &quot;Run&quot; button. You can provide input data each time you run.
          </Typography>
        </Box>
      </Box>
    );
  }

  // Schedule Trigger configuration
  if (label === 'Schedule Trigger') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography level='title-md'>Schedule Trigger Configuration</Typography>

        <FormControl>
          <FormLabel>Schedule Type</FormLabel>
          <Select
            value={usePreset ? 'preset' : 'custom'}
            onChange={(_, value) => setUsePreset(value === 'preset')}
          >
            <Option value="preset">Preset Schedule</Option>
            <Option value="custom">Custom Cron Expression</Option>
          </Select>
        </FormControl>

        {usePreset ? (
          <FormControl>
            <FormLabel>Schedule Preset</FormLabel>
            <Select
              value={config.schedule || 'Every hour'}
              onChange={(_, value) => {
                updateConfig('schedule', value);
                updateConfig('cron', CRON_PRESETS[value as keyof typeof CRON_PRESETS]);
              }}
            >
              {Object.keys(CRON_PRESETS).map((preset) => (
                <Option key={preset} value={preset}>
                  {preset}
                </Option>
              ))}
            </Select>
            {config.cron && (
              <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
                Cron: <code>{config.cron}</code>
              </Typography>
            )}
          </FormControl>
        ) : (
          <FormControl>
            <FormLabel>Cron Expression</FormLabel>
            <Input
              placeholder="0 9 * * *"
              value={config.cron || ''}
              onChange={(e) => updateConfig('cron', e.target.value)}
            />
            <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
              Format: minute hour day month weekday
            </Typography>
          </FormControl>
        )}

        <FormControl>
          <FormLabel>Timezone</FormLabel>
          <Select
            value={config.timezone || 'UTC'}
            onChange={(_, value) => updateConfig('timezone', value)}
          >
            <Option value="UTC">UTC</Option>
            <Option value="America/New_York">America/New York (EST)</Option>
            <Option value="America/Los_Angeles">America/Los Angeles (PST)</Option>
            <Option value="Europe/London">Europe/London (GMT)</Option>
            <Option value="Asia/Tokyo">Asia/Tokyo (JST)</Option>
          </Select>
        </FormControl>

        <Box sx={{ bgcolor: 'background.level1', p: 2, borderRadius: 'sm' }}>
          <Typography level='body-sm' sx={{ fontWeight: 'bold', mb: 1 }}>
            Cron Format Reference:
          </Typography>
          <Typography level='body-xs' sx={{ fontFamily: 'monospace', mb: 0.5 }}>
            * * * * *
          </Typography>
          <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
            │ │ │ │ │
          </Typography>
          <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
            │ │ │ │ └─ Weekday (0-7, Sunday=0 or 7)
          </Typography>
          <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
            │ │ │ └──── Month (1-12)
          </Typography>
          <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
            │ │ └─────── Day (1-31)
          </Typography>
          <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
            │ └──────── Hour (0-23)
          </Typography>
          <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
            └────────── Minute (0-59)
          </Typography>
        </Box>
      </Box>
    );
  }

  // Webhook Trigger configuration
  if (label === 'Webhook Trigger') {
    const webhookUrl = `${window.location.origin}/api/flowcore/webhook/${node.id}`;

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography level='title-md'>Webhook Trigger Configuration</Typography>

        <FormControl>
          <FormLabel>Webhook URL</FormLabel>
          <Input
            value={webhookUrl}
            readOnly
            endDecorator={
              <Chip
                size="sm"
                variant="soft"
                onClick={() => navigator.clipboard.writeText(webhookUrl)}
                sx={{ cursor: 'pointer' }}
              >
                Copy
              </Chip>
            }
          />
          <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
            POST requests to this URL will trigger the workflow
          </Typography>
        </FormControl>

        <FormControl>
          <FormLabel>Authentication Token</FormLabel>
          <Input
            placeholder="Enter bearer token for authentication"
            value={config.authToken || ''}
            onChange={(e) => updateConfig('authToken', e.target.value)}
            type="password"
          />
          <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
            {'Optional: Require "Authorization: Bearer <token>" header'}
          </Typography>
        </FormControl>

        <FormControl>
          <FormLabel>Expected Payload Schema (JSON, optional)</FormLabel>
          <Textarea
            placeholder={'{\n  "event": "string",\n  "data": {}\n}'}
            value={config.payloadSchema || ''}
            onChange={(e) => updateConfig('payloadSchema', e.target.value)}
            minRows={6}
          />
          <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
            Define expected webhook payload structure
          </Typography>
        </FormControl>

        <Box sx={{ bgcolor: 'background.level1', p: 2, borderRadius: 'sm' }}>
          <Typography level='body-sm' sx={{ fontWeight: 'bold', mb: 1 }}>
            Example cURL:
          </Typography>
          <Typography level='body-xs' sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {`curl -X POST ${webhookUrl} \\\n  -H "Content-Type: application/json" \\\n`}
            {config.authToken && `-H "Authorization: Bearer ${config.authToken}" \\\n`}
            {`  -d '{"event": "test"}'`}
          </Typography>
        </Box>
      </Box>
    );
  }

  // Generic trigger config
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography level='title-md'>Trigger Configuration</Typography>
      <Typography level='body-sm' color="neutral">
        Configuration for {label}
      </Typography>
    </Box>
  );
}
