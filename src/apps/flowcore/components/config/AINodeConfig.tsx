import * as React from 'react';
import { Box, FormControl, FormLabel, Input, Select, Option, Textarea, Slider, Typography, Chip } from '@mui/joy';
import type { Node } from 'reactflow';
import { useModelsStore } from '~/common/stores/llms/store-llms';

interface AINodeConfigProps {
  node: Node;
  onChange: (nodeId: string, data: Partial<Node>) => void;
}

export function AINodeConfig({ node, onChange }: AINodeConfigProps) {
  const config = node.data?.config || {};
  const label = node.data?.label || '';

  // Get available LLM models
  const llms = useModelsStore((state: any) => state.llms);

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

  // LLM Chat configuration
  if (label === 'LLM Chat') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography level='title-md'>LLM Chat Configuration</Typography>

        <FormControl>
          <FormLabel>Model</FormLabel>
          <Select
            value={config.modelId || 'anthropic-claude-3-5-sonnet-20241022'}
            onChange={(_, value) => updateConfig('modelId', value)}
          >
            {llms.map((llm: any) => (
              <Option key={llm.id} value={llm.id}>
                {llm.label || llm.id}
              </Option>
            ))}
          </Select>
          <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
            Select the AI model to use
          </Typography>
        </FormControl>

        <FormControl>
          <FormLabel>Prompt</FormLabel>
          <Textarea
            placeholder="Enter your prompt here..."
            value={config.prompt || ''}
            onChange={(e) => updateConfig('prompt', e.target.value)}
            minRows={6}
          />
          <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
            Use {`{{nodes.nodeId.result}}`} to reference previous results
          </Typography>
        </FormControl>

        <FormControl>
          <FormLabel>System Message (optional)</FormLabel>
          <Textarea
            placeholder="You are a helpful assistant..."
            value={config.systemMessage || ''}
            onChange={(e) => updateConfig('systemMessage', e.target.value)}
            minRows={3}
          />
        </FormControl>

        <FormControl>
          <FormLabel>
            Temperature: {config.temperature ?? 0.7}
          </FormLabel>
          <Slider
            value={config.temperature ?? 0.7}
            onChange={(_, value) => updateConfig('temperature', value)}
            min={0}
            max={2}
            step={0.1}
            marks={[
              { value: 0, label: '0' },
              { value: 1, label: '1' },
              { value: 2, label: '2' },
            ]}
          />
          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
            Lower = more focused, Higher = more creative
          </Typography>
        </FormControl>

        <FormControl>
          <FormLabel>Max Tokens</FormLabel>
          <Input
            type="number"
            value={config.maxTokens || 2000}
            onChange={(e) => updateConfig('maxTokens', parseInt(e.target.value, 10))}
            slotProps={{ input: { min: 1, max: 100000 } }}
          />
          <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
            Maximum length of the response
          </Typography>
        </FormControl>
      </Box>
    );
  }

  // Summarize configuration
  if (label === 'Summarize') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography level='title-md'>Summarize Configuration</Typography>

        <FormControl>
          <FormLabel>Model</FormLabel>
          <Select
            value={config.modelId || 'anthropic-claude-3-5-sonnet-20241022'}
            onChange={(_, value) => updateConfig('modelId', value)}
          >
            {llms.map((llm: any) => (
              <Option key={llm.id} value={llm.id}>
                {llm.label || llm.id}
              </Option>
            ))}
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Input Text</FormLabel>
          <Textarea
            placeholder="Text to summarize or {{nodes.nodeId.result}}"
            value={config.input || ''}
            onChange={(e) => updateConfig('input', e.target.value)}
            minRows={4}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Summary Length</FormLabel>
          <Select
            value={config.summaryLength || 'medium'}
            onChange={(_, value) => updateConfig('summaryLength', value)}
          >
            <Option value="brief">Brief (1-2 sentences)</Option>
            <Option value="medium">Medium (1 paragraph)</Option>
            <Option value="detailed">Detailed (multiple paragraphs)</Option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Output Format</FormLabel>
          <Select
            value={config.outputFormat || 'paragraph'}
            onChange={(_, value) => updateConfig('outputFormat', value)}
          >
            <Option value="paragraph">Paragraph</Option>
            <Option value="bullets">Bullet Points</Option>
            <Option value="numbered">Numbered List</Option>
          </Select>
        </FormControl>
      </Box>
    );
  }

  // Extract Data configuration
  if (label === 'Extract Data') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography level='title-md'>Extract Data Configuration</Typography>

        <FormControl>
          <FormLabel>Model</FormLabel>
          <Select
            value={config.modelId || 'anthropic-claude-3-5-sonnet-20241022'}
            onChange={(_, value) => updateConfig('modelId', value)}
          >
            {llms.map((llm: any) => (
              <Option key={llm.id} value={llm.id}>
                {llm.label || llm.id}
              </Option>
            ))}
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Input Text</FormLabel>
          <Textarea
            placeholder="Text to extract data from or {{nodes.nodeId.result}}"
            value={config.input || ''}
            onChange={(e) => updateConfig('input', e.target.value)}
            minRows={4}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Extraction Schema (JSON)</FormLabel>
          <Textarea
            placeholder={'{\n  "name": "string",\n  "email": "string",\n  "age": "number"\n}'}
            value={config.schema || ''}
            onChange={(e) => updateConfig('schema', e.target.value)}
            minRows={6}
          />
          <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
            Define the structure of data to extract
          </Typography>
        </FormControl>

        <FormControl>
          <FormLabel>Examples (optional)</FormLabel>
          <Textarea
            placeholder="Provide example extractions to improve accuracy"
            value={config.examples || ''}
            onChange={(e) => updateConfig('examples', e.target.value)}
            minRows={3}
          />
        </FormControl>
      </Box>
    );
  }

  // Generic AI config
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography level='title-md'>AI Configuration</Typography>
      <Typography level='body-sm' color="neutral">
        Configuration for {label}
      </Typography>
    </Box>
  );
}
