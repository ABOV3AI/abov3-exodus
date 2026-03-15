import { createHash } from 'crypto';
import type AdmZip from 'adm-zip';
import type { IZipEntry } from 'adm-zip';

/**
 * Result of zip validation
 */
export interface ZipValidationResult {
  valid: boolean;
  version?: string;
  checksum: string;
  size: number;
  error?: string;
  files?: string[];
}

/**
 * Expected files/directories in a valid update zip
 */
const REQUIRED_PATHS = [
  'package.json',
  '.next',
];

const OPTIONAL_PATHS = [
  'prisma',
  'public',
  'src',
  'node_modules',
];

/**
 * Calculate SHA-256 checksum of a buffer
 */
export function calculateChecksum(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Validate a zip buffer for software update
 * Checks structure, required files, and extracts version
 */
export async function validateUpdateZip(buffer: Buffer): Promise<ZipValidationResult> {
  const checksum = calculateChecksum(buffer);
  const size = buffer.length;

  try {
    // Dynamic import for adm-zip (handles zip extraction)
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    // Get list of file paths in the zip
    const files = entries.map((entry: IZipEntry) => entry.entryName);

    // Check for required paths
    const missingRequired: string[] = [];
    for (const required of REQUIRED_PATHS) {
      const hasPath = files.some((f: string) =>
        f === required ||
        f.startsWith(required + '/') ||
        f === required + '/'
      );
      if (!hasPath) {
        missingRequired.push(required);
      }
    }

    if (missingRequired.length > 0) {
      return {
        valid: false,
        checksum,
        size,
        error: `Missing required paths: ${missingRequired.join(', ')}`,
        files,
      };
    }

    // Extract version from package.json
    const packageJsonEntry = entries.find((e: IZipEntry) => e.entryName === 'package.json');
    if (!packageJsonEntry) {
      return {
        valid: false,
        checksum,
        size,
        error: 'package.json not found in root of zip',
        files,
      };
    }

    let version: string;
    try {
      const packageJson = JSON.parse(packageJsonEntry.getData().toString('utf-8'));
      version = packageJson.version;
      if (!version) {
        return {
          valid: false,
          checksum,
          size,
          error: 'No version field in package.json',
          files,
        };
      }
    } catch {
      return {
        valid: false,
        checksum,
        size,
        error: 'Failed to parse package.json',
        files,
      };
    }

    // Validate version format (semver)
    const semverRegex = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;
    if (!semverRegex.test(version)) {
      return {
        valid: false,
        checksum,
        size,
        version,
        error: `Invalid version format: ${version}. Expected semver (e.g., 1.0.0)`,
        files,
      };
    }

    // Check for potentially dangerous files
    const dangerousPatterns = [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.ps1$/i,
      /\.sh$/i,
      /\.\.\//, // Path traversal
    ];

    for (const file of files) {
      for (const pattern of dangerousPatterns) {
        if (pattern.test(file)) {
          return {
            valid: false,
            checksum,
            size,
            version,
            error: `Potentially dangerous file detected: ${file}`,
            files,
          };
        }
      }
    }

    return {
      valid: true,
      version,
      checksum,
      size,
      files,
    };

  } catch (error) {
    return {
      valid: false,
      checksum,
      size,
      error: `Failed to read zip file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Verify checksum of a buffer against expected value
 */
export function verifyChecksum(buffer: Buffer, expectedChecksum: string): boolean {
  const actualChecksum = calculateChecksum(buffer);
  return actualChecksum === expectedChecksum;
}

/**
 * Get file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
