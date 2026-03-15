/**
 * Sync Router
 *
 * Handles synchronization of user conversations and settings between
 * client (IndexedDB) and server (PostgreSQL).
 *
 * This enables:
 * - Cross-device conversation sync
 * - User data isolation (each user has their own data)
 * - Cloud backup of conversations
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';

import { protectedProcedure, createTRPCRouter } from '../trpc.server';
import { prismaDb } from '../../prisma/prismaDb';


// Schema for conversation metadata (without full messages)
const conversationMetadataSchema = z.object({
  id: z.string(),
  userTitle: z.string().optional().nullable(),
  autoTitle: z.string().optional().nullable(),
  isArchived: z.boolean().optional(),
  userSymbol: z.string().optional().nullable(),
  systemPurposeId: z.string().optional().nullable(),
  created: z.number(),
  updated: z.number().nullable(),
  tokenCount: z.number().optional(),
});

// Schema for full conversation with messages
const conversationSchema = z.object({
  id: z.string(),
  userTitle: z.string().optional().nullable(),
  autoTitle: z.string().optional().nullable(),
  isArchived: z.boolean().optional(),
  userSymbol: z.string().optional().nullable(),
  systemPurposeId: z.string().optional().nullable(),
  created: z.number(),
  updated: z.number().nullable(),
  tokenCount: z.number().optional(),
  messages: z.array(z.any()), // Messages are complex, store as JSON
});

export type SyncConversation = z.infer<typeof conversationSchema>;
export type SyncConversationMetadata = z.infer<typeof conversationMetadataSchema>;


export const syncRouter = createTRPCRouter({

  /**
   * Get all conversations for the current user (metadata only)
   * Used for initial sync to determine what needs to be fetched
   */
  listConversations: protectedProcedure
    .query(async ({ ctx }) => {
      const conversations = await prismaDb.dConversation.findMany({
        where: { userId: ctx.userId },
        select: {
          id: true,
          userTitle: true,
          autoTitle: true,
          isArchived: true,
          userSymbol: true,
          systemPurposeId: true,
          created: true,
          updated: true,
        },
        orderBy: { updated: 'desc' },
      });

      return conversations.map(c => ({
        id: c.id,
        userTitle: c.userTitle,
        autoTitle: c.autoTitle,
        isArchived: c.isArchived,
        userSymbol: c.userSymbol,
        systemPurposeId: c.systemPurposeId,
        created: c.created.getTime(),
        updated: c.updated.getTime(),
      }));
    }),


  /**
   * Get a single conversation with full messages
   */
  getConversation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const conversation = await prismaDb.dConversation.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId, // Ensure user owns this conversation
        },
      });

      if (!conversation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        });
      }

      return {
        id: conversation.id,
        userTitle: conversation.userTitle,
        autoTitle: conversation.autoTitle,
        isArchived: conversation.isArchived,
        userSymbol: conversation.userSymbol,
        systemPurposeId: conversation.systemPurposeId,
        created: conversation.created.getTime(),
        updated: conversation.updated.getTime(),
        messages: conversation.messages as any[],
        tokenCount: 0, // Recalculate on client
      };
    }),


  /**
   * Get all conversations with full messages (for initial sync)
   */
  getAllConversations: protectedProcedure
    .query(async ({ ctx }) => {
      const conversations = await prismaDb.dConversation.findMany({
        where: { userId: ctx.userId },
        orderBy: { updated: 'desc' },
      });

      return conversations.map(c => ({
        id: c.id,
        userTitle: c.userTitle,
        autoTitle: c.autoTitle,
        isArchived: c.isArchived,
        userSymbol: c.userSymbol,
        systemPurposeId: c.systemPurposeId,
        created: c.created.getTime(),
        updated: c.updated.getTime(),
        messages: c.messages as any[],
        tokenCount: 0,
      }));
    }),


  /**
   * Save or update a conversation
   */
  saveConversation: protectedProcedure
    .input(conversationSchema)
    .mutation(async ({ ctx, input }) => {
      // Exclude tokenCount from metadata as it's not in the DB schema (computed on client)
      const { id, messages, created, updated, tokenCount: _tokenCount, ...metadata } = input;

      // Check if conversation exists
      const existing = await prismaDb.dConversation.findFirst({
        where: { id, userId: ctx.userId },
        select: { id: true },
      });

      if (existing) {
        // Update existing
        await prismaDb.dConversation.update({
          where: { id },
          data: {
            ...metadata,
            messages: messages,
            cloudBackupAt: new Date(),
          },
        });
      } else {
        // Create new
        await prismaDb.dConversation.create({
          data: {
            id,
            userId: ctx.userId,
            ...metadata,
            messages: messages,
            created: new Date(created),
            cloudBackupAt: new Date(),
          },
        });
      }

      return { success: true, id };
    }),


  /**
   * Save multiple conversations at once (batch sync)
   */
  saveConversations: protectedProcedure
    .input(z.array(conversationSchema))
    .mutation(async ({ ctx, input }) => {
      const results: { id: string; success: boolean; error?: string }[] = [];

      for (const conversation of input) {
        try {
          // Exclude tokenCount from metadata as it's not in the DB schema (computed on client)
          const { id, messages, created, updated, tokenCount: _tokenCount, ...metadata } = conversation;

          const existing = await prismaDb.dConversation.findFirst({
            where: { id, userId: ctx.userId },
            select: { id: true },
          });

          if (existing) {
            await prismaDb.dConversation.update({
              where: { id },
              data: {
                ...metadata,
                messages: messages,
                cloudBackupAt: new Date(),
              },
            });
          } else {
            await prismaDb.dConversation.create({
              data: {
                id,
                userId: ctx.userId,
                ...metadata,
                messages: messages,
                created: new Date(created),
                cloudBackupAt: new Date(),
              },
            });
          }

          results.push({ id, success: true });
        } catch (error: any) {
          results.push({ id: conversation.id, success: false, error: error.message });
        }
      }

      return {
        total: input.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success),
      };
    }),


  /**
   * Delete a conversation
   */
  deleteConversation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Only delete if user owns it
      const deleted = await prismaDb.dConversation.deleteMany({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
      });

      return { success: deleted.count > 0 };
    }),


  /**
   * Delete multiple conversations
   */
  deleteConversations: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await prismaDb.dConversation.deleteMany({
        where: {
          id: { in: input.ids },
          userId: ctx.userId,
        },
      });

      return { deleted: deleted.count };
    }),


  /**
   * Get user settings from server
   */
  getSettings: protectedProcedure
    .query(async ({ ctx }) => {
      const settings = await prismaDb.userSettings.findUnique({
        where: { userId: ctx.userId },
      });

      if (!settings) {
        return null;
      }

      return {
        llmSettings: settings.llmSettings,
        uiSettings: settings.uiSettings,
        appSettings: settings.appSettings,
        workflowData: settings.workflowData,
        autoBackup: settings.autoBackup,
      };
    }),


  /**
   * Save user settings to server
   */
  saveSettings: protectedProcedure
    .input(z.object({
      llmSettings: z.any().optional(),
      uiSettings: z.any().optional(),
      appSettings: z.any().optional(),
      workflowData: z.any().optional(),
      autoBackup: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await prismaDb.userSettings.upsert({
        where: { userId: ctx.userId },
        create: {
          userId: ctx.userId,
          llmSettings: input.llmSettings || {},
          uiSettings: input.uiSettings || {},
          appSettings: input.appSettings || {},
          workflowData: input.workflowData || {},
          autoBackup: input.autoBackup ?? false,
        },
        update: {
          ...(input.llmSettings !== undefined && { llmSettings: input.llmSettings }),
          ...(input.uiSettings !== undefined && { uiSettings: input.uiSettings }),
          ...(input.appSettings !== undefined && { appSettings: input.appSettings }),
          ...(input.workflowData !== undefined && { workflowData: input.workflowData }),
          ...(input.autoBackup !== undefined && { autoBackup: input.autoBackup }),
        },
      });

      return { success: true };
    }),

});
