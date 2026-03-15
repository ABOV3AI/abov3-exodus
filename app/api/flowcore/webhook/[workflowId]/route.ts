import { NextRequest, NextResponse } from 'next/server';

// This webhook endpoint allows external systems to trigger workflow execution
// Usage: POST /api/flowcore/webhook/[workflowId]
// Body: JSON with optional input data
//
// SECURITY: Webhook authentication is REQUIRED in production.
// Set FLOWCORE_WEBHOOK_SECRET environment variable and pass it as Bearer token.

/**
 * Validate webhook authentication
 * In production, FLOWCORE_WEBHOOK_SECRET is required.
 * In development, it's optional for convenience.
 */
function validateWebhookAuth(request: NextRequest): { valid: boolean; error?: string } {
  const authHeader = request.headers.get('Authorization');
  const webhookSecret = process.env.FLOWCORE_WEBHOOK_SECRET;

  // In development, allow unauthenticated requests if no secret is configured
  if (process.env.NODE_ENV === 'development' && !webhookSecret) {
    console.warn('[FlowCore Webhook] WARNING: No FLOWCORE_WEBHOOK_SECRET configured - accepting unauthenticated requests in development');
    return { valid: true };
  }

  // In production, require the secret to be configured
  if (!webhookSecret) {
    console.error('[FlowCore Webhook] FLOWCORE_WEBHOOK_SECRET not configured - rejecting all webhook requests');
    return { valid: false, error: 'Webhook authentication not configured. Set FLOWCORE_WEBHOOK_SECRET.' };
  }

  // Validate the bearer token
  if (!authHeader || authHeader !== `Bearer ${webhookSecret}`) {
    return { valid: false, error: 'Unauthorized: Invalid or missing webhook secret' };
  }

  return { valid: true };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await params;

    // SECURITY: Validate webhook authentication
    const authResult = validateWebhookAuth(request);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    // Parse incoming payload
    let payload: Record<string, any> = {};
    try {
      payload = await request.json();
    } catch (e) {
      // No body or invalid JSON - that's okay, we'll use empty payload
    }

    // In a real implementation, this would:
    // 1. Look up the workflow from storage
    // 2. Validate that webhook triggers are enabled
    // 3. Queue the workflow for execution with the payload
    // 4. Return execution ID

    // For now, we'll return a mock response
    const executionId = `exec-webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[FlowCore Webhook] Triggered workflow ${workflowId} with execution ${executionId}`);
    console.log('[FlowCore Webhook] Payload:', payload);

    return NextResponse.json({
      success: true,
      workflowId,
      executionId,
      message: 'Workflow triggered successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[FlowCore Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// GET method to check webhook status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  const { workflowId } = await params;

  return NextResponse.json({
    workflowId,
    webhookUrl: `/api/flowcore/webhook/${workflowId}`,
    status: 'active',
    message: 'Webhook endpoint is ready to receive triggers',
  });
}
