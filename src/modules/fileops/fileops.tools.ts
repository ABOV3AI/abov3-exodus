import type { AixTools_ToolDefinition } from '../aix/server/api/aix.wiretypes';


/**
 * File Operations Tool Definitions for AIX
 * These tools allow AI models to read, write, and list files in the active project directory
 */

export const FILE_OPERATIONS_TOOLS: AixTools_ToolDefinition[] = [
  {
    type: 'function_call',
    function_call: {
      name: 'read_file',
      description: 'Reads the complete content of a file from the active project directory. Use this to examine source code, configuration files, documentation, or any text-based files. The path must be relative to the project root. Returns the full file content as a string. If the file does not exist or cannot be read, returns an error message.',
      input_schema: {
        properties: {
          path: {
            type: 'string',
            description: 'Relative path from project root (e.g., "src/app.ts", "README.md", "config/settings.json")',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function_call',
    function_call: {
      name: 'write_file',
      description: 'Writes or updates a file in the active project directory. Creates the file if it doesn\'t exist, or overwrites it if it does. Creates any necessary parent directories. Use this to create new files, update existing code, save generated content, or modify configuration. The path must be relative to the project root. Returns confirmation message with bytes written, or error message if operation fails.',
      input_schema: {
        properties: {
          path: {
            type: 'string',
            description: 'Relative path from project root where file should be written (e.g., "src/components/Button.tsx")',
          },
          content: {
            type: 'string',
            description: 'Complete content to write to the file. Will replace existing content if file exists.',
          },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function_call',
    function_call: {
      name: 'list_files',
      description: 'Lists files and directories in a specified directory within the active project. Use this to explore the project structure, discover available files, or check if files exist before reading/writing. Returns a structured list of entries with names, types (file/directory), and sizes. If recursive is true, lists all files in subdirectories as well.',
      input_schema: {
        properties: {
          path: {
            type: 'string',
            description: 'Relative directory path from project root (e.g., "src", "src/components"). Use empty string or "." for project root.',
          },
          recursive: {
            type: 'boolean',
            description: 'If true, recursively lists all files in subdirectories. If false (default), only lists direct children.',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function_call',
    function_call: {
      name: 'create_directory',
      description: 'Creates a new directory in the active project. Creates all necessary parent directories if they don\'t exist. Use this to organize project structure before creating files. Returns confirmation message or error if operation fails.',
      input_schema: {
        properties: {
          path: {
            type: 'string',
            description: 'Relative path of directory to create (e.g., "src/utils", "tests/integration")',
          },
        },
        required: ['path'],
      },
    },
  },
];
