/**
 * Telegram Webhook Endpoint
 *
 * Receives messages from Telegram and triggers Nephesh job execution.
 *
 * POST /api/webhooks/telegram/:profileId
 *
 * Telegram sends updates in this format:
 * {
 *   "update_id": 123456789,
 *   "message": {
 *     "message_id": 1,
 *     "from": { "id": 987654321, "first_name": "John", "username": "john" },
 *     "chat": { "id": 987654321, "first_name": "John", "type": "private" },
 *     "date": 1640000000,
 *     "text": "Hello, agent!"
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prismaDb } from '~/server/prisma/prismaDb';
import { enqueueExecuteJob } from '~/server/queue/job-queue';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      first_name?: string;
      type: string;
    };
    date: number;
    text?: string;
  };
}

interface TelegramChannelBinding {
  chatId: string;
  botToken?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { profileId: string } }
) {
  try {
    const profileId = params.profileId;

    // Parse webhook payload
    const update: TelegramUpdate = await request.json();

    // Extract message
    const message = update.message;
    if (!message || !message.text) {
      return NextResponse.json(
        { error: 'No message text found in update' },
        { status: 400 }
      );
    }

    const messageText = message.text;
    const chatId = message.chat.id.toString();
    const username = message.from.username || message.from.first_name;

    console.log(`[Telegram Webhook] Received message from ${username} (chat: ${chatId}): ${messageText}`);

    // Load Nephesh profile
    const profile = await prismaDb.nepheshProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      console.error(`[Telegram Webhook] Profile ${profileId} not found`);
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (!profile.enabled) {
      console.error(`[Telegram Webhook] Profile ${profileId} is disabled`);
      return NextResponse.json(
        { error: 'Profile is disabled' },
        { status: 403 }
      );
    }

    // Verify Telegram channel binding
    const channelBindings = profile.channelBindings as any;
    const telegramBinding = channelBindings?.telegram as TelegramChannelBinding | undefined;

    if (!telegramBinding || !telegramBinding.chatId) {
      console.error(`[Telegram Webhook] Profile ${profileId} has no Telegram binding`);
      return NextResponse.json(
        { error: 'Profile is not bound to Telegram' },
        { status: 403 }
      );
    }

    // Verify chat ID matches
    if (telegramBinding.chatId !== chatId) {
      console.error(`[Telegram Webhook] Chat ID mismatch: expected ${telegramBinding.chatId}, got ${chatId}`);
      return NextResponse.json(
        { error: 'Unauthorized chat ID' },
        { status: 403 }
      );
    }

    // Create TRIGGERED job
    const job = await prismaDb.nepheshJob.create({
      data: {
        profileId: profile.id,
        name: `Telegram: ${username}`,
        type: 'TRIGGERED',
        status: 'QUEUED',
        inputPrompt: messageText,
        progress: 0,
      },
    });

    console.log(`[Telegram Webhook] Created job ${job.id} for profile ${profileId}`);

    // Enqueue job for execution
    try {
      await enqueueExecuteJob({
        jobId: job.id,
        profileId: profile.id,
        userId: profile.userId,
      });

      console.log(`[Telegram Webhook] Enqueued job ${job.id} for execution`);

    } catch (error) {
      console.error(`[Telegram Webhook] Failed to enqueue job ${job.id}:`, error);

      // Mark job as error
      await prismaDb.nepheshJob.update({
        where: { id: job.id },
        data: {
          status: 'ERROR',
          error: `Failed to enqueue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      });

      return NextResponse.json(
        { error: 'Failed to enqueue job' },
        { status: 500 }
      );
    }

    // Return success (Telegram expects 200 OK)
    return NextResponse.json({ ok: true, jobId: job.id }, { status: 200 });

  } catch (error) {
    console.error('[Telegram Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for webhook verification
 * Some Telegram bot frameworks send GET requests to verify the webhook URL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { profileId: string } }
) {
  return NextResponse.json({
    ok: true,
    message: 'Telegram webhook endpoint is active',
    profileId: params.profileId,
  });
}
