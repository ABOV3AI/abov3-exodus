/**
 * Variable Interpolation System for FlowCore
 *
 * Supports:
 * - Simple variables: {{variableName}}
 * - Nested object access: {{node.result.data.items[0].name}}
 * - Context variables: {{trigger.payload}}, {{nodes.nodeId.result}}
 * - Array access: {{array[0]}}, {{array[1].property}}
 */

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  trigger?: {
    type: string;
    payload?: any;
    timestamp: Date;
  };
  nodes: Record<string, NodeExecutionResult>;
  variables: Record<string, any>;
  input?: Record<string, any>;
}

export interface NodeExecutionResult {
  nodeId: string;
  status: 'success' | 'error' | 'skipped';
  result?: any;
  error?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

/**
 * Interpolates variables in a string or object using the execution context
 */
export class VariableInterpolator {
  /**
   * Interpolate variables in a string
   * Example: "Hello {{user.name}}" with context.variables.user.name = "John" -> "Hello John"
   */
  static interpolateString(template: string, context: ExecutionContext): string {
    if (!template || typeof template !== 'string') {
      return template;
    }

    // Match {{variable.path}} patterns
    const regex = /\{\{([^}]+)\}\}/g;

    return template.replace(regex, (match, path) => {
      try {
        const value = this.resolvePath(path.trim(), context);
        return this.formatValue(value);
      } catch (error) {
        console.warn(`Failed to resolve variable: ${path}`, error);
        return match; // Keep original if resolution fails
      }
    });
  }

  /**
   * Interpolate variables in an object (recursively)
   */
  static interpolateObject(obj: any, context: ExecutionContext): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.interpolateString(obj, context);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.interpolateObject(item, context));
    }

    if (typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateObject(value, context);
      }
      return result;
    }

    return obj;
  }

  /**
   * Resolve a path like "nodes.nodeId.result.data[0].name"
   */
  private static resolvePath(path: string, context: ExecutionContext): any {
    // Split path by dots, but preserve array indices
    const parts = path.split(/\.(?![^\[]*\])/);

    let current: any = context;

    for (const part of parts) {
      // Handle array access: items[0] or items[0].name
      const arrayMatch = part.match(/^([^[]+)(\[(\d+)\])(.*)$/);

      if (arrayMatch) {
        const [, prop, , index, rest] = arrayMatch;

        // Get the array
        current = current?.[prop];
        if (!current) {
          throw new Error(`Property '${prop}' not found`);
        }

        // Access array element
        current = current[parseInt(index, 10)];
        if (!current && current !== 0) {
          throw new Error(`Array index ${index} not found`);
        }

        // Handle remaining path after array access
        if (rest) {
          const restPath = rest.startsWith('.') ? rest.slice(1) : rest;
          if (restPath) {
            current = this.resolvePath(restPath, { ...context, variables: current } as any);
          }
        }
      } else {
        // Simple property access
        current = current?.[part];
        if (current === undefined) {
          throw new Error(`Property '${part}' not found in path '${path}'`);
        }
      }
    }

    return current;
  }

  /**
   * Format a value for string interpolation
   */
  private static formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Validate that all variables in a template can be resolved
   * Returns array of missing variable paths
   */
  static validateTemplate(template: string, context: ExecutionContext): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const missing: string[] = [];

    let match;
    while ((match = regex.exec(template)) !== null) {
      const path = match[1].trim();
      try {
        this.resolvePath(path, context);
      } catch (error) {
        missing.push(path);
      }
    }

    return missing;
  }

  /**
   * Get all variable paths used in a template
   */
  static extractVariables(template: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];

    let match;
    while ((match = regex.exec(template)) !== null) {
      variables.push(match[1].trim());
    }

    return variables;
  }

  /**
   * Get all available variable paths from context
   */
  static getAvailableVariables(context: ExecutionContext): string[] {
    const variables: string[] = [];

    // Trigger variables
    if (context.trigger) {
      variables.push('trigger.type');
      variables.push('trigger.timestamp');
      if (context.trigger.payload) {
        this.addObjectPaths('trigger.payload', context.trigger.payload, variables);
      }
    }

    // Node results
    for (const [nodeId, result] of Object.entries(context.nodes)) {
      variables.push(`nodes.${nodeId}.status`);
      variables.push(`nodes.${nodeId}.nodeId`);
      if (result.result !== undefined) {
        this.addObjectPaths(`nodes.${nodeId}.result`, result.result, variables);
      }
      if (result.error) {
        variables.push(`nodes.${nodeId}.error`);
      }
    }

    // Custom variables
    for (const [key, value] of Object.entries(context.variables)) {
      this.addObjectPaths(`variables.${key}`, value, variables);
    }

    // Input variables
    if (context.input) {
      for (const [key, value] of Object.entries(context.input)) {
        this.addObjectPaths(`input.${key}`, value, variables);
      }
    }

    return variables;
  }

  /**
   * Recursively add object paths to the variables list
   */
  private static addObjectPaths(prefix: string, obj: any, variables: string[], depth = 0, maxDepth = 3) {
    if (depth > maxDepth) {
      return; // Prevent infinite recursion
    }

    variables.push(prefix);

    if (obj === null || obj === undefined) {
      return;
    }

    if (Array.isArray(obj)) {
      // Add first few array indices as examples
      for (let i = 0; i < Math.min(3, obj.length); i++) {
        this.addObjectPaths(`${prefix}[${i}]`, obj[i], variables, depth + 1, maxDepth);
      }
    } else if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        this.addObjectPaths(`${prefix}.${key}`, value, variables, depth + 1, maxDepth);
      }
    }
  }
}
