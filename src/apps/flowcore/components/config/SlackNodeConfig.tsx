/**
 * Slack Node Configuration Component
 * Configures Slack webhook integrations
 */

import * as React from 'react';
import { Box, FormControl, FormLabel, Input, Textarea, Select, Option, Typography, Chip, IconButton, Alert } from '@mui/joy';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import type { Node } from 'reactflow';

interface SlackNodeConfigProps {
  node: Node;
  onChange: (nodeId: string, data: Partial<Node>) => void;
}

export function SlackNodeConfig({ node, onChange }: SlackNodeConfigProps) {
  const config = node.data?.config || {};

  const handleConfigChange = (key: string, value: any) => {
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

  // Blocks/Attachments management for advanced formatting
  const blocks = config.blocks || [];

  const addBlock = () => {
    handleConfigChange('blocks', [
      ...blocks,
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '',
        },
      },
    ]);
  };

  const updateBlockText = (index: number, value: string) => {
    const updated = [...blocks];
    updated[index] = {
      ...updated[index],
      text: {
        ...updated[index].text,
        text: value,
      },
    };
    handleConfigChange('blocks', updated);
  };

  const removeBlock = (index: number) => {
    handleConfigChange('blocks', blocks.filter((_: any, i: number) => i !== index));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Webhook URL */}
      <FormControl>
        <FormLabel>Webhook URL</FormLabel>
        <Input
          placeholder="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
          value={config.webhookUrl || ''}
          onChange={(e) => handleConfigChange('webhookUrl', e.target.value)}
        />
        <Typography level="body-xs" sx={{ mt: 0.5, color: 'text.tertiary' }}>
          Get this from Slack App Settings → Incoming Webhooks
        </Typography>
      </FormControl>

      {/* Message Format */}
      <FormControl>
        <FormLabel>Message Format</FormLabel>
        <Select value={config.messageFormat || 'simple'} onChange={(_, value) => handleConfigChange('messageFormat', value)}>
          <Option value="simple">Simple Text</Option>
          <Option value="blocks">Blocks (Advanced)</Option>
        </Select>
      </FormControl>

      {/* Simple Text Mode */}
      {config.messageFormat === 'simple' && (
        <>
          <FormControl>
            <FormLabel>Message Text</FormLabel>
            <Textarea
              placeholder="Enter your message (supports {{variables}} and Slack markdown)"
              value={config.text || ''}
              onChange={(e) => handleConfigChange('text', e.target.value)}
              minRows={4}
            />
            <Typography level="body-xs" sx={{ mt: 0.5, color: 'text.tertiary' }}>
              Supports Slack markdown: *bold*, _italic_, ~strike~, `code`, ```block```
            </Typography>
          </FormControl>

          <FormControl>
            <FormLabel>Username (Optional)</FormLabel>
            <Input
              placeholder="Bot Name"
              value={config.username || ''}
              onChange={(e) => handleConfigChange('username', e.target.value)}
            />
          </FormControl>

          <FormControl>
            <FormLabel>Icon Emoji (Optional)</FormLabel>
            <Input
              placeholder=":robot_face:"
              value={config.iconEmoji || ''}
              onChange={(e) => handleConfigChange('iconEmoji', e.target.value)}
            />
          </FormControl>

          <FormControl>
            <FormLabel>Channel Override (Optional)</FormLabel>
            <Input
              placeholder="#channel-name or @username"
              value={config.channel || ''}
              onChange={(e) => handleConfigChange('channel', e.target.value)}
            />
            <Typography level="body-xs" sx={{ mt: 0.5, color: 'text.tertiary' }}>
              Override the default webhook channel
            </Typography>
          </FormControl>
        </>
      )}

      {/* Blocks Mode */}
      {config.messageFormat === 'blocks' && (
        <Box>
          <Typography level="title-sm" sx={{ mb: 1 }}>
            Message Blocks
          </Typography>

          <Alert color="primary" variant="soft" sx={{ mb: 2 }} startDecorator={<InfoIcon />}>
            <Typography level="body-xs">
              Blocks provide rich formatting with sections, dividers, buttons, and more.
              Learn more at{' '}
              <a href="https://api.slack.com/block-kit" target="_blank" rel="noopener noreferrer">
                api.slack.com/block-kit
              </a>
            </Typography>
          </Alert>

          {blocks.map((block: any, index: number) => (
            <Box key={index} sx={{ mb: 2, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 'sm' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography level="body-sm">Block {index + 1}</Typography>
                <IconButton size="sm" color="danger" onClick={() => removeBlock(index)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
              <Textarea
                placeholder="Enter markdown text for this section (supports {{variables}})"
                value={block.text?.text || ''}
                onChange={(e) => updateBlockText(index, e.target.value)}
                minRows={3}
              />
            </Box>
          ))}

          <IconButton size="sm" variant="outlined" onClick={addBlock} startDecorator={<AddIcon />}>
            Add Block
          </IconButton>

          <FormControl sx={{ mt: 2 }}>
            <FormLabel>Fallback Text</FormLabel>
            <Input
              placeholder="Plain text fallback for notifications"
              value={config.text || ''}
              onChange={(e) => handleConfigChange('text', e.target.value)}
            />
            <Typography level="body-xs" sx={{ mt: 0.5, color: 'text.tertiary' }}>
              Used for notifications when blocks can't be displayed
            </Typography>
          </FormControl>
        </Box>
      )}

      {/* Thread Settings */}
      <Box>
        <Typography level="title-sm" sx={{ mb: 1 }}>
          Thread Settings
        </Typography>

        <FormControl>
          <FormLabel>Thread Timestamp (Optional)</FormLabel>
          <Input
            placeholder="{{nodes.prevMessage.result.ts}}"
            value={config.threadTs || ''}
            onChange={(e) => handleConfigChange('threadTs', e.target.value)}
          />
          <Typography level="body-xs" sx={{ mt: 0.5, color: 'text.tertiary' }}>
            Reply to a thread by providing the parent message timestamp
          </Typography>
        </FormControl>
      </Box>

      {/* Notification Settings */}
      <Box>
        <Typography level="title-sm" sx={{ mb: 1 }}>
          Notification Settings
        </Typography>

        <FormControl>
          <FormLabel>Unfurl Links</FormLabel>
          <Select
            value={config.unfurlLinks !== undefined ? String(config.unfurlLinks) : 'true'}
            onChange={(_, value) => handleConfigChange('unfurlLinks', value === 'true')}
          >
            <Option value="true">Enable (show link previews)</Option>
            <Option value="false">Disable (no previews)</Option>
          </Select>
        </FormControl>

        <FormControl sx={{ mt: 1.5 }}>
          <FormLabel>Unfurl Media</FormLabel>
          <Select
            value={config.unfurlMedia !== undefined ? String(config.unfurlMedia) : 'true'}
            onChange={(_, value) => handleConfigChange('unfurlMedia', value === 'true')}
          >
            <Option value="true">Enable (show image/video previews)</Option>
            <Option value="false">Disable (no media previews)</Option>
          </Select>
        </FormControl>
      </Box>

      {/* Mention Support */}
      <Box sx={{ p: 2, bgcolor: 'background.level1', borderRadius: 'sm' }}>
        <Typography level="body-xs" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          💡 Tips:
        </Typography>
        <Typography level="body-xs" sx={{ fontFamily: 'monospace', color: 'text.secondary', mb: 0.5 }}>
          • Mention users: <code>&lt;@USER_ID&gt;</code> or <code>@channel</code>, <code>@here</code>
        </Typography>
        <Typography level="body-xs" sx={{ fontFamily: 'monospace', color: 'text.secondary', mb: 0.5 }}>
          • Use variables: <code>{`{{nodes.nodeId.result.data}}`}</code>
        </Typography>
        <Typography level="body-xs" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
          • Link format: <code>&lt;https://example.com|Link Text&gt;</code>
        </Typography>
      </Box>

      {/* Quick Examples */}
      <Box sx={{ p: 2, bgcolor: 'background.level2', borderRadius: 'sm' }}>
        <Typography level="body-xs" sx={{ fontWeight: 'bold', mb: 1 }}>
          📝 Example Messages:
        </Typography>
        <Typography level="body-xs" sx={{ fontFamily: 'monospace', color: 'text.secondary', mb: 0.5 }}>
          Simple: <code>Workflow completed successfully! ✅</code>
        </Typography>
        <Typography level="body-xs" sx={{ fontFamily: 'monospace', color: 'text.secondary', mb: 0.5 }}>
          With data: <code>User {`{{trigger.payload.name}}`} signed up!</code>
        </Typography>
        <Typography level="body-xs" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
          Alert: <code>@channel Critical alert: {`{{nodes.check.result.error}}`}</code>
        </Typography>
      </Box>
    </Box>
  );
}
