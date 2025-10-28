/**
 * Tool execution framework with sandboxing, rate limiting, and error handling
 */

import type { ToolExecutionContext, ToolExecutionResult } from './tools.types';
import { getTool, trackToolExecution, isToolEnabled } from './tools.registry';
import { useToolsStore } from './store-tools';


// Rate limiting: Track executions per minute
const executionLog = new Map<string, number[]>();


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
    // 1. Get tool definition
    const tool = getTool(toolId);
    if (!tool) {
      return {
        error: `Unknown tool: ${toolId}`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    // 2. Check if enabled
    if (!isToolEnabled(toolId)) {
      return {
        error: `Tool "${tool.name}" is disabled in settings. Enable it in Settings → Tools.`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    // 3. Check browser support
    if (!checkBrowserSupport(toolId)) {
      return {
        error: `Your browser doesn't support ${tool.name}. Required APIs: ${tool.browserAPIs?.join(', ')}`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    // 4. Check rate limit
    if (!checkRateLimit(toolId)) {
      return {
        error: `Rate limit exceeded for ${tool.name}. Maximum ${settings.rateLimit} calls per minute.`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    // 5. Check project requirement
    if (tool.requiresProject && !context.projectHandle) {
      return {
        error: `Tool "${tool.name}" requires an active project. Please select a project first.`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    // 6. Parse arguments
    let args: Record<string, any>;
    try {
      args = JSON.parse(argsJson);
    } catch (e) {
      return {
        error: `Invalid arguments for ${tool.name}: ${e instanceof Error ? e.message : 'Parse error'}`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    // 7. Set up timeout
    const timeout = tool.defaultTimeout || settings.executionTimeout;
    const timeoutPromise = new Promise<ToolExecutionResult>((_, reject) =>
      setTimeout(() => reject(new Error(`Tool execution timeout (${timeout}ms)`)), timeout)
    );

    // 8. Execute with timeout
    if (settings.logToolCalls) {
      console.log(`[Tools] Executing: ${toolId}`, args);
    }

    const executionPromise = tool.executor(args, context);
    const result = await Promise.race([executionPromise, timeoutPromise]);

    // 9. Track execution
    trackToolExecution(toolId);

    // 10. Add metadata
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
