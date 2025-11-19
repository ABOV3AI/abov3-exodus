import { NextRequest, NextResponse } from 'next/server';

// This webhook endpoint allows external systems to trigger workflow execution
// Usage: POST /api/flowcore/webhook/[workflowId]
// Body: JSON with optional input data

export async function POST(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const { workflowId } = params;

    // Parse incoming payload
    let payload: Record<string, any> = {};
    try {
      payload = await request.json();
    } catch (e) {
      // No body or invalid JSON - that's okay, we'll use empty payload
    }

    // Validate webhook secret if provided
    const authHeader = request.headers.get('Authorization');
    const webhookSecret = process.env.FLOWCORE_WEBHOOK_SECRET;

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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
  { params }: { params: { workflowId: string } }
) {
  const { workflowId } = params;

  return NextResponse.json({
    workflowId,
    webhookUrl: `/api/flowcore/webhook/${workflowId}`,
    status: 'active',
    message: 'Webhook endpoint is ready to receive triggers',
  });
}
