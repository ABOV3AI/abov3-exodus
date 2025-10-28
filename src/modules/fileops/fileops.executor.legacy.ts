/**
 * File Operations Executor
 * Executes file operation tool calls using the browser's File System Access API
 */

interface FileListEntry {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
}

/**
 * Navigate to a file/directory within a directory handle using a relative path
 */
async function getHandleFromPath(
  rootHandle: FileSystemDirectoryHandle,
  relativePath: string,
  options?: { create?: boolean; type?: 'file' | 'directory' }
): Promise<FileSystemHandle> {
  // Normalize path
  const normalizedPath = relativePath.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '');

  if (!normalizedPath || normalizedPath === '.') {
    return rootHandle;
  }

  const parts = normalizedPath.split('/').filter(Boolean);

  let currentHandle: FileSystemHandle = rootHandle;

  // Navigate through directories
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLast = i === parts.length - 1;

    if (currentHandle.kind !== 'directory') {
      throw new Error(`Cannot navigate through file: ${parts.slice(0, i).join('/')}`);
    }

    const dirHandle = currentHandle as FileSystemDirectoryHandle;

    if (isLast && options?.create) {
      // Last part - create if needed
      if (options.type === 'file') {
        currentHandle = await dirHandle.getFileHandle(part, { create: true });
      } else {
        currentHandle = await dirHandle.getDirectoryHandle(part, { create: true });
      }
    } else {
      // Intermediate directory or final lookup
      try {
        currentHandle = await dirHandle.getDirectoryHandle(part);
      } catch (error) {
        if (isLast && options?.type === 'file') {
          // Try as file for last part
          try {
            currentHandle = await dirHandle.getFileHandle(part, { create: options.create });
          } catch {
            throw new Error(`Path not found: ${relativePath}`);
          }
        } else {
          throw new Error(`Directory not found: ${parts.slice(0, i + 1).join('/')}`);
        }
      }
    }
  }

  return currentHandle;
}

/**
 * Recursively list files in a directory
 */
async function listFilesRecursive(
  dirHandle: FileSystemDirectoryHandle,
  basePath: string = '',
  results: FileListEntry[] = []
): Promise<FileListEntry[]> {
  for await (const [name, handle] of dirHandle.entries()) {
    const entryPath = basePath ? `${basePath}/${name}` : name;

    if (handle.kind === 'file') {
      const fileHandle = handle as FileSystemFileHandle;
      const file = await fileHandle.getFile();
      results.push({
        name,
        type: 'file',
        path: entryPath,
        size: file.size,
      });
    } else {
      results.push({
        name,
        type: 'directory',
        path: entryPath,
      });
      await listFilesRecursive(handle as FileSystemDirectoryHandle, entryPath, results);
    }
  }

  return results;
}

/**
 * Execute a file operation tool call
 */
export async function executeFileOperation(
  toolName: string,
  argsJson: string,
  projectHandle: FileSystemDirectoryHandle
): Promise<{ result: string; error?: string }> {
  try {
    const args = JSON.parse(argsJson);

    switch (toolName) {
      case 'read_file': {
        const fileHandle = await getHandleFromPath(projectHandle, args.path, { type: 'file' });
        if (fileHandle.kind !== 'file') {
          return { result: '', error: `Not a file: ${args.path}` };
        }
        const file = await (fileHandle as FileSystemFileHandle).getFile();
        const content = await file.text();
        return { result: content };
      }

      case 'write_file': {
        // Create parent directories if needed
        const pathParts = args.path.split('/').filter(Boolean);
        const fileName = pathParts.pop()!;
        const dirPath = pathParts.join('/');

        let targetDir = projectHandle;
        if (dirPath) {
          const dirHandle = await getHandleFromPath(projectHandle, dirPath, {
            create: true,
            type: 'directory',
          });
          if (dirHandle.kind !== 'directory') {
            return { result: '', error: `Parent path is not a directory: ${dirPath}` };
          }
          targetDir = dirHandle as FileSystemDirectoryHandle;
        }

        const fileHandle = await targetDir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(args.content);
        await writable.close();

        return {
          result: `Successfully wrote ${args.content.length} bytes to ${args.path}`,
        };
      }

      case 'list_files': {
        const dirHandle = await getHandleFromPath(projectHandle, args.path || '.', {
          type: 'directory',
        });
        if (dirHandle.kind !== 'directory') {
          return { result: '', error: `Not a directory: ${args.path}` };
        }

        const entries: FileListEntry[] = [];

        if (args.recursive) {
          await listFilesRecursive(dirHandle as FileSystemDirectoryHandle, '', entries);
        } else {
          // Non-recursive listing
          for await (const [name, handle] of (dirHandle as FileSystemDirectoryHandle).entries()) {
            if (handle.kind === 'file') {
              const file = await (handle as FileSystemFileHandle).getFile();
              entries.push({
                name,
                type: 'file',
                path: name,
                size: file.size,
              });
            } else {
              entries.push({
                name,
                type: 'directory',
                path: name,
              });
            }
          }
        }

        // Format as readable text
        const result = entries
          .map((entry) => {
            const typeIcon = entry.type === 'directory' ? '📁' : '📄';
            const sizeStr = entry.size !== undefined ? ` (${formatBytes(entry.size)})` : '';
            return `${typeIcon} ${entry.path}${sizeStr}`;
          })
          .join('\n');

        return {
          result: result || '(empty directory)',
        };
      }

      case 'create_directory': {
        await getHandleFromPath(projectHandle, args.path, {
          create: true,
          type: 'directory',
        });
        return {
          result: `Successfully created directory: ${args.path}`,
        };
      }

      default:
        return {
          result: '',
          error: `Unknown file operation: ${toolName}`,
        };
    }
  } catch (error: any) {
    return {
      result: '',
      error: `File operation failed: ${error.message || error.toString()}`,
    };
  }
}

/**
 * Format bytes as human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
