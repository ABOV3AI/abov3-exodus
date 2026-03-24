import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { prismaDb } from '~/server/prisma/prismaDb';


// Validation schema
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').optional(),
});


// Force dynamic rendering - don't prerender at build time (needs DATABASE_URL)
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password, name } = signupSchema.parse(body);

    // Check if signups are allowed
    const adminSettings = await prismaDb.adminSettings.findFirst();
    if (adminSettings && !adminSettings.allowSignups) {
      return NextResponse.json(
        { error: 'New signups are currently disabled' },
        { status: 403 },
      );
    }

    // Check if user already exists
    const existingUser = await prismaDb.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prismaDb.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name || null,
        storageMode: 'LOCAL_ONLY', // Default storage mode
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
    await prismaDb.userSettings.create({
      data: {
        userId: user.id,
        autoBackup: false,
        llmSettings: {},
        uiSettings: {},
      },
    });

    // Return success
    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Signup error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'An error occurred during signup' },
      { status: 500 },
    );
  }
}
