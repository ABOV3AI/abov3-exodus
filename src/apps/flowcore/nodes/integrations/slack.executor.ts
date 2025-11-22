/**
 * Slack Node Executor
 * Sends messages to Slack via webhook or API
 */

import type { NodeExecutionResult } from '../../runtime/variable-interpolator';

export interface SlackConfig {
  webhookUrl?: string; // Slack webhook URL
  channel?: string;
  username?: string;
  iconEmoji?: string;
  iconUrl?: string;
  text: string;
  blocks?: any[]; // Slack Block Kit blocks
  attachments?: any[]; // Legacy attachments
  // For OAuth-based posting (future)
  token?: string;
}

/**
 * Execute Slack message posting
 */
export async function executeSlackNode(config: Partial<SlackConfig>): Promise<NodeExecutionResult> {
  try {
    // Validate required fields
    if (!config.webhookUrl && !config.token) {
      throw new Error('Missing Slack webhook URL or token');
    }

    if (!config.text && !config.blocks) {
      throw new Error('Message must have either text or blocks');
    }

    // Build message payload
    const payload: any = {
      text: config.text,
    };

    if (config.channel) payload.channel = config.channel;
    if (config.username) payload.username = config.username;
    if (config.iconEmoji) payload.icon_emoji = config.iconEmoji;
    if (config.iconUrl) payload.icon_url = config.iconUrl;
    if (config.blocks) payload.blocks = config.blocks;
    if (config.attachments) payload.attachments = config.attachments;

    // Send via webhook
    if (config.webhookUrl) {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Slack webhook failed: ${response.status} ${errorText}`);
      }

      const responseText = await response.text();

      return {
        success: true,
        data: {
          response: responseText,
          channel: config.channel || 'default',
          text: config.text,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date(),
      };
    }

    // Send via API (future enhancement)
    if (config.token) {
      throw new Error('Slack API token method not yet implemented. Use webhook URL.');
    }

    throw new Error('No valid Slack posting method configured');
  } catch (error: any) {
    return {
      success: false,
      error: `Slack message failed: ${error.message}`,
      timestamp: new Date(),
    };
  }
}

/**
 * Test Slack webhook connection
 */
export async function testSlackWebhook(webhookUrl: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'Test message from ABOV3 FlowCore',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, message: `Webhook test failed: ${response.status} ${errorText}` };
    }

    return { success: true, message: 'Slack webhook is working' };
  } catch (error: any) {
    return { success: false, message: `Webhook test failed: ${error.message}` };
  }
}
