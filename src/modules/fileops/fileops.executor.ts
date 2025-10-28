/**
 * File operations executor - integrates with tools registry
 */

import type { ToolDefinition, ToolExecutor } from '../tools/tools.types';
import { FILE_OPERATIONS_TOOLS } from './fileops.tools';
import { executeFileOperation } from './fileops.executor.legacy';


/**
 * Generic file operation executor
 */
const createFileOpExecutor = (toolName: string): ToolExecutor => {
  return async (args, context) => {
    if (!context.projectHandle) {
      return {
        error: 'No active project. Please select a project directory first.',
      };
    }

    try {
      const argsJson = JSON.stringify(args);
      const result = await executeFileOperation(toolName, argsJson, context.projectHandle);
      return result;
    } catch (error: any) {
      return {
        error: `File operation failed: ${error.message}`,
      };
    }
  };
};


/**
 * File operation tools for registry
 */
export const FILE_OPERATION_TOOLS: ToolDefinition[] = [
  {
    id: 'read_file',
    category: 'file-ops',
    name: 'Read File',
    description: 'Read the complete content of a file from the active project',
    aixDefinition: FILE_OPERATIONS_TOOLS[0],
    executor: createFileOpExecutor('read_file'),
    requiresProject: true,
    browserAPIs: ['FileSystem'],
  },
  {
    id: 'write_file',
    category: 'file-ops',
    name: 'Write File',
    description: 'Write or update a file in the active project',
    aixDefinition: FILE_OPERATIONS_TOOLS[1],
    executor: createFileOpExecutor('write_file'),
    requiresProject: true,
    browserAPIs: ['FileSystem'],
  },
  {
    id: 'list_files',
    category: 'file-ops',
    name: 'List Files',
    description: 'List files and directories in the active project',
    aixDefinition: FILE_OPERATIONS_TOOLS[2],
    executor: createFileOpExecutor('list_files'),
    requiresProject: true,
    browserAPIs: ['FileSystem'],
  },
  {
    id: 'create_directory',
    category: 'file-ops',
    name: 'Create Directory',
    description: 'Create a new directory in the active project',
    aixDefinition: FILE_OPERATIONS_TOOLS[3],
    executor: createFileOpExecutor('create_directory'),
    requiresProject: true,
    browserAPIs: ['FileSystem'],
  },
];
