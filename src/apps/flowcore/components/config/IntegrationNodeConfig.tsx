import * as React from 'react';
import { Box, FormControl, FormLabel, Input, Textarea, Switch, Button, Typography, Divider, Alert, Select, Option } from '@mui/joy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import type { Node } from 'reactflow';

import { testEmailConnection } from '../../nodes/integrations/email.executor';
import { testSlackWebhook } from '../../nodes/integrations/slack.executor';
import { testDiscordWebhook } from '../../nodes/integrations/discord.executor';

interface IntegrationNodeConfigProps {
  node: Node;
  onChange: (config: Record<string, any>) => void;
}

export function IntegrationNodeConfig({ node, onChange }: IntegrationNodeConfigProps) {
  const [testStatus, setTestStatus] = React.useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = React.useState(false);

  const config = node.data?.config || {};
  const nodeType = node.data?.label || '';

  const handleChange = (field: string, value: any) => {
    onChange({ ...config, [field]: value });
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestStatus(null);

    try {
      let result: { success: boolean; message: string };

      if (nodeType === 'Send Email') {
        result = await testEmailConnection(config);
      } else if (nodeType === 'Slack Message') {
        result = await testSlackWebhook(config.webhookUrl || '');
      } else if (nodeType === 'Discord Webhook') {
        result = await testDiscordWebhook(config.webhookUrl || '');
      } else {
        result = { success: false, message: 'Unknown integration type' };
      }

      setTestStatus(result);
    } catch (error: any) {
      setTestStatus({ success: false, message: error.message });
    } finally {
      setIsTesting(false);
    }
  };

  // Email configuration
  if (nodeType === 'Send Email') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography level='title-md'>Email Configuration</Typography>

        <Divider>SMTP Server</Divider>

        <FormControl>
          <FormLabel>SMTP Host</FormLabel>
          <Input
            placeholder='smtp.gmail.com'
            value={config.host || ''}
            onChange={(e) => handleChange('host', e.target.value)}
          />
        </FormControl>

        <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1 }}>
          <FormControl>
            <FormLabel>Port</FormLabel>
            <Input
              type='number'
              placeholder='587'
              value={config.port || ''}
              onChange={(e) => handleChange('port', parseInt(e.target.value))}
            />
          </FormControl>

          <FormControl>
            <FormLabel>Secure (SSL)</FormLabel>
            <Switch
              checked={config.secure || false}
              onChange={(e) => handleChange('secure', e.target.checked)}
            />
          </FormControl>
        </Box>

        <FormControl>
          <FormLabel>Username</FormLabel>
          <Input
            placeholder='your-email@example.com'
            value={config.auth?.user || ''}
            onChange={(e) => handleChange('auth', { ...config.auth, user: e.target.value })}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Password / App Password</FormLabel>
          <Input
            type='password'
            placeholder='••••••••'
            value={config.auth?.pass || ''}
            onChange={(e) => handleChange('auth', { ...config.auth, pass: e.target.value })}
          />
        </FormControl>

        <Divider>Email Details</Divider>

        <FormControl>
          <FormLabel>From</FormLabel>
          <Input
            placeholder='sender@example.com'
            value={config.from || ''}
            onChange={(e) => handleChange('from', e.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormLabel>To</FormLabel>
          <Input
            placeholder='recipient@example.com'
            value={config.to || ''}
            onChange={(e) => handleChange('to', e.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Subject</FormLabel>
          <Input
            placeholder='{{variables.subject}} or "Daily Report"'
            value={config.subject || ''}
            onChange={(e) => handleChange('subject', e.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Body (Text)</FormLabel>
          <Textarea
            minRows={4}
            placeholder='Email content... Use {{variables.name}} for dynamic values'
            value={config.text || ''}
            onChange={(e) => handleChange('text', e.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormLabel>CC (optional)</FormLabel>
          <Input
            placeholder='cc@example.com'
            value={config.cc || ''}
            onChange={(e) => handleChange('cc', e.target.value)}
          />
        </FormControl>

        <Button
          variant='outlined'
          color='primary'
          onClick={handleTest}
          loading={isTesting}
          disabled={!config.host || !config.auth?.user || !config.auth?.pass}
        >
          Test SMTP Connection
        </Button>

        {testStatus && (
          <Alert
            color={testStatus.success ? 'success' : 'danger'}
            startDecorator={testStatus.success ? <CheckCircleIcon /> : <ErrorIcon />}
          >
            {testStatus.message}
          </Alert>
        )}
      </Box>
    );
  }

  // Slack configuration
  if (nodeType === 'Slack Message') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography level='title-md'>Slack Configuration</Typography>

        <FormControl>
          <FormLabel>Webhook URL</FormLabel>
          <Input
            placeholder='https://hooks.slack.com/services/...'
            value={config.webhookUrl || ''}
            onChange={(e) => handleChange('webhookUrl', e.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Message Text</FormLabel>
          <Textarea
            minRows={4}
            placeholder='Your message here... Use {{variables.name}} for dynamic values'
            value={config.text || ''}
            onChange={(e) => handleChange('text', e.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Channel (optional)</FormLabel>
          <Input
            placeholder='#general'
            value={config.channel || ''}
            onChange={(e) => handleChange('channel', e.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Username (optional)</FormLabel>
          <Input
            placeholder='FlowCore Bot'
            value={config.username || ''}
            onChange={(e) => handleChange('username', e.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Icon Emoji (optional)</FormLabel>
          <Input
            placeholder=':robot_face:'
            value={config.iconEmoji || ''}
            onChange={(e) => handleChange('iconEmoji', e.target.value)}
          />
        </FormControl>

        <Button
          variant='outlined'
          color='primary'
          onClick={handleTest}
          loading={isTesting}
          disabled={!config.webhookUrl}
        >
          Test Slack Webhook
        </Button>

        {testStatus && (
          <Alert
            color={testStatus.success ? 'success' : 'danger'}
            startDecorator={testStatus.success ? <CheckCircleIcon /> : <ErrorIcon />}
          >
            {testStatus.message}
          </Alert>
        )}
      </Box>
    );
  }

  // Discord configuration
  if (nodeType === 'Discord Webhook') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography level='title-md'>Discord Configuration</Typography>

        <FormControl>
          <FormLabel>Webhook URL</FormLabel>
          <Input
            placeholder='https://discord.com/api/webhooks/...'
            value={config.webhookUrl || ''}
            onChange={(e) => handleChange('webhookUrl', e.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Message Content</FormLabel>
          <Textarea
            minRows={4}
            placeholder='Your message here... Use {{variables.name}} for dynamic values'
            value={config.content || ''}
            onChange={(e) => handleChange('content', e.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Username (optional)</FormLabel>
          <Input
            placeholder='FlowCore Bot'
            value={config.username || ''}
            onChange={(e) => handleChange('username', e.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Avatar URL (optional)</FormLabel>
          <Input
            placeholder='https://example.com/avatar.png'
            value={config.avatarUrl || ''}
            onChange={(e) => handleChange('avatarUrl', e.target.value)}
          />
        </FormControl>

        <Button
          variant='outlined'
          color='primary'
          onClick={handleTest}
          loading={isTesting}
          disabled={!config.webhookUrl}
        >
          Test Discord Webhook
        </Button>

        {testStatus && (
          <Alert
            color={testStatus.success ? 'success' : 'danger'}
            startDecorator={testStatus.success ? <CheckCircleIcon /> : <ErrorIcon />}
          >
            {testStatus.message}
          </Alert>
        )}
      </Box>
    );
  }

  return null;
}
