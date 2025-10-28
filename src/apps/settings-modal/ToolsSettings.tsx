/**
 * Tools settings panel
 * Configure which tool categories are enabled and their execution limits
 */

import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Box, Checkbox, FormControl, FormHelperText, FormLabel, Option, Select, Switch, Typography } from '@mui/joy';

import { FormLabelStart } from '~/common/components/forms/FormLabelStart';
import { useToolsStore } from '~/modules/tools/store-tools';
import { useWebToolsStore, SEARXNG_INSTANCES, type SearchProvider } from '~/modules/web-tools/store-web-tools';


const _styleHelperText = {
  fontSize: 'xs',
} as const;


export function ToolsSettings() {

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

  const handleSearchProviderChange = (_event: any, value: SearchProvider | null) => value && setSearchProvider(value);
  const handleSearxngInstanceChange = (_event: any, value: string | null) => value && setSearxngInstance(value);


  return <>

    <Typography level='body-sm' sx={{ mb: 2 }}>
      Configure which AI tools are available and how they execute. Tools allow AI models to search the web, manipulate files, execute code, and more - all safely in your browser.
    </Typography>

    {/* Tool Categories */}
    <Typography level='title-sm' sx={{ mt: 2, mb: 1 }}>
      Tool Categories
    </Typography>

    <FormControl>
      <Checkbox
        size='sm'
        label='File Operations'
        checked={enableFileOps}
        onChange={(e) => setEnableFileOps(e.target.checked)}
      />
      <FormHelperText sx={_styleHelperText}>
        Read, write, list, and create files/directories in active projects
      </FormHelperText>
    </FormControl>

    <FormControl>
      <Checkbox
        size='sm'
        label='Web Tools (No API keys required!)'
        checked={enableWeb}
        onChange={(e) => setEnableWeb(e.target.checked)}
      />
      <FormHelperText sx={_styleHelperText}>
        Search the web, fetch pages, extract links - works out of the box with free search engines
      </FormHelperText>
    </FormControl>

    <FormControl>
      <Checkbox
        size='sm'
        label='Image Tools'
        checked={enableImage}
        onChange={(e) => setEnableImage(e.target.checked)}
      />
      <FormHelperText sx={_styleHelperText}>
        Generate images, edit with canvas, OCR, color extraction
      </FormHelperText>
    </FormControl>

    <FormControl>
      <Checkbox
        size='sm'
        label='Data & Visualization'
        checked={enableData}
        onChange={(e) => setEnableData(e.target.checked)}
      />
      <FormHelperText sx={_styleHelperText}>
        Query CSV/JSON, create charts, statistical analysis
      </FormHelperText>
    </FormControl>

    <FormControl>
      <Checkbox
        size='sm'
        label='Diagram Generation'
        checked={enableDiagram}
        onChange={(e) => setEnableDiagram(e.target.checked)}
      />
      <FormHelperText sx={_styleHelperText}>
        Create Mermaid diagrams, PlantUML, Graphviz, flowcharts
      </FormHelperText>
    </FormControl>

    <FormControl>
      <Checkbox
        size='sm'
        label='Code Execution'
        checked={enableCodeExec}
        onChange={(e) => setEnableCodeExec(e.target.checked)}
      />
      <FormHelperText sx={_styleHelperText}>
        Run Python, JavaScript, SQL in browser sandbox
      </FormHelperText>
    </FormControl>

    <FormControl>
      <Checkbox
        size='sm'
        label='Office Documents'
        checked={enableOffice}
        onChange={(e) => setEnableOffice(e.target.checked)}
      />
      <FormHelperText sx={_styleHelperText}>
        Read/write DOCX, XLSX, PPTX, PDF, ODT files
      </FormHelperText>
    </FormControl>

    <FormControl>
      <Checkbox
        size='sm'
        label='Git Operations (Experimental)'
        checked={enableGit}
        onChange={(e) => setEnableGit(e.target.checked)}
      />
      <FormHelperText sx={_styleHelperText}>
        Git status, log, diff, commit - browser-based via isomorphic-git
      </FormHelperText>
    </FormControl>

    <FormControl>
      <Checkbox
        size='sm'
        label='Testing & Quality'
        checked={enableTesting}
        onChange={(e) => setEnableTesting(e.target.checked)}
      />
      <FormHelperText sx={_styleHelperText}>
        ESLint, Prettier, TypeScript checking, JSON validation
      </FormHelperText>
    </FormControl>

    {/* Web Search Settings */}
    {enableWeb && (
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
    <Typography level='title-sm' sx={{ mt: 3, mb: 1 }}>
      Dangerous Operations
    </Typography>

    <FormControl>
      <Checkbox
        size='sm'
        color='danger'
        label='Allow file deletion'
        checked={allowFileDeletion}
        onChange={(e) => setAllowFileDeletion(e.target.checked)}
      />
      <FormHelperText sx={_styleHelperText}>
        ⚠️ Enables delete_file tool (cannot be undone)
      </FormHelperText>
    </FormControl>

    <FormControl>
      <Checkbox
        size='sm'
        color='danger'
        label='Allow git commits'
        checked={allowGitCommit}
        onChange={(e) => setAllowGitCommit(e.target.checked)}
      />
      <FormHelperText sx={_styleHelperText}>
        ⚠️ Enables git_commit tool (modifies repository history)
      </FormHelperText>
    </FormControl>

    {/* Execution Limits */}
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

  </>;
}
