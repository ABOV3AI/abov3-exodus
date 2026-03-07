import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';

import { adminProcedure, protectedProcedure, createTRPCRouter } from '../trpc.server';
import { prismaDb } from '../../prisma/prismaDb';
import {
  canModifyUserPermissions,
  getUserFeatures,
  setFeaturePermission,
  type FeatureFlag,
} from '../../auth/permissions';

const featureFlagSchema = z.enum(['NEPHESH', 'TRAIN', 'FLOWCORE', 'ADMIN_PANEL']);


const smtpConfigSchema = z.object({
  smtpHost: z.string().min(1),
  smtpPort: z.number().int().min(1).max(65535),
  smtpUser: z.string().min(1),
  smtpPassword: z.string().min(1),
  smtpFrom: z.string().email(),
  smtpSecure: z.boolean(),
});


export const adminRouter = createTRPCRouter({

  // Get current admin settings
  getSettings: adminProcedure
    .query(async () => {
      let settings = await prismaDb.adminSettings.findFirst();

      // Create default settings if none exist
      if (!settings) {
        settings = await prismaDb.adminSettings.create({
          data: {
            allowSignups: true,
            requireEmailVerification: false,
            smtpSecure: true,
          },
        });
      }

      // Don't expose password in response
      return {
        ...settings,
        smtpPassword: settings.smtpPassword ? '********' : null,
      };
    }),


  // Update SMTP configuration
  updateSmtpConfig: adminProcedure
    .input(smtpConfigSchema)
    .mutation(async ({ input }) => {
      let settings = await prismaDb.adminSettings.findFirst();

      if (!settings) {
        // Create new settings
        settings = await prismaDb.adminSettings.create({
          data: {
            ...input,
            allowSignups: true,
            requireEmailVerification: false,
          },
        });
      } else {
        // Update existing settings
        settings = await prismaDb.adminSettings.update({
          where: { id: settings.id },
          data: input,
        });
      }

      return { success: true };
    }),


  // Test SMTP connection and send test email
  testSmtpConnection: adminProcedure
    .input(z.object({
      testEmail: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      const settings = await prismaDb.adminSettings.findFirst();

      if (!settings?.smtpHost || !settings?.smtpUser || !settings?.smtpPassword) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'SMTP configuration is incomplete',
        });
      }

      try {
        // Create transporter
        const transporter = nodemailer.createTransport({
          host: settings.smtpHost,
          port: settings.smtpPort || 587,
          secure: settings.smtpSecure,
          auth: {
            user: settings.smtpUser,
            pass: settings.smtpPassword,
          },
        });

        // Verify connection
        await transporter.verify();

        // Send test email
        await transporter.sendMail({
          from: settings.smtpFrom || settings.smtpUser,
          to: input.testEmail,
          subject: 'ABOV3 Exodus - SMTP Test Email',
          text: 'This is a test email from ABOV3 Exodus. Your SMTP configuration is working correctly!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">SMTP Test Successful ✓</h2>
              <p>This is a test email from ABOV3 Exodus.</p>
              <p>Your SMTP configuration is working correctly!</p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">
                Sent from ABOV3 Exodus Admin Panel
              </p>
            </div>
          `,
        });

        return {
          success: true,
          message: 'Test email sent successfully',
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `SMTP Error: ${error.message}`,
        });
      }
    }),


  // Toggle signup allow/disallow
  toggleSignups: adminProcedure
    .input(z.object({
      allow: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      let settings = await prismaDb.adminSettings.findFirst();

      if (!settings) {
        settings = await prismaDb.adminSettings.create({
          data: {
            allowSignups: input.allow,
            requireEmailVerification: false,
            smtpSecure: true,
          },
        });
      } else {
        settings = await prismaDb.adminSettings.update({
          where: { id: settings.id },
          data: {
            allowSignups: input.allow,
          },
        });
      }

      return { success: true, allowSignups: settings.allowSignups };
    }),


  // List all users (admin only)
  listUsers: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const users = await prismaDb.user.findMany({
        take: input.limit,
        skip: input.offset,
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          isAdmin: true,
          storageMode: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              conversations: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const total = await prismaDb.user.count();

      return {
        users,
        total,
        hasMore: (input.offset + input.limit) < total,
      };
    }),


  // Make user admin
  setUserAdmin: adminProcedure
    .input(z.object({
      userId: z.string(),
      isAdmin: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      await prismaDb.user.update({
        where: { id: input.userId },
        data: { isAdmin: input.isAdmin },
      });

      return { success: true };
    }),


  // Delete user
  deleteUser: adminProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if trying to delete self
      if (input.userId === ctx.userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete your own account',
        });
      }

      // Check if target is master developer
      const target = await prismaDb.user.findUnique({
        where: { id: input.userId },
        select: { isMasterDev: true },
      });

      if (target?.isMasterDev) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot delete Master Developer account',
        });
      }

      // Delete user (cascade will handle related records)
      await prismaDb.user.delete({
        where: { id: input.userId },
      });

      return { success: true };
    }),


  // Create a new user (admin only - for when signups are disabled)
  createUser: adminProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().optional(),
      features: z.array(featureFlagSchema).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if user already exists
      const existing = await prismaDb.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email already exists',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 12);

      // Create user
      const user = await prismaDb.user.create({
        data: {
          email: input.email.toLowerCase(),
          password: hashedPassword,
          name: input.name || null,
          storageMode: 'LOCAL_ONLY',
          isAdmin: false,
          role: 'USER',
        },
      });

      // Create default user settings
      await prismaDb.userSettings.create({
        data: {
          userId: user.id,
          autoBackup: false,
          llmSettings: {},
          uiSettings: {},
        },
      });

      // Grant requested features
      if (input.features && input.features.length > 0) {
        await Promise.all(
          input.features.map((feature) =>
            prismaDb.userPermission.create({
              data: {
                userId: user.id,
                feature,
                granted: true,
                grantedBy: ctx.userId,
              },
            })
          )
        );
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      };
    }),


  // List users with their permissions
  listUsersWithPermissions: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const where = input.search
        ? {
            OR: [
              { email: { contains: input.search, mode: 'insensitive' as const } },
              { name: { contains: input.search, mode: 'insensitive' as const } },
            ],
          }
        : {};

      const users = await prismaDb.user.findMany({
        where,
        take: input.limit,
        skip: input.offset,
        select: {
          id: true,
          email: true,
          name: true,
          isAdmin: true,
          isMasterDev: true,
          role: true,
          createdAt: true,
          permissions: {
            select: {
              feature: true,
              granted: true,
              grantedAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const total = await prismaDb.user.count({ where });

      return {
        users: users.map((u) => ({
          ...u,
          features: u.permissions.filter((p) => p.granted).map((p) => p.feature),
        })),
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),


  // Update a user's feature permission
  updateUserPermission: adminProcedure
    .input(z.object({
      userId: z.string(),
      feature: featureFlagSchema,
      granted: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await setFeaturePermission(
        ctx.userId,
        input.userId,
        input.feature as FeatureFlag,
        input.granted
      );

      if (!result.success) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: result.error || 'Failed to update permission',
        });
      }

      return { success: true };
    }),


  // Bulk update permissions for multiple users
  bulkUpdatePermissions: adminProcedure
    .input(z.object({
      userIds: z.array(z.string()),
      feature: featureFlagSchema,
      granted: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const results = await Promise.all(
        input.userIds.map(async (userId) => {
          const canModify = await canModifyUserPermissions(ctx.userId, userId);
          if (!canModify) {
            return { userId, success: false, error: 'Cannot modify this user' };
          }

          const result = await setFeaturePermission(
            ctx.userId,
            userId,
            input.feature as FeatureFlag,
            input.granted
          );

          return { userId, ...result };
        })
      );

      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success);

      return {
        successful,
        failed: failed.length,
        errors: failed,
      };
    }),


  // Get current user's features (for client-side store initialization)
  getMyFeatures: protectedProcedure
    .query(async ({ ctx }) => {
      const features = await getUserFeatures(ctx.userId);

      const user = await prismaDb.user.findUnique({
        where: { id: ctx.userId },
        select: { isAdmin: true, isMasterDev: true, role: true, image: true, name: true },
      });

      return {
        features,
        isAdmin: user?.isAdmin || user?.isMasterDev || user?.role === 'ADMIN' || user?.role === 'MASTER',
        isMasterDev: user?.isMasterDev || false,
        // Avatar from database (not in JWT to avoid cookie size issues)
        avatar: user?.image || null,
        name: user?.name || null,
      };
    }),

});
