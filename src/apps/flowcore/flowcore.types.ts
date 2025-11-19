import type { Node, Edge } from 'reactflow';

// Workflow definition
export interface Workflow {
  id: string;
  name: string;
  description: string;
  tags: string[];
  nodes: Node[];
  edges: Edge[];
  trigger: TriggerConfig;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastRun?: Date;
  executions: WorkflowExecution[];
}

// Trigger configuration
export interface TriggerConfig {
  type: 'manual' | 'schedule' | 'webhook';
  schedule?: string;  // cron expression
  webhookId?: string;
}

// Workflow execution record
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  error?: string;
  results: Record<string, any>;
}

// Execution context for runtime
export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  startTime: Date;
  variables: Record<string, any>;
  nodeResults: Map<string, any>;
  status: 'running' | 'paused' | 'completed' | 'failed';
  currentNodeId: string | null;
  errors: ExecutionError[];
}

// Execution error
export interface ExecutionError {
  nodeId: string;
  message: string;
  timestamp: Date;
}

// Node types
export type NodeType = 'tool' | 'ai' | 'logic' | 'trigger' | 'output';

// Node data interface
export interface FlowCoreNodeData {
  label: string;
  type: NodeType;
  config: Record<string, any>;
}

// Template workflow
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'executions'>;
}
