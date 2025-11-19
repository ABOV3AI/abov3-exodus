import type { Node, Edge } from 'reactflow';
import type { ExecutionContext, WorkflowExecution, ExecutionError } from '../flowcore.types';

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
  private onStatusUpdate?: (context: ExecutionContext) => void;
  private retryConfig: RetryConfig;

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

    // Initialize execution context
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
      // Mark as failed
      this.executionContext.status = 'failed';
      this.executionContext.errors.push({
        nodeId: this.executionContext.currentNodeId || 'unknown',
        message: error.message,
        timestamp: new Date(),
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

  private async executeNode(node: Node, allNodes: Node[], allEdges: Edge[], retryCount = 0): Promise<any> {
    if (!this.executionContext) throw new Error('No execution context');

    // Update current node
    this.executionContext.currentNodeId = node.id;
    this.notifyStatusUpdate();

    // Simulate delay for visualization
    await new Promise(resolve => setTimeout(resolve, 500));

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
          result = await this.executeLogicNode(node);
          break;
        case 'output':
          result = await this.executeOutputNode(node);
          break;
        default:
          result = { success: true, message: `Executed ${node.data?.label}` };
      }

      // Store result
      this.executionContext.nodeResults.set(node.id, result);

      // Find and execute next nodes
      const outgoingEdges = allEdges.filter(edge => edge.source === node.id);

      for (const edge of outgoingEdges) {
        const nextNode = allNodes.find(n => n.id === edge.target);
        if (nextNode) {
          await this.executeNode(nextNode, allNodes, allEdges);
        }
      }

      return result;

    } catch (error: any) {
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
      });

      throw new Error(errorMessage);
    }
  }

  private async executeTriggerNode(node: Node): Promise<any> {
    return {
      type: 'trigger',
      triggered: true,
      timestamp: new Date().toISOString(),
    };
  }

  private async executeToolNode(node: Node): Promise<any> {
    const config = node.data?.config || {};
    const label = node.data?.label || 'Unknown Tool';

    // Simulate tool execution
    // In the future, this will call actual Exodus tools via executeToolCall
    return {
      type: 'tool',
      tool: label,
      status: 'success',
      data: {
        message: `Executed tool: ${label}`,
        config,
      },
    };
  }

  private async executeAINode(node: Node): Promise<any> {
    const config = node.data?.config || {};
    const label = node.data?.label || 'Unknown AI';

    // Simulate AI execution
    // In the future, this will call actual AIX endpoints
    return {
      type: 'ai',
      model: label,
      status: 'success',
      data: {
        message: `AI reasoning completed: ${label}`,
        response: `This is a simulated AI response from ${label}`,
        config,
      },
    };
  }

  private async executeLogicNode(node: Node): Promise<any> {
    const config = node.data?.config || {};
    const label = node.data?.label || 'Unknown Logic';

    return {
      type: 'logic',
      operation: label,
      status: 'success',
      data: {
        message: `Logic operation: ${label}`,
        config,
      },
    };
  }

  private async executeOutputNode(node: Node): Promise<any> {
    const config = node.data?.config || {};
    const label = node.data?.label || 'Unknown Output';

    // Collect all previous results
    const allResults = this.executionContext
      ? Object.fromEntries(this.executionContext.nodeResults)
      : {};

    return {
      type: 'output',
      output: label,
      status: 'success',
      data: {
        message: `Output: ${label}`,
        results: allResults,
        config,
      },
    };
  }

  private notifyStatusUpdate() {
    if (this.onStatusUpdate && this.executionContext) {
      this.onStatusUpdate({ ...this.executionContext });
    }
  }

  getExecutionContext(): ExecutionContext | null {
    return this.executionContext;
  }
}
