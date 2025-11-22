/**
 * Execution Logger for FlowCore
 * Tracks detailed execution logs for debugging and analysis
 */

export interface ExecutionLogEntry {
  id: string;
  timestamp: Date;
  nodeId: string;
  nodeLabel: string;
  type: 'start' | 'success' | 'error' | 'retry' | 'skip' | 'info';
  message: string;
  data?: any;
  duration?: number;
  metadata?: {
    attemptNumber?: number;
    httpStatus?: number;
    tokenUsage?: { input: number; output: number };
    errorStack?: string;
  };
}

export interface ExecutionLog {
  executionId: string;
  workflowId: string;
  startTime: Date;
  endTime?: Date;
  entries: ExecutionLogEntry[];
  summary: {
    totalNodes: number;
    successfulNodes: number;
    failedNodes: number;
    totalDuration: number;
    totalTokens?: number;
  };
}

export class ExecutionLogger {
  private entries: ExecutionLogEntry[] = [];
  private executionId: string;
  private workflowId: string;
  private startTime: Date;

  constructor(executionId: string, workflowId: string) {
    this.executionId = executionId;
    this.workflowId = workflowId;
    this.startTime = new Date();
  }

  /**
   * Log node execution start
   */
  logNodeStart(nodeId: string, nodeLabel: string, data?: any) {
    this.addEntry({
      nodeId,
      nodeLabel,
      type: 'start',
      message: `Starting execution of ${nodeLabel}`,
      data,
    });
  }

  /**
   * Log node execution success
   */
  logNodeSuccess(nodeId: string, nodeLabel: string, result: any, duration: number) {
    this.addEntry({
      nodeId,
      nodeLabel,
      type: 'success',
      message: `Successfully executed ${nodeLabel}`,
      data: result,
      duration,
    });
  }

  /**
   * Log node execution error
   */
  logNodeError(nodeId: string, nodeLabel: string, error: Error, attemptNumber?: number) {
    this.addEntry({
      nodeId,
      nodeLabel,
      type: 'error',
      message: `Error in ${nodeLabel}: ${error.message}`,
      data: { error: error.message },
      metadata: {
        attemptNumber,
        errorStack: error.stack,
      },
    });
  }

  /**
   * Log node retry
   */
  logNodeRetry(nodeId: string, nodeLabel: string, attemptNumber: number, delay: number) {
    this.addEntry({
      nodeId,
      nodeLabel,
      type: 'retry',
      message: `Retrying ${nodeLabel} (attempt ${attemptNumber}) after ${delay}ms`,
      metadata: { attemptNumber },
    });
  }

  /**
   * Log node skip (e.g., conditional branch not taken)
   */
  logNodeSkip(nodeId: string, nodeLabel: string, reason: string) {
    this.addEntry({
      nodeId,
      nodeLabel,
      type: 'skip',
      message: `Skipped ${nodeLabel}: ${reason}`,
    });
  }

  /**
   * Log general info
   */
  logInfo(nodeId: string, nodeLabel: string, message: string, data?: any) {
    this.addEntry({
      nodeId,
      nodeLabel,
      type: 'info',
      message,
      data,
    });
  }

  /**
   * Log HTTP request details
   */
  logHttpRequest(nodeId: string, nodeLabel: string, method: string, url: string, status: number, duration: number) {
    this.addEntry({
      nodeId,
      nodeLabel,
      type: 'info',
      message: `HTTP ${method} ${url} → ${status}`,
      duration,
      metadata: { httpStatus: status },
    });
  }

  /**
   * Log AI token usage
   */
  logTokenUsage(nodeId: string, nodeLabel: string, tokenUsage: { input: number; output: number }) {
    this.addEntry({
      nodeId,
      nodeLabel,
      type: 'info',
      message: `Token usage: ${tokenUsage.input} input, ${tokenUsage.output} output`,
      metadata: { tokenUsage },
    });
  }

  /**
   * Add entry to log
   */
  private addEntry(entry: Omit<ExecutionLogEntry, 'id' | 'timestamp'>) {
    const logEntry: ExecutionLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...entry,
    };

    this.entries.push(logEntry);
  }

  /**
   * Get all log entries
   */
  getEntries(): ExecutionLogEntry[] {
    return [...this.entries];
  }

  /**
   * Get log entries for a specific node
   */
  getNodeEntries(nodeId: string): ExecutionLogEntry[] {
    return this.entries.filter(e => e.nodeId === nodeId);
  }

  /**
   * Get execution summary
   */
  getSummary(): ExecutionLog['summary'] {
    const uniqueNodes = new Set(this.entries.map(e => e.nodeId));
    const successNodes = new Set(
      this.entries.filter(e => e.type === 'success').map(e => e.nodeId)
    );
    const failedNodes = new Set(
      this.entries.filter(e => e.type === 'error').map(e => e.nodeId)
    );

    const totalDuration = this.entries
      .filter(e => e.duration)
      .reduce((sum, e) => sum + (e.duration || 0), 0);

    const totalTokens = this.entries
      .filter(e => e.metadata?.tokenUsage)
      .reduce((sum, e) => {
        const usage = e.metadata!.tokenUsage!;
        return sum + usage.input + usage.output;
      }, 0);

    return {
      totalNodes: uniqueNodes.size,
      successfulNodes: successNodes.size,
      failedNodes: failedNodes.size,
      totalDuration,
      totalTokens: totalTokens > 0 ? totalTokens : undefined,
    };
  }

  /**
   * Export full execution log
   */
  export(): ExecutionLog {
    return {
      executionId: this.executionId,
      workflowId: this.workflowId,
      startTime: this.startTime,
      endTime: new Date(),
      entries: this.getEntries(),
      summary: this.getSummary(),
    };
  }

  /**
   * Export as JSON string
   */
  exportJSON(): string {
    return JSON.stringify(this.export(), null, 2);
  }

  /**
   * Clear all entries
   */
  clear() {
    this.entries = [];
  }
}
