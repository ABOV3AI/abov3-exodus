import { handlers } from '~/server/auth/auth';

// Force dynamic rendering - don't prerender at build time (needs DATABASE_URL)
export const dynamic = 'force-dynamic';

export const { GET, POST } = handlers;
