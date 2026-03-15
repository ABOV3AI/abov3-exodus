/**
 * Software Update Apply API
 *
 * Handles the actual application of software updates.
 * Uploads zip, validates, creates backup, and applies in one request.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { auth } from '~/server/auth/auth';
import { prismaDb } from '~/server/prisma/prismaDb';
import { validateUpdateZip, UpdateEngine, getCurrentVersion } from '~/server/update';

/**
 * Check if user is a Master Developer
 */
async function isMasterDev(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const user = await prismaDb.user.findUnique({
      where: { id: userId },
      select: { isMasterDev: true },
    });

    return user?.isMasterDev ?? false;
  } catch {
    return false;
  }
}

/**
 * POST - Upload and apply update in one step
 */
export async function POST(request: NextRequest) {
  let updateRecordId: string | undefined;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const isMaster = await isMasterDev(session.user.id);
    if (!isMaster) {
      return NextResponse.json({ error: 'Only Master Developers can apply software updates' }, { status: 403 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file type
    if (!file.name.endsWith('.zip')) {
      return NextResponse.json({ error: 'File must be a .zip archive' }, { status: 400 });
    }

    // Check file size (max 500MB)
    const MAX_SIZE = 500 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 500MB' }, { status: 400 });
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate the zip first
    const validation = await validateUpdateZip(buffer);

    if (!validation.valid) {
      return NextResponse.json({
        error: validation.error || 'Invalid update package',
        details: validation,
      }, { status: 400 });
    }

    const currentVersion = await getCurrentVersion();

    // Create database record with VALIDATING status
    const updateRecord = await prismaDb.softwareUpdate.create({
      data: {
        version: validation.version!,
        filename: file.name,
        checksum: validation.checksum,
        size: validation.size,
        status: 'VALIDATING',
        uploadedBy: session.user.id,
      },
    });
    updateRecordId = updateRecord.id;

    // Create update engine with progress callback
    const engine = new UpdateEngine(async (stage, progress, message) => {
      // Update database with current stage
      try {
        await prismaDb.softwareUpdate.update({
          where: { id: updateRecordId },
          data: { status: stage },
        });
      } catch {
        // Ignore update errors during process
      }
    });

    // Apply the update
    const result = await engine.applyUpdate(buffer);

    // Update final status
    await prismaDb.softwareUpdate.update({
      where: { id: updateRecordId },
      data: {
        status: result.success ? 'COMPLETED' : result.stage,
        appliedAt: result.success ? new Date() : null,
        backupPath: result.backupPath,
        error: result.error,
      },
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        updateId: updateRecordId,
        previousVersion: currentVersion,
        newVersion: result.version,
        backupPath: result.backupPath,
        message: 'Update applied successfully. Application will restart.',
      });
    } else {
      return NextResponse.json({
        success: false,
        updateId: updateRecordId,
        error: result.error,
        stage: result.stage,
        backupPath: result.backupPath,
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[update/apply] POST error:', error);

    // Update database record if we have one
    if (updateRecordId) {
      try {
        await prismaDb.softwareUpdate.update({
          where: { id: updateRecordId },
          data: {
            status: 'FAILED',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      } catch {
        // Ignore
      }
    }

    return NextResponse.json({
      error: 'Failed to apply update',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
