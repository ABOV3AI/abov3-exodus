/**
 * Discord Node Executor
 * Sends messages to Discord via webhook
 */

import type { NodeExecutionResult } from '../../runtime/variable-interpolator';

export interface DiscordConfig {
  webhookUrl: string;
  content?: string; // Simple text message
  username?: string;
  avatarUrl?: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    url?: string;
    color?: number; // Decimal color code
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
    footer?: {
      text: string;
      icon_url?: string;
    };
    timestamp?: string; // ISO 8601 timestamp
    thumbnail?: {
      url: string;
    };
    image?: {
      url: string;
    };
    author?: {
      name: string;
      url?: string;
      icon_url?: string;
    };
  }>;
  tts?: boolean; // Text-to-speech
}

/**
 * Execute Discord message posting
 */
export async function executeDiscordNode(config: Partial<DiscordConfig>): Promise<NodeExecutionResult> {
  try {
    // Validate required fields
    if (!config.webhookUrl) {
      throw new Error('Missing Discord webhook URL');
    }

    if (!config.content && (!config.embeds || config.embeds.length === 0)) {
      throw new Error('Message must have either content or embeds');
    }

    // Build message payload
    const payload: any = {};

    if (config.content) payload.content = config.content;
    if (config.username) payload.username = config.username;
    if (config.avatarUrl) payload.avatar_url = config.avatarUrl;
    if (config.embeds) payload.embeds = config.embeds;
    if (config.tts) payload.tts = config.tts;

    // Send via webhook
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord webhook failed: ${response.status} ${errorText}`);
    }

    // Discord webhooks return 204 No Content on success
    return {
      success: true,
      data: {
        status: response.status,
        statusText: response.statusText,
        content: config.content || (config.embeds ? `${config.embeds.length} embed(s)` : ''),
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date(),
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Discord message failed: ${error.message}`,
      timestamp: new Date(),
    };
  }
}

/**
 * Test Discord webhook connection
 */
export async function testDiscordWebhook(webhookUrl: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: 'Test message from ABOV3 FlowCore',
        embeds: [
          {
            title: 'Webhook Test',
            description: 'Your Discord webhook is configured correctly!',
            color: 5814783, // Purple color
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, message: `Webhook test failed: ${response.status} ${errorText}` };
    }

    return { success: true, message: 'Discord webhook is working' };
  } catch (error: any) {
    return { success: false, message: `Webhook test failed: ${error.message}` };
  }
}
