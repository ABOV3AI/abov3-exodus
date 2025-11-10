import NextAuth from 'next-auth';
import { authConfig } from '~/server/auth/auth.config';
import { env } from '~/server/env';


// Extend NextAuth configuration with secret
const handler = NextAuth({
  ...authConfig,
  secret: env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production',
});

export { handler as GET, handler as POST };
