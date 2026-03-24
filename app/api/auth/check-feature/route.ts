/**
 * Feature Access Check API
 *
 * Endpoint for middleware to verify if a user has access to a specific feature.
 * Returns 200 if access granted, 403 if denied.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { hasFeatureAccess, type FeatureFlag } from '~/server/auth/permissions';
import { auth } from '~/server/auth/auth';

// Force dynamic rendering - don't prerender at build time (needs DATABASE_URL)
export const dynamic = 'force-dynamic';

// Explicitly use Node.js runtime (not Edge) for Prisma access
export const runtime = 'nodejs';

// Valid feature flags
const VALID_FEATURES: FeatureFlag[] = ['NEPHESH', 'TRAIN', 'FLOWCORE', 'ADMIN_PANEL'];

export async function POST(request: NextRequest) {
  try {
    // Get current session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { feature } = body;

    // Validate feature
    if (!feature || !VALID_FEATURES.includes(feature as FeatureFlag)) {
      return NextResponse.json({ error: 'Invalid feature' }, { status: 400 });
    }

    // Check access
    const hasAccess = await hasFeatureAccess(session.user.id, feature as FeatureFlag);

    if (hasAccess) {
      return NextResponse.json({ access: true }, { status: 200 });
    } else {
      return NextResponse.json({ access: false, error: 'No access to feature' }, { status: 403 });
    }
  } catch (error) {
    console.error('[check-feature] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
