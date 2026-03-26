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
import {
  getCurrentVersion,
  listBackups,
  deleteBackup,
  cleanupOldBackups,
  UpdateEngine,
  getUpdateSystemInfo,
} from '../../update';

const featureFlagSchema = z.enum(['NEPHESH', 'TRAIN', 'FLOWCORE', 'ADMIN_PANEL', 'ABOV3_MODELS']);
const userRoleSchema = z.enum(['USER', 'DEVELOPER', 'ADMIN', 'MASTER']);

// Generate random alphanumeric code (8 characters)
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars: 0, O, I, 1
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}


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


  // Update user details (admin only)
  updateUser: adminProcedure
    .input(z.object({
      userId: z.string(),
      email: z.string().email().optional(),
      name: z.string().optional(),
      newPassword: z.string().min(8).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if target exists
      const target = await prismaDb.user.findUnique({
        where: { id: input.userId },
        select: { isMasterDev: true, email: true },
      });

      if (!target) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Check if trying to modify master developer (only master can modify master)
      if (target.isMasterDev) {
        const currentUser = await prismaDb.user.findUnique({
          where: { id: ctx.userId },
          select: { isMasterDev: true },
        });
        if (!currentUser?.isMasterDev) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cannot modify Master Developer account',
          });
        }
      }

      // Check if email is being changed and if it's already taken
      if (input.email && input.email.toLowerCase() !== target.email.toLowerCase()) {
        const existing = await prismaDb.user.findUnique({
          where: { email: input.email.toLowerCase() },
        });
        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Email is already in use by another account',
          });
        }
      }

      // Build update data
      const updateData: any = {};
      if (input.email) updateData.email = input.email.toLowerCase();
      if (input.name !== undefined) updateData.name = input.name || null;
      if (input.newPassword) {
        updateData.password = await bcrypt.hash(input.newPassword, 12);
      }

      // Update user
      const updated = await prismaDb.user.update({
        where: { id: input.userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      return { success: true, user: updated };
    }),


  // Update user role (admin only)
  updateUserRole: adminProcedure
    .input(z.object({
      userId: z.string(),
      role: userRoleSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if target exists
      const target = await prismaDb.user.findUnique({
        where: { id: input.userId },
        select: { isMasterDev: true, role: true },
      });

      if (!target) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Cannot modify master developer role
      if (target.isMasterDev) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot modify Master Developer role',
        });
      }

      // Cannot set someone to MASTER role unless you're a master dev
      if (input.role === 'MASTER') {
        const currentUser = await prismaDb.user.findUnique({
          where: { id: ctx.userId },
          select: { isMasterDev: true },
        });
        if (!currentUser?.isMasterDev) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only Master Developers can assign MASTER role',
          });
        }
      }

      // Update role and isAdmin flag
      const isAdmin = input.role === 'ADMIN' || input.role === 'MASTER';

      const updated = await prismaDb.user.update({
        where: { id: input.userId },
        data: {
          role: input.role,
          isAdmin,
        },
        select: {
          id: true,
          role: true,
          isAdmin: true,
        },
      });

      return { success: true, user: updated };
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


  // ===== SOFTWARE UPDATE PROCEDURES =====

  // Get update system info and history (Master Dev only)
  getUpdateStatus: adminProcedure
    .query(async ({ ctx }) => {
      // Check if user is Master Developer
      const user = await prismaDb.user.findUnique({
        where: { id: ctx.userId },
        select: { isMasterDev: true },
      });

      if (!user?.isMasterDev) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Master Developers can access software updates',
        });
      }

      const systemInfo = await getUpdateSystemInfo();
      const backups = await listBackups();

      // Get update history from database
      const updates = await prismaDb.softwareUpdate.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      return {
        ...systemInfo,
        updates,
        backups: backups.slice(0, 10),
      };
    }),


  // List available backups (Master Dev only)
  listUpdateBackups: adminProcedure
    .query(async ({ ctx }) => {
      const user = await prismaDb.user.findUnique({
        where: { id: ctx.userId },
        select: { isMasterDev: true },
      });

      if (!user?.isMasterDev) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Master Developers can access software updates',
        });
      }

      const backups = await listBackups();
      return { backups };
    }),


  // Trigger rollback to a backup (Master Dev only)
  rollbackUpdate: adminProcedure
    .input(z.object({
      backupPath: z.string(),
      updateId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await prismaDb.user.findUnique({
        where: { id: ctx.userId },
        select: { isMasterDev: true },
      });

      if (!user?.isMasterDev) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Master Developers can rollback updates',
        });
      }

      const engine = new UpdateEngine();
      const result = await engine.rollback(input.backupPath);

      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Rollback failed',
        });
      }

      // Update database record if provided
      if (input.updateId) {
        await prismaDb.softwareUpdate.update({
          where: { id: input.updateId },
          data: {
            status: 'ROLLED_BACK',
            rollbackAt: new Date(),
          },
        });
      }

      return {
        success: true,
        message: 'Rollback initiated. Application will restart.',
      };
    }),


  // Delete a backup (Master Dev only)
  deleteUpdateBackup: adminProcedure
    .input(z.object({
      backupPath: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await prismaDb.user.findUnique({
        where: { id: ctx.userId },
        select: { isMasterDev: true },
      });

      if (!user?.isMasterDev) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Master Developers can delete backups',
        });
      }

      await deleteBackup(input.backupPath);
      return { success: true };
    }),


  // Clean up old backups, keeping only the most recent N (Master Dev only)
  cleanupOldBackups: adminProcedure
    .input(z.object({
      keepCount: z.number().min(1).max(20).default(5),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await prismaDb.user.findUnique({
        where: { id: ctx.userId },
        select: { isMasterDev: true },
      });

      if (!user?.isMasterDev) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Master Developers can cleanup backups',
        });
      }

      const deleted = await cleanupOldBackups(input.keepCount);
      return { deleted };
    }),


  // ===== INVITATION CODE PROCEDURES =====

  // Generate a new invitation code (Master Dev only)
  generateInvitationCode: adminProcedure
    .input(z.object({
      email: z.string().email().optional(), // Pre-assign to specific email
      note: z.string().max(200).optional(), // Internal note
      maxUses: z.number().min(1).max(100).default(1),
      expiresInDays: z.number().min(1).max(365).optional(), // Optional expiration
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if user is Master Developer
      const user = await prismaDb.user.findUnique({
        where: { id: ctx.userId },
        select: { isMasterDev: true },
      });

      if (!user?.isMasterDev) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Master Developers can generate invitation codes',
        });
      }

      // Generate unique code (retry if collision)
      let code: string;
      let attempts = 0;
      do {
        code = generateInviteCode();
        const existing = await prismaDb.invitationCode.findUnique({
          where: { code },
        });
        if (!existing) break;
        attempts++;
      } while (attempts < 10);

      if (attempts >= 10) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate unique code. Please try again.',
        });
      }

      // Calculate expiration date if specified
      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      // Create invitation code
      const invitation = await prismaDb.invitationCode.create({
        data: {
          code,
          createdById: ctx.userId,
          email: input.email?.toLowerCase() || null,
          note: input.note || null,
          maxUses: input.maxUses,
          expiresAt,
        },
      });

      return {
        success: true,
        invitation: {
          id: invitation.id,
          code: invitation.code,
          email: invitation.email,
          note: invitation.note,
          maxUses: invitation.maxUses,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
        },
      };
    }),


  // Generate multiple invitation codes at once (Master Dev only)
  generateBulkInvitationCodes: adminProcedure
    .input(z.object({
      count: z.number().min(1).max(50),
      note: z.string().max(200).optional(),
      maxUses: z.number().min(1).max(100).default(1),
      expiresInDays: z.number().min(1).max(365).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if user is Master Developer
      const user = await prismaDb.user.findUnique({
        where: { id: ctx.userId },
        select: { isMasterDev: true },
      });

      if (!user?.isMasterDev) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Master Developers can generate invitation codes',
        });
      }

      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      const codes: string[] = [];
      const usedCodes = new Set<string>();

      // Generate unique codes
      for (let i = 0; i < input.count; i++) {
        let code: string;
        let attempts = 0;
        do {
          code = generateInviteCode();
          attempts++;
        } while ((usedCodes.has(code) || await prismaDb.invitationCode.findUnique({ where: { code } })) && attempts < 10);

        if (attempts >= 10) continue;
        usedCodes.add(code);
        codes.push(code);
      }

      // Bulk create
      const invitations = await prismaDb.$transaction(
        codes.map((code) =>
          prismaDb.invitationCode.create({
            data: {
              code,
              createdById: ctx.userId,
              note: input.note || null,
              maxUses: input.maxUses,
              expiresAt,
            },
          })
        )
      );

      return {
        success: true,
        count: invitations.length,
        codes: invitations.map((i: { code: string }) => i.code),
      };
    }),


  // List all invitation codes (Master Dev only)
  listInvitationCodes: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      status: z.enum(['ACTIVE', 'EXHAUSTED', 'EXPIRED', 'REVOKED', 'ALL']).default('ALL'),
    }))
    .query(async ({ input, ctx }) => {
      // Check if user is Master Developer
      const user = await prismaDb.user.findUnique({
        where: { id: ctx.userId },
        select: { isMasterDev: true },
      });

      if (!user?.isMasterDev) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Master Developers can view invitation codes',
        });
      }

      const where = input.status !== 'ALL' ? { status: input.status as any } : {};

      const invitations = await prismaDb.invitationCode.findMany({
        where,
        take: input.limit,
        skip: input.offset,
        include: {
          usages: {
            select: {
              userId: true,
              userEmail: true,
              usedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const total = await prismaDb.invitationCode.count({ where });

      return {
        invitations,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),


  // Get invitation statistics (Master Dev only)
  getInvitationStats: adminProcedure
    .query(async ({ ctx }) => {
      const user = await prismaDb.user.findUnique({
        where: { id: ctx.userId },
        select: { isMasterDev: true },
      });

      if (!user?.isMasterDev) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Master Developers can view invitation statistics',
        });
      }

      const [total, active, used, expired, revoked, totalUsages] = await Promise.all([
        prismaDb.invitationCode.count(),
        prismaDb.invitationCode.count({ where: { status: 'ACTIVE' } }),
        prismaDb.invitationCode.count({ where: { status: 'EXHAUSTED' } }),
        prismaDb.invitationCode.count({ where: { status: 'EXPIRED' } }),
        prismaDb.invitationCode.count({ where: { status: 'REVOKED' } }),
        prismaDb.invitationUsage.count(),
      ]);

      // Get recent activations (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentActivations = await prismaDb.invitationUsage.count({
        where: { usedAt: { gte: weekAgo } },
      });

      return {
        total,
        active,
        used,
        expired,
        revoked,
        totalUsages,
        recentActivations,
      };
    }),


  // Revoke an invitation code (Master Dev only)
  revokeInvitationCode: adminProcedure
    .input(z.object({
      invitationId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await prismaDb.user.findUnique({
        where: { id: ctx.userId },
        select: { isMasterDev: true },
      });

      if (!user?.isMasterDev) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Master Developers can revoke invitation codes',
        });
      }

      const invitation = await prismaDb.invitationCode.findUnique({
        where: { id: input.invitationId },
      });

      if (!invitation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitation code not found',
        });
      }

      await prismaDb.invitationCode.update({
        where: { id: input.invitationId },
        data: { status: 'REVOKED' },
      });

      return { success: true };
    }),


  // Reactivate a revoked invitation code (Master Dev only)
  reactivateInvitationCode: adminProcedure
    .input(z.object({
      invitationId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await prismaDb.user.findUnique({
        where: { id: ctx.userId },
        select: { isMasterDev: true },
      });

      if (!user?.isMasterDev) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Master Developers can reactivate invitation codes',
        });
      }

      const invitation = await prismaDb.invitationCode.findUnique({
        where: { id: input.invitationId },
      });

      if (!invitation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitation code not found',
        });
      }

      if (invitation.status !== 'REVOKED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only revoked codes can be reactivated',
        });
      }

      // Check if it should be exhausted
      const newStatus = invitation.useCount >= invitation.maxUses ? 'EXHAUSTED' : 'ACTIVE';

      await prismaDb.invitationCode.update({
        where: { id: input.invitationId },
        data: { status: newStatus },
      });

      return { success: true, newStatus };
    }),


  // Delete an invitation code (Master Dev only, only if unused)
  deleteInvitationCode: adminProcedure
    .input(z.object({
      invitationId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await prismaDb.user.findUnique({
        where: { id: ctx.userId },
        select: { isMasterDev: true },
      });

      if (!user?.isMasterDev) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Master Developers can delete invitation codes',
        });
      }

      const invitation = await prismaDb.invitationCode.findUnique({
        where: { id: input.invitationId },
        include: { usages: true },
      });

      if (!invitation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitation code not found',
        });
      }

      if (invitation.usages.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete invitation codes that have been used. Revoke instead.',
        });
      }

      await prismaDb.invitationCode.delete({
        where: { id: input.invitationId },
      });

      return { success: true };
    }),

});
