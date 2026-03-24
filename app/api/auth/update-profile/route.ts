import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '~/server/auth/auth';
import { prismaDb } from '~/server/prisma/prismaDb';

// Max image size: 500KB for base64 (approx 375KB actual image after encoding overhead)
const MAX_IMAGE_SIZE = 500 * 1024;

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  image: z.union([
    z.string().max(MAX_IMAGE_SIZE).refine(
      (val) => val.startsWith('data:image/'),
      'Image must be a valid data URL'
    ),
    z.null(),
  ]).optional(),
}).refine(
  (data) => data.name !== undefined || data.image !== undefined,
  'At least one field (name or image) must be provided'
);

// Force dynamic rendering - don't prerender at build time (needs DATABASE_URL)
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate body
    const body = await request.json();
    const validated = updateProfileSchema.parse(body);

    // Build update data
    const updateData: { name?: string; image?: string | null } = {};
    if (validated.name !== undefined) {
      updateData.name = validated.name;
    }
    if (validated.image !== undefined) {
      updateData.image = validated.image;
    }

    // Update user
    await prismaDb.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update profile error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
