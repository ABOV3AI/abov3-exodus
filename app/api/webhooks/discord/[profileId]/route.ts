/**
 * Discord Webhook Endpoint
 *
 * Receives messages from Discord and triggers Nephesh job execution.
 *
 * POST /api/webhooks/discord/:profileId
 *
 * Discord sends events in this format:
 * {
 *   "type": 0, // MESSAGE_CREATE
 *   "id": "123456789",
 *   "content": "Hello, agent!",
 *   "channel_id": "987654321",
 *   "author": {
 *     "id": "111111111",
 *     "username": "john",
 *     "discriminator": "1234"
 *   },
 *   "timestamp": "2021-12-20T00:00:00.000000+00:00"
 * }
 *
 * Interaction format (for slash commands):
 * {
 *   "type": 2, // APPLICATION_COMMAND
 *   "id": "123456789",
 *   "data": {
 *     "name": "ask",
 *     "options": [{ "name": "question", "value": "Hello" }]
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prismaDb } from '~/server/prisma/prismaDb';
import { enqueueExecuteJob } from '~/server/queue/job-queue';

interface DiscordMessage {
  type: number; // 0 = MESSAGE_CREATE, 2 = APPLICATION_COMMAND
  id: string;
  content?: string;
  channel_id?: string;
  author?: {
    id: string;
    username: string;
    discriminator?: string;
    bot?: boolean;
  };
  timestamp?: string;
  data?: {
    name: string;
    options?: Array<{ name: string; value: string }>;
  };
}

interface DiscordChannelBinding {
  channelId: string;
  botToken?: string;
}

const DISCORD_MESSAGE_CREATE = 0;
const DISCORD_APPLICATION_COMMAND = 2;

export async function POST(
  request: NextRequest,
  { params }: { params: { profileId: string } }
) {
  try {
    const profileId = params.profileId;

    // Parse webhook payload
    const message: DiscordMessage = await request.json();

    // Extract message content
    let messageText: string | undefined;
    let channelId: string | undefined;
    let username: string | undefined;

    if (message.type === DISCORD_MESSAGE_CREATE) {
      // Regular message
      messageText = message.content;
      channelId = message.channel_id;
      username = message.author?.username;

      // Ignore bot messages to prevent loops
      if (message.author?.bot) {
        return NextResponse.json({ ok: true }, { status: 200 });
      }
    } else if (message.type === DISCORD_APPLICATION_COMMAND) {
      // Slash command interaction
      const commandName = message.data?.name;
      const options = message.data?.options;

      // Extract question from options
      messageText = options?.find(opt => opt.name === 'question')?.value;
      channelId = message.channel_id;
      username = 'slash-command';

      console.log(`[Discord Webhook] Slash command: /${commandName}`);
    }

    if (!messageText || !channelId) {
      return NextResponse.json(
        { error: 'Missing message content or channel ID' },
        { status: 400 }
      );
    }

    console.log(`[Discord Webhook] Received message from ${username} (channel: ${channelId}): ${messageText}`);

    // Load Nephesh profile
    const profile = await prismaDb.nepheshProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      console.error(`[Discord Webhook] Profile ${profileId} not found`);
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (!profile.enabled) {
      console.error(`[Discord Webhook] Profile ${profileId} is disabled`);
      return NextResponse.json(
        { error: 'Profile is disabled' },
        { status: 403 }
      );
    }

    // Verify Discord channel binding
    const channelBindings = profile.channelBindings as any;
    const discordBinding = channelBindings?.discord as DiscordChannelBinding | undefined;

    if (!discordBinding || !discordBinding.channelId) {
      console.error(`[Discord Webhook] Profile ${profileId} has no Discord binding`);
      return NextResponse.json(
        { error: 'Profile is not bound to Discord' },
        { status: 403 }
      );
    }

    // Verify channel ID matches
    if (discordBinding.channelId !== channelId) {
      console.error(`[Discord Webhook] Channel ID mismatch: expected ${discordBinding.channelId}, got ${channelId}`);
      return NextResponse.json(
        { error: 'Unauthorized channel ID' },
        { status: 403 }
      );
    }

    // Create TRIGGERED job
    const job = await prismaDb.nepheshJob.create({
      data: {
        profileId: profile.id,
        name: `Discord: ${username || 'unknown'}`,
        type: 'TRIGGERED',
        status: 'QUEUED',
        inputPrompt: messageText,
        progress: 0,
      },
    });

    console.log(`[Discord Webhook] Created job ${job.id} for profile ${profileId}`);

    // Enqueue job for execution
    try {
      await enqueueExecuteJob({
        jobId: job.id,
        profileId: profile.id,
        userId: profile.userId,
      });

      console.log(`[Discord Webhook] Enqueued job ${job.id} for execution`);

    } catch (error) {
      console.error(`[Discord Webhook] Failed to enqueue job ${job.id}:`, error);

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

    // Return success
    // For interactions (type 2), Discord expects a specific response format
    if (message.type === DISCORD_APPLICATION_COMMAND) {
      return NextResponse.json({
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          content: `Processing your request... (Job ID: ${job.id})`,
        },
      }, { status: 200 });
    }

    // For regular messages
    return NextResponse.json({ ok: true, jobId: job.id }, { status: 200 });

  } catch (error) {
    console.error('[Discord Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for webhook verification
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { profileId: string } }
) {
  return NextResponse.json({
    ok: true,
    message: 'Discord webhook endpoint is active',
    profileId: params.profileId,
  });
}
