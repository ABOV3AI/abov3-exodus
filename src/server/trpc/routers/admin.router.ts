import { z } from 'zod/v4';
import { TRPCError } from '@trpc/server';
import nodemailer from 'nodemailer';

import { adminProcedure, publicProcedure, router } from '../trpc.server';
import { prismaDb } from '../../prisma/prismaDb';


const smtpConfigSchema = z.object({
  smtpHost: z.string().min(1),
  smtpPort: z.number().int().min(1).max(65535),
  smtpUser: z.string().min(1),
  smtpPassword: z.string().min(1),
  smtpFrom: z.string().email(),
  smtpSecure: z.boolean(),
});


export const adminRouter = router({

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
        const transporter = nodemailer.createTransporter({
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
    .mutation(async ({ input }) => {
      // Delete user (cascade will handle related records)
      await prismaDb.user.delete({
        where: { id: input.userId },
      });

      return { success: true };
    }),

});
