/**
 * Binary File Writer
 * Writes binary document files (PPTX, DOCX, PDF) to project directory
 * Uses File System Access API for direct file system writes
 */

/**
 * Write a binary file (Blob) to the project directory
 * @param relativePath - Path relative to project root (e.g., "output/report.pdf")
 * @param blob - Binary data to write
 * @param projectHandle - FileSystemDirectoryHandle for the project root
 */
export async function writeBinaryFile(
  relativePath: string,
  blob: Blob,
  projectHandle: FileSystemDirectoryHandle | undefined
): Promise<void> {
  if (!projectHandle) {
    throw new Error('No project directory selected. Please select a project folder first.');
  }

  // Normalize path separators and split
  const normalizedPath = relativePath.replace(/\\/g, '/');
  const pathParts = normalizedPath.split('/').filter(Boolean);
  const fileName = pathParts.pop();

  if (!fileName) {
    throw new Error('Invalid file path: no filename specified');
  }

  // Validate filename
  if (fileName.length > 255) {
    throw new Error('Filename too long (max 255 characters)');
  }

  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  if (invalidChars.test(fileName)) {
    throw new Error('Filename contains invalid characters');
  }

  // Navigate to parent directory, creating directories as needed
  let currentDir = projectHandle;

  for (const part of pathParts) {
    if (part === '.' || part === '..') {
      throw new Error('Invalid path: relative path components (./ or ../) not allowed');
    }

    try {
      currentDir = await currentDir.getDirectoryHandle(part, { create: true });
    } catch (error: any) {
      throw new Error(`Failed to create directory "${part}": ${error.message}`);
    }
  }

  // Create or overwrite the file
  try {
    const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();

    // Write blob directly (supports binary data)
    await writable.write(blob);
    await writable.close();
  } catch (error: any) {
    throw new Error(`Failed to write file "${fileName}": ${error.message}`);
  }
}

/**
 * Check if a file exists in the project directory
 * @param relativePath - Path relative to project root
 * @param projectHandle - FileSystemDirectoryHandle for the project root
 */
export async function fileExists(
  relativePath: string,
  projectHandle: FileSystemDirectoryHandle | undefined
): Promise<boolean> {
  if (!projectHandle) {
    return false;
  }

  const normalizedPath = relativePath.replace(/\\/g, '/');
  const pathParts = normalizedPath.split('/').filter(Boolean);
  const fileName = pathParts.pop();

  if (!fileName) {
    return false;
  }

  let currentDir = projectHandle;

  try {
    // Navigate to parent directory
    for (const part of pathParts) {
      currentDir = await currentDir.getDirectoryHandle(part);
    }

    // Try to get the file handle
    await currentDir.getFileHandle(fileName);
    return true;
  } catch {
    return false;
  }
}
