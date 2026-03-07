/**
 * Training Generation API Endpoint
 *
 * This endpoint allows Eden MCP server to generate text using Exodus's
 * authenticated LLM connections, including OAuth tokens for Claude Pro/Max.
 *
 * Routes requests through the existing AIX infrastructure which has working OAuth support.
 */

import { NextRequest, NextResponse } from 'next/server';
import { chatGenerateContentImpl } from '~/modules/aix/server/api/aix.router';
import type { AixAPI_Access, AixAPI_Model, AixAPIChatGenerate_Request, AixAPI_Context_ChatGenerate } from '~/modules/aix/server/api/aix.wiretypes';

// CORS headers for Eden to call this endpoint
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Credentials passed from Eden (matches TeacherModelCredentials)
interface Credentials {
  provider: 'openai' | 'anthropic' | 'ollama' | 'openrouter' | 'azure' | 'abov3' | 'mistral' | 'groq' | 'deepseek' | 'gemini' | 'other';
  apiKey?: string;
  baseUrl?: string;
  modelId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  organizationId?: string;
}

// Request body schema
interface GenerateRequest {
  modelId: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  credentials?: Credentials;
}

// Response body schema
interface GenerateResponse {
  success: boolean;
  text?: string;
  error?: string;
  model?: string;
  provider?: string;
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * Build AIX Access object from credentials
 */
function buildAixAccess(credentials: Credentials): AixAPI_Access {
  const { provider, apiKey, baseUrl, accessToken, refreshToken, expiresAt, organizationId } = credentials;

  switch (provider) {
    case 'abov3':
      return {
        dialect: 'abov3' as const,
        abov3Key: apiKey || '',
        abov3Host: baseUrl || null,
        heliconeKey: null,
        // OAuth credentials - this is what makes it work!
        oauthAccessToken: accessToken || null,
        oauthRefreshToken: refreshToken || null,
        oauthExpiresAt: expiresAt || null,
      };

    case 'anthropic':
      return {
        dialect: 'anthropic' as const,
        anthropicKey: apiKey || '',
        anthropicHost: baseUrl || null,
        heliconeKey: null,
        // OAuth credentials
        oauthAccessToken: accessToken || null,
        oauthRefreshToken: refreshToken || null,
        oauthExpiresAt: expiresAt || null,
      };

    case 'openai':
      return {
        dialect: 'openai' as const,
        oaiKey: apiKey || '',
        oaiOrg: organizationId || '',
        oaiHost: baseUrl || '',
        heliKey: '',
        moderationCheck: false,
      };

    case 'ollama':
      return {
        dialect: 'ollama' as const,
        ollamaHost: baseUrl || 'http://127.0.0.1:11434',
        ollamaJson: false,
      };

    case 'gemini':
      return {
        dialect: 'gemini' as const,
        geminiKey: apiKey || '',
        geminiHost: '',
        minSafetyLevel: 'BLOCK_NONE',
      };

    default:
      // Fallback to OpenAI-compatible
      return {
        dialect: 'openai' as const,
        oaiKey: apiKey || '',
        oaiOrg: organizationId || '',
        oaiHost: baseUrl || '',
        heliKey: '',
        moderationCheck: false,
      };
  }
}

/**
 * Build AIX Model object
 */
function buildAixModel(modelId: string, temperature: number, maxTokens: number): AixAPI_Model {
  return {
    id: modelId,
    acceptsOutputs: ['text'],
    temperature: temperature,
    maxTokens: maxTokens,
  };
}

/**
 * Build AIX ChatGenerate Request
 */
function buildAixChatGenerate(systemPrompt: string, userPrompt: string): AixAPIChatGenerate_Request {
  return {
    systemMessage: systemPrompt ? {
      parts: [{ pt: 'text' as const, text: systemPrompt }],
    } : null,
    chatSequence: [
      {
        role: 'user' as const,
        parts: [{ pt: 'text' as const, text: userPrompt }],
      },
    ],
  };
}

/**
 * Generate text using AIX infrastructure for proper OAuth support
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { modelId, systemPrompt, userPrompt, temperature = 0.7, maxTokens = 16384, credentials } = body;

    if (!modelId || !userPrompt) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: modelId, userPrompt' } satisfies GenerateResponse,
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!credentials) {
      return NextResponse.json(
        { success: false, error: 'Missing credentials. Pass credentials from Exodus.' } satisfies GenerateResponse,
        { status: 400, headers: CORS_HEADERS }
      );
    }

    console.log(`[Training API] Generate request via AIX: modelId=${modelId}, provider=${credentials.provider}`);
    console.log(`[Training API] OAuth: hasAccessToken=${!!credentials.accessToken}, hasRefreshToken=${!!credentials.refreshToken}`);

    // Build AIX components
    const aixAccess = buildAixAccess(credentials);
    const aixModel = buildAixModel(credentials.modelId, temperature, maxTokens);
    const aixChatGenerate = buildAixChatGenerate(systemPrompt, userPrompt);
    const aixContext: AixAPI_Context_ChatGenerate = {
      method: 'chat-generate',
      name: '_DEV_', // Use dev context for training
      ref: `training-${Date.now()}`,
    };

    console.log(`[Training API] AIX Access dialect: ${aixAccess.dialect}`);

    // Create abort controller for timeout
    // Training data generation can take a while, especially with complex prompts
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 600000); // 10 minute timeout for training

    try {
      // Call AIX infrastructure - this handles OAuth properly!
      // Use streaming mode as it's more reliable for OAuth
      const generator = chatGenerateContentImpl(
        {
          access: aixAccess,
          model: aixModel,
          chatGenerate: aixChatGenerate,
          context: aixContext,
          streaming: true, // Use streaming for reliable OAuth responses
        },
        { reqSignal: abortController.signal }
      );

      // Collect all particles from the generator
      let fullText = '';
      let errorMessage: string | null = null;
      let particleCount = 0;

      for await (const particle of generator) {
        particleCount++;
        // Process different particle types based on what AIX returns
        const p = particle as Record<string, unknown>;

        // Debug: log each particle type
        const particleKeys = Object.keys(p);
        console.log(`[Training API] Particle ${particleCount}: keys=${particleKeys.join(',')}`);

        if ('t' in p && typeof p.t === 'string') {
          // Text particle - main content
          fullText += p.t;
          console.log(`[Training API] Text particle: +${p.t.length} chars`);
        } else if ('p' in p && p.p === 'tr_' && typeof p._t === 'string') {
          // Reasoning text particle (thinking) - also capture this
          fullText += p._t;
          console.log(`[Training API] Reasoning particle: +${(p._t as string).length} chars`);
        } else if ('cg' in p) {
          // Chat control particle
          const cgType = p.cg;
          console.log(`[Training API] Control particle: cg=${cgType}`);
          if (cgType === 'issue' && p.issueText) {
            errorMessage = p.issueText as string;
            console.error(`[Training API] Issue: ${errorMessage}`);
          }
        } else if ('p' in p) {
          // Other part particle
          console.log(`[Training API] Part particle: p=${p.p}`);
        }
      }

      console.log(`[Training API] Total: ${particleCount} particles, ${fullText.length} chars`);

      clearTimeout(timeout);

      if (errorMessage) {
        console.error(`[Training API] AIX error: ${errorMessage}`);
        return NextResponse.json(
          { success: false, error: errorMessage, provider: credentials.provider } satisfies GenerateResponse,
          { status: 500, headers: CORS_HEADERS }
        );
      }

      console.log(`[Training API] Success via AIX: generated ${fullText.length} chars`);

      return NextResponse.json(
        { success: true, text: fullText, model: credentials.modelId, provider: credentials.provider } satisfies GenerateResponse,
        { status: 200, headers: CORS_HEADERS }
      );

    } finally {
      clearTimeout(timeout);
    }

  } catch (error) {
    console.error('[Training API] Error:', error);

    // Check for OAuth-specific errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('only authorized for use with Claude Code')) {
      return NextResponse.json(
        {
          success: false,
          error: `OAuth Limitation: ${errorMessage}. Please add an Anthropic API key in Exodus Settings.`,
          provider: 'abov3'
        } satisfies GenerateResponse,
        { status: 401, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { success: false, error: errorMessage } satisfies GenerateResponse,
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
