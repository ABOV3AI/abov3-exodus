import { promises as fs } from 'fs';
import { join, dirname, basename } from 'path';
import { existsSync } from 'fs';

/**
 * Directories and files to backup before update
 */
const BACKUP_ITEMS = [
  '.next',           // Built Next.js application
  'public',          // Static assets
  'src',             // Source code
  'package.json',    // Dependencies
  'package-lock.json',
  'next.config.ts',
  'tsconfig.json',
  // Note: node_modules and prisma are handled separately
];

/**
 * Directories to preserve (not replaced during update)
 */
const PRESERVE_ITEMS = [
  '.env',
  '.env.local',
  'prisma/migrations', // Preserve existing migrations
  'uploads',           // User uploads
  'data',              // Persistent data
];

/**
 * Get the application root directory
 */
export function getAppRoot(): string {
  // Navigate from src/server/update to root
  return join(__dirname, '..', '..', '..', '..');
}

/**
 * Get the backups directory
 */
export function getBackupsDir(): string {
  return join(getAppRoot(), '.backups');
}

/**
 * Create a backup of the current application state
 * @param version - Version being backed up (for labeling)
 * @returns Path to the backup directory
 */
export async function createBackup(version: string): Promise<string> {
  const appRoot = getAppRoot();
  const backupsDir = getBackupsDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `backup-${version}-${timestamp}`;
  const backupPath = join(backupsDir, backupName);

  // Ensure backups directory exists
  await fs.mkdir(backupsDir, { recursive: true });

  // Create backup directory
  await fs.mkdir(backupPath, { recursive: true });

  // Copy each backup item
  for (const item of BACKUP_ITEMS) {
    const sourcePath = join(appRoot, item);
    const destPath = join(backupPath, item);

    if (existsSync(sourcePath)) {
      try {
        const stat = await fs.stat(sourcePath);
        if (stat.isDirectory()) {
          await copyDirectory(sourcePath, destPath);
        } else {
          await fs.mkdir(dirname(destPath), { recursive: true });
          await fs.copyFile(sourcePath, destPath);
        }
      } catch (error) {
        console.warn(`[Backup] Failed to backup ${item}:`, error);
        // Continue with other items
      }
    }
  }

  // Store metadata
  const metadata = {
    version,
    timestamp: new Date().toISOString(),
    items: BACKUP_ITEMS,
    appRoot,
  };
  await fs.writeFile(
    join(backupPath, 'backup-metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  return backupPath;
}

/**
 * Restore from a backup
 * @param backupPath - Path to the backup directory
 */
export async function restoreBackup(backupPath: string): Promise<void> {
  const appRoot = getAppRoot();

  // Read metadata
  const metadataPath = join(backupPath, 'backup-metadata.json');
  if (!existsSync(metadataPath)) {
    throw new Error('Invalid backup: metadata not found');
  }

  const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

  // Restore each item
  for (const item of metadata.items) {
    const sourcePath = join(backupPath, item);
    const destPath = join(appRoot, item);

    if (existsSync(sourcePath)) {
      try {
        // Remove existing
        if (existsSync(destPath)) {
          await fs.rm(destPath, { recursive: true, force: true });
        }

        const stat = await fs.stat(sourcePath);
        if (stat.isDirectory()) {
          await copyDirectory(sourcePath, destPath);
        } else {
          await fs.mkdir(dirname(destPath), { recursive: true });
          await fs.copyFile(sourcePath, destPath);
        }
      } catch (error) {
        console.error(`[Restore] Failed to restore ${item}:`, error);
        throw error;
      }
    }
  }
}

/**
 * List available backups
 */
export async function listBackups(): Promise<Array<{
  name: string;
  path: string;
  version: string;
  timestamp: string;
  size?: number;
}>> {
  const backupsDir = getBackupsDir();

  if (!existsSync(backupsDir)) {
    return [];
  }

  const entries = await fs.readdir(backupsDir, { withFileTypes: true });
  const backups: Array<{
    name: string;
    path: string;
    version: string;
    timestamp: string;
    size?: number;
  }> = [];

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith('backup-')) {
      const backupPath = join(backupsDir, entry.name);
      const metadataPath = join(backupPath, 'backup-metadata.json');

      if (existsSync(metadataPath)) {
        try {
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
          backups.push({
            name: entry.name,
            path: backupPath,
            version: metadata.version,
            timestamp: metadata.timestamp,
          });
        } catch {
          // Skip invalid backups
        }
      }
    }
  }

  // Sort by timestamp descending (newest first)
  backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return backups;
}

/**
 * Delete a backup
 */
export async function deleteBackup(backupPath: string): Promise<void> {
  // Security: ensure it's actually in the backups directory
  const backupsDir = getBackupsDir();
  if (!backupPath.startsWith(backupsDir)) {
    throw new Error('Invalid backup path');
  }

  await fs.rm(backupPath, { recursive: true, force: true });
}

/**
 * Clean up old backups, keeping only the most recent N
 */
export async function cleanupOldBackups(keepCount: number = 5): Promise<number> {
  const backups = await listBackups();

  if (backups.length <= keepCount) {
    return 0;
  }

  const toDelete = backups.slice(keepCount);
  let deleted = 0;

  for (const backup of toDelete) {
    try {
      await deleteBackup(backup.path);
      deleted++;
    } catch (error) {
      console.warn(`[Backup] Failed to delete old backup ${backup.name}:`, error);
    }
  }

  return deleted;
}

/**
 * Recursively copy a directory
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Get current application version from package.json
 */
export async function getCurrentVersion(): Promise<string> {
  const packageJsonPath = join(getAppRoot(), 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
  return packageJson.version || 'unknown';
}
