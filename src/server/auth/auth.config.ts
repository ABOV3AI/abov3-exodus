import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Resend from 'next-auth/providers/resend';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { z } from 'zod/v4';

import { prismaDb } from '../prisma/prismaDb';
import { env } from '../env';


// Email configuration from Admin Settings or environment variables
async function getEmailConfig() {
  try {
    // Try to get SMTP config from AdminSettings table
    const adminSettings = await prismaDb.adminSettings.findFirst();

    if (adminSettings?.smtpHost && adminSettings?.smtpUser && adminSettings?.smtpPassword) {
      return {
        server: {
          host: adminSettings.smtpHost,
          port: adminSettings.smtpPort || 587,
          auth: {
            user: adminSettings.smtpUser,
            pass: adminSettings.smtpPassword,
          },
          secure: adminSettings.smtpSecure,
        },
        from: adminSettings.smtpFrom || env.EMAIL_FROM || 'noreply@abov3-exodus.com',
      };
    }
  } catch (error) {
    console.warn('Failed to load admin SMTP settings, using environment variables:', error);
  }

  // Fallback to environment variables
  if (env.EMAIL_SERVER_HOST && env.EMAIL_SERVER_USER && env.EMAIL_SERVER_PASSWORD) {
    return {
      server: {
        host: env.EMAIL_SERVER_HOST,
        port: parseInt(env.EMAIL_SERVER_PORT || '587'),
        auth: {
          user: env.EMAIL_SERVER_USER,
          pass: env.EMAIL_SERVER_PASSWORD,
        },
        secure: true,
      },
      from: env.EMAIL_FROM || 'noreply@abov3-exodus.com',
    };
  }

  // Return null if no email config available
  return null;
}

// Validation schemas
const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});


export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prismaDb),

  // Secret for JWT signing (required in production)
  secret: env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production',

  // Base URL for callbacks
  basePath: '/api/auth',

  // Session configuration
  session: {
    strategy: 'jwt', // Use JWT for better serverless compatibility
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Pages configuration
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/auth/welcome',
  },

  // Providers configuration
  providers: [
    // Email + Password provider
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          // Validate input
          const { email, password } = signInSchema.parse(credentials);

          // Find user by email
          const user = await prismaDb.user.findUnique({
            where: { email: email.toLowerCase() },
          });

          if (!user || !user.password) {
            return null; // User doesn't exist or hasn't set a password
          }

          // Verify password - use dynamic import to avoid Edge Runtime bundling issues
          const bcrypt = await import('bcryptjs').then(m => m.default);
          const isValidPassword = await bcrypt.compare(password, user.password);

          if (!isValidPassword) {
            return null; // Invalid password
          }

          // Return user object (password excluded)
          // Don't include image if it's a large base64 data URL (would overflow JWT cookie)
          const imageForToken = user.image?.startsWith('data:') ? null : user.image;
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: imageForToken,
            emailVerified: user.emailVerified,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),

    // Magic Link (Email) provider - can be configured later via Admin Panel
    // Uncomment and configure when SMTP is set up:
    // Resend({
    //   apiKey: process.env.RESEND_API_KEY,
    //   from: process.env.EMAIL_FROM || 'noreply@abov3-exodus.com',
    // }),
  ],

  // Callbacks
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      // Check if signups are allowed
      const adminSettings = await prismaDb.adminSettings.findFirst();
      const allowSignups = adminSettings?.allowSignups ?? true;

      // Allow existing users to sign in
      if (user.id) return true;

      // Block new signups if disabled
      if (!allowSignups) {
        console.log('New signups are disabled');
        return false;
      }

      return true;
    },

    async jwt({ token, user, account, profile, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;

        // Fetch additional user data
        const dbUser = await prismaDb.user.findUnique({
          where: { id: user.id },
          select: {
            isAdmin: true,
            storageMode: true,
          },
        });

        if (dbUser) {
          token.isAdmin = dbUser.isAdmin;
          token.storageMode = dbUser.storageMode;
        }
      }

      // Update token on session update
      if (trigger === 'update' && session) {
        token = { ...token, ...session };
      }

      return token;
    },

    async session({ session, token, user }) {
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

  // Events
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      if (isNewUser) {
        console.log('New user signed up:', user.email);

        // Create default user settings
        await prismaDb.userSettings.create({
          data: {
            userId: user.id as string,
            autoBackup: false,
            llmSettings: {},
            uiSettings: {},
          },
        });
      }
    },
  },

  // Debug mode
  debug: process.env.NODE_ENV === 'development',
};

/**
 * Check if public signups are enabled
 * Returns false if AdminSettings has allowSignups = false
 */
export async function areSignupsEnabled(): Promise<boolean> {
  try {
    const adminSettings = await prismaDb.adminSettings.findFirst();
    // Default to true if no settings exist
    return adminSettings?.allowSignups ?? true;
  } catch {
    return true;
  }
}

/**
 * Beta mode: Signups should be disabled
 * Set this in AdminSettings table during deployment
 */
export const BETA_SIGNUPS_DISABLED_MESSAGE =
  'Registration is currently closed for beta testing. Contact the administrator to request access.';
