/**
 * Edge-compatible auth configuration
 *
 * This config is used in Edge Runtime (e.g., API routes) where bcryptjs cannot be bundled.
 * It contains only the session validation logic without authentication providers.
 */
import type { NextAuthConfig } from 'next-auth';
import { env } from '../env';

/**
 * Base auth configuration for Edge Runtime
 *
 * This config only handles session validation - no providers that require Node.js modules.
 * The full auth config with providers is in auth.config.ts (used by /api/auth routes).
 */
export const authConfigEdge: NextAuthConfig = {
  // Secret for JWT signing
  secret: env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production',

  // Session configuration
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Pages configuration (for redirects)
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/auth/welcome',
  },

  // Empty providers - session validation only
  providers: [],

  // Callbacks - must match full config for consistent session shape
  callbacks: {
    async jwt({ token }) {
      // Just pass through the token - no DB queries in edge
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
        // @ts-ignore - custom properties
        session.user.isAdmin = token.isAdmin as boolean;
        // @ts-ignore - custom properties
        session.user.storageMode = token.storageMode as string;
      }
      return session;
    },
  },
};
