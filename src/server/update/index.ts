// Software Update System
export { validateUpdateZip, calculateChecksum, verifyChecksum, formatFileSize } from './update.validator';
export type { ZipValidationResult } from './update.validator';

export { createBackup, restoreBackup, listBackups, deleteBackup, cleanupOldBackups, getCurrentVersion, getAppRoot, getBackupsDir } from './update.backup';

export { UpdateEngine, getUpdateSystemInfo } from './update.engine';
export type { UpdateStage, UpdateProgressCallback, UpdateResult } from './update.engine';
