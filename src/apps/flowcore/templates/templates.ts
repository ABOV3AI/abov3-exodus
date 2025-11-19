import type { WorkflowTemplate } from '../flowcore.types';

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'template-news-summary',
    name: 'Daily News Summary',
    description: 'Search web for news, summarize with AI, and save to file',
    category: 'Research',
    workflow: {
      name: 'Daily News Summary',
      description: 'Automated daily news aggregation and summarization',
      tags: ['news', 'ai', 'automation'],
      nodes: [
        {
          id: 'trigger-1',
          type: 'default',
          position: { x: 100, y: 100 },
          data: {
            label: 'Schedule: Daily 9am',
            type: 'trigger',
            config: {},
          },
        },
        {
          id: 'tool-1',
          type: 'default',
          position: { x: 100, y: 200 },
          data: {
            label: 'Web Search',
            type: 'tool',
            config: { query: 'latest tech news' },
          },
        },
        {
          id: 'ai-1',
          type: 'default',
          position: { x: 100, y: 300 },
          data: {
            label: 'Summarize',
            type: 'ai',
            config: { prompt: 'Summarize the top news stories' },
          },
        },
        {
          id: 'tool-2',
          type: 'default',
          position: { x: 100, y: 400 },
          data: {
            label: 'File Write',
            type: 'tool',
            config: { filename: 'news-summary.txt' },
          },
        },
        {
          id: 'output-1',
          type: 'default',
          position: { x: 100, y: 500 },
          data: {
            label: 'Return Result',
            type: 'output',
            config: {},
          },
        },
      ],
      edges: [
        { id: 'e1-2', source: 'trigger-1', target: 'tool-1' },
        { id: 'e2-3', source: 'tool-1', target: 'ai-1' },
        { id: 'e3-4', source: 'ai-1', target: 'tool-2' },
        { id: 'e4-5', source: 'tool-2', target: 'output-1' },
      ],
      trigger: { type: 'schedule', schedule: '0 9 * * *' },
      isActive: false,
    },
  },
  {
    id: 'template-data-pipeline',
    name: 'Data Processing Pipeline',
    description: 'Read file, process with AI, send to API',
    category: 'Data',
    workflow: {
      name: 'Data Processing Pipeline',
      description: 'Automated data processing and API integration',
      tags: ['data', 'api', 'automation'],
      nodes: [
        {
          id: 'trigger-1',
          type: 'default',
          position: { x: 100, y: 100 },
          data: {
            label: 'Manual Trigger',
            type: 'trigger',
            config: {},
          },
        },
        {
          id: 'tool-1',
          type: 'default',
          position: { x: 100, y: 200 },
          data: {
            label: 'File Read',
            type: 'tool',
            config: { filename: 'data.csv' },
          },
        },
        {
          id: 'logic-1',
          type: 'default',
          position: { x: 100, y: 300 },
          data: {
            label: 'Loop',
            type: 'logic',
            config: { items: 'rows' },
          },
        },
        {
          id: 'ai-1',
          type: 'default',
          position: { x: 100, y: 400 },
          data: {
            label: 'Extract Data',
            type: 'ai',
            config: { prompt: 'Parse and validate data fields' },
          },
        },
        {
          id: 'tool-2',
          type: 'default',
          position: { x: 100, y: 500 },
          data: {
            label: 'HTTP Request',
            type: 'tool',
            config: { url: 'https://api.example.com/data', method: 'POST' },
          },
        },
        {
          id: 'output-1',
          type: 'default',
          position: { x: 100, y: 600 },
          data: {
            label: 'Return Result',
            type: 'output',
            config: {},
          },
        },
      ],
      edges: [
        { id: 'e1-2', source: 'trigger-1', target: 'tool-1' },
        { id: 'e2-3', source: 'tool-1', target: 'logic-1' },
        { id: 'e3-4', source: 'logic-1', target: 'ai-1' },
        { id: 'e4-5', source: 'ai-1', target: 'tool-2' },
        { id: 'e5-6', source: 'tool-2', target: 'output-1' },
      ],
      trigger: { type: 'manual' },
      isActive: false,
    },
  },
  {
    id: 'template-monitor',
    name: 'Website Monitor',
    description: 'Check website hourly, alert on changes',
    category: 'Monitoring',
    workflow: {
      name: 'Website Monitor',
      description: 'Monitor website for changes and send alerts',
      tags: ['monitoring', 'alert', 'automation'],
      nodes: [
        {
          id: 'trigger-1',
          type: 'default',
          position: { x: 100, y: 100 },
          data: {
            label: 'Schedule: Hourly',
            type: 'trigger',
            config: {},
          },
        },
        {
          id: 'tool-1',
          type: 'default',
          position: { x: 100, y: 200 },
          data: {
            label: 'HTTP Request',
            type: 'tool',
            config: { url: 'https://example.com', method: 'GET' },
          },
        },
        {
          id: 'logic-1',
          type: 'default',
          position: { x: 100, y: 300 },
          data: {
            label: 'If Changed',
            type: 'logic',
            config: { condition: 'content_changed' },
          },
        },
        {
          id: 'output-1',
          type: 'default',
          position: { x: 100, y: 400 },
          data: {
            label: 'Send Notification',
            type: 'output',
            config: { message: 'Website changed!' },
          },
        },
      ],
      edges: [
        { id: 'e1-2', source: 'trigger-1', target: 'tool-1' },
        { id: 'e2-3', source: 'tool-1', target: 'logic-1' },
        { id: 'e3-4', source: 'logic-1', target: 'output-1' },
      ],
      trigger: { type: 'schedule', schedule: '0 * * * *' },
      isActive: false,
    },
  },
  {
    id: 'template-content-generator',
    name: 'AI Content Generator',
    description: 'Generate content with AI and publish',
    category: 'Content',
    workflow: {
      name: 'AI Content Generator',
      description: 'Automated content generation and publishing',
      tags: ['ai', 'content', 'automation'],
      nodes: [
        {
          id: 'trigger-1',
          type: 'default',
          position: { x: 100, y: 100 },
          data: {
            label: 'Manual Trigger',
            type: 'trigger',
            config: {},
          },
        },
        {
          id: 'ai-1',
          type: 'default',
          position: { x: 100, y: 200 },
          data: {
            label: 'LLM Chat',
            type: 'ai',
            config: { prompt: 'Generate a blog post about AI automation' },
          },
        },
        {
          id: 'ai-2',
          type: 'default',
          position: { x: 100, y: 300 },
          data: {
            label: 'Summarize',
            type: 'ai',
            config: { prompt: 'Create SEO meta description' },
          },
        },
        {
          id: 'tool-1',
          type: 'default',
          position: { x: 100, y: 400 },
          data: {
            label: 'File Write',
            type: 'tool',
            config: { filename: 'blog-post.md' },
          },
        },
        {
          id: 'output-1',
          type: 'default',
          position: { x: 100, y: 500 },
          data: {
            label: 'Return Result',
            type: 'output',
            config: {},
          },
        },
      ],
      edges: [
        { id: 'e1-2', source: 'trigger-1', target: 'ai-1' },
        { id: 'e2-3', source: 'ai-1', target: 'ai-2' },
        { id: 'e3-4', source: 'ai-2', target: 'tool-1' },
        { id: 'e4-5', source: 'tool-1', target: 'output-1' },
      ],
      trigger: { type: 'manual' },
      isActive: false,
    },
  },
];

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(category: string): WorkflowTemplate[] {
  return WORKFLOW_TEMPLATES.filter(t => t.category === category);
}

export function getAllCategories(): string[] {
  return Array.from(new Set(WORKFLOW_TEMPLATES.map(t => t.category)));
}
