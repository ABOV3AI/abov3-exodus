/**
 * Feature-level permission checking for beta access control
 *
 * This module handles checking whether users have access to specific
 * beta features (Nephesh, Train, FlowCore) based on their role and
 * explicit permission grants.
 */

import type { FeatureFlag, UserRole } from '@prisma/client';

import { prismaDb } from '~/server/prisma/prismaDb';

export type { FeatureFlag } from '@prisma/client';

// All available feature flags
export const ALL_FEATURES: FeatureFlag[] = ['NEPHESH', 'TRAIN', 'FLOWCORE', 'ADMIN_PANEL', 'ABOV3_MODELS'];

/**
 * Check if a user has access to a specific feature
 *
 * Access is granted if:
 * 1. User is a Master Developer (isMasterDev = true)
 * 2. User has ADMIN or MASTER role
 * 3. User has explicit permission grant for the feature
 */
export async function hasFeatureAccess(userId: string, feature: FeatureFlag): Promise<boolean> {
  if (!userId) return false;

  try {
    const user = await prismaDb.user.findUnique({
      where: { id: userId },
      include: { permissions: true },
    });

    if (!user) return false;

    // Master dev always has full access
    if (user.isMasterDev) return true;

    // ADMIN and MASTER roles have all access
    if (user.role === 'ADMIN' || user.role === 'MASTER') return true;

    // Check specific permission grant
    return user.permissions.some((p) => p.feature === feature && p.granted);
  } catch (error) {
    console.error('[permissions] Error checking feature access:', error);
    return false;
  }
}

/**
 * Get all features a user has access to
 */
export async function getUserFeatures(userId: string): Promise<FeatureFlag[]> {
  if (!userId) return [];

  try {
    const user = await prismaDb.user.findUnique({
      where: { id: userId },
      include: { permissions: true },
    });

    if (!user) return [];

    // Master/Admin gets all features
    if (user.isMasterDev || user.role === 'ADMIN' || user.role === 'MASTER') {
      return ALL_FEATURES;
    }

    // Return explicitly granted features
    return user.permissions.filter((p) => p.granted).map((p) => p.feature);
  } catch (error) {
    console.error('[permissions] Error getting user features:', error);
    return [];
  }
}

/**
 * Check if a user can modify another user's permissions
 *
 * Rules:
 * - Only admins can modify permissions
 * - Master developers cannot be modified by anyone
 * - Admins cannot modify other admins unless they are Master
 */
export async function canModifyUserPermissions(
  actorId: string,
  targetUserId: string
): Promise<boolean> {
  if (!actorId || !targetUserId) return false;

  try {
    const [actor, target] = await Promise.all([
      prismaDb.user.findUnique({ where: { id: actorId } }),
      prismaDb.user.findUnique({ where: { id: targetUserId } }),
    ]);

    if (!actor || !target) return false;

    // Target is Master - no one can modify
    if (target.isMasterDev) return false;

    // Only admins/masters can modify
    if (!actor.isAdmin && actor.role !== 'ADMIN' && actor.role !== 'MASTER') return false;

    // Regular admins cannot modify other admins
    if (!actor.isMasterDev && (target.role === 'ADMIN' || target.isAdmin)) return false;

    return true;
  } catch (error) {
    console.error('[permissions] Error checking modify permissions:', error);
    return false;
  }
}

/**
 * Grant or revoke a feature permission for a user
 */
export async function setFeaturePermission(
  actorId: string,
  targetUserId: string,
  feature: FeatureFlag,
  granted: boolean
): Promise<{ success: boolean; error?: string }> {
  // Check if actor can modify target
  const canModify = await canModifyUserPermissions(actorId, targetUserId);
  if (!canModify) {
    return { success: false, error: 'Insufficient permissions to modify this user' };
  }

  try {
    await prismaDb.userPermission.upsert({
      where: {
        userId_feature: {
          userId: targetUserId,
          feature,
        },
      },
      update: {
        granted,
        grantedBy: actorId,
        grantedAt: new Date(),
      },
      create: {
        userId: targetUserId,
        feature,
        granted,
        grantedBy: actorId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[permissions] Error setting feature permission:', error);
    return { success: false, error: 'Failed to update permission' };
  }
}

/**
 * Check if user can access admin features
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const user = await prismaDb.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true, isMasterDev: true, role: true },
    });

    if (!user) return false;

    return user.isAdmin || user.isMasterDev || user.role === 'ADMIN' || user.role === 'MASTER';
  } catch {
    return false;
  }
}

/**
 * Get user role info for display
 */
export async function getUserRoleInfo(
  userId: string
): Promise<{ role: UserRole; isAdmin: boolean; isMasterDev: boolean } | null> {
  if (!userId) return null;

  try {
    const user = await prismaDb.user.findUnique({
      where: { id: userId },
      select: { role: true, isAdmin: true, isMasterDev: true },
    });

    return user;
  } catch {
    return null;
  }
}
