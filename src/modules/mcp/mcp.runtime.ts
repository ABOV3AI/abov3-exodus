/**
 * MCP (Model Context Protocol) Runtime
 * Manages connections to MCP servers and executes tools
 * Provides universal MCP support for all function-calling models
 */

import type { AixTools_ToolDefinition } from '../aix/server/api/aix.wiretypes';
import type { MCPServerConfig } from './mcp.types';


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
   */
  async executeTool(toolName: string, args: Record<string, any>): Promise<string> {
    if (!this.connected) {
      throw new Error(`MCP server ${this.serverConfig.name} not connected`);
    }

    try {
      const response = await this.sendRequest('tools/call', {
        name: toolName,
        arguments: args,
      });

      // MCP returns tool results in response.content array
      if (response.content && Array.isArray(response.content)) {
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
    if (this.servers.has(config.name)) {
      throw new Error(`MCP server ${config.name} already registered`);
    }

    const connection = new MCPServerConnection(config);
    await connection.connect();
    this.servers.set(config.name, connection);

    // Discover tools from the server
    await this.refreshToolsFromServer(config.name);
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

    // Add new tools
    for (const tool of tools) {
      const toolId = `mcp_${serverName}_${tool.name}`;
      this.toolCache.set(toolId, { serverName, tool });
    }
  }

  /**
   * Get all discovered MCP tools as AIX tool definitions
   */
  getAvailableTools(): AixTools_ToolDefinition[] {
    const aixTools: AixTools_ToolDefinition[] = [];

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
   */
  async executeTool(toolId: string, args: Record<string, any>): Promise<string> {
    const cached = this.toolCache.get(toolId);
    if (!cached) {
      throw new Error(`MCP tool ${toolId} not found`);
    }

    const { serverName, tool } = cached;
    const connection = this.servers.get(serverName);
    if (!connection) {
      throw new Error(`MCP server ${serverName} not available`);
    }

    return await connection.executeTool(tool.name, args);
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
}


/**
 * Global runtime instance accessor
 */
export function getMCPRuntime(): MCPToolRuntime {
  return MCPToolRuntime.getInstance();
}
