/**
 * Edge-compatible tRPC server configuration
 *
 * This module provides tRPC setup for Edge Runtime routes without bcryptjs dependency.
 * Uses the edge-compatible auth module for session validation.
 */
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import * as z from 'zod/v4';
import { initTRPC, TRPCError } from '@trpc/server';
import { transformer } from '~/server/trpc/trpc.transformer';
import { authEdge } from '~/server/auth/auth.edge';

/**
 * Type of the Context object passed to procedures/resolvers
 */
export type EdgeContext = Awaited<ReturnType<typeof createTRPCFetchContextEdge>>;

/**
 * Create tRPC context for Edge Runtime
 * Uses edge-compatible auth that doesn't require bcryptjs
 */
export const createTRPCFetchContextEdge = async ({ req }: FetchCreateContextFnOptions) => {
  // Get session using edge-compatible auth
  const session = await authEdge();

  return {
    hostName: req.headers?.get('host') ?? 'localhost',
    reqSignal: req.signal,
    session,
    userId: session?.user?.id || null,
    isAdmin: (session?.user as any)?.isAdmin || false,
  };
};

/**
 * Initialize tRPC for Edge Runtime
 */
const t = initTRPC.context<typeof createTRPCFetchContextEdge>().create({
  transformer: transformer,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof z.ZodError ? z.treeifyError(error.cause) : null,
      },
    };
  },
});

/**
 * Router and procedure exports for Edge Runtime
 */
export const createTRPCRouterEdge = t.router;
export const publicProcedureEdge = t.procedure;

/**
 * Protected procedure for Edge Runtime
 */
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be signed in to perform this action' });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId: ctx.userId,
    },
  });
});

export const protectedProcedureEdge = t.procedure.use(enforceUserIsAuthed);
