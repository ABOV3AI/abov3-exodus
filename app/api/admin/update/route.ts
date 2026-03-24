/**
 * Software Update Upload API
 *
 * Handles zip file uploads for software updates.
 * Only Master Developers can access this endpoint.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { auth } from '~/server/auth/auth';
import { prismaDb } from '~/server/prisma/prismaDb';
import { validateUpdateZip, calculateChecksum, UpdateEngine, getCurrentVersion, listBackups } from '~/server/update';

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
 * GET - Get update status and history
 */
// Force dynamic rendering - don't prerender at build time (needs DATABASE_URL)
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const isMaster = await isMasterDev(session.user.id);
    if (!isMaster) {
      return NextResponse.json({ error: 'Only Master Developers can access software updates' }, { status: 403 });
    }

    // Get current version
    const currentVersion = await getCurrentVersion();

    // Get update history from database
    const updates = await prismaDb.softwareUpdate.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Get available backups
    const backups = await listBackups();

    return NextResponse.json({
      currentVersion,
      updates,
      backups: backups.slice(0, 10), // Only return last 10 backups
    });

  } catch (error) {
    console.error('[update] GET error:', error);
    return NextResponse.json({ error: 'Failed to get update status' }, { status: 500 });
  }
}

/**
 * POST - Upload and validate update zip
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const isMaster = await isMasterDev(session.user.id);
    if (!isMaster) {
      return NextResponse.json({ error: 'Only Master Developers can upload software updates' }, { status: 403 });
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

    // Validate the zip
    const validation = await validateUpdateZip(buffer);

    if (!validation.valid) {
      return NextResponse.json({
        error: validation.error || 'Invalid update package',
        details: validation,
      }, { status: 400 });
    }

    // Create database record
    const updateRecord = await prismaDb.softwareUpdate.create({
      data: {
        version: validation.version!,
        filename: file.name,
        checksum: validation.checksum,
        size: validation.size,
        status: 'PENDING',
        uploadedBy: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      updateId: updateRecord.id,
      version: validation.version,
      checksum: validation.checksum,
      size: validation.size,
      fileCount: validation.files?.length ?? 0,
    });

  } catch (error) {
    console.error('[update] POST error:', error);
    return NextResponse.json({ error: 'Failed to upload update' }, { status: 500 });
  }
}

/**
 * PUT - Apply a pending update
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const isMaster = await isMasterDev(session.user.id);
    if (!isMaster) {
      return NextResponse.json({ error: 'Only Master Developers can apply software updates' }, { status: 403 });
    }

    const body = await request.json();
    const { updateId, action } = body;

    if (action === 'apply') {
      // Get the update record
      const updateRecord = await prismaDb.softwareUpdate.findUnique({
        where: { id: updateId },
      });

      if (!updateRecord) {
        return NextResponse.json({ error: 'Update not found' }, { status: 404 });
      }

      if (updateRecord.status !== 'PENDING') {
        return NextResponse.json({ error: 'Update is not in PENDING status' }, { status: 400 });
      }

      // Note: In a real implementation, we would:
      // 1. Store the zip file temporarily during POST
      // 2. Retrieve it here to apply
      // For now, we'll return a message that the zip needs to be re-uploaded

      return NextResponse.json({
        error: 'To apply an update, upload the zip file using the /apply endpoint',
        updateId: updateRecord.id,
      }, { status: 400 });

    } else if (action === 'rollback') {
      const { backupPath } = body;

      if (!backupPath) {
        return NextResponse.json({ error: 'Backup path required for rollback' }, { status: 400 });
      }

      const engine = new UpdateEngine();
      const result = await engine.rollback(backupPath);

      if (result.success) {
        // Update any relevant database records
        if (updateId) {
          await prismaDb.softwareUpdate.update({
            where: { id: updateId },
            data: {
              status: 'ROLLED_BACK',
              rollbackAt: new Date(),
            },
          });
        }

        return NextResponse.json({
          success: true,
          message: 'Rollback initiated. Application will restart.',
        });
      } else {
        return NextResponse.json({
          error: result.error || 'Rollback failed',
        }, { status: 500 });
      }

    } else {
      return NextResponse.json({ error: 'Invalid action. Use "apply" or "rollback"' }, { status: 400 });
    }

  } catch (error) {
    console.error('[update] PUT error:', error);
    return NextResponse.json({ error: 'Failed to process update action' }, { status: 500 });
  }
}
