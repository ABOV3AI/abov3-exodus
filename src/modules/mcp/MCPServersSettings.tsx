/**
 * MCP Servers Settings Component
 * Configure MCP (Model Context Protocol) servers for universal tool support
 */

import * as React from 'react';
import { Box, Button, FormControl, FormHelperText, FormLabel, IconButton, Input, List, ListItem, ListItemButton, ListItemDecorator, Sheet, Switch, Typography } from '@mui/joy';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudIcon from '@mui/icons-material/Cloud';
import CloudOffIcon from '@mui/icons-material/CloudOff';

import { FormLabelStart } from '~/common/components/forms/FormLabelStart';
import { useMCPServersStore } from '~/common/stores/store-mcp-servers';
import { MCPToolsManager } from './MCPToolsManager';


export function MCPServersSettings() {
  const { servers, addServer, removeServer, toggleServer } = useMCPServersStore();

  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newServerName, setNewServerName] = React.useState('');
  const [newServerUrl, setNewServerUrl] = React.useState('');
  const [newServerAuthToken, setNewServerAuthToken] = React.useState('');
  const [addError, setAddError] = React.useState<string | null>(null);

  const handleAddServer = async () => {
    if (!newServerName.trim()) {
      setAddError('Server name is required');
      return;
    }
    if (!newServerUrl.trim()) {
      setAddError('Server URL is required');
      return;
    }

    try {
      await addServer({
        name: newServerName.trim(),
        type: 'url',
        url: newServerUrl.trim(),
        authToken: newServerAuthToken.trim() || undefined,
        enabled: true,
      });

      // Reset form
      setNewServerName('');
      setNewServerUrl('');
      setNewServerAuthToken('');
      setShowAddForm(false);
      setAddError(null);
    } catch (error: any) {
      setAddError(error.message || 'Failed to add server');
    }
  };

  const handleRemoveServer = async (id: string) => {
    if (confirm('Remove this MCP server?')) {
      await removeServer(id);
    }
  };

  const handleToggleServer = async (id: string) => {
    try {
      await toggleServer(id);
    } catch (error: any) {
      alert(`Failed to toggle server: ${error.message}`);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography level="body-sm">
        MCP (Model Context Protocol) servers provide additional tools that work with any AI model supporting function calling
        (OpenAI, Gemini, Groq, etc.). Add MCP servers to extend model capabilities with custom tools.
      </Typography>

      {/* Servers List */}
      <FormControl>
        <FormLabelStart title={`MCP Servers (${servers.length})`} />

        {servers.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3, bgcolor: 'background.level1', borderRadius: 'sm' }}>
            <Typography level="body-sm" color="neutral">
              No MCP servers configured yet.
              <br />
              Click &quot;Add MCP Server&quot; to get started.
            </Typography>
          </Box>
        ) : (
          <List size="sm" sx={{ '--ListItem-paddingY': '0.5rem' }}>
            {servers.map((server) => (
              <ListItem
                key={server.id}
                endAction={
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Switch
                      checked={server.enabled}
                      onChange={() => handleToggleServer(server.id)}
                      size="sm"
                    />
                    <IconButton
                      size="sm"
                      color="danger"
                      variant="plain"
                      onClick={() => handleRemoveServer(server.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemButton sx={{ pointerEvents: 'none' }}>
                  <ListItemDecorator>
                    {server.enabled ? (
                      <CloudIcon sx={{ color: 'success.500' }} />
                    ) : (
                      <CloudOffIcon sx={{ color: 'neutral.400' }} />
                    )}
                  </ListItemDecorator>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography level="title-sm">{server.name}</Typography>
                    <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                      {server.url}
                    </Typography>
                  </Box>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}

        <FormHelperText sx={{ fontSize: 'xs' }}>
          Enabled MCP servers provide tools to all models that support function calling.
        </FormHelperText>
      </FormControl>

      {/* Add Server Form */}
      {showAddForm ? (
        <Sheet variant="outlined" sx={{ p: 2, borderRadius: 'sm' }}>
          <Typography level="title-sm" sx={{ mb: 2 }}>Add MCP Server</Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl error={!!addError}>
              <FormLabel>Server Name</FormLabel>
              <Input
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
                placeholder="e.g., Filesystem Server"
                size="sm"
              />
            </FormControl>

            <FormControl error={!!addError}>
              <FormLabel>Server URL</FormLabel>
              <Input
                value={newServerUrl}
                onChange={(e) => setNewServerUrl(e.target.value)}
                placeholder="e.g., http://localhost:3000/mcp"
                size="sm"
              />
              <FormHelperText sx={{ fontSize: 'xs' }}>
                HTTP/HTTPS URL of the MCP server endpoint
              </FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>Authorization Token (Optional)</FormLabel>
              <Input
                value={newServerAuthToken}
                onChange={(e) => setNewServerAuthToken(e.target.value)}
                placeholder="Bearer token"
                type="password"
                size="sm"
              />
            </FormControl>

            {addError && (
              <Typography level="body-sm" color="danger">
                {addError}
              </Typography>
            )}

            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                variant="plain"
                color="neutral"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setAddError(null);
                  setNewServerName('');
                  setNewServerUrl('');
                  setNewServerAuthToken('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="solid"
                color="primary"
                size="sm"
                onClick={handleAddServer}
              >
                Add Server
              </Button>
            </Box>
          </Box>
        </Sheet>
      ) : (
        <Button
          startDecorator={<AddIcon />}
          variant="outlined"
          color="primary"
          size="sm"
          onClick={() => setShowAddForm(true)}
        >
          Add MCP Server
        </Button>
      )}

      {/* Tools Manager - with search filter */}
      {servers.some(s => s.enabled) && (
        <Box sx={{ mt: 2 }}>
          <Typography level="title-sm" sx={{ mb: 1.5 }}>
            Manage Tools
          </Typography>
          <MCPToolsManager />
        </Box>
      )}

      {/* Info Box */}
      <Sheet variant="soft" color="primary" sx={{ p: 2, borderRadius: 'sm' }}>
        <Typography level="title-sm" sx={{ mb: 1 }}>
          📘 About MCP
        </Typography>
        <Typography level="body-sm">
          MCP (Model Context Protocol) is an open protocol for connecting AI models to external tools and data sources.
          With client-side MCP runtime, ABOV3 Exodus enables <strong>any function-calling model</strong> (OpenAI, Gemini, Groq, etc.)
          to use MCP tools.
        </Typography>
        <Typography level="body-xs" sx={{ mt: 1 }}>
          Learn more: <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer">modelcontextprotocol.io</a>
        </Typography>
      </Sheet>
    </Box>
  );
}
