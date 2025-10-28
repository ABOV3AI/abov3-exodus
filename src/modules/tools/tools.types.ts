/**
 * Core types for the ABOV3 Exodus tools system
 * This enables Claude Code-like capabilities in the browser
 */

import type { AixTools_ToolDefinition } from '../aix/server/api/aix.wiretypes';


export type ToolCategory =
  | 'file-ops'
  | 'code-exec'
  | 'web'
  | 'office'
  | 'image'
  | 'data'
  | 'diagram'
  | 'git'
  | 'testing'
  | 'utility';


export interface ToolExecutionContext {
  projectHandle?: FileSystemDirectoryHandle;
  conversationId?: string;
  messageId?: string;
  abortSignal?: AbortSignal;
}


export interface ToolExecutionResult {
  result?: string;
  error?: string;
  metadata?: {
    executionTime?: number;
    source?: string;
    [key: string]: any;
  };
}


export type ToolExecutor = (
  args: Record<string, any>,
  context: ToolExecutionContext
) => Promise<ToolExecutionResult>;


export interface ToolDefinition {
  id: string;
  category: ToolCategory;
  name: string;
  description: string;
  aixDefinition: AixTools_ToolDefinition;
  executor: ToolExecutor;

  // Requirements
  requiresProject?: boolean;
  requiresNetwork?: boolean;
  requiresAPI?: string; // e.g., 'GOOGLE_API_KEY' (optional)
  dangerous?: boolean;

  // Browser compatibility
  browserAPIs?: string[]; // e.g., ['FileSystem', 'WebWorker']

  // Limits
  defaultTimeout?: number; // ms
  maxMemoryMB?: number;
}


export interface ToolRegistryEntry {
  definition: ToolDefinition;
  enabled: boolean;
  lastExecuted?: number;
  executionCount?: number;
}
