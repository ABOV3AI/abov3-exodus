/**
 * UI-driven file operations using FileSystem Access API
 * Supports delete, rename, and edit operations for the project file browser
 */

export interface FileOperationResult {
  success: boolean;
  error?: string;
}

/**
 * Delete a file or directory
 * @param dirHandle Parent directory handle
 * @param name File or directory name to delete
 * @param recursive If true, recursively delete directory contents
 */
export async function deleteFileOrDirectory(
  dirHandle: FileSystemDirectoryHandle,
  name: string,
  recursive: boolean = false
): Promise<FileOperationResult> {
  try {
    await dirHandle.removeEntry(name, { recursive });
    return { success: true };
  } catch (error) {
    console.error('[FileOps] Delete failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete',
    };
  }
}

/**
 * Rename a file (copy + delete pattern since FileSystem API has no native rename)
 * @param parentHandle Parent directory handle
 * @param oldName Current file name
 * @param newName New file name
 */
export async function renameFile(
  parentHandle: FileSystemDirectoryHandle,
  oldName: string,
  newName: string
): Promise<FileOperationResult> {
  try {
    // Check if new name already exists
    try {
      await parentHandle.getFileHandle(newName);
      return {
        success: false,
        error: `File "${newName}" already exists`,
      };
    } catch {
      // Good - file doesn't exist
    }

    // Get old file
    const oldHandle = await parentHandle.getFileHandle(oldName);
    const oldFile = await oldHandle.getFile();

    // Create new file
    const newHandle = await parentHandle.getFileHandle(newName, { create: true });
    const writable = await newHandle.createWritable();

    // Copy content
    await writable.write(await oldFile.arrayBuffer());
    await writable.close();

    // Delete old file
    await parentHandle.removeEntry(oldName);

    return { success: true };
  } catch (error) {
    console.error('[FileOps] Rename file failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rename file',
    };
  }
}

/**
 * Rename a directory (copy + delete pattern)
 * @param parentHandle Parent directory handle
 * @param oldName Current directory name
 * @param newName New directory name
 */
export async function renameDirectory(
  parentHandle: FileSystemDirectoryHandle,
  oldName: string,
  newName: string
): Promise<FileOperationResult> {
  try {
    // Check if new name already exists
    try {
      await parentHandle.getDirectoryHandle(newName);
      return {
        success: false,
        error: `Directory "${newName}" already exists`,
      };
    } catch {
      // Good - directory doesn't exist
    }

    // Get old directory
    const oldHandle = await parentHandle.getDirectoryHandle(oldName);

    // Create new directory
    const newHandle = await parentHandle.getDirectoryHandle(newName, { create: true });

    // Copy contents recursively
    await copyDirectoryContents(oldHandle, newHandle);

    // Delete old directory
    await parentHandle.removeEntry(oldName, { recursive: true });

    return { success: true };
  } catch (error) {
    console.error('[FileOps] Rename directory failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rename directory',
    };
  }
}

/**
 * Recursively copy directory contents
 */
async function copyDirectoryContents(
  sourceDir: FileSystemDirectoryHandle,
  targetDir: FileSystemDirectoryHandle
): Promise<void> {
  for await (const [name, handle] of sourceDir.entries()) {
    if (handle.kind === 'file') {
      // Copy file
      const sourceFile = await (handle as FileSystemFileHandle).getFile();
      const targetFile = await targetDir.getFileHandle(name, { create: true });
      const writable = await targetFile.createWritable();
      await writable.write(await sourceFile.arrayBuffer());
      await writable.close();
    } else if (handle.kind === 'directory') {
      // Copy directory recursively
      const sourceSubdir = handle as FileSystemDirectoryHandle;
      const targetSubdir = await targetDir.getDirectoryHandle(name, { create: true });
      await copyDirectoryContents(sourceSubdir, targetSubdir);
    }
  }
}

/**
 * Write content to a file
 * @param fileHandle File handle to write to
 * @param content Content to write
 */
export async function writeFile(
  fileHandle: FileSystemFileHandle,
  content: string
): Promise<FileOperationResult> {
  try {
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    return { success: true };
  } catch (error) {
    console.error('[FileOps] Write file failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to write file',
    };
  }
}

/**
 * Create a new file
 * @param dirHandle Parent directory handle
 * @param fileName New file name
 * @param content Initial content (default empty)
 */
export async function createFile(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
  content: string = ''
): Promise<FileOperationResult> {
  try {
    // Check if file already exists
    try {
      await dirHandle.getFileHandle(fileName);
      return {
        success: false,
        error: `File "${fileName}" already exists`,
      };
    } catch {
      // Good - file doesn't exist
    }

    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();

    return { success: true };
  } catch (error) {
    console.error('[FileOps] Create file failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create file',
    };
  }
}

/**
 * Create a new directory
 * @param parentHandle Parent directory handle
 * @param dirName New directory name
 */
export async function createDirectory(
  parentHandle: FileSystemDirectoryHandle,
  dirName: string
): Promise<FileOperationResult> {
  try {
    // Check if directory already exists
    try {
      await parentHandle.getDirectoryHandle(dirName);
      return {
        success: false,
        error: `Directory "${dirName}" already exists`,
      };
    } catch {
      // Good - directory doesn't exist
    }

    await parentHandle.getDirectoryHandle(dirName, { create: true });
    return { success: true };
  } catch (error) {
    console.error('[FileOps] Create directory failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create directory',
    };
  }
}

/**
 * Validate file/directory name
 * @param name File or directory name
 * @returns True if valid, error message if invalid
 */
export function validateFileName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Name cannot be empty' };
  }

  // Check for invalid characters (platform-specific, but these are common)
  const invalidChars = /[<>:"/\\|?*\x00-\x1F]/;
  if (invalidChars.test(name)) {
    return {
      valid: false,
      error: 'Name contains invalid characters: < > : " / \\ | ? *',
    };
  }

  // Check for reserved names (Windows)
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
  if (reservedNames.test(name)) {
    return { valid: false, error: 'Name is reserved by the system' };
  }

  // Check length (255 is common max for most filesystems)
  if (name.length > 255) {
    return { valid: false, error: 'Name is too long (max 255 characters)' };
  }

  return { valid: true };
}
