/**
 * Next.js Middleware for Route Protection
 *
 * PRODUCTION SECURITY: All routes are protected by default.
 * Only explicitly public routes are accessible without authentication.
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
  const feature = Object.entries(PROTECTED_FEATURES).find(([route]) =>
    pathname.startsWith(route)
  )?.[1];

  // If feature-protected route, check feature access
  if (feature) {
    try {
      // Call internal API to check feature access
      const checkUrl = new URL('/api/auth/check-feature', request.url);
      const checkRes = await fetch(checkUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: request.headers.get('cookie') || '',
        },
        body: JSON.stringify({
          userId: session.user.id,
          feature,
        }),
      });

      if (!checkRes.ok) {
        // No access - redirect to unauthorized page
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    } catch (error) {
      console.error('[middleware] Feature check failed:', error);
      // On error, deny access for security
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  return NextResponse.next();
}

// Run middleware on ALL routes except static files
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public files (logo, icons, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|logo|icons|manifest.json).*)',
  ],
};
