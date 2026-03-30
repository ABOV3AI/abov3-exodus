/**
 * Next.js Middleware for Route Protection
 *
 * PRODUCTION SECURITY: All routes are protected by default.
 * Only explicitly public routes are accessible without authentication.
 *
 * NOTE: Feature permissions are checked from the JWT session token which contains
 * the user's features (cached at login time). The features include:
 * - Explicit permission grants from UserPermission table
 * - Role-based access (ADMIN/MASTER roles have all features)
 * - Master developer flag (isMasterDev)
 *
 * For immediate permission updates, users need to log out and back in.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '~/server/auth/auth';

// Routes that are PUBLIC (no auth required)
const PUBLIC_ROUTES = [
  '/auth/signin',
  '/auth/signup',
  '/auth/error',
  '/auth/verify-request',
  '/api/', // All API routes (auth handled at procedure level)
  '/unauthorized',
];

// Static assets and Next.js internals (always public)
const STATIC_PATTERNS = [
  '/_next',
  '/favicon.ico',
  '/logo',
  '/icons',
  '/images',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
];

// Map of beta feature routes to required feature flags
const PROTECTED_FEATURES: Record<string, string> = {
  '/nephesh': 'NEPHESH',
  '/train': 'TRAIN',
  '/flowcore': 'FLOWCORE',
};

// All features list for admin/master check
const ALL_FEATURES = ['NEPHESH', 'TRAIN', 'FLOWCORE', 'ADMIN_PANEL', 'ABOV3_MODELS'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow static assets and Next.js internals
  if (STATIC_PATTERNS.some((pattern) => pathname.startsWith(pattern))) {
    return NextResponse.next();
  }

  // Allow explicitly public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // All other routes require authentication
  const session = await auth();

  // No session - redirect to sign in
  if (!session?.user?.id) {
    const signInUrl = new URL('/auth/signin', request.url);
    const response = NextResponse.redirect(signInUrl);

    // Store callback URL in secure httpOnly cookie (not visible in URL)
    response.cookies.set('auth.callback', pathname, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5, // 5 minutes
      path: '/',
    });

    return response;
  }

  // Check if this is a feature-protected route
  const featureEntry = Object.entries(PROTECTED_FEATURES).find(([route]) =>
    pathname.startsWith(route)
  );

  // If feature-protected route, check feature access from session
  if (featureEntry) {
    const feature = featureEntry[1];
    const user = session.user as any; // Cast to any to access custom properties

    // Check access using session data (avoids Edge Runtime Prisma issues)
    const hasAccess = checkFeatureAccess(user, feature);

    if (!hasAccess) {
      console.log(`[middleware] Access denied: user=${user.email} feature=${feature} role=${user.role} features=${JSON.stringify(user.features || [])}`);
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    console.log(`[middleware] Access granted: user=${user.email} feature=${feature}`);
  }

  return NextResponse.next();
}

/**
 * Check if user has access to a feature using session data
 * This avoids database queries in Edge Runtime
 */
function checkFeatureAccess(user: any, feature: string): boolean {
  if (!user) return false;

  // Master developer always has full access
  if (user.isMasterDev === true) {
    return true;
  }

  // ADMIN and MASTER roles have all access
  if (user.role === 'ADMIN' || user.role === 'MASTER') {
    return true;
  }

  // isAdmin flag (legacy) grants all access
  if (user.isAdmin === true) {
    return true;
  }

  // Check if feature is in user's granted features list
  const userFeatures = user.features || [];
  return userFeatures.includes(feature);
}

// Run middleware on ALL routes except static files
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public files (logo, icons, images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|logo|icons|images|manifest.json).*)',
  ],
};
