import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { prismaDb } from '~/server/prisma/prismaDb';


// Validation schema
const activateSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  invitationCode: z.string().length(8, 'Invitation code must be 8 characters'),
});


// Force dynamic rendering - don't prerender at build time (needs DATABASE_URL)
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password, name, invitationCode } = activateSchema.parse(body);

    // Normalize the invitation code (uppercase for consistency)
    const normalizedCode = invitationCode.toUpperCase();

    // Find the invitation code
    const invitation = await prismaDb.invitationCode.findUnique({
      where: { code: normalizedCode },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation code' },
        { status: 400 },
      );
    }

    // Check if invitation is active
    if (invitation.status !== 'ACTIVE') {
      const statusMessages: Record<string, string> = {
        EXHAUSTED: 'This invitation code has already been used',
        EXPIRED: 'This invitation code has expired',
        REVOKED: 'This invitation code is no longer valid',
      };
      return NextResponse.json(
        { error: statusMessages[invitation.status] || 'Invalid invitation code' },
        { status: 400 },
      );
    }

    // Check if invitation has expired
    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      // Update status to expired
      await prismaDb.invitationCode.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.json(
        { error: 'This invitation code has expired' },
        { status: 400 },
      );
    }

    // Check if max uses reached
    if (invitation.useCount >= invitation.maxUses) {
      // Update status to exhausted
      await prismaDb.invitationCode.update({
        where: { id: invitation.id },
        data: { status: 'EXHAUSTED' },
      });
      return NextResponse.json(
        { error: 'This invitation code has already been used' },
        { status: 400 },
      );
    }

    // Check if email is pre-assigned and matches
    if (invitation.email && invitation.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation code is reserved for a different email address' },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existingUser = await prismaDb.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user and record invitation usage in a transaction
    const result = await prismaDb.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          name: name.trim(),
          storageMode: 'LOCAL_ONLY',
          isAdmin: false,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      // Create default user settings
      await tx.userSettings.create({
        data: {
          userId: user.id,
          autoBackup: false,
          llmSettings: {},
          uiSettings: {},
        },
      });

      // Record invitation usage
      await tx.invitationUsage.create({
        data: {
          invitationId: invitation.id,
          userId: user.id,
          userEmail: email.toLowerCase(),
        },
      });

      // Update invitation use count
      const newUseCount = invitation.useCount + 1;
      const newStatus = newUseCount >= invitation.maxUses ? 'EXHAUSTED' : 'ACTIVE';

      await tx.invitationCode.update({
        where: { id: invitation.id },
        data: {
          useCount: newUseCount,
          status: newStatus,
        },
      });

      return user;
    });

    // Return success
    return NextResponse.json(
      {
        success: true,
        user: {
          id: result.id,
          email: result.email,
          name: result.name,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Invitation activation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'An error occurred during account activation' },
      { status: 500 },
    );
  }
}
