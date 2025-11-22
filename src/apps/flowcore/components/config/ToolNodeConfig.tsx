import * as React from 'react';
import { Box, FormControl, FormLabel, Input, Select, Option, Textarea, Button, Typography, Divider, IconButton } from '@mui/joy';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Node } from 'reactflow';

interface ToolNodeConfigProps {
  node: Node;
  onChange: (nodeId: string, data: Partial<Node>) => void;
}

export function ToolNodeConfig({ node, onChange }: ToolNodeConfigProps) {
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

  // HTTP Request configuration
  if (label === 'HTTP Request') {
    const [headers, setHeaders] = React.useState<Array<{ key: string; value: string }>>(
      config.headers || [{ key: '', value: '' }]
    );

    const updateHeaders = (newHeaders: Array<{ key: string; value: string }>) => {
      setHeaders(newHeaders);
      const headersObject = newHeaders.reduce((acc, h) => {
        if (h.key) acc[h.key] = h.value;
        return acc;
      }, {} as Record<string, string>);
      updateConfig('headers', headersObject);
    };

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography level='title-md'>HTTP Request Configuration</Typography>

        <FormControl>
          <FormLabel>Method</FormLabel>
          <Select
            value={config.method || 'GET'}
            onChange={(_, value) => updateConfig('method', value)}
          >
            <Option value="GET">GET</Option>
            <Option value="POST">POST</Option>
            <Option value="PUT">PUT</Option>
            <Option value="DELETE">DELETE</Option>
            <Option value="PATCH">PATCH</Option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>URL</FormLabel>
          <Input
            placeholder="https://api.example.com/endpoint"
            value={config.url || ''}
            onChange={(e) => updateConfig('url', e.target.value)}
          />
          <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
            Supports variables: {`{{nodes.nodeId.result}}`}
          </Typography>
        </FormControl>

        <FormControl>
          <FormLabel>Headers</FormLabel>
          {headers.map((header, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Input
                placeholder="Key"
                value={header.key}
                onChange={(e) => {
                  const newHeaders = [...headers];
                  newHeaders[index].key = e.target.value;
                  updateHeaders(newHeaders);
                }}
                sx={{ flex: 1 }}
              />
              <Input
                placeholder="Value"
                value={header.value}
                onChange={(e) => {
                  const newHeaders = [...headers];
                  newHeaders[index].value = e.target.value;
                  updateHeaders(newHeaders);
                }}
                sx={{ flex: 1 }}
              />
              <IconButton
                size="sm"
                color="danger"
                onClick={() => {
                  const newHeaders = headers.filter((_, i) => i !== index);
                  updateHeaders(newHeaders.length > 0 ? newHeaders : [{ key: '', value: '' }]);
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
          <Button
            size="sm"
            variant="outlined"
            startDecorator={<AddIcon />}
            onClick={() => updateHeaders([...headers, { key: '', value: '' }])}
          >
            Add Header
          </Button>
        </FormControl>

        {(config.method === 'POST' || config.method === 'PUT' || config.method === 'PATCH') && (
          <FormControl>
            <FormLabel>Request Body</FormLabel>
            <Textarea
              placeholder='{"key": "value"}'
              value={config.body || ''}
              onChange={(e) => updateConfig('body', e.target.value)}
              minRows={4}
            />
            <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
              JSON format. Supports variables.
            </Typography>
          </FormControl>
        )}
      </Box>
    );
  }

  // Web Search configuration
  if (label === 'Web Search') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography level='title-md'>Web Search Configuration</Typography>

        <FormControl>
          <FormLabel>Search Query</FormLabel>
          <Input
            placeholder="Enter search query"
            value={config.query || ''}
            onChange={(e) => updateConfig('query', e.target.value)}
          />
          <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
            Supports variables: {`{{trigger.payload.topic}}`}
          </Typography>
        </FormControl>

        <FormControl>
          <FormLabel>Number of Results</FormLabel>
          <Input
            type="number"
            value={config.num_results || 10}
            onChange={(e) => updateConfig('num_results', parseInt(e.target.value, 10))}
            slotProps={{ input: { min: 1, max: 50 } }}
          />
        </FormControl>
      </Box>
    );
  }

  // File Read configuration
  if (label === 'File Read') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography level='title-md'>File Read Configuration</Typography>

        <FormControl>
          <FormLabel>File Path</FormLabel>
          <Input
            placeholder="/path/to/file.txt"
            value={config.path || ''}
            onChange={(e) => updateConfig('path', e.target.value)}
          />
          <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
            Supports variables for dynamic paths
          </Typography>
        </FormControl>

        <FormControl>
          <FormLabel>Encoding</FormLabel>
          <Select
            value={config.encoding || 'utf-8'}
            onChange={(_, value) => updateConfig('encoding', value)}
          >
            <Option value="utf-8">UTF-8</Option>
            <Option value="ascii">ASCII</Option>
            <Option value="base64">Base64</Option>
          </Select>
        </FormControl>
      </Box>
    );
  }

  // File Write configuration
  if (label === 'File Write') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography level='title-md'>File Write Configuration</Typography>

        <FormControl>
          <FormLabel>File Path</FormLabel>
          <Input
            placeholder="/path/to/output.txt"
            value={config.path || ''}
            onChange={(e) => updateConfig('path', e.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Content</FormLabel>
          <Textarea
            placeholder="File content to write"
            value={config.content || ''}
            onChange={(e) => updateConfig('content', e.target.value)}
            minRows={6}
          />
          <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
            Use {`{{nodes.nodeId.result}}`} to reference previous results
          </Typography>
        </FormControl>

        <FormControl>
          <FormLabel>Mode</FormLabel>
          <Select
            value={config.mode || 'write'}
            onChange={(_, value) => updateConfig('mode', value)}
          >
            <Option value="write">Overwrite</Option>
            <Option value="append">Append</Option>
          </Select>
        </FormControl>
      </Box>
    );
  }

  // Fetch Webpage configuration
  if (label === 'Fetch Webpage') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography level='title-md'>Fetch Webpage Configuration</Typography>

        <FormControl>
          <FormLabel>URL</FormLabel>
          <Input
            placeholder="https://example.com"
            value={config.url || ''}
            onChange={(e) => updateConfig('url', e.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Output Format</FormLabel>
          <Select
            value={config.format || 'markdown'}
            onChange={(_, value) => updateConfig('format', value)}
          >
            <Option value="markdown">Markdown</Option>
            <Option value="text">Plain Text</Option>
            <Option value="html">HTML</Option>
          </Select>
        </FormControl>
      </Box>
    );
  }

  // Scrape Links configuration
  if (label === 'Scrape Links') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography level='title-md'>Scrape Links Configuration</Typography>

        <FormControl>
          <FormLabel>URL</FormLabel>
          <Input
            placeholder="https://example.com"
            value={config.url || ''}
            onChange={(e) => updateConfig('url', e.target.value)}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Filter Pattern (optional)</FormLabel>
          <Input
            placeholder="e.g., /blog/*"
            value={config.filter || ''}
            onChange={(e) => updateConfig('filter', e.target.value)}
          />
          <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
            Only return links matching this pattern
          </Typography>
        </FormControl>
      </Box>
    );
  }

  // Generic tool config
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography level='title-md'>Tool Configuration</Typography>
      <Typography level='body-sm' color="neutral">
        Configuration for {label}
      </Typography>
    </Box>
  );
}
