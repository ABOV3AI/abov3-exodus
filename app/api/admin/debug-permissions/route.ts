/**
 * Debug Permissions API
 *
 * Returns detailed permission information for debugging.
 * Only accessible to authenticated users - shows their own permissions.
 */

import { NextResponse } from 'next/server';

import { auth } from '~/server/auth/auth';
import { prismaDb } from '~/server/prisma/prismaDb';
import { hasFeatureAccess, getUserFeatures, ALL_FEATURES } from '~/server/auth/permissions';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Use Node.js runtime for Prisma
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Get current session
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({
        error: 'Not authenticated',
        session: null,
      }, { status: 401 });
    }

    const userId = session.user.id;

    // Get full user record from database
    const user = await prismaDb.user.findUnique({
      where: { id: userId },
      include: { permissions: true },
    });

    if (!user) {
      return NextResponse.json({
        error: 'User not found in database',
        sessionUserId: userId,
      }, { status: 404 });
    }

    // Check each feature
    const featureAccessResults: Record<string, boolean> = {};
    for (const feature of ALL_FEATURES) {
      featureAccessResults[feature] = await hasFeatureAccess(userId, feature);
    }

    // Get user features via helper
    const userFeatures = await getUserFeatures(userId);

    return NextResponse.json({
      debug: {
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV,
      },
      session: {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name,
        // @ts-ignore
        isAdmin: session.user.isAdmin,
      },
      database: {
        id: user.id,
        email: user.email,
        isMasterDev: user.isMasterDev,
        role: user.role,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      },
      permissions: {
        explicit: user.permissions.map(p => ({
          feature: p.feature,
          granted: p.granted,
          grantedBy: p.grantedBy,
          grantedAt: p.grantedAt,
        })),
      },
      featureAccess: featureAccessResults,
      userFeatures,
      analysis: {
        shouldHaveFullAccess: user.isMasterDev || user.role === 'ADMIN' || user.role === 'MASTER',
        reasonForFullAccess: user.isMasterDev
          ? 'isMasterDev=true'
          : user.role === 'MASTER'
            ? 'role=MASTER'
            : user.role === 'ADMIN'
              ? 'role=ADMIN'
              : 'none',
      },
    });
  } catch (error) {
    console.error('[debug-permissions] Error:', error);
    return NextResponse.json({
      error: 'Failed to get permissions',
      message: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
