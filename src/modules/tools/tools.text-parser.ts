/**
 * Text-based tool invocation parser for ABOV3 Exodus
 *
 * Parses tool invocations from Claude's text response when using OAuth
 * (since Claude Code OAuth doesn't support structured tool calls).
 *
 * Supports two formats:
 * 1. Code block: ```tool:tool_name\n{...json args...}\n```
 * 2. XML tag: <tool name="tool_name">{...json args...}</tool>
 */

import { getTool } from './tools.registry';


export interface TextToolInvocation {
  name: string;
  args: Record<string, unknown>;
  rawBlock: string;
  startIndex: number;
  endIndex: number;
}


/**
 * Parse tool invocations from text response
 * Returns all valid tool blocks found in the text
 */
export function parseToolInvocationsFromText(text: string): TextToolInvocation[] {
  const invocations: TextToolInvocation[] = [];

  // Pattern 1: ```tool:name\n{...json...}\n```
  // Matches: ```tool:read_file\n{"path": "foo.ts"}\n```
  const codeBlockPattern = /```tool:(\w+)\s*\n([\s\S]*?)```/g;

  let match: RegExpExecArray | null;

  while ((match = codeBlockPattern.exec(text)) !== null) {
    const toolName = match[1];
    const argsStr = match[2].trim();

    try {
      const args = JSON.parse(argsStr);

      // Validate tool exists
      const tool = getTool(toolName);
      if (!tool) {
        console.warn(`[TextToolParser] Unknown tool: ${toolName}`);
        continue;
      }

      invocations.push({
        name: toolName,
        args,
        rawBlock: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    } catch (e) {
      console.warn(`[TextToolParser] Failed to parse args for ${toolName}:`, e);
    }
  }

  // Pattern 2: <tool name="...">...</tool>
  const xmlPattern = /<tool\s+name="(\w+)">\s*([\s\S]*?)<\/tool>/g;

  while ((match = xmlPattern.exec(text)) !== null) {
    const toolName = match[1];
    const argsStr = match[2].trim();

    try {
      const args = JSON.parse(argsStr);

      // Validate tool exists
      const tool = getTool(toolName);
      if (!tool) {
        console.warn(`[TextToolParser] Unknown tool: ${toolName}`);
        continue;
      }

      // Check for duplicate (same position)
      const isDuplicate = invocations.some(
        inv => inv.startIndex === match!.index && inv.name === toolName
      );

      if (!isDuplicate) {
        invocations.push({
          name: toolName,
          args,
          rawBlock: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    } catch (e) {
      console.warn(`[TextToolParser] Failed to parse XML args for ${toolName}:`, e);
    }
  }

  // Sort by position in text
  invocations.sort((a, b) => a.startIndex - b.startIndex);

  return invocations;
}


/**
 * Remove parsed tool blocks from text
 * Returns clean text without the tool invocation blocks
 */
export function removeToolBlocksFromText(
  text: string,
  invocations: TextToolInvocation[]
): string {
  if (invocations.length === 0) return text;

  // Sort by start index descending (remove from end first to preserve indices)
  const sorted = [...invocations].sort((a, b) => b.startIndex - a.startIndex);

  let result = text;
  for (const inv of sorted) {
    result = result.slice(0, inv.startIndex) + result.slice(inv.endIndex);
  }

  // Clean up any double newlines left behind
  result = result.replace(/\n{3,}/g, '\n\n').trim();

  return result;
}


/**
 * Check if text contains any tool invocations
 * Quick check without full parsing
 */
export function hasToolInvocations(text: string): boolean {
  return /```tool:\w+/.test(text) || /<tool\s+name="\w+"/.test(text);
}


/**
 * Get the available tools formatted as instructions for the system prompt
 */
export function getToolInstructionsForPrompt(): string {
  return `## Local Tool Access

You have access to local file operations in the user's selected project directory. To use them, output a tool block in this exact format:

\`\`\`tool:read_file
{"path": "relative/path/to/file.ts"}
\`\`\`

\`\`\`tool:write_file
{"path": "relative/path/to/file.ts", "content": "file contents here"}
\`\`\`

\`\`\`tool:list_files
{"path": ".", "recursive": false}
\`\`\`

\`\`\`tool:create_directory
{"path": "new/directory/path"}
\`\`\`

After outputting a tool block, STOP and wait for the result. The system will execute the tool and provide the output in the next message. Then continue your response based on the result.

Important rules:
- Output ONE tool block at a time, then stop immediately
- Wait for tool results before continuing
- All paths are relative to the user's project directory
- Do not assume file contents - always read first if you need to modify`;
}
