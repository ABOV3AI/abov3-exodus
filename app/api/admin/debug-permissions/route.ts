/**
 * Debug API for Permissions System
 *
 * TEMPORARY: Used for debugging permissions issues in production.
 * Returns detailed information about user permissions and feature access.
 *
 * Access: https://exodus.abov3.ai/api/admin/debug-permissions
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { hasFeatureAccess, getUserFeatures } from '~/server/auth/permissions';
import { auth } from '~/server/auth/auth';
import { prismaDb } from '~/server/prisma/prismaDb';

// Force dynamic rendering - don't prerender at build time (needs DATABASE_URL)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    // Get user from database with permissions
    const user = await prismaDb.user.findUnique({
      where: { id: userId },
      include: {
        permissions: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        error: 'User not found in database',
        userId,
      }, { status: 404 });
    }

    // Test feature access for all features
    const nepheshAccess = await hasFeatureAccess(userId, 'NEPHESH');
    const trainAccess = await hasFeatureAccess(userId, 'TRAIN');
    const flowcoreAccess = await hasFeatureAccess(userId, 'FLOWCORE');
    const adminPanelAccess = await hasFeatureAccess(userId, 'ADMIN_PANEL');
    const abov3ModelsAccess = await hasFeatureAccess(userId, 'ABOV3_MODELS');

    // Get all features user has access to
    const allFeatures = await getUserFeatures(userId);

    // Return comprehensive debug info
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      session: {
        userId: session.user.id,
        userEmail: session.user.email,
        userName: session.user.name,
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isMasterDev: user.isMasterDev,
        role: user.role,
        isAdmin: user.isAdmin,
        storageMode: user.storageMode,
        createdAt: user.createdAt,
      },
      permissions: user.permissions.map((p) => ({
        feature: p.feature,
        granted: p.granted,
        grantedBy: p.grantedBy,
        grantedAt: p.grantedAt,
      })),
      featureAccess: {
        NEPHESH: nepheshAccess,
        TRAIN: trainAccess,
        FLOWCORE: flowcoreAccess,
        ADMIN_PANEL: adminPanelAccess,
        ABOV3_MODELS: abov3ModelsAccess,
      },
      allGrantedFeatures: allFeatures,
      shouldHaveFullAccess: user.isMasterDev || user.role === 'MASTER' || user.role === 'ADMIN',
      diagnosis: {
        masterDevBypass: user.isMasterDev ? 'YES - Should have full access' : 'NO',
        roleBypass: (user.role === 'MASTER' || user.role === 'ADMIN') ? `YES - Role ${user.role} should have full access` : 'NO',
        explicitPermissions: user.permissions.length > 0 ? `YES - ${user.permissions.filter(p => p.granted).length} granted` : 'NO explicit permissions',
        expectedAccess: user.isMasterDev || user.role === 'MASTER' || user.role === 'ADMIN' ? 'ALL FEATURES' : 'Only explicitly granted features',
        actualAccess: allFeatures.length > 0 ? allFeatures.join(', ') : 'NONE',
        accessMatch: (() => {
          const shouldHaveFull = user.isMasterDev || user.role === 'MASTER' || user.role === 'ADMIN';
          const hasAll = allFeatures.length === 5; // All 5 features
          if (shouldHaveFull && hasAll) return '✅ CORRECT - Full access granted';
          if (shouldHaveFull && !hasAll) return '❌ BROKEN - Should have full access but doesn\'t!';
          return '⚠️ Limited access (may be correct for regular user)';
        })(),
      },
    });
  } catch (error) {
    console.error('[debug-permissions] Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
