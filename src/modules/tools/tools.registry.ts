/**
 * Central registry for all available tools in ABOV3 Exodus
 * Tools are registered by category and can be dynamically enabled/disabled
 */

import type { AixTools_ToolDefinition } from '../aix/server/api/aix.wiretypes';
import type { ToolCategory, ToolDefinition, ToolRegistryEntry } from './tools.types';
import { useToolsStore } from './store-tools';
import { getMCPRuntime } from '~/modules/mcp/mcp.runtime';


// Global registry
const TOOL_REGISTRY = new Map<string, ToolRegistryEntry>();


/**
 * Register a tool in the global registry
 */
export function registerTool(
  definition: ToolDefinition,
  options?: { overwrite?: boolean }
): void {
  if (TOOL_REGISTRY.has(definition.id) && !options?.overwrite) {
    console.warn(`Tool ${definition.id} already registered`);
    return;
  }

  TOOL_REGISTRY.set(definition.id, {
    definition,
    enabled: true,
    executionCount: 0,
  });

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Tools] Registered: ${definition.id} (${definition.category})`);
  }
}


/**
 * Get a tool by ID
 */
export function getTool(id: string): ToolDefinition | undefined {
  const entry = TOOL_REGISTRY.get(id);
  return entry?.definition;
}


/**
 * Get all registered tools
 */
export function getAllTools(): ToolDefinition[] {
  return Array.from(TOOL_REGISTRY.values()).map(entry => entry.definition);
}


/**
 * Get tools by category
 */
export function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
  return getAllTools().filter(tool => tool.category === category);
}


/**
 * Check if a tool is enabled based on user settings
 */
export function isToolEnabled(toolId: string): boolean {
  const tool = getTool(toolId);
  if (!tool) return false;

  const settings = useToolsStore.getState();

  // Check category-level enable
  switch (tool.category) {
    case 'file-ops':
      return settings.enableFileOps;
    case 'code-exec':
      return settings.enableCodeExec;
    case 'web':
      return settings.enableWeb;
    case 'office':
      return settings.enableOffice;
    case 'image':
      return settings.enableImage;
    case 'data':
      return settings.enableData;
    case 'diagram':
      return settings.enableDiagram;
    case 'git':
      return settings.enableGit;
    case 'testing':
      return settings.enableTesting;
    case 'utility':
      return settings.enableUtility;
    default:
      return false;
  }
}


/**
 * Get all AIX tool definitions for enabled tools
 * This is what gets passed to the AI model
 */
export function getEnabledAIXTools(options?: {
  category?: ToolCategory;
  requiresProject?: boolean;
  readOnly?: boolean; // If true, only return read-only tools (research mode)
  modelId?: string;   // If specified, filter MCP tools based on model's userMcpEnabled setting
}): AixTools_ToolDefinition[] {
  let tools = getAllTools();

  // Filter by category if specified
  if (options?.category) {
    tools = tools.filter(t => t.category === options.category);
  }

  // Filter by project requirement if specified
  if (options?.requiresProject !== undefined) {
    tools = tools.filter(t => t.requiresProject === options.requiresProject);
  }

  // Filter by readOnly flag if specified
  if (options?.readOnly !== undefined) {
    tools = tools.filter(t => t.readOnly === options.readOnly);
  }

  // Filter by enabled status
  tools = tools.filter(t => isToolEnabled(t.id));

  const aixTools = tools.map(t => t.aixDefinition);

  // Add MCP tools - filter based on model's MCP setting if modelId is provided
  let mcpTools: AixTools_ToolDefinition[] = [];

  if (options?.modelId) {
    // Per-model MCP filtering
    const { findLLMOrThrow } = require('~/common/stores/llms/llms.hooks');
    const { LLM_IF_OAI_Fn } = require('~/common/stores/llms/llms.types');

    try {
      const llm = findLLMOrThrow(options.modelId);
      const mcpEnabled = llm.userMcpEnabled !== false; // undefined = enabled
      const hasFunctionCalls = llm.interfaces.includes(LLM_IF_OAI_Fn);

      if (mcpEnabled && hasFunctionCalls) {
        const mcpRuntime = getMCPRuntime();
        mcpTools = mcpRuntime.getAvailableTools();
      }
    } catch (error) {
      // Model not found or error - fall back to including MCP tools
      console.warn('Error filtering MCP tools by model:', error);
      const mcpRuntime = getMCPRuntime();
      mcpTools = mcpRuntime.getAvailableTools();
    }
  } else {
    // No modelId specified - include all MCP tools (backwards compatibility)
    const mcpRuntime = getMCPRuntime();
    mcpTools = mcpRuntime.getAvailableTools();
  }

  return [...aixTools, ...mcpTools];
}


/**
 * Track tool execution
 */
export function trackToolExecution(toolId: string): void {
  const entry = TOOL_REGISTRY.get(toolId);
  if (entry) {
    entry.lastExecuted = Date.now();
    entry.executionCount = (entry.executionCount || 0) + 1;
  }
}


/**
 * Get tool statistics
 */
export function getToolStats(toolId: string): {
  lastExecuted?: number;
  executionCount: number;
} {
  const entry = TOOL_REGISTRY.get(toolId);
  return {
    lastExecuted: entry?.lastExecuted,
    executionCount: entry?.executionCount || 0,
  };
}


/**
 * Initialize and register all tools
 * Called once at app startup
 */
export function initializeToolRegistry(): void {
  if (TOOL_REGISTRY.size > 0) {
    console.warn('[Tools] Registry already initialized');
    return;
  }

  // Import and register all tool modules
  import('../fileops/fileops.executor').then(module => {
    module.FILE_OPERATION_TOOLS.forEach(tool => registerTool(tool));
  });

  import('../web-tools/web-tools.executor').then(module => {
    module.WEB_TOOLS.forEach(tool => registerTool(tool));
  });

  // More tool modules will be added here as we build them

  if (process.env.NODE_ENV === 'development') {
    // Log after a short delay to let imports complete
    setTimeout(() => {
      console.log(`[Tools] Initialized with ${TOOL_REGISTRY.size} tools`);
    }, 100);
  }
}
