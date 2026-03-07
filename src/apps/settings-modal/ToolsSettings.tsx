/**
 * Tools settings panel
 * Configure which tool categories are enabled and their execution limits
 */

import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Box, Checkbox, Chip, FormControl, FormHelperText, IconButton, Input, Option, Select, Typography } from '@mui/joy';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';

import { FormLabelStart } from '~/common/components/forms/FormLabelStart';
import { useToolsStore } from '~/modules/tools/store-tools';
import { useWebToolsStore, SEARXNG_INSTANCES, type SearchProvider } from '~/modules/web-tools/store-web-tools';


const _styleHelperText = {
  fontSize: 'xs',
} as const;


// Tool category definition
interface ToolCategory {
  id: string;
  label: string;
  description: string;
  keywords: string[]; // Additional search keywords
  isDangerous?: boolean;
}

// Define all tool categories with searchable keywords
const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: 'fileOps',
    label: 'File Operations',
    description: 'Read, write, list, and create files/directories in active projects',
    keywords: ['file', 'read', 'write', 'directory', 'folder', 'create', 'fs', 'filesystem'],
  },
  {
    id: 'web',
    label: 'Web Tools (No API keys required!)',
    description: 'Search the web, fetch pages, extract links - works out of the box with free search engines',
    keywords: ['web', 'search', 'fetch', 'http', 'url', 'link', 'scrape', 'browse', 'internet'],
  },
  {
    id: 'image',
    label: 'Image Tools',
    description: 'Generate images, edit with canvas, OCR, color extraction',
    keywords: ['image', 'picture', 'photo', 'ocr', 'canvas', 'color', 'resize', 'crop', 'generate'],
  },
  {
    id: 'data',
    label: 'Data & Visualization',
    description: 'Query CSV/JSON, create charts, statistical analysis',
    keywords: ['data', 'csv', 'json', 'chart', 'graph', 'statistics', 'analysis', 'visualization', 'plot'],
  },
  {
    id: 'diagram',
    label: 'Diagram Generation',
    description: 'Create Mermaid diagrams, PlantUML, Graphviz, flowcharts',
    keywords: ['diagram', 'mermaid', 'plantuml', 'graphviz', 'flowchart', 'uml', 'sequence', 'graph'],
  },
  {
    id: 'codeExec',
    label: 'Code Execution',
    description: 'Run Python, JavaScript, SQL in browser sandbox',
    keywords: ['code', 'execute', 'run', 'python', 'javascript', 'sql', 'sandbox', 'eval'],
  },
  {
    id: 'office',
    label: 'Office Documents',
    description: 'Read/write DOCX, XLSX, PPTX, PDF, ODT files',
    keywords: ['office', 'docx', 'xlsx', 'pptx', 'pdf', 'word', 'excel', 'powerpoint', 'document'],
  },
  {
    id: 'git',
    label: 'Git Operations (Experimental)',
    description: 'Git status, log, diff, commit - browser-based via isomorphic-git',
    keywords: ['git', 'version', 'control', 'commit', 'diff', 'log', 'status', 'branch', 'repository'],
  },
  {
    id: 'testing',
    label: 'Testing & Quality',
    description: 'ESLint, Prettier, TypeScript checking, JSON validation',
    keywords: ['test', 'lint', 'eslint', 'prettier', 'typescript', 'validate', 'format', 'quality'],
  },
];

// Dangerous operations
const DANGEROUS_OPERATIONS: ToolCategory[] = [
  {
    id: 'fileDeletion',
    label: 'Allow file deletion',
    description: '⚠️ Enables delete_file tool (cannot be undone)',
    keywords: ['delete', 'remove', 'file', 'dangerous'],
    isDangerous: true,
  },
  {
    id: 'gitCommit',
    label: 'Allow git commits',
    description: '⚠️ Enables git_commit tool (modifies repository history)',
    keywords: ['git', 'commit', 'push', 'dangerous'],
    isDangerous: true,
  },
];


export function ToolsSettings() {
  // Local state for search
  const [searchQuery, setSearchQuery] = React.useState('');

  // external state - main tools settings
  const {
    enableFileOps, setEnableFileOps,
    enableCodeExec, setEnableCodeExec,
    enableWeb, setEnableWeb,
    enableOffice, setEnableOffice,
    enableImage, setEnableImage,
    enableData, setEnableData,
    enableDiagram, setEnableDiagram,
    enableGit, setEnableGit,
    enableTesting, setEnableTesting,
    allowFileDeletion, setAllowFileDeletion,
    allowGitCommit, setAllowGitCommit,
    executionTimeout, setExecutionTimeout,
    rateLimit, setRateLimit,
    showProgress, setShowProgress,
    logToolCalls, setLogToolCalls,
  } = useToolsStore(useShallow(state => ({
    enableFileOps: state.enableFileOps,
    enableCodeExec: state.enableCodeExec,
    enableWeb: state.enableWeb,
    enableOffice: state.enableOffice,
    enableImage: state.enableImage,
    enableData: state.enableData,
    enableDiagram: state.enableDiagram,
    enableGit: state.enableGit,
    enableTesting: state.enableTesting,
    setEnableFileOps: state.setEnableFileOps,
    setEnableCodeExec: state.setEnableCodeExec,
    setEnableWeb: state.setEnableWeb,
    setEnableOffice: state.setEnableOffice,
    setEnableImage: state.setEnableImage,
    setEnableData: state.setEnableData,
    setEnableDiagram: state.setEnableDiagram,
    setEnableGit: state.setEnableGit,
    setEnableTesting: state.setEnableTesting,
    allowFileDeletion: state.allowFileDeletion,
    setAllowFileDeletion: state.setAllowFileDeletion,
    allowGitCommit: state.allowGitCommit,
    setAllowGitCommit: state.setAllowGitCommit,
    executionTimeout: state.executionTimeout,
    setExecutionTimeout: state.setExecutionTimeout,
    rateLimit: state.rateLimit,
    setRateLimit: state.setRateLimit,
    showProgress: state.showProgress,
    setShowProgress: state.setShowProgress,
    logToolCalls: state.logToolCalls,
    setLogToolCalls: state.setLogToolCalls,
  })));

  // external state - web tools
  const {
    searchProvider, setSearchProvider,
    searxngInstance, setSearxngInstance,
  } = useWebToolsStore(useShallow(state => ({
    searchProvider: state.searchProvider,
    setSearchProvider: state.setSearchProvider,
    searxngInstance: state.searxngInstance,
    setSearxngInstance: state.setSearxngInstance,
  })));

  // Map category IDs to their state and setters
  const categoryStateMap: Record<string, { enabled: boolean; setEnabled: (v: boolean) => void }> = {
    fileOps: { enabled: enableFileOps, setEnabled: setEnableFileOps },
    web: { enabled: enableWeb, setEnabled: setEnableWeb },
    image: { enabled: enableImage, setEnabled: setEnableImage },
    data: { enabled: enableData, setEnabled: setEnableData },
    diagram: { enabled: enableDiagram, setEnabled: setEnableDiagram },
    codeExec: { enabled: enableCodeExec, setEnabled: setEnableCodeExec },
    office: { enabled: enableOffice, setEnabled: setEnableOffice },
    git: { enabled: enableGit, setEnabled: setEnableGit },
    testing: { enabled: enableTesting, setEnabled: setEnableTesting },
    fileDeletion: { enabled: allowFileDeletion, setEnabled: setAllowFileDeletion },
    gitCommit: { enabled: allowGitCommit, setEnabled: setAllowGitCommit },
  };

  // Filter categories based on search
  const filterCategories = (categories: ToolCategory[]) => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase();
    return categories.filter(cat =>
      cat.label.toLowerCase().includes(query) ||
      cat.description.toLowerCase().includes(query) ||
      cat.keywords.some(kw => kw.toLowerCase().includes(query))
    );
  };

  const filteredToolCategories = filterCategories(TOOL_CATEGORIES);
  const filteredDangerousOps = filterCategories(DANGEROUS_OPERATIONS);

  // Count enabled categories
  const enabledCount = TOOL_CATEGORIES.filter(cat => categoryStateMap[cat.id]?.enabled).length;

  const handleSearchProviderChange = (_event: any, value: SearchProvider | null) => value && setSearchProvider(value);
  const handleSearxngInstanceChange = (_event: any, value: string | null) => value && setSearxngInstance(value);
  const handleClearSearch = () => setSearchQuery('');


  return <>

    <Typography level='body-sm' sx={{ mb: 2 }}>
      Configure which AI tools are available and how they execute. Tools allow AI models to search the web, manipulate files, execute code, and more - all safely in your browser.
    </Typography>

    {/* Search Filter */}
    <Box sx={{ mb: 2 }}>
      <Input
        placeholder="Search tools by name or keyword..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        startDecorator={<SearchIcon sx={{ color: 'neutral.500' }} />}
        endDecorator={
          searchQuery ? (
            <IconButton size="sm" variant="plain" color="neutral" onClick={handleClearSearch}>
              <ClearIcon />
            </IconButton>
          ) : null
        }
        size="sm"
        sx={{ mb: 1 }}
      />
      {searchQuery && (
        <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
          Showing {filteredToolCategories.length + filteredDangerousOps.length} of {TOOL_CATEGORIES.length + DANGEROUS_OPERATIONS.length} categories
        </Typography>
      )}
    </Box>

    {/* Tool Categories */}
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, mb: 1 }}>
      <Typography level='title-sm'>
        Tool Categories
      </Typography>
      <Chip size="sm" variant="soft" color="primary">
        {enabledCount}/{TOOL_CATEGORIES.length} enabled
      </Chip>
    </Box>

    {filteredToolCategories.length === 0 && searchQuery ? (
      <Typography level="body-sm" sx={{ color: 'text.tertiary', py: 2 }}>
        No tool categories match &quot;{searchQuery}&quot;
      </Typography>
    ) : (
      filteredToolCategories.map((category) => {
        const state = categoryStateMap[category.id];
        if (!state) return null;
        return (
          <FormControl key={category.id}>
            <Checkbox
              size='sm'
              label={category.label}
              checked={state.enabled}
              onChange={(e) => state.setEnabled(e.target.checked)}
            />
            <FormHelperText sx={_styleHelperText}>
              {category.description}
            </FormHelperText>
          </FormControl>
        );
      })
    )}

    {/* Web Search Settings */}
    {enableWeb && !searchQuery && (
      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.level1', borderRadius: 'md' }}>
        <Typography level='title-sm' sx={{ mb: 1 }}>
          Web Search Configuration
        </Typography>

        <FormControl orientation='horizontal' sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <FormLabelStart
            title='Search Provider'
            description={
              searchProvider === 'searxng' ? 'Free, privacy-focused' :
              searchProvider === 'duckduckgo' ? 'Free, reliable' :
              searchProvider === 'google' ? 'Requires API key' :
              'Tries all sources'
            }
          />
          <Select
            variant='outlined'
            value={searchProvider}
            onChange={handleSearchProviderChange}
            slotProps={{
              root: { sx: { minWidth: '160px' } },
              indicator: { sx: { opacity: 0.5 } },
            }}
          >
            <Option value='auto'>Auto (All sources)</Option>
            <Option value='searxng'>SearXNG (Free)</Option>
            <Option value='duckduckgo'>DuckDuckGo (Free)</Option>
            <Option value='google'>Google (API key)</Option>
          </Select>
        </FormControl>

        {(searchProvider === 'searxng' || searchProvider === 'auto') && (
          <FormControl orientation='horizontal' sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <FormLabelStart
              title='SearXNG Instance'
              description='Public instance to use'
            />
            <Select
              variant='outlined'
              value={searxngInstance}
              onChange={handleSearxngInstanceChange}
              slotProps={{
                root: { sx: { minWidth: '200px' } },
                indicator: { sx: { opacity: 0.5 } },
              }}
            >
              {SEARXNG_INSTANCES.map(instance => (
                <Option key={instance} value={instance}>
                  {instance.replace('https://', '')}
                </Option>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>
    )}

    {/* Dangerous Operations */}
    {(filteredDangerousOps.length > 0 || !searchQuery) && (
      <>
        <Typography level='title-sm' sx={{ mt: 3, mb: 1 }}>
          Dangerous Operations
        </Typography>

        {filteredDangerousOps.length === 0 && searchQuery ? (
          <Typography level="body-sm" sx={{ color: 'text.tertiary', py: 1 }}>
            No dangerous operations match the search
          </Typography>
        ) : (
          filteredDangerousOps.map((category) => {
            const state = categoryStateMap[category.id];
            if (!state) return null;
            return (
              <FormControl key={category.id}>
                <Checkbox
                  size='sm'
                  color='danger'
                  label={category.label}
                  checked={state.enabled}
                  onChange={(e) => state.setEnabled(e.target.checked)}
                />
                <FormHelperText sx={_styleHelperText}>
                  {category.description}
                </FormHelperText>
              </FormControl>
            );
          })
        )}
      </>
    )}

    {/* Execution Limits - only show when not searching */}
    {!searchQuery && (
      <>
        <Typography level='title-sm' sx={{ mt: 3, mb: 1 }}>
          Execution Limits
        </Typography>

        <FormControl orientation='horizontal' sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <FormLabelStart
            title='Timeout'
            description={`${executionTimeout}ms per tool`}
          />
          <Select
            variant='outlined'
            value={executionTimeout}
            onChange={(_e, value) => value && setExecutionTimeout(value as number)}
            slotProps={{
              root: { sx: { minWidth: '120px' } },
            }}
          >
            <Option value={2000}>2 seconds</Option>
            <Option value={5000}>5 seconds</Option>
            <Option value={10000}>10 seconds</Option>
            <Option value={30000}>30 seconds</Option>
          </Select>
        </FormControl>

        <FormControl orientation='horizontal' sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <FormLabelStart
            title='Rate Limit'
            description={`${rateLimit} calls/minute`}
          />
          <Select
            variant='outlined'
            value={rateLimit}
            onChange={(_e, value) => value && setRateLimit(value as number)}
            slotProps={{
              root: { sx: { minWidth: '120px' } },
            }}
          >
            <Option value={50}>50/min</Option>
            <Option value={100}>100/min</Option>
            <Option value={200}>200/min</Option>
            <Option value={500}>500/min (high)</Option>
          </Select>
        </FormControl>

        {/* Debug Options */}
        <Typography level='title-sm' sx={{ mt: 3, mb: 1 }}>
          Debug & Monitoring
        </Typography>

        <FormControl>
          <Checkbox
            size='sm'
            label='Show tool execution progress'
            checked={showProgress}
            onChange={(e) => setShowProgress(e.target.checked)}
          />
          <FormHelperText sx={_styleHelperText}>
            Display visual indicators when tools are executing
          </FormHelperText>
        </FormControl>

        <FormControl>
          <Checkbox
            size='sm'
            label='Log tool calls to console'
            checked={logToolCalls}
            onChange={(e) => setLogToolCalls(e.target.checked)}
          />
          <FormHelperText sx={_styleHelperText}>
            Developer mode: Log all tool executions to browser console
          </FormHelperText>
        </FormControl>
      </>
    )}

  </>;
}
