/**
 * MCP (Model Context Protocol) Runtime
 * Manages connections to MCP servers and executes tools
 * Provides universal MCP support for all function-calling models
 */

import type { AixTools_ToolDefinition } from '../aix/server/api/aix.wiretypes';
import type { MCPServerConfig } from './mcp.types';
import type { MCPToolResultContentItem } from '~/common/stores/chat/chat.fragments';


/**
 * MCP Tool Result - can be string (text-only) or structured content (text + images)
 */
export type MCPToolResult = string | MCPToolResultContentItem[];


/**
 * JSON-RPC 2.0 Message Types
 */
interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}


/**
 * MCP Tool Schema (from MCP protocol)
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}


/**
 * MCP Server Connection
 * Handles communication with a single MCP server
 */
class MCPServerConnection {
  private serverConfig: MCPServerConfig;
  private requestId: number = 0;
  private connected: boolean = false;

  constructor(config: MCPServerConfig) {
    this.serverConfig = config;
  }

  /**
   * Connect to MCP server
   * For HTTP/URL-based servers, this tests connectivity
   * For stdio servers, this would spawn the process (future work)
   */
  async connect(): Promise<void> {
    if (this.serverConfig.type === 'url') {
      // Test connection with a ping/capabilities request
      try {
        await this.sendRequest('capabilities', {});
        this.connected = true;
      } catch (error) {
        throw new Error(`Failed to connect to MCP server ${this.serverConfig.name}: ${error}`);
      }
    } else if (this.serverConfig.type === 'stdio') {
      // Stdio transport not yet implemented - requires server-side process spawning
      throw new Error('Stdio MCP servers not yet supported (requires server-side implementation)');
    }
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    this.connected = false;
  }

  /**
   * Discover available tools from MCP server
   */
  async discoverTools(): Promise<MCPTool[]> {
    if (!this.connected) {
      throw new Error(`MCP server ${this.serverConfig.name} not connected`);
    }

    try {
      const response = await this.sendRequest('tools/list', {});
      return response.tools || [];
    } catch (error) {
      console.error(`Failed to discover tools from ${this.serverConfig.name}:`, error);
      return [];
    }
  }

  /**
   * Execute a tool on the MCP server
   * Returns structured content if the result contains images, otherwise returns a string
   * @param toolName - The name of the tool to execute
   * @param args - Tool arguments
   * @param workspacePath - Optional workspace path for file operations (sent from Exodus)
   */
  async executeTool(toolName: string, args: Record<string, any>, workspacePath?: string): Promise<MCPToolResult> {
    if (!this.connected) {
      throw new Error(`MCP server ${this.serverConfig.name} not connected`);
    }

    try {
      const response = await this.sendRequest('tools/call', {
        name: toolName,
        arguments: args,
        // Pass workspace path to Eden for proper file path resolution
        workspacePath,
      });

      // MCP returns tool results in response.content array
      if (response.content && Array.isArray(response.content)) {
        // Check if there are any images in the response
        const hasImages = response.content.some((item: any) => item.type === 'image');

        if (hasImages) {
          // Return structured content to preserve images for vision LLM analysis
          const structuredContent: MCPToolResultContentItem[] = response.content.map((item: any) => {
            if (item.type === 'image') {
              return { type: 'image' as const, data: item.data, mimeType: item.mimeType || 'image/png' };
            } else if (item.type === 'text') {
              return { type: 'text' as const, text: item.text };
            } else {
              // For other types, convert to text
              return { type: 'text' as const, text: item.text || JSON.stringify(item) };
            }
          });
          return structuredContent;
        }

        // No images - return as plain string for backward compatibility
        return response.content
          .map((item: any) => item.text || JSON.stringify(item))
          .join('\n');
      }

      return JSON.stringify(response);
    } catch (error: any) {
      throw new Error(`Tool execution failed: ${error.message || error}`);
    }
  }

  /**
   * Send JSON-RPC request to MCP server
   */
  private async sendRequest(method: string, params: any): Promise<any> {
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      id: ++this.requestId,
      method,
      params,
    };

    if (this.serverConfig.type === 'url') {
      const response = await fetch(this.serverConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.serverConfig.authToken && {
            'Authorization': `Bearer ${this.serverConfig.authToken}`,
          }),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const jsonRpcResponse: JSONRPCResponse = await response.json();

      if (jsonRpcResponse.error) {
        throw new Error(jsonRpcResponse.error.message);
      }

      return jsonRpcResponse.result;
    }

    throw new Error('Unsupported transport type');
  }

  isConnected(): boolean {
    return this.connected;
  }

  getName(): string {
    return this.serverConfig.name;
  }
}


/**
 * Sanitize a string for use in tool IDs
 * Only allows letters, numbers, underscores, and hyphens
 */
function sanitizeForToolId(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
}


/**
 * MCP Tool Runtime
 * Global singleton managing all MCP server connections
 */
export class MCPToolRuntime {
  private static instance: MCPToolRuntime | null = null;
  private servers: Map<string, MCPServerConnection> = new Map();
  private toolCache: Map<string, { serverName: string; tool: MCPTool }> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): MCPToolRuntime {
    if (!MCPToolRuntime.instance) {
      MCPToolRuntime.instance = new MCPToolRuntime();
    }
    return MCPToolRuntime.instance;
  }

  /**
   * Register and connect to an MCP server
   */
  async registerServer(config: MCPServerConfig): Promise<void> {
    console.log('[MCP Runtime] Registering server:', config.name, 'type:', config.type, 'url:', config.url);

    if (this.servers.has(config.name)) {
      console.warn('[MCP Runtime] Server already registered:', config.name);
      throw new Error(`MCP server ${config.name} already registered`);
    }

    const connection = new MCPServerConnection(config);
    await connection.connect();
    this.servers.set(config.name, connection);
    console.log('[MCP Runtime] Server connected:', config.name);

    // Discover tools from the server
    await this.refreshToolsFromServer(config.name);
    console.log('[MCP Runtime] Tools discovered for server:', config.name, 'total tools in cache:', this.toolCache.size);
  }

  /**
   * Unregister MCP server
   */
  async unregisterServer(serverName: string): Promise<void> {
    const connection = this.servers.get(serverName);
    if (connection) {
      await connection.disconnect();
      this.servers.delete(serverName);

      // Remove tools from this server
      for (const [toolId, cached] of this.toolCache.entries()) {
        if (cached.serverName === serverName) {
          this.toolCache.delete(toolId);
        }
      }
    }
  }

  /**
   * Refresh tool list from a specific server
   */
  async refreshToolsFromServer(serverName: string): Promise<void> {
    const connection = this.servers.get(serverName);
    if (!connection) {
      throw new Error(`MCP server ${serverName} not found`);
    }

    const tools = await connection.discoverTools();

    // Clear old tools from this server
    for (const [toolId, cached] of this.toolCache.entries()) {
      if (cached.serverName === serverName) {
        this.toolCache.delete(toolId);
      }
    }

    // Add new tools with sanitized IDs (function names must match /^[a-zA-Z0-9_-]{1,64}$/)
    for (const tool of tools) {
      const sanitizedServerName = sanitizeForToolId(serverName);
      const sanitizedToolName = sanitizeForToolId(tool.name);
      // Ensure toolId stays within 64 character limit
      let toolId = `mcp_${sanitizedServerName}_${sanitizedToolName}`;
      if (toolId.length > 64) {
        // Truncate server name portion if needed, keep tool name intact
        const maxServerLen = 64 - 5 - sanitizedToolName.length; // 5 = "mcp_" + "_"
        const truncatedServer = sanitizedServerName.slice(0, Math.max(4, maxServerLen));
        toolId = `mcp_${truncatedServer}_${sanitizedToolName}`;
      }
      this.toolCache.set(toolId, { serverName, tool });
    }
  }

  /**
   * Get all discovered MCP tools as AIX tool definitions
   */
  getAvailableTools(): AixTools_ToolDefinition[] {
    const aixTools: AixTools_ToolDefinition[] = [];

    console.log('[MCP Runtime] getAvailableTools called - toolCache size:', this.toolCache.size, 'servers:', this.servers.size);

    for (const [toolId, cached] of this.toolCache.entries()) {
      const { tool } = cached;

      aixTools.push({
        type: 'function_call',
        function_call: {
          name: toolId,
          description: tool.description,
          input_schema: {
            properties: tool.inputSchema.properties || {},
            required: tool.inputSchema.required,
          },
        },
      });
    }

    return aixTools;
  }

  /**
   * Execute an MCP tool
   * Returns structured content if the result contains images, otherwise returns a string
   * @param toolId - The tool ID (e.g., "mcp_eden_read_file")
   * @param args - Tool arguments
   * @param workspacePath - Optional workspace path for file operations
   */
  async executeTool(toolId: string, args: Record<string, any>, workspacePath?: string): Promise<MCPToolResult> {
    const cached = this.toolCache.get(toolId);
    if (!cached) {
      throw new Error(`MCP tool ${toolId} not found`);
    }

    const { serverName, tool } = cached;
    const connection = this.servers.get(serverName);
    if (!connection) {
      throw new Error(`MCP server ${serverName} not available`);
    }

    return await connection.executeTool(tool.name, args, workspacePath);
  }

  /**
   * Check if a tool ID is an MCP tool
   */
  isMCPTool(toolId: string): boolean {
    return this.toolCache.has(toolId);
  }

  /**
   * Get list of registered servers
   */
  getRegisteredServers(): { name: string; connected: boolean }[] {
    return Array.from(this.servers.entries()).map(([name, connection]) => ({
      name,
      connected: connection.isConnected(),
    }));
  }

  /**
   * Get all tools with their server names (for UI display)
   */
  async getAllTools(): Promise<Array<{ tool: MCPTool; serverName: string }>> {
    const result: Array<{ tool: MCPTool; serverName: string }> = [];

    for (const [_toolId, cached] of this.toolCache.entries()) {
      result.push({
        tool: cached.tool,
        serverName: cached.serverName,
      });
    }

    return result;
  }

  /**
   * Refresh tools from all connected servers
   */
  async refreshAllTools(): Promise<void> {
    for (const serverName of this.servers.keys()) {
      try {
        await this.refreshToolsFromServer(serverName);
      } catch (error) {
        console.error(`Failed to refresh tools from ${serverName}:`, error);
      }
    }
  }
}


/**
 * Global runtime instance accessor
 */
export function getMCPRuntime(): MCPToolRuntime {
  return MCPToolRuntime.getInstance();
}
