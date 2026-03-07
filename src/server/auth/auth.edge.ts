/**
 * Edge-compatible auth module
 *
 * Use this in Edge Runtime routes to validate sessions without bcryptjs.
 * Does not support sign-in/sign-out - use the full auth module for that.
 */
import NextAuth from 'next-auth';
import { authConfigEdge } from './auth.config.edge';

/**
 * NextAuth instance with edge-compatible configuration
 * Only used for session validation in Edge Runtime.
 */
const { auth: getSession } = NextAuth(authConfigEdge);

/**
 * Get the current session on the server side (Edge-compatible)
 * Use this in Edge API routes for session validation.
 */
export const authEdge = getSession;
