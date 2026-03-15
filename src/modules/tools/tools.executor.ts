/**
 * Tool execution framework with sandboxing, rate limiting, and error handling
 */

import type { ToolExecutionContext, ToolExecutionResult } from './tools.types';
import { getTool, trackToolExecution, isToolEnabled } from './tools.registry';
import { useToolsStore } from './store-tools';
import { getMCPRuntime } from '~/modules/mcp/mcp.runtime';


// Rate limiting: Track executions per minute
const executionLog = new Map<string, number[]>();

// MCP file tools that can be intercepted and executed locally using browser's File System Access API
const MCP_FILE_TOOLS = [
  'read_file',
  'write_file',
  'list_directory',
  'create_directory',
  'delete_file',
  'file_info',
  'append_file',
];

/**
 * SECURITY: Validate file paths to prevent directory traversal attacks
 * Rejects paths containing:
 * - ".." sequences (parent directory traversal)
 * - Absolute paths starting with "/" or drive letters like "C:\"
 * - Null bytes or other control characters
 */
function validateFilePath(filePath: string): { valid: boolean; error?: string } {
  if (!filePath || typeof filePath !== 'string') {
    return { valid: false, error: 'Path must be a non-empty string' };
  }

  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Block absolute paths (Unix-style or Windows-style)
  if (normalizedPath.startsWith('/') || /^[a-zA-Z]:/.test(filePath)) {
    return { valid: false, error: 'Absolute paths are not allowed. Use relative paths within the project.' };
  }

  // Block null bytes and control characters (security risk)
  if (/[\x00-\x1f]/.test(filePath)) {
    return { valid: false, error: 'Path contains invalid control characters' };
  }

  // Split and check each component
  const parts = normalizedPath.split('/').filter(p => p);
  for (const part of parts) {
    // Block ".." traversal
    if (part === '..') {
      return { valid: false, error: 'Path traversal (..) is not allowed' };
    }
    // Block hidden traversal attempts like "...", ".. ", etc.
    if (part.startsWith('..')) {
      return { valid: false, error: 'Path traversal patterns are not allowed' };
    }
    // Block paths that might resolve to parent (Windows-specific edge cases)
    if (part.match(/^\.+$/)) {
      return { valid: false, error: 'Invalid path component' };
    }
  }

  return { valid: true };
}

/**
 * Extract the base tool name from an MCP tool ID
 * e.g., "mcp_ABOV3_Eden_read_file" -> "read_file"
 */
function extractMCPToolName(toolId: string): string | null {
  for (const toolName of MCP_FILE_TOOLS) {
    if (toolId.endsWith(`_${toolName}`)) {
      return toolName;
    }
  }
  return null;
}

/**
 * Execute MCP file tools locally using browser's File System Access API
 */
async function executeLocalFileOperation(
  toolName: string,
  args: Record<string, unknown>,
  projectHandle: FileSystemDirectoryHandle
): Promise<ToolExecutionResult> {
  try {
    switch (toolName) {
      case 'read_file': {
        const filePath = args.path as string;
        if (!filePath) return { error: 'Missing required argument: path' };

        // SECURITY: Validate path against traversal attacks
        const pathValidation = validateFilePath(filePath);
        if (!pathValidation.valid) return { error: pathValidation.error! };

        const fileHandle = await getFileHandle(projectHandle, filePath, false);
        if (!fileHandle) return { error: `File not found: ${filePath}` };

        const file = await fileHandle.getFile();
        const content = await file.text();
        return { result: content };
      }

      case 'write_file': {
        const filePath = args.path as string;
        const content = args.content as string;
        if (!filePath) return { error: 'Missing required argument: path' };
        if (content === undefined) return { error: 'Missing required argument: content' };

        // SECURITY: Validate path against traversal attacks
        const pathValidation = validateFilePath(filePath);
        if (!pathValidation.valid) return { error: pathValidation.error! };

        const fileHandle = await getFileHandle(projectHandle, filePath, true);
        if (!fileHandle) return { error: `Could not create file: ${filePath}` };

        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        return { result: `Successfully wrote ${content.length} characters to ${filePath}` };
      }

      case 'list_directory': {
        const dirPath = (args.path as string) || '.';
        const includeHidden = args.includeHidden as boolean ?? false;

        // SECURITY: Validate path against traversal attacks (except for "." root)
        if (dirPath !== '.') {
          const pathValidation = validateFilePath(dirPath);
          if (!pathValidation.valid) return { error: pathValidation.error! };
        }

        const dirHandle = dirPath === '.' ? projectHandle : await getDirectoryHandle(projectHandle, dirPath, false);
        if (!dirHandle) return { error: `Directory not found: ${dirPath}` };

        const entries: Array<{ name: string; type: string }> = [];
        for await (const [name, handle] of (dirHandle as any).entries()) {
          if (!includeHidden && name.startsWith('.')) continue;
          entries.push({
            name,
            type: handle.kind === 'directory' ? 'directory' : 'file',
          });
        }

        return { result: JSON.stringify({ path: dirPath, entries, count: entries.length }, null, 2) };
      }

      case 'create_directory': {
        const dirPath = args.path as string;
        if (!dirPath) return { error: 'Missing required argument: path' };

        // SECURITY: Validate path against traversal attacks
        const pathValidation = validateFilePath(dirPath);
        if (!pathValidation.valid) return { error: pathValidation.error! };

        const dirHandle = await getDirectoryHandle(projectHandle, dirPath, true);
        if (!dirHandle) return { error: `Could not create directory: ${dirPath}` };

        return { result: `Successfully created directory: ${dirPath}` };
      }

      case 'delete_file': {
        const filePath = args.path as string;
        if (!filePath) return { error: 'Missing required argument: path' };

        // SECURITY: Validate path against traversal attacks
        const pathValidation = validateFilePath(filePath);
        if (!pathValidation.valid) return { error: pathValidation.error! };

        const parts = filePath.split('/').filter(p => p);
        const fileName = parts.pop()!;
        const parentPath = parts.join('/');

        const parentHandle = parentPath ? await getDirectoryHandle(projectHandle, parentPath, false) : projectHandle;
        if (!parentHandle) return { error: `Parent directory not found: ${parentPath}` };

        await parentHandle.removeEntry(fileName);
        return { result: `Successfully deleted: ${filePath}` };
      }

      case 'file_info': {
        const filePath = args.path as string;
        if (!filePath) return { error: 'Missing required argument: path' };

        // SECURITY: Validate path against traversal attacks
        const pathValidation = validateFilePath(filePath);
        if (!pathValidation.valid) return { error: pathValidation.error! };

        const fileHandle = await getFileHandle(projectHandle, filePath, false);
        if (!fileHandle) return { error: `File not found: ${filePath}` };

        const file = await fileHandle.getFile();
        const info = {
          path: filePath,
          type: 'file',
          size: file.size,
          lastModified: new Date(file.lastModified).toISOString(),
        };
        return { result: JSON.stringify(info, null, 2) };
      }

      case 'append_file': {
        const filePath = args.path as string;
        const content = args.content as string;
        if (!filePath) return { error: 'Missing required argument: path' };
        if (content === undefined) return { error: 'Missing required argument: content' };

        // SECURITY: Validate path against traversal attacks
        const pathValidation = validateFilePath(filePath);
        if (!pathValidation.valid) return { error: pathValidation.error! };

        // Read existing content first
        let existingContent = '';
        const fileHandle = await getFileHandle(projectHandle, filePath, true);
        if (!fileHandle) return { error: `Could not access file: ${filePath}` };

        try {
          const file = await fileHandle.getFile();
          existingContent = await file.text();
        } catch {
          // File might not exist, start with empty content
        }

        // Write combined content
        const writable = await fileHandle.createWritable();
        await writable.write(existingContent + content);
        await writable.close();
        return { result: `Successfully appended ${content.length} characters to ${filePath}` };
      }

      default:
        return { error: `Unknown file operation: ${toolName}` };
    }
  } catch (error: any) {
    return { error: `File operation failed: ${error.message}` };
  }
}

/**
 * Navigate to a file in the directory tree, optionally creating it
 */
async function getFileHandle(
  rootHandle: FileSystemDirectoryHandle,
  filePath: string,
  create: boolean
): Promise<FileSystemFileHandle | null> {
  const parts = filePath.split('/').filter(p => p);
  const fileName = parts.pop();
  if (!fileName) return null;

  let currentDir = rootHandle;
  for (const part of parts) {
    try {
      currentDir = await currentDir.getDirectoryHandle(part, { create });
    } catch {
      return null;
    }
  }

  try {
    return await currentDir.getFileHandle(fileName, { create });
  } catch {
    return null;
  }
}

/**
 * Navigate to a directory in the directory tree, optionally creating it
 */
async function getDirectoryHandle(
  rootHandle: FileSystemDirectoryHandle,
  dirPath: string,
  create: boolean
): Promise<FileSystemDirectoryHandle | null> {
  const parts = dirPath.split('/').filter(p => p);
  let currentDir = rootHandle;

  for (const part of parts) {
    try {
      currentDir = await currentDir.getDirectoryHandle(part, { create });
    } catch {
      return null;
    }
  }

  return currentDir;
}


/**
 * Check if tool is within rate limit
 */
function checkRateLimit(toolId: string): boolean {
  const settings = useToolsStore.getState();
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Get recent executions
  const executions = executionLog.get(toolId) || [];
  const recentExecutions = executions.filter(time => time > oneMinuteAgo);

  // Update log
  executionLog.set(toolId, [...recentExecutions, now]);

  return recentExecutions.length < settings.rateLimit;
}


/**
 * Check if browser supports required APIs
 */
function checkBrowserSupport(toolId: string): boolean {
  const tool = getTool(toolId);
  if (!tool || !tool.browserAPIs) return true;

  for (const api of tool.browserAPIs) {
    switch (api) {
      case 'FileSystem':
        if (!('showDirectoryPicker' in window)) return false;
        break;
      case 'WebWorker':
        if (typeof Worker === 'undefined') return false;
        break;
      case 'WebAssembly':
        if (typeof WebAssembly === 'undefined') return false;
        break;
      // Add more as needed
    }
  }

  return true;
}


/**
 * Execute a tool with timeout, rate limiting, and error handling
 */
export async function executeToolCall(
  toolId: string,
  argsJson: string,
  context: ToolExecutionContext = {}
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  const settings = useToolsStore.getState();

  try {
    // 1. Check if this is an MCP tool
    const mcpRuntime = getMCPRuntime();
    const isMCPTool = mcpRuntime.isMCPTool(toolId);

    if (isMCPTool) {
      // MCP tool execution path
      // Handle empty/undefined/null args - some tools don't require arguments
      console.log(`[MCP Execute] toolId: ${toolId}, argsJson type: ${typeof argsJson}, argsJson: "${argsJson}"`);
      let args: Record<string, unknown> = {};
      if (argsJson && typeof argsJson === 'string' && argsJson.trim()) {
        try {
          args = JSON.parse(argsJson);
        } catch (parseError) {
          console.warn(`[MCP Execute] Failed to parse argsJson, using empty object. Error:`, parseError);
        }
      }

      if (settings.logToolCalls) {
        console.log(`[Tools] Executing MCP tool: ${toolId}`, args);
      }

      // Check if this is a file operation that can be executed locally
      const localToolName = extractMCPToolName(toolId);
      if (localToolName && context.projectHandle) {
        console.log(`[MCP Execute] Intercepting file operation "${localToolName}" to execute locally with project handle`);

        // Execute locally using browser's File System Access API
        const localResult = await executeLocalFileOperation(localToolName, args, context.projectHandle);

        trackToolExecution(toolId);

        // Trigger file tree refresh for file-modifying operations
        const fileModifyingTools = ['write_file', 'create_directory', 'delete_file', 'append_file'];
        if (fileModifyingTools.includes(localToolName) && !localResult.error) {
          // Dynamic import to avoid circular dependencies
          import('~/apps/projects/store-projects').then(({ useProjectsStore }) => {
            useProjectsStore.getState().triggerFileTreeRefresh();
          });
        }

        return {
          ...localResult,
          metadata: {
            executionTime: Date.now() - startTime,
            toolId,
            toolName: localToolName,
            source: 'local-intercept',
          },
        };
      }

      // Otherwise, execute via MCP server (Eden)
      // Get the workspace path from the active project to pass to Eden
      const { useProjectsStore } = await import('~/apps/projects/store-projects');
      const activeProject = useProjectsStore.getState().getActiveProject();
      // Pass fullPath if available, otherwise pass the folder name so Eden can search for it
      const workspacePath = activeProject?.fullPath || activeProject?.name || undefined;

      if (workspacePath) {
        console.log(`[MCP Execute] Using workspace path: ${workspacePath}`);
      }

      const result = await mcpRuntime.executeTool(toolId, args, workspacePath);

      trackToolExecution(toolId);

      return {
        result,
        metadata: {
          executionTime: Date.now() - startTime,
          toolId,
          toolName: toolId,
          source: 'mcp',
          workspacePath,
        },
      };
    }

    // 2. Get tool definition (for native tools)
    const tool = getTool(toolId);
    if (!tool) {
      return {
        error: `Unknown tool: ${toolId}`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    // 3. Check mode-based access control
    // Import at call time to avoid circular dependencies
    const { useProjectsStore } = await import('~/apps/projects/store-projects');
    const projectMode = useProjectsStore.getState().mode;

    // In research mode, only allow read-only tools
    if (projectMode === 'research' && !tool.readOnly) {
      return {
        error: `Tool "${tool.name}" is not available in Research mode. Switch to Coding mode to use write operations.`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    // In chat mode, no tools should be executed (but this is already handled by not passing tools to AI)
    if (projectMode === 'chat') {
      return {
        error: `Tools are not available in Chat mode. Switch to Research or Coding mode to use tools.`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    // 4. Check if enabled
    if (!isToolEnabled(toolId)) {
      return {
        error: `Tool "${tool.name}" is disabled in settings. Enable it in Settings → Tools.`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    // 5. Check browser support
    if (!checkBrowserSupport(toolId)) {
      return {
        error: `Your browser doesn't support ${tool.name}. Required APIs: ${tool.browserAPIs?.join(', ')}`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    // 6. Check rate limit
    if (!checkRateLimit(toolId)) {
      return {
        error: `Rate limit exceeded for ${tool.name}. Maximum ${settings.rateLimit} calls per minute.`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    // 7. Check project requirement
    if (tool.requiresProject && !context.projectHandle) {
      return {
        error: `Tool "${tool.name}" requires an active project. Please select a project first.`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    // 8. Parse arguments
    let args: Record<string, any>;
    try {
      args = JSON.parse(argsJson);
    } catch (e) {
      return {
        error: `Invalid arguments for ${tool.name}: ${e instanceof Error ? e.message : 'Parse error'}`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    // 9. Set up timeout
    const timeout = tool.defaultTimeout || settings.executionTimeout;
    const timeoutPromise = new Promise<ToolExecutionResult>((_, reject) =>
      setTimeout(() => reject(new Error(`Tool execution timeout (${timeout}ms)`)), timeout)
    );

    // 10. Execute with timeout
    if (settings.logToolCalls) {
      console.log(`[Tools] Executing: ${toolId}`, args);
    }

    const executionPromise = tool.executor(args, context);
    const result = await Promise.race([executionPromise, timeoutPromise]);

    // 11. Track execution
    trackToolExecution(toolId);

    // 12. Add metadata
    const executionTime = Date.now() - startTime;
    return {
      ...result,
      metadata: {
        ...result.metadata,
        executionTime,
        toolId,
        toolName: tool.name,
      },
    };

  } catch (error: any) {
    const executionTime = Date.now() - startTime;

    if (settings.logToolCalls) {
      console.error(`[Tools] Error executing ${toolId}:`, error);
    }

    return {
      error: `Tool execution failed: ${error.message || error.toString()}`,
      metadata: {
        executionTime,
        toolId,
        error: error.stack,
      },
    };
  }
}


/**
 * Batch execute multiple tools (with concurrency limit)
 */
export async function executeToolBatch(
  calls: Array<{ toolId: string; argsJson: string; context?: ToolExecutionContext }>
): Promise<ToolExecutionResult[]> {
  const settings = useToolsStore.getState();
  const maxConcurrent = settings.maxConcurrent;

  const results: ToolExecutionResult[] = [];

  for (let i = 0; i < calls.length; i += maxConcurrent) {
    const batch = calls.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(call => executeToolCall(call.toolId, call.argsJson, call.context))
    );
    results.push(...batchResults);
  }

  return results;
}
