/**
 * Email Node Executor
 * Sends emails using SMTP via Nodemailer
 */

import nodemailer from 'nodemailer';
import type { NodeExecutionResult } from '../../runtime/variable-interpolator';

export interface EmailConfig {
  // SMTP Configuration
  host: string;
  port: number;
  secure: boolean; // true for 465, false for other ports
  auth: {
    user: string;
    pass: string;
  };
  // Email Details
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  cc?: string;
  bcc?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string;
  }>;
}

/**
 * Execute email sending
 */
export async function executeEmailNode(config: Partial<EmailConfig>): Promise<NodeExecutionResult> {
  try {
    // Validate required fields
    if (!config.host || !config.port || !config.auth?.user || !config.auth?.pass) {
      throw new Error('Missing SMTP configuration (host, port, user, pass)');
    }

    if (!config.from || !config.to || !config.subject) {
      throw new Error('Missing email details (from, to, subject)');
    }

    if (!config.text && !config.html) {
      throw new Error('Email must have either text or html content');
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure || false,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
    });

    // Verify connection
    await transporter.verify();

    // Send email
    const info = await transporter.sendMail({
      from: config.from,
      to: config.to,
      subject: config.subject,
      text: config.text,
      html: config.html,
      cc: config.cc,
      bcc: config.bcc,
      attachments: config.attachments,
    });

    return {
      success: true,
      data: {
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected,
        to: config.to,
        subject: config.subject,
      },
      timestamp: new Date(),
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Email send failed: ${error.message}`,
      timestamp: new Date(),
    };
  }
}

/**
 * Test SMTP connection without sending
 */
export async function testEmailConnection(config: Partial<EmailConfig>): Promise<{ success: boolean; message: string }> {
  try {
    if (!config.host || !config.port || !config.auth?.user || !config.auth?.pass) {
      return { success: false, message: 'Missing SMTP configuration' };
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure || false,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
    });

    await transporter.verify();
    return { success: true, message: 'SMTP connection successful' };
  } catch (error: any) {
    return { success: false, message: `SMTP connection failed: ${error.message}` };
  }
}
