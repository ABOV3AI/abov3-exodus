/**
 * Slack Webhook Endpoint
 *
 * Receives messages from Slack and triggers Nephesh job execution.
 *
 * POST /api/webhooks/slack/:profileId
 *
 * Slack sends events in this format:
 * {
 *   "type": "event_callback",
 *   "event": {
 *     "type": "message",
 *     "user": "U123456",
 *     "text": "Hello, agent!",
 *     "channel": "C123456",
 *     "ts": "1640000000.123456"
 *   }
 * }
 *
 * URL Verification (first-time setup):
 * {
 *   "type": "url_verification",
 *   "challenge": "random_string"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prismaDb } from '~/server/prisma/prismaDb';
import { enqueueExecuteJob } from '~/server/queue/job-queue';

interface SlackUrlVerification {
  type: 'url_verification';
  challenge: string;
}

interface SlackEventCallback {
  type: 'event_callback';
  event: {
    type: string;
    user?: string;
    text?: string;
    channel?: string;
    ts?: string;
    subtype?: string; // e.g., "bot_message" for bot messages
  };
  team_id?: string;
}

type SlackWebhookPayload = SlackUrlVerification | SlackEventCallback;

interface SlackChannelBinding {
  channelId: string;
  botToken?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { profileId: string } }
) {
  try {
    const profileId = params.profileId;

    // Parse webhook payload
    const payload: SlackWebhookPayload = await request.json();

    // Handle URL verification challenge (first-time webhook setup)
    if (payload.type === 'url_verification') {
      console.log(`[Slack Webhook] URL verification for profile ${profileId}`);
      return NextResponse.json({ challenge: payload.challenge }, { status: 200 });
    }

    // Handle event callback
    if (payload.type !== 'event_callback') {
      return NextResponse.json(
        { error: 'Unsupported event type' },
        { status: 400 }
      );
    }

    const event = payload.event;

    // Ignore non-message events
    if (event.type !== 'message') {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Ignore bot messages to prevent loops
    if (event.subtype === 'bot_message') {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Extract message
    const messageText = event.text;
    const channelId = event.channel;
    const userId = event.user;

    if (!messageText || !channelId) {
      return NextResponse.json(
        { error: 'Missing message text or channel ID' },
        { status: 400 }
      );
    }

    console.log(`[Slack Webhook] Received message from user ${userId} (channel: ${channelId}): ${messageText}`);

    // Load Nephesh profile
    const profile = await prismaDb.nepheshProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      console.error(`[Slack Webhook] Profile ${profileId} not found`);
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (!profile.enabled) {
      console.error(`[Slack Webhook] Profile ${profileId} is disabled`);
      return NextResponse.json(
        { error: 'Profile is disabled' },
        { status: 403 }
      );
    }

    // Verify Slack channel binding
    const channelBindings = profile.channelBindings as any;
    const slackBinding = channelBindings?.slack as SlackChannelBinding | undefined;

    if (!slackBinding || !slackBinding.channelId) {
      console.error(`[Slack Webhook] Profile ${profileId} has no Slack binding`);
      return NextResponse.json(
        { error: 'Profile is not bound to Slack' },
        { status: 403 }
      );
    }

    // Verify channel ID matches
    if (slackBinding.channelId !== channelId) {
      console.error(`[Slack Webhook] Channel ID mismatch: expected ${slackBinding.channelId}, got ${channelId}`);
      return NextResponse.json(
        { error: 'Unauthorized channel ID' },
        { status: 403 }
      );
    }

    // Create TRIGGERED job
    const job = await prismaDb.nepheshJob.create({
      data: {
        profileId: profile.id,
        name: `Slack: ${userId || 'unknown'}`,
        type: 'TRIGGERED',
        status: 'QUEUED',
        inputPrompt: messageText,
        progress: 0,
      },
    });

    console.log(`[Slack Webhook] Created job ${job.id} for profile ${profileId}`);

    // Enqueue job for execution
    try {
      await enqueueExecuteJob({
        jobId: job.id,
        profileId: profile.id,
        userId: profile.userId,
      });

      console.log(`[Slack Webhook] Enqueued job ${job.id} for execution`);

    } catch (error) {
      console.error(`[Slack Webhook] Failed to enqueue job ${job.id}:`, error);

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

    // Return success (Slack expects 200 OK within 3 seconds)
    return NextResponse.json({ ok: true, jobId: job.id }, { status: 200 });

  } catch (error) {
    console.error('[Slack Webhook] Error processing webhook:', error);
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
    message: 'Slack webhook endpoint is active',
    profileId: params.profileId,
  });
}
