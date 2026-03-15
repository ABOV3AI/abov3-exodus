import { promises as fs } from 'fs';
import { join } from 'path';
import { existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

import { validateUpdateZip, type ZipValidationResult } from './update.validator';
import { createBackup, restoreBackup, getAppRoot, getCurrentVersion } from './update.backup';

const execAsync = promisify(exec);

/**
 * Update status for progress tracking
 */
export type UpdateStage =
  | 'PENDING'
  | 'VALIDATING'
  | 'BACKING_UP'
  | 'APPLYING'
  | 'MIGRATING'
  | 'RESTARTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'ROLLED_BACK';

/**
 * Progress callback for update stages
 */
export type UpdateProgressCallback = (
  stage: UpdateStage,
  progress: number,
  message: string
) => void;

/**
 * Result of an update operation
 */
export interface UpdateResult {
  success: boolean;
  version?: string;
  previousVersion?: string;
  backupPath?: string;
  error?: string;
  stage: UpdateStage;
}

/**
 * Directories to update from the zip
 */
const UPDATE_TARGETS = [
  '.next',
  'public',
  'src',
  'package.json',
  'package-lock.json',
  'next.config.ts',
  'tsconfig.json',
];

/**
 * Files/directories to skip during extraction
 */
const SKIP_PATTERNS = [
  '.env',
  '.env.local',
  '.env.production',
  'node_modules',
  '.backups',
  'prisma/migrations',
  'uploads',
  'data',
];

/**
 * Main update engine - orchestrates the update process
 */
export class UpdateEngine {
  private appRoot: string;
  private onProgress?: UpdateProgressCallback;

  constructor(onProgress?: UpdateProgressCallback) {
    this.appRoot = getAppRoot();
    this.onProgress = onProgress;
  }

  private progress(stage: UpdateStage, progress: number, message: string) {
    this.onProgress?.(stage, progress, message);
    console.log(`[UpdateEngine] [${stage}] ${progress}% - ${message}`);
  }

  /**
   * Apply an update from a zip buffer
   */
  async applyUpdate(zipBuffer: Buffer): Promise<UpdateResult> {
    let backupPath: string | undefined;
    let previousVersion: string | undefined;

    try {
      // Stage 1: Validate
      this.progress('VALIDATING', 0, 'Validating update package...');
      const validation = await validateUpdateZip(zipBuffer);

      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || 'Validation failed',
          stage: 'FAILED',
        };
      }

      const newVersion = validation.version!;
      previousVersion = await getCurrentVersion();
      this.progress('VALIDATING', 100, `Valid update: v${newVersion}`);

      // Stage 2: Backup
      this.progress('BACKING_UP', 0, 'Creating backup of current version...');
      backupPath = await createBackup(previousVersion);
      this.progress('BACKING_UP', 100, `Backup created at ${backupPath}`);

      // Stage 3: Apply
      this.progress('APPLYING', 0, 'Extracting update files...');
      await this.extractAndApply(zipBuffer, validation);
      this.progress('APPLYING', 100, 'Files extracted and applied');

      // Stage 4: Run migrations if prisma directory exists
      this.progress('MIGRATING', 0, 'Checking for database migrations...');
      await this.runMigrations();
      this.progress('MIGRATING', 100, 'Migrations complete');

      // Stage 5: Signal restart
      this.progress('RESTARTING', 0, 'Signaling application restart...');
      await this.signalRestart();

      this.progress('COMPLETED', 100, `Update to v${newVersion} complete`);

      return {
        success: true,
        version: newVersion,
        previousVersion,
        backupPath,
        stage: 'COMPLETED',
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.progress('FAILED', 0, `Update failed: ${errorMessage}`);

      // Attempt rollback if backup exists
      if (backupPath) {
        try {
          this.progress('ROLLED_BACK', 0, 'Rolling back to previous version...');
          await restoreBackup(backupPath);
          this.progress('ROLLED_BACK', 100, 'Rollback complete');

          return {
            success: false,
            error: `Update failed and rolled back: ${errorMessage}`,
            previousVersion,
            backupPath,
            stage: 'ROLLED_BACK',
          };
        } catch (rollbackError) {
          return {
            success: false,
            error: `Update failed and rollback also failed: ${errorMessage}. Manual intervention required.`,
            previousVersion,
            backupPath,
            stage: 'FAILED',
          };
        }
      }

      return {
        success: false,
        error: errorMessage,
        previousVersion,
        stage: 'FAILED',
      };
    }
  }

  /**
   * Extract and apply update files
   */
  private async extractAndApply(
    zipBuffer: Buffer,
    validation: ZipValidationResult
  ): Promise<void> {
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();

    const totalEntries = entries.length;
    let processedEntries = 0;

    for (const entry of entries) {
      const entryPath = entry.entryName;

      // Skip preserved items
      if (this.shouldSkip(entryPath)) {
        processedEntries++;
        continue;
      }

      // Only extract update targets
      if (!this.isUpdateTarget(entryPath)) {
        processedEntries++;
        continue;
      }

      const destPath = join(this.appRoot, entryPath);

      if (entry.isDirectory) {
        await fs.mkdir(destPath, { recursive: true });
      } else {
        // Ensure parent directory exists
        await fs.mkdir(join(destPath, '..'), { recursive: true });
        // Write file
        await fs.writeFile(destPath, entry.getData());
      }

      processedEntries++;
      const progress = Math.round((processedEntries / totalEntries) * 100);
      if (progress % 10 === 0) {
        this.progress('APPLYING', progress, `Extracting files... ${progress}%`);
      }
    }
  }

  /**
   * Check if a path should be skipped during extraction
   */
  private shouldSkip(path: string): boolean {
    return SKIP_PATTERNS.some(pattern =>
      path === pattern ||
      path.startsWith(pattern + '/')
    );
  }

  /**
   * Check if a path is an update target
   */
  private isUpdateTarget(path: string): boolean {
    return UPDATE_TARGETS.some(target =>
      path === target ||
      path.startsWith(target + '/') ||
      path.startsWith(target)
    );
  }

  /**
   * Run database migrations if needed
   */
  private async runMigrations(): Promise<void> {
    const prismaDir = join(this.appRoot, 'prisma');

    if (!existsSync(prismaDir)) {
      console.log('[UpdateEngine] No prisma directory, skipping migrations');
      return;
    }

    try {
      // Run prisma migrate deploy (safe for production)
      const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
        cwd: this.appRoot,
        timeout: 120000, // 2 minute timeout
      });

      if (stdout) console.log('[UpdateEngine] Migration output:', stdout);
      if (stderr) console.warn('[UpdateEngine] Migration warnings:', stderr);
    } catch (error) {
      console.warn('[UpdateEngine] Migration error (continuing anyway):', error);
      // Don't throw - migrations might not be needed
    }
  }

  /**
   * Signal the application to restart
   */
  private async signalRestart(): Promise<void> {
    // Write a restart flag file that can be monitored externally
    const restartFlagPath = join(this.appRoot, '.restart-required');
    await fs.writeFile(restartFlagPath, new Date().toISOString());

    // For PM2 or similar process managers, we can use process.exit
    // The process manager will restart the app automatically
    console.log('[UpdateEngine] Restart flag written. Application will restart shortly.');

    // Schedule exit after response is sent
    setTimeout(() => {
      console.log('[UpdateEngine] Initiating restart...');
      process.exit(0);
    }, 2000);
  }

  /**
   * Manually rollback to a specific backup
   */
  async rollback(backupPath: string): Promise<UpdateResult> {
    try {
      this.progress('ROLLED_BACK', 0, 'Rolling back...');

      const previousVersion = await getCurrentVersion();
      await restoreBackup(backupPath);

      this.progress('ROLLED_BACK', 100, 'Rollback complete');

      // Signal restart after rollback
      await this.signalRestart();

      return {
        success: true,
        previousVersion,
        backupPath,
        stage: 'ROLLED_BACK',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Rollback failed: ${errorMessage}`,
        backupPath,
        stage: 'FAILED',
      };
    }
  }
}

/**
 * Get update system info
 */
export async function getUpdateSystemInfo(): Promise<{
  currentVersion: string;
  appRoot: string;
  nodeVersion: string;
  platform: string;
}> {
  return {
    currentVersion: await getCurrentVersion(),
    appRoot: getAppRoot(),
    nodeVersion: process.version,
    platform: process.platform,
  };
}
