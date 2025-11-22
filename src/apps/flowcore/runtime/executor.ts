import type { Node, Edge } from 'reactflow';
import type { DLLMId } from '~/common/stores/llms/llms.types';
import { executeToolCall } from '~/modules/tools/tools.executor';
import { aixChatGenerateContent_DMessage } from '~/modules/aix/client/aix.client';
import { VariableInterpolator, type ExecutionContext as VarContext, type NodeExecutionResult } from './variable-interpolator';

// Re-export for compatibility
export type { ExecutionContext as VarContext, NodeExecutionResult } from './variable-interpolator';

// Workflow execution result
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  startTime: Date;
  endTime: Date;
  status: 'completed' | 'failed' | 'cancelled';
  error?: string;
  results: Record<string, any>;
}

// Execution error
export interface ExecutionError {
  nodeId: string;
  message: string;
  timestamp: Date;
  stack?: string;
}

// Legacy ExecutionContext for compatibility with components
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

// Generate unique execution ID
const generateExecutionId = () => `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

interface RetryConfig {
  maxRetries: number;
  retryDelay: number; // in milliseconds
  retryBackoff: number; // multiplier for exponential backoff
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoff: 2,
};

export class WorkflowExecutor {
  private executionContext: ExecutionContext | null = null;
  private varContext: VarContext | null = null;
  private onStatusUpdate?: (context: ExecutionContext) => void;
  private retryConfig: RetryConfig;
  private abortController: AbortController | null = null;

  constructor(
    onStatusUpdate?: (context: ExecutionContext) => void,
    retryConfig?: Partial<RetryConfig>
  ) {
    this.onStatusUpdate = onStatusUpdate;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  async executeWorkflow(
    workflowId: string,
    nodes: Node[],
    edges: Edge[],
    inputs: Record<string, any> = {}
  ): Promise<WorkflowExecution> {
    const executionId = generateExecutionId();
    const startTime = new Date();

    // Create abort controller for cancellation
    this.abortController = new AbortController();

    // Initialize legacy execution context (for UI compatibility)
    this.executionContext = {
      workflowId,
      executionId,
      startTime,
      variables: { ...inputs },
      nodeResults: new Map(),
      status: 'running',
      currentNodeId: null,
      errors: [],
    };

    // Initialize variable interpolation context
    this.varContext = {
      workflowId,
      executionId,
      trigger: {
        type: 'manual',
        payload: inputs,
        timestamp: startTime,
      },
      nodes: {},
      variables: { ...inputs },
      input: inputs,
    };

    this.notifyStatusUpdate();

    try {
      // Find trigger node (entry point)
      const triggerNode = nodes.find(node => node.data?.type === 'trigger');

      if (!triggerNode) {
        throw new Error('No trigger node found in workflow');
      }

      // Execute workflow starting from trigger
      await this.executeNode(triggerNode, nodes, edges);

      // Mark as completed
      this.executionContext.status = 'completed';
      this.executionContext.currentNodeId = null;
      this.notifyStatusUpdate();

      return {
        id: executionId,
        workflowId,
        startTime,
        endTime: new Date(),
        status: 'completed',
        results: Object.fromEntries(this.executionContext.nodeResults),
      };

    } catch (error: any) {
      // Check if cancelled
      if (error.name === 'AbortError' || this.abortController?.signal.aborted) {
        this.executionContext.status = 'failed';
        return {
          id: executionId,
          workflowId,
          startTime,
          endTime: new Date(),
          status: 'cancelled',
          error: 'Workflow execution was cancelled',
          results: Object.fromEntries(this.executionContext.nodeResults),
        };
      }

      // Mark as failed
      this.executionContext.status = 'failed';
      this.executionContext.errors.push({
        nodeId: this.executionContext.currentNodeId || 'unknown',
        message: error.message,
        timestamp: new Date(),
        stack: error.stack,
      });
      this.notifyStatusUpdate();

      return {
        id: executionId,
        workflowId,
        startTime,
        endTime: new Date(),
        status: 'failed',
        error: error.message,
        results: Object.fromEntries(this.executionContext.nodeResults),
      };
    }
  }

  cancel() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  private async executeNode(node: Node, allNodes: Node[], allEdges: Edge[], retryCount = 0): Promise<any> {
    if (!this.executionContext || !this.varContext) throw new Error('No execution context');

    // Check for abort
    if (this.abortController?.signal.aborted) {
      throw new Error('Workflow execution was cancelled');
    }

    // Update current node
    this.executionContext.currentNodeId = node.id;
    this.notifyStatusUpdate();

    // Simulate delay for visualization
    await new Promise(resolve => setTimeout(resolve, 500));

    const nodeStartTime = new Date();
    let result: any;

    try {
      // Execute based on node type
      const nodeType = node.data?.type;

      switch (nodeType) {
        case 'trigger':
          result = await this.executeTriggerNode(node);
          break;
        case 'tool':
          result = await this.executeToolNode(node);
          break;
        case 'ai':
          result = await this.executeAINode(node);
          break;
        case 'logic':
          result = await this.executeLogicNode(node, allNodes, allEdges);
          break;
        case 'output':
          result = await this.executeOutputNode(node);
          break;
        default:
          result = { success: true, message: `Executed ${node.data?.label}` };
      }

      const nodeEndTime = new Date();

      // Store result in variable context
      this.varContext.nodes[node.id] = {
        nodeId: node.id,
        status: 'success',
        result,
        startTime: nodeStartTime,
        endTime: nodeEndTime,
        duration: nodeEndTime.getTime() - nodeStartTime.getTime(),
      };

      // Store result in legacy context
      this.executionContext.nodeResults.set(node.id, result);

      // For logic nodes (If/Else), edges might be conditional
      if (nodeType === 'logic' && node.data?.label?.includes('If')) {
        // Conditional execution handled in executeLogicNode
        return result;
      }

      // Find and execute next nodes
      const outgoingEdges = allEdges.filter(edge => edge.source === node.id);

      // Execute next nodes in parallel if there are multiple branches
      if (outgoingEdges.length > 1) {
        await Promise.all(
          outgoingEdges.map(async (edge) => {
            const nextNode = allNodes.find(n => n.id === edge.target);
            if (nextNode) {
              await this.executeNode(nextNode, allNodes, allEdges);
            }
          })
        );
      } else if (outgoingEdges.length === 1) {
        // Single branch - execute sequentially
        const nextNode = allNodes.find(n => n.id === outgoingEdges[0].target);
        if (nextNode) {
          await this.executeNode(nextNode, allNodes, allEdges);
        }
      }

      return result;

    } catch (error: any) {
      // Record error in variable context
      this.varContext.nodes[node.id] = {
        nodeId: node.id,
        status: 'error',
        error: error.message,
        startTime: nodeStartTime,
      };

      // Retry logic
      if (retryCount < this.retryConfig.maxRetries) {
        const delay = this.retryConfig.retryDelay * Math.pow(this.retryConfig.retryBackoff, retryCount);

        console.log(`[FlowCore] Retrying node ${node.id} (attempt ${retryCount + 1}/${this.retryConfig.maxRetries}) after ${delay}ms`);

        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));

        // Retry execution
        return this.executeNode(node, allNodes, allEdges, retryCount + 1);
      }

      // Max retries exceeded, record error and throw
      const errorMessage = `Node ${node.data?.label || node.id} failed after ${retryCount} retries: ${error.message}`;

      this.executionContext.errors.push({
        nodeId: node.id,
        message: errorMessage,
        timestamp: new Date(),
        stack: error.stack,
      });

      throw new Error(errorMessage);
    }
  }

  private async executeTriggerNode(node: Node): Promise<any> {
    return {
      type: 'trigger',
      triggered: true,
      timestamp: new Date().toISOString(),
      payload: this.varContext?.trigger?.payload,
    };
  }

  private async executeToolNode(node: Node): Promise<any> {
    if (!this.varContext) throw new Error('No variable context');

    const config = node.data?.config || {};
    const label = node.data?.label || 'Unknown Tool';

    // Interpolate variables in config
    const interpolatedConfig = VariableInterpolator.interpolateObject(config, this.varContext);

    // Map node label to tool ID
    const toolId = this.mapNodeLabelToToolId(label);

    if (!toolId) {
      // No tool mapping, return simulated result
      return {
        type: 'tool',
        tool: label,
        status: 'success',
        data: {
          message: `Executed tool: ${label}`,
          config: interpolatedConfig,
        },
      };
    }

    try {
      // Execute real tool
      const toolResult = await executeToolCall(
        toolId,
        JSON.stringify(interpolatedConfig),
        {
          conversationId: this.varContext.workflowId,
        }
      );

      return {
        type: 'tool',
        tool: label,
        toolId,
        status: 'success',
        data: toolResult.result,
        metadata: {
          toolId,
        },
      };
    } catch (error: any) {
      throw new Error(`Tool execution failed: ${error.message}`);
    }
  }

  private async executeAINode(node: Node): Promise<any> {
    if (!this.varContext) throw new Error('No variable context');

    const config = node.data?.config || {};
    const label = node.data?.label || 'Unknown AI';

    // Interpolate variables in config
    const interpolatedConfig = VariableInterpolator.interpolateObject(config, this.varContext);

    const {
      modelId = 'anthropic-claude-3-5-sonnet-20241022', // Default to Claude
      prompt = 'Please provide a response.',
      temperature = 0.7,
      maxTokens = 2000,
    } = interpolatedConfig;

    try {
      // Prepare messages
      const messages = [{
        role: 'user' as const,
        parts: [{ pt: 'text' as const, text: prompt }],
      }];

      let aiResponse = '';
      let tokenUsage = { input: 0, output: 0 };

      // Execute AI request with streaming
      const result = await aixChatGenerateContent_DMessage(
        modelId as DLLMId,
        {
          systemMessage: null,
          chatSequence: messages,
        },
        { method: 'chat-generate', name: '_DEV_', ref: this.varContext.executionId },
        true, // streaming
        {
          abortSignal: this.abortController?.signal || 'NON_ABORTABLE',
          throttleParallelThreads: 1,
        },
        async (update: any, isDone: boolean) => {
          // Handle streaming updates
          if (update.fragments && update.fragments.length > 0) {
            const textFragments = update.fragments
              .filter((f: any) => f.ft === 'content' && f.part.pt === 'text')
              .map((f: any) => f.part.text);

            aiResponse = textFragments.join('');
          }

          // Get token usage
          if (update.genTokenStopReason) {
            tokenUsage = {
              input: update.genTokensIn || 0,
              output: update.genTokensOut || 0,
            };
          }
        }
      );

      return {
        type: 'ai',
        model: label,
        modelId,
        status: 'success',
        data: {
          response: aiResponse,
          tokenUsage,
          config: interpolatedConfig,
        },
      };
    } catch (error: any) {
      throw new Error(`AI execution failed: ${error.message}`);
    }
  }

  private async executeLogicNode(node: Node, allNodes: Node[], allEdges: Edge[]): Promise<any> {
    if (!this.varContext) throw new Error('No variable context');

    const config = node.data?.config || {};
    const label = node.data?.label || 'Unknown Logic';

    // Interpolate variables in config
    const interpolatedConfig = VariableInterpolator.interpolateObject(config, this.varContext);

    // If/Then/Else logic
    if (label.includes('If') || label.includes('Condition')) {
      const { condition, leftOperand, operator = '==', rightOperand } = interpolatedConfig;

      let conditionResult = false;

      // Evaluate condition
      if (condition !== undefined) {
        // Simple boolean condition
        conditionResult = Boolean(condition);
      } else if (leftOperand !== undefined && rightOperand !== undefined) {
        // Comparison condition
        conditionResult = this.evaluateCondition(leftOperand, operator, rightOperand);
      }

      // Execute appropriate branch
      const outgoingEdges = allEdges.filter(edge => edge.source === node.id);

      for (const edge of outgoingEdges) {
        const edgeLabel = (edge as any).label || '';
        const shouldExecute = (
          (conditionResult && (edgeLabel.includes('true') || edgeLabel.includes('yes'))) ||
          (!conditionResult && (edgeLabel.includes('false') || edgeLabel.includes('no')))
        );

        if (shouldExecute) {
          const nextNode = allNodes.find(n => n.id === edge.target);
          if (nextNode) {
            await this.executeNode(nextNode, allNodes, allEdges);
          }
        }
      }

      return {
        type: 'logic',
        operation: 'condition',
        conditionResult,
        config: interpolatedConfig,
      };
    }

    // Loop logic
    if (label.includes('Loop') || label.includes('Iterate')) {
      const { array = [], loopVariable = 'item', maxIterations = 100 } = interpolatedConfig;

      const iterations: any[] = [];
      const actualArray = Array.isArray(array) ? array : [];

      for (let i = 0; i < Math.min(actualArray.length, maxIterations); i++) {
        // Set loop variable in context
        this.varContext.variables[loopVariable] = actualArray[i];
        this.varContext.variables[`${loopVariable}Index`] = i;

        // Execute loop body (next nodes)
        const outgoingEdges = allEdges.filter(edge => edge.source === node.id);

        for (const edge of outgoingEdges) {
          const nextNode = allNodes.find(n => n.id === edge.target);
          if (nextNode) {
            const result = await this.executeNode(nextNode, allNodes, allEdges);
            iterations.push(result);
          }
        }
      }

      return {
        type: 'logic',
        operation: 'loop',
        iterations: iterations.length,
        results: iterations,
        config: interpolatedConfig,
      };
    }

    // Merge logic
    if (label.includes('Merge') || label.includes('Combine')) {
      // Collect results from all incoming edges
      const incomingEdges = allEdges.filter(edge => edge.target === node.id);
      const incomingResults: any[] = [];

      for (const edge of incomingEdges) {
        const sourceNode = allNodes.find(n => n.id === edge.source);
        if (sourceNode && this.varContext.nodes[sourceNode.id]) {
          incomingResults.push(this.varContext.nodes[sourceNode.id].result);
        }
      }

      return {
        type: 'logic',
        operation: 'merge',
        merged: incomingResults,
        config: interpolatedConfig,
      };
    }

    // Default logic execution
    return {
      type: 'logic',
      operation: label,
      status: 'success',
      config: interpolatedConfig,
    };
  }

  private evaluateCondition(left: any, operator: string, right: any): boolean {
    switch (operator) {
      case '==':
      case 'equals':
        return left == right;
      case '===':
      case 'strict_equals':
        return left === right;
      case '!=':
      case 'not_equals':
        return left != right;
      case '>':
      case 'greater_than':
        return left > right;
      case '>=':
      case 'greater_or_equal':
        return left >= right;
      case '<':
      case 'less_than':
        return left < right;
      case '<=':
      case 'less_or_equal':
        return left <= right;
      case 'contains':
        return String(left).includes(String(right));
      case 'starts_with':
        return String(left).startsWith(String(right));
      case 'ends_with':
        return String(left).endsWith(String(right));
      default:
        console.warn(`Unknown operator: ${operator}, defaulting to ==`);
        return left == right;
    }
  }

  private async executeOutputNode(node: Node): Promise<any> {
    if (!this.varContext) throw new Error('No variable context');

    const config = node.data?.config || {};
    const label = node.data?.label || 'Unknown Output';

    // Interpolate variables in config
    const interpolatedConfig = VariableInterpolator.interpolateObject(config, this.varContext);

    // Collect all previous results
    const allResults = Object.fromEntries(
      Object.entries(this.varContext.nodes).map(([id, result]) => [id, result.result])
    );

    return {
      type: 'output',
      output: label,
      status: 'success',
      data: {
        message: `Output: ${label}`,
        results: allResults,
        formatted: interpolatedConfig.format || allResults,
        config: interpolatedConfig,
      },
    };
  }

  private mapNodeLabelToToolId(label: string): string | null {
    const mapping: Record<string, string> = {
      'HTTP Request': 'http_request',
      'Web Search': 'search_web',
      'File Read': 'file_read',
      'File Write': 'file_write',
      'Fetch Webpage': 'fetch_webpage',
      'Scrape Links': 'scrape_links',
    };

    return mapping[label] || null;
  }

  private notifyStatusUpdate() {
    if (this.onStatusUpdate && this.executionContext) {
      this.onStatusUpdate({ ...this.executionContext });
    }
  }

  getExecutionContext(): ExecutionContext | null {
    return this.executionContext;
  }

  getVariableContext(): VarContext | null {
    return this.varContext;
  }
}
