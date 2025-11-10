/**
 * Type definitions for MCP (Model Context Protocol) integration
 */

export type MCPServerType = 'url' | 'stdio';

export interface MCPServerConfig {
  id: string;
  name: string;
  type: MCPServerType;
  url: string; // For 'url' type
  command?: string; // For 'stdio' type (future)
  args?: string[]; // For 'stdio' type (future)
  authToken?: string;
  enabled: boolean;
  addedAt: number;
}
