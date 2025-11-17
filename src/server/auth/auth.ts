import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

/**
 * NextAuth instance with our configuration
 */
const { auth: getSession, handlers, signIn, signOut } = NextAuth(authConfig);

/**
 * Get the current session on the server side
 * Use this in API routes, server components, etc.
 */
export const auth = getSession;

/**
 * NextAuth handlers for API routes
 */
export { handlers, signIn, signOut };

/**
 * Get the current user ID
 * Returns null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id || null;
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  // @ts-ignore - custom property
  return session?.user?.isAdmin === true;
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session;
}

/**
 * Require admin access - throws error if not admin
 */
export async function requireAdmin() {
  const session = await requireAuth();
  // @ts-ignore - custom property
  if (!session.user.isAdmin) {
    throw new Error('Admin access required');
  }
  return session;
}
