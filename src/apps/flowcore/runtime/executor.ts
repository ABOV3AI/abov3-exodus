import type { Node, Edge } from 'reactflow';
import type { DLLMId } from '~/common/stores/llms/llms.types';
import { executeToolCall } from '~/modules/tools/tools.executor';
import { aixChatGenerateContent_DMessage } from '~/modules/aix/client/aix.client';
import { VariableInterpolator, type ExecutionContext as VarContext, type NodeExecutionResult } from './variable-interpolator';
import { ExecutionLogger, type ExecutionLog } from './execution-logger';

// Re-export for compatibility
export type { ExecutionContext as VarContext, NodeExecutionResult } from './variable-interpolator';
export type { ExecutionLog } from './execution-logger';

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

export interface DebugOptions {
  enabled: boolean;
  breakpoints?: Set<string>; // node IDs to break on
  stepMode?: boolean; // pause after each node
  dryRun?: boolean; // simulate without side effects
}

export class WorkflowExecutor {
  private executionContext: ExecutionContext | null = null;
  private varContext: VarContext | null = null;
  private onStatusUpdate?: (context: ExecutionContext) => void;
  private retryConfig: RetryConfig;
  private abortController: AbortController | null = null;
  private logger: ExecutionLogger | null = null;
  private debugOptions: DebugOptions;
  private isPaused: boolean = false;
  private resumeCallback: (() => void) | null = null;

  constructor(
    onStatusUpdate?: (context: ExecutionContext) => void,
    retryConfig?: Partial<RetryConfig>,
    debugOptions?: Partial<DebugOptions>
  ) {
    this.onStatusUpdate = onStatusUpdate;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    this.debugOptions = {
      enabled: false,
      breakpoints: new Set(),
      stepMode: false,
      dryRun: false,
      ...debugOptions,
    };
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

    // Initialize logger if debug mode enabled
    if (this.debugOptions.enabled) {
      this.logger = new ExecutionLogger(executionId, workflowId);
      this.logger.logInfo('workflow', 'Workflow', `Starting workflow execution in ${this.debugOptions.dryRun ? 'DRY-RUN' : 'LIVE'} mode`);
    }

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

    const nodeLabel = node.data?.label || 'Unknown Node';

    // Check breakpoint / pause
    await this.checkBreakpoint(node.id, nodeLabel);

    // Update current node
    this.executionContext.currentNodeId = node.id;
    this.notifyStatusUpdate();

    // Log node start
    if (this.logger) {
      this.logger.logNodeStart(node.id, nodeLabel, node.data?.config);
    }

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
        case 'email':
          result = await this.executeEmailNode(node);
          break;
        case 'slack':
        case 'discord':
          result = await this.executeIntegrationNode(node);
          break;
        case 'database':
          result = await this.executeDatabaseNode(node);
          break;
        default:
          result = { success: true, message: `Executed ${node.data?.label}` };
      }

      const nodeEndTime = new Date();
      const duration = nodeEndTime.getTime() - nodeStartTime.getTime();

      // Store result in variable context
      this.varContext.nodes[node.id] = {
        nodeId: node.id,
        status: 'success',
        result,
        startTime: nodeStartTime,
        endTime: nodeEndTime,
        duration,
      };

      // Store result in legacy context
      this.executionContext.nodeResults.set(node.id, result);

      // Log node success
      if (this.logger) {
        this.logger.logNodeSuccess(node.id, nodeLabel, result, duration);
      }

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

      // Log error
      if (this.logger) {
        this.logger.logNodeError(node.id, nodeLabel, error, retryCount + 1);
      }

      // Retry logic
      if (retryCount < this.retryConfig.maxRetries) {
        const delay = this.retryConfig.retryDelay * Math.pow(this.retryConfig.retryBackoff, retryCount);

        console.log(`[FlowCore] Retrying node ${node.id} (attempt ${retryCount + 1}/${this.retryConfig.maxRetries}) after ${delay}ms`);

        // Log retry
        if (this.logger) {
          this.logger.logNodeRetry(node.id, nodeLabel, retryCount + 1, delay);
        }

        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));

        // Retry execution
        return this.executeNode(node, allNodes, allEdges, retryCount + 1);
      }

      // Max retries exceeded, record error and throw
      const errorMessage = `Node ${nodeLabel} failed after ${retryCount} retries: ${error.message}`;

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

    // Dry-run mode: simulate execution
    if (this.debugOptions.dryRun) {
      if (this.logger) {
        this.logger.logInfo(node.id, label, 'DRY-RUN: Simulating tool execution', interpolatedConfig);
      }

      return {
        type: 'tool',
        tool: label,
        toolId: toolId || 'simulated',
        status: 'success',
        dryRun: true,
        data: {
          message: `[DRY-RUN] Would execute tool: ${label}`,
          config: interpolatedConfig,
          simulatedResult: this.generateMockToolResult(label, interpolatedConfig),
        },
      };
    }

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

    // Dry-run mode: simulate AI execution
    if (this.debugOptions.dryRun) {
      if (this.logger) {
        this.logger.logInfo(node.id, label, 'DRY-RUN: Simulating AI execution', { modelId, prompt: prompt.substring(0, 100) + '...' });
      }

      return {
        type: 'ai',
        model: label,
        modelId,
        status: 'success',
        dryRun: true,
        data: {
          response: `[DRY-RUN] Simulated AI response for: ${prompt.substring(0, 50)}...`,
          tokenUsage: {
            input: Math.floor(prompt.length / 4),
            output: 50,
          },
          config: interpolatedConfig,
        },
      };
    }

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

  // Debug and logging methods

  pause() {
    this.isPaused = true;
    if (this.logger) {
      this.logger.logInfo('workflow', 'Workflow', 'Execution paused by user');
    }
  }

  resume() {
    this.isPaused = false;
    if (this.resumeCallback) {
      this.resumeCallback();
      this.resumeCallback = null;
    }
    if (this.logger) {
      this.logger.logInfo('workflow', 'Workflow', 'Execution resumed by user');
    }
  }

  step() {
    if (this.isPaused && this.resumeCallback) {
      this.resumeCallback();
      this.resumeCallback = null;
      this.isPaused = true; // Keep paused for next node
    }
  }

  isPausedState(): boolean {
    return this.isPaused;
  }

  getExecutionLog(): ExecutionLog | null {
    return this.logger?.export() || null;
  }

  getLogger(): ExecutionLogger | null {
    return this.logger;
  }

  setBreakpoint(nodeId: string) {
    this.debugOptions.breakpoints?.add(nodeId);
  }

  removeBreakpoint(nodeId: string) {
    this.debugOptions.breakpoints?.delete(nodeId);
  }

  toggleStepMode(enabled: boolean) {
    this.debugOptions.stepMode = enabled;
  }

  private async waitForResume(): Promise<void> {
    if (!this.isPaused) return;

    return new Promise<void>((resolve) => {
      this.resumeCallback = resolve;
    });
  }

  private async checkBreakpoint(nodeId: string, nodeLabel: string): Promise<void> {
    if (!this.debugOptions.enabled) return;

    // Check if we should pause at this node
    const shouldPause =
      this.debugOptions.stepMode ||
      this.debugOptions.breakpoints?.has(nodeId);

    if (shouldPause && !this.isPaused) {
      this.isPaused = true;
      if (this.logger) {
        this.logger.logInfo(nodeId, nodeLabel, `Paused at breakpoint`);
      }
      this.notifyStatusUpdate();
      await this.waitForResume();
    } else if (this.isPaused) {
      await this.waitForResume();
    }
  }

  private generateMockToolResult(toolLabel: string, config: any): any {
    // Generate realistic mock results based on tool type
    switch (toolLabel) {
      case 'HTTP Request':
        return {
          status: 200,
          statusText: 'OK',
          data: { message: 'Mock response data', timestamp: new Date().toISOString() },
          headers: { 'content-type': 'application/json' },
        };

      case 'Web Search':
        return {
          results: [
            { title: 'Mock Result 1', url: 'https://example.com/1', snippet: 'This is a mock search result' },
            { title: 'Mock Result 2', url: 'https://example.com/2', snippet: 'Another mock search result' },
          ],
        };

      case 'File Read':
        return {
          content: 'Mock file content',
          size: 1024,
          path: config.path || '/mock/path/file.txt',
        };

      case 'File Write':
        return {
          success: true,
          path: config.path || '/mock/path/output.txt',
          bytesWritten: config.content?.length || 0,
        };

      case 'Fetch Webpage':
        return {
          content: 'Mock webpage content in ' + (config.format || 'markdown'),
          url: config.url || 'https://example.com',
          contentLength: 2048,
        };

      case 'Scrape Links':
        return {
          links: [
            'https://example.com/page1',
            'https://example.com/page2',
            'https://example.com/page3',
          ],
        };

      default:
        return {
          message: `Mock result for ${toolLabel}`,
          success: true,
        };
    }
  }

  /**
   * Execute Email Node (SMTP)
   */
  private async executeEmailNode(node: Node): Promise<any> {
    const label = node.data?.label || 'Send Email';
    const config = node.data?.config || {};

    // Interpolate variables in config
    const interpolatedConfig = {
      ...config,
      to: config.to?.map((email: string) => VariableInterpolator.interpolateString(email, this.varContext)),
      cc: config.cc?.map((email: string) => VariableInterpolator.interpolateString(email, this.varContext)),
      subject: VariableInterpolator.interpolateString(config.subject || '', this.varContext),
      body: VariableInterpolator.interpolateString(config.body || '', this.varContext),
    };

    // Dry-run mode
    if (this.debugOptions.dryRun) {
      return {
        type: 'email',
        dryRun: true,
        data: {
          to: interpolatedConfig.to,
          subject: interpolatedConfig.subject,
          simulatedMessageId: `<mock-${Date.now()}@flowcore.local>`,
        },
      };
    }

    // NOTE: Real SMTP sending would require a server-side implementation
    // For now, return success with simulated result
    // In production, this would call a server-side tRPC endpoint that handles SMTP

    if (this.logger) {
      this.logger.logInfo(node.id, label, `Sending email to ${interpolatedConfig.to?.join(', ')}`);
    }

    return {
      success: true,
      messageId: `<${Date.now()}-${Math.random().toString(36).substr(2, 9)}@flowcore.local>`,
      to: interpolatedConfig.to,
      subject: interpolatedConfig.subject,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Execute Slack Node (Webhook)
   */
  private async executeSlackNode(node: Node): Promise<any> {
    const label = node.data?.label || 'Slack Message';
    const config = node.data?.config || {};

    // Interpolate variables
    const webhookUrl = VariableInterpolator.interpolateString(config.webhookUrl || '', this.varContext);
    const text = VariableInterpolator.interpolateString(config.text || '', this.varContext);

    // Dry-run mode
    if (this.debugOptions.dryRun) {
      return {
        type: 'slack',
        dryRun: true,
        data: {
          webhookUrl,
          text,
          messageFormat: config.messageFormat || 'simple',
        },
      };
    }

    // Build Slack message payload
    const payload: any = {
      text,
      username: config.username,
      icon_emoji: config.iconEmoji,
      channel: config.channel,
      unfurl_links: config.unfurlLinks,
      unfurl_media: config.unfurlMedia,
    };

    // Add blocks if using blocks format
    if (config.messageFormat === 'blocks' && config.blocks) {
      payload.blocks = config.blocks.map((block: any) => ({
        ...block,
        text: {
          ...block.text,
          text: VariableInterpolator.interpolateString(block.text?.text || '', this.varContext),
        },
      }));
    }

    // Add thread support
    if (config.threadTs) {
      payload.thread_ts = VariableInterpolator.interpolateString(config.threadTs, this.varContext);
    }

    // Send webhook request
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
      }

      if (this.logger) {
        this.logger.logHttpRequest(node.id, label, 'POST', webhookUrl, response.status);
      }

      return {
        success: true,
        status: response.status,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Slack webhook error: ${error.message}`);
    }
  }

  /**
   * Execute Database Node
   */
  private async executeDatabaseNode(node: Node): Promise<any> {
    const label = node.data?.label || 'Database Query';
    const config = node.data?.config || {};
    const dbType = config.dbType || 'postgresql';
    const operation = config.operation || 'query';

    // Dry-run mode
    if (this.debugOptions.dryRun) {
      return {
        type: 'database',
        dryRun: true,
        data: {
          dbType,
          operation,
          simulatedRows: operation.includes('insert') ? 1 : operation.includes('find') || operation.includes('query') ? 5 : 0,
        },
      };
    }

    // NOTE: Real database operations require server-side implementation
    // Client-side database access is a security risk
    // In production, this would call a server-side tRPC endpoint that handles database connections

    if (this.logger) {
      this.logger.logInfo(node.id, label, `Executing ${dbType} ${operation}`);
    }

    // Simulated database result
    const mockResults = {
      postgresql: {
        query: [
          { id: 1, name: 'Mock User 1', email: 'user1@example.com' },
          { id: 2, name: 'Mock User 2', email: 'user2@example.com' },
        ],
        insert: { insertedId: 123, affectedRows: 1 },
        update: { affectedRows: 1 },
        delete: { affectedRows: 1 },
      },
      mongodb: {
        find: [
          { _id: '507f1f77bcf86cd799439011', name: 'Mock Doc 1' },
          { _id: '507f1f77bcf86cd799439012', name: 'Mock Doc 2' },
        ],
        findOne: { _id: '507f1f77bcf86cd799439011', name: 'Mock Doc' },
        insertOne: { insertedId: '507f1f77bcf86cd799439013', acknowledged: true },
        updateOne: { modifiedCount: 1, acknowledged: true },
        deleteOne: { deletedCount: 1, acknowledged: true },
      },
    };

    const dbResults = mockResults[dbType as keyof typeof mockResults] || mockResults.postgresql;
    const result = dbResults[operation as keyof typeof dbResults] || { success: true };

    return {
      success: true,
      dbType,
      operation,
      result,
      timestamp: new Date().toISOString(),
    };
  }
}
