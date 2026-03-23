/**
 * User Theme Preference API
 *
 * Stores theme preference (light/dark) in database per user.
 * This ensures theme settings are isolated between users.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { auth } from '~/server/auth/auth';
import { prismaDb } from '~/server/prisma/prismaDb';

// Force dynamic rendering - don't prerender at build time (needs DATABASE_URL)
export const dynamic = 'force-dynamic';

// GET - Retrieve user's theme preference
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get or create user settings
    let settings = await prismaDb.userSettings.findUnique({
      where: { userId },
      select: { uiSettings: true },
    });

    // Create default settings if none exist
    if (!settings) {
      settings = await prismaDb.userSettings.create({
        data: {
          userId,
          uiSettings: { theme: 'dark' }, // Default to dark theme
        },
        select: { uiSettings: true },
      });
    }

    const uiSettings = settings.uiSettings as any;
    const theme = uiSettings?.theme || 'dark';

    return NextResponse.json({ theme });
  } catch (error) {
    console.error('[theme API] GET error:', error);
    return NextResponse.json({ error: 'Failed to load theme' }, { status: 500 });
  }
}

// POST - Save user's theme preference
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { theme } = body;

    // Validate theme value
    if (theme !== 'light' && theme !== 'dark') {
      return NextResponse.json({ error: 'Invalid theme value' }, { status: 400 });
    }

    // Update or create user settings with new theme
    const settings = await prismaDb.userSettings.upsert({
      where: { userId },
      update: {
        uiSettings: {
          ...(await prismaDb.userSettings.findUnique({ where: { userId } }).then(s => s?.uiSettings as any || {})),
          theme,
        },
      },
      create: {
        userId,
        uiSettings: { theme },
      },
      select: { uiSettings: true },
    });

    console.log(`[theme API] User ${userId} changed theme to: ${theme}`);

    return NextResponse.json({ success: true, theme });
  } catch (error) {
    console.error('[theme API] POST error:', error);
    return NextResponse.json({ error: 'Failed to save theme' }, { status: 500 });
  }
}
