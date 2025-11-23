/**
 * Email Node Configuration Component
 * Configures SMTP email sending
 */

import * as React from 'react';
import { Box, FormControl, FormLabel, Input, Textarea, Select, Option, Typography, Chip, IconButton, Button } from '@mui/joy';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Node } from 'reactflow';

interface EmailNodeConfigProps {
  node: Node;
  onChange: (nodeId: string, data: Partial<Node>) => void;
}

export function EmailNodeConfig({ node, onChange }: EmailNodeConfigProps) {
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

  // Recipients management
  const recipients = config.to || [];

  const addRecipient = () => {
    handleConfigChange('to', [...recipients, '']);
  };

  const updateRecipient = (index: number, value: string) => {
    const updated = [...recipients];
    updated[index] = value;
    handleConfigChange('to', updated);
  };

  const removeRecipient = (index: number) => {
    handleConfigChange('to', recipients.filter((_: any, i: number) => i !== index));
  };

  // CC management
  const ccRecipients = config.cc || [];

  const addCC = () => {
    handleConfigChange('cc', [...ccRecipients, '']);
  };

  const updateCC = (index: number, value: string) => {
    const updated = [...ccRecipients];
    updated[index] = value;
    handleConfigChange('cc', updated);
  };

  const removeCC = (index: number) => {
    handleConfigChange('cc', ccRecipients.filter((_: any, i: number) => i !== index));
  };

  // Attachments management
  const attachments = config.attachments || [];

  const addAttachment = () => {
    handleConfigChange('attachments', [...attachments, { path: '', filename: '' }]);
  };

  const updateAttachment = (index: number, field: 'path' | 'filename', value: string) => {
    const updated = [...attachments];
    updated[index] = { ...updated[index], [field]: value };
    handleConfigChange('attachments', updated);
  };

  const removeAttachment = (index: number) => {
    handleConfigChange('attachments', attachments.filter((_: any, i: number) => i !== index));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* SMTP Configuration */}
      <Box>
        <Typography level="title-sm" sx={{ mb: 1 }}>
          SMTP Configuration
        </Typography>

        <FormControl sx={{ mb: 1.5 }}>
          <FormLabel>SMTP Host</FormLabel>
          <Input
            placeholder="smtp.gmail.com"
            value={config.smtpHost || ''}
            onChange={(e) => handleConfigChange('smtpHost', e.target.value)}
          />
        </FormControl>

        <FormControl sx={{ mb: 1.5 }}>
          <FormLabel>SMTP Port</FormLabel>
          <Input
            type="number"
            placeholder="587"
            value={config.smtpPort || ''}
            onChange={(e) => handleConfigChange('smtpPort', parseInt(e.target.value, 10))}
          />
        </FormControl>

        <FormControl sx={{ mb: 1.5 }}>
          <FormLabel>Username</FormLabel>
          <Input
            placeholder="your-email@example.com"
            value={config.smtpUsername || ''}
            onChange={(e) => handleConfigChange('smtpUsername', e.target.value)}
          />
        </FormControl>

        <FormControl sx={{ mb: 1.5 }}>
          <FormLabel>Password</FormLabel>
          <Input
            type="password"
            placeholder="App Password or SMTP Password"
            value={config.smtpPassword || ''}
            onChange={(e) => handleConfigChange('smtpPassword', e.target.value)}
          />
        </FormControl>

        <FormControl sx={{ mb: 1.5 }}>
          <FormLabel>Encryption</FormLabel>
          <Select value={config.smtpSecure || 'tls'} onChange={(_, value) => handleConfigChange('smtpSecure', value)}>
            <Option value="tls">TLS (Port 587)</Option>
            <Option value="ssl">SSL (Port 465)</Option>
            <Option value="none">None (Port 25)</Option>
          </Select>
        </FormControl>
      </Box>

      {/* Email Content */}
      <Box>
        <Typography level="title-sm" sx={{ mb: 1 }}>
          Email Content
        </Typography>

        <FormControl sx={{ mb: 1.5 }}>
          <FormLabel>From</FormLabel>
          <Input
            placeholder="sender@example.com"
            value={config.from || ''}
            onChange={(e) => handleConfigChange('from', e.target.value)}
          />
        </FormControl>

        {/* To Recipients */}
        <FormControl sx={{ mb: 1.5 }}>
          <FormLabel>To (Recipients)</FormLabel>
          {recipients.map((recipient: string, index: number) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Input
                placeholder="recipient@example.com"
                value={recipient}
                onChange={(e) => updateRecipient(index, e.target.value)}
                sx={{ flex: 1 }}
              />
              <IconButton size="sm" color="danger" onClick={() => removeRecipient(index)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
          <Button size="sm" variant="outlined" onClick={addRecipient} startDecorator={<AddIcon />}>
            Add Recipient
          </Button>
        </FormControl>

        {/* CC Recipients */}
        <FormControl sx={{ mb: 1.5 }}>
          <FormLabel>CC (Optional)</FormLabel>
          {ccRecipients.map((recipient: string, index: number) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Input
                placeholder="cc@example.com"
                value={recipient}
                onChange={(e) => updateCC(index, e.target.value)}
                sx={{ flex: 1 }}
              />
              <IconButton size="sm" color="danger" onClick={() => removeCC(index)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
          <Button size="sm" variant="outlined" onClick={addCC} startDecorator={<AddIcon />}>
            Add CC
          </Button>
        </FormControl>

        <FormControl sx={{ mb: 1.5 }}>
          <FormLabel>Subject</FormLabel>
          <Input
            placeholder="Email Subject (supports {{variables}})"
            value={config.subject || ''}
            onChange={(e) => handleConfigChange('subject', e.target.value)}
          />
        </FormControl>

        <FormControl sx={{ mb: 1.5 }}>
          <FormLabel>Body Format</FormLabel>
          <Select value={config.bodyFormat || 'html'} onChange={(_, value) => handleConfigChange('bodyFormat', value)}>
            <Option value="html">HTML</Option>
            <Option value="text">Plain Text</Option>
          </Select>
        </FormControl>

        <FormControl sx={{ mb: 1.5 }}>
          <FormLabel>Body</FormLabel>
          <Textarea
            placeholder={config.bodyFormat === 'html' ? '<h1>Hello</h1><p>{{nodes.result.data}}</p>' : 'Email body (supports {{variables}})'}
            value={config.body || ''}
            onChange={(e) => handleConfigChange('body', e.target.value)}
            minRows={6}
          />
        </FormControl>
      </Box>

      {/* Attachments */}
      <Box>
        <Typography level="title-sm" sx={{ mb: 1 }}>
          Attachments (Optional)
        </Typography>

        {attachments.map((attachment: any, index: number) => (
          <Box key={index} sx={{ mb: 2, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 'sm' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography level="body-sm">Attachment {index + 1}</Typography>
              <IconButton size="sm" color="danger" onClick={() => removeAttachment(index)}>
                <DeleteIcon />
              </IconButton>
            </Box>
            <FormControl sx={{ mb: 1 }}>
              <FormLabel>File Path</FormLabel>
              <Input
                placeholder="/path/to/file.pdf or {{nodes.fileNode.result.path}}"
                value={attachment.path || ''}
                onChange={(e) => updateAttachment(index, 'path', e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Filename (Optional)</FormLabel>
              <Input
                placeholder="report.pdf"
                value={attachment.filename || ''}
                onChange={(e) => updateAttachment(index, 'filename', e.target.value)}
              />
            </FormControl>
          </Box>
        ))}

        <Button size="sm" variant="outlined" onClick={addAttachment} startDecorator={<AddIcon />}>
          Add Attachment
        </Button>
      </Box>

      {/* Variable Help */}
      <Box sx={{ p: 2, bgcolor: 'background.level1', borderRadius: 'sm' }}>
        <Typography level="body-xs" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          💡 Variable Support:
        </Typography>
        <Typography level="body-xs" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
          Use {`{{variables}}`} in To, Subject, and Body fields
        </Typography>
        <Typography level="body-xs" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
          Example: {`{{nodes.nodeId.result.email}}`}
        </Typography>
      </Box>
    </Box>
  );
}
