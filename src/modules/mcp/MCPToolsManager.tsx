/**
 * MCP Tools Manager Component
 * Lists and filters tools from connected MCP servers (like Eden)
 */

import * as React from 'react';
import { Box, Checkbox, Chip, CircularProgress, FormControl, IconButton, Input, List, ListItem, ListItemContent, Sheet, Typography } from '@mui/joy';
import BuildIcon from '@mui/icons-material/Build';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

import { FormLabelStart } from '~/common/components/forms/FormLabelStart';
import { getMCPRuntime, type MCPTool } from './mcp.runtime';
import { useMCPServersStore } from '~/common/stores/store-mcp-servers';


interface ToolWithServer extends MCPTool {
  serverName: string;
  fullId: string;
}


export function MCPToolsManager() {
  // State
  const [tools, setTools] = React.useState<ToolWithServer[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [disabledTools, setDisabledTools] = React.useState<Set<string>>(new Set());

  // External state
  const servers = useMCPServersStore(state => state.servers);
  const enabledServers = servers.filter(s => s.enabled);

  // Fetch tools from all connected servers
  const fetchTools = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const runtime = getMCPRuntime();
      const allTools = await runtime.getAllTools();

      // Convert to ToolWithServer format
      const toolsWithServer: ToolWithServer[] = allTools.map(({ tool, serverName }) => ({
        ...tool,
        serverName,
        fullId: `${serverName}__${tool.name}`,
      }));

      setTools(toolsWithServer);
    } catch (error) {
      console.error('Failed to fetch MCP tools:', error);
      setTools([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch tools on mount and when servers change
  React.useEffect(() => {
    if (enabledServers.length > 0) {
      fetchTools();
    } else {
      setTools([]);
    }
  }, [enabledServers.length, fetchTools]);

  // Filter tools based on search query
  const filteredTools = React.useMemo(() => {
    if (!searchQuery.trim()) return tools;

    const query = searchQuery.toLowerCase();
    return tools.filter(tool =>
      tool.name.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query) ||
      tool.serverName.toLowerCase().includes(query)
    );
  }, [tools, searchQuery]);

  // Group tools by server
  const groupedTools = React.useMemo(() => {
    const groups: Record<string, ToolWithServer[]> = {};
    for (const tool of filteredTools) {
      if (!groups[tool.serverName]) {
        groups[tool.serverName] = [];
      }
      groups[tool.serverName].push(tool);
    }
    return groups;
  }, [filteredTools]);

  // Handle tool enable/disable toggle
  const handleToggleTool = (fullId: string) => {
    setDisabledTools(prev => {
      const next = new Set(prev);
      if (next.has(fullId)) {
        next.delete(fullId);
      } else {
        next.add(fullId);
      }
      return next;
    });
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  if (enabledServers.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 3, bgcolor: 'background.level1', borderRadius: 'sm' }}>
        <Typography level="body-sm" color="neutral">
          No MCP servers connected.
          <br />
          Add and enable an MCP server above to see available tools.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header with search and refresh */}
      <FormControl>
        <FormLabelStart
          title={`Available Tools (${filteredTools.length}${searchQuery ? ` of ${tools.length}` : ''})`}
        />

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Input
            placeholder="Search tools by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startDecorator={<SearchIcon sx={{ color: 'neutral.500' }} />}
            endDecorator={
              searchQuery ? (
                <IconButton
                  size="sm"
                  variant="plain"
                  color="neutral"
                  onClick={handleClearSearch}
                >
                  <ClearIcon />
                </IconButton>
              ) : null
            }
            sx={{ flex: 1 }}
            size="sm"
          />
          <IconButton
            size="sm"
            variant="outlined"
            color="neutral"
            onClick={fetchTools}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size="sm" /> : <RefreshIcon />}
          </IconButton>
        </Box>
      </FormControl>

      {/* Tools list grouped by server */}
      {isLoading && tools.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredTools.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 3, bgcolor: 'background.level1', borderRadius: 'sm' }}>
          <Typography level="body-sm" color="neutral">
            {searchQuery
              ? `No tools matching "${searchQuery}"`
              : 'No tools available from connected servers.'
            }
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Object.entries(groupedTools).map(([serverName, serverTools]) => (
            <Sheet
              key={serverName}
              variant="outlined"
              sx={{ borderRadius: 'sm', overflow: 'hidden' }}
            >
              {/* Server header */}
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  bgcolor: 'background.level1',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <BuildIcon sx={{ fontSize: 16, color: 'primary.500' }} />
                <Typography level="title-sm">{serverName}</Typography>
                <Chip size="sm" variant="soft" color="primary">
                  {serverTools.length} tools
                </Chip>
              </Box>

              {/* Tools list */}
              <List
                size="sm"
                sx={{
                  '--ListItem-paddingY': '0.5rem',
                  '--ListItem-paddingX': '1rem',
                  maxHeight: '300px',
                  overflowY: 'auto',
                }}
              >
                {serverTools.map((tool) => (
                  <ListItem
                    key={tool.fullId}
                    sx={{
                      opacity: disabledTools.has(tool.fullId) ? 0.5 : 1,
                      '&:not(:last-child)': {
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      },
                    }}
                  >
                    <Checkbox
                      size="sm"
                      checked={!disabledTools.has(tool.fullId)}
                      onChange={() => handleToggleTool(tool.fullId)}
                      sx={{ mr: 1 }}
                    />
                    <ListItemContent>
                      <Typography level="title-sm" sx={{ fontFamily: 'monospace' }}>
                        {tool.name}
                      </Typography>
                      <Typography
                        level="body-xs"
                        sx={{
                          color: 'text.tertiary',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {tool.description}
                      </Typography>
                    </ListItemContent>
                  </ListItem>
                ))}
              </List>
            </Sheet>
          ))}
        </Box>
      )}

      {/* Info text */}
      <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
        Tools from MCP servers are available to AI models that support function calling.
        Disable individual tools to prevent the AI from using them.
      </Typography>
    </Box>
  );
}
