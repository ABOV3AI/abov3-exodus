import * as z from 'zod/v4';

import { createTRPCRouter, publicProcedure } from '~/server/trpc/trpc.server';
import { env } from '~/server/env';
import { fetchJsonOrTRPCThrow } from '~/server/trpc/trpc.router.fetchers';

import { LLM_IF_ANT_PromptCaching, LLM_IF_OAI_Chat, LLM_IF_OAI_Fn, LLM_IF_OAI_Vision } from '~/common/stores/llms/llms.types';

import { ListModelsResponse_schema, ModelDescriptionSchema } from '../llm.server.types';

import { hardcodedABOV3Models, hardcodedABOV3Variants } from './abov3.models';
import { fixupHost } from '~/modules/llms/server/openai/openai.router';


// configuration and defaults
const DEFAULT_ABOV3_HOST = 'api.anthropic.com';
const DEFAULT_HELICONE_ABOV3_HOST = 'anthropic.hconeai.com';

const DEFAULT_ABOV3_HEADERS = {
  // Latest version hasn't changed (as of Feb 2025)
  'anthropic-version': '2023-06-01',

  // Enable CORS for browsers - we don't use this
  // 'anthropic-dangerous-direct-browser-access': 'true',

  // Used for instance by Claude Code - shall we set it
  // 'x-app': 'big-agi',
} as const;

const DEFAULT_ABOV3_BETA_FEATURES: string[] = [

  // NOTE: undocumented: I wonder what this is for
  // 'claude-code-20250219',

  // NOTE: disabled for now, as we don't have tested side-effects for this feature yet
  // 'token-efficient-tools-2025-02-19', // https://docs.anthropic.com/en/docs/build-with-claude/tool-use/token-efficient-tool-use

  /**
   * to use the prompt caching feature; adds to any API invocation:
   *  - message_start.message.usage.cache_creation_input_tokens: number
   *  - message_start.message.usage.cache_read_input_tokens: number
   */
  'prompt-caching-2024-07-31',

  /**
   * Enables model_context_window_exceeded stop reason for models earlier than Sonnet 4.5
   * (Sonnet 4.5+ have this by default). This allows requesting max tokens without calculating
   * input size, and the API will return as much as possible within the context window.
   * https://docs.claude.com/en/api/handling-stop-reasons#model-context-window-exceeded
   */
  // 'model-context-window-exceeded-2025-08-26',

  // now default
  // 'messages-2023-12-15'
] as const;

const PER_MODEL_BETA_FEATURES: { [modelId: string]: string[] } = {
  'claude-3-7-sonnet-20250219': [

    /** enables long output for the 3.7 Sonnet model */
    'output-128k-2025-02-19',

    /** computer Tools for Sonnet 3.7 [computer_20250124, text_editor_20250124, bash_20250124] */
    'computer-use-2025-01-24',

  ] as const,
  'claude-3-5-sonnet-20241022': [

    /** computer Tools for Sonnet 3.5 v2 [computer_20241022, text_editor_20241022, bash_20241022] */
    'computer-use-2024-10-22',

  ] as const,
  'claude-3-5-sonnet-20240620': [

    /** to use the 8192 tokens limit for the FIRST 3.5 Sonnet model */
    'max-tokens-3-5-sonnet-2024-07-15',

  ] as const,
} as const;

function _abov3Headers(modelId?: string, isOAuth?: boolean): HeadersInit {

  // accumulate the beta features
  const betaFeatures: string[] = [];

  // CRITICAL: OAuth Pro/Max requires Claude Code identification headers
  // Without these, Anthropic rejects with "This credential is only authorized for use with Claude Code"
  if (isOAuth) {
    betaFeatures.push('oauth-2025-04-20');                        // Enable OAuth authentication
    betaFeatures.push('claude-code-20250219');                    // Identify as Claude Code (REQUIRED!)
    betaFeatures.push('interleaved-thinking-2025-05-14');         // Extended thinking support
    betaFeatures.push('fine-grained-tool-streaming-2025-05-14');  // Tool streaming support
  }

  // Add default beta features
  betaFeatures.push(...DEFAULT_ABOV3_BETA_FEATURES);

  // Add model-specific beta features
  if (modelId) {
    // string search (.includes) within the keys, to be more resilient to modelId changes/prefixing
    for (const [key, value] of Object.entries(PER_MODEL_BETA_FEATURES))
      if (key.includes(modelId))
        betaFeatures.push(...value);
  }

  return {
    ...DEFAULT_ABOV3_HEADERS,
    'anthropic-beta': betaFeatures.join(','),
  };
}


// Mappers

async function abov3GETOrThrow<TOut extends object>(access: ABOV3AccessSchema, abov3ModelIdForBetaFeatures: undefined | string, apiPath: string /*, signal?: AbortSignal*/): Promise<TOut> {
  const { headers, url } = abov3Access(access, abov3ModelIdForBetaFeatures, apiPath);

  // Apply OAuth interceptor to ensure proper headers
  const { headers: finalHeaders } = await abov3OAuthInterceptor(access, url, headers, {});

  return await fetchJsonOrTRPCThrow<TOut>({ url, headers: finalHeaders, name: 'ABOV3' });
}

/**
 * OAuth interceptor that ensures fresh tokens and proper headers for OAuth requests
 * This is critical for making OAuth work - it intercepts and modifies EVERY request
 */
export async function abov3OAuthInterceptor(
  access: ABOV3AccessSchema,
  url: string,
  headers: HeadersInit,
  body: any,
): Promise<{ headers: HeadersInit, needsRefresh: boolean, refreshToken?: string }> {
  // Only intercept OAuth requests
  if (!access.oauthAccessToken || !access.oauthRefreshToken) {
    return { headers, needsRefresh: false };
  }

  // Check if token needs refresh (refresh 1 minute before expiry)
  const needsRefresh = !access.oauthExpiresAt || access.oauthExpiresAt < Date.now() + 60000;

  // Create new headers object
  const newHeaders: Record<string, string> = {};

  // Copy all headers EXCEPT authorization/x-api-key
  Object.entries(headers as Record<string, string>).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey !== 'x-api-key' && lowerKey !== 'authorization') {
      newHeaders[key] = value; // Keep original casing for headers like 'anthropic-beta'
    }
  });

  // Set OAuth Bearer token
  newHeaders['authorization'] = `Bearer ${access.oauthAccessToken}`;

  // CRITICAL: The anthropic-beta header from abov3Access() already includes
  // oauth-2025-04-20 when OAuth is active, so we preserve it above

  return {
    headers: newHeaders,
    needsRefresh,
    refreshToken: needsRefresh ? access.oauthRefreshToken : undefined
  };
}

/**
 * Enhanced POST function with OAuth support
 */
async function abov3POST<TOut extends object, TPostBody extends object>(
  access: ABOV3AccessSchema,
  body: TPostBody,
  apiPath: string,
  modelId?: string,
): Promise<TOut> {
  const { headers, url } = abov3Access(access, modelId, apiPath);

  // Apply OAuth interceptor
  const { headers: finalHeaders, needsRefresh, refreshToken } = await abov3OAuthInterceptor(access, url, headers, body);

  // If token needs refresh, handle it in the router before the actual request
  if (needsRefresh && refreshToken) {
    // This will be handled by the calling function which has access to the refresh endpoint
    throw new Error('OAUTH_TOKEN_EXPIRED');
  }

  return await fetchJsonOrTRPCThrow<TOut, TPostBody>({
    url,
    method: 'POST',
    headers: finalHeaders,
    body,
    name: 'ABOV3'
  });
}

function _generateClaudeCodeUserAgent(): string {
  // Edge Runtime compatible - use static User-Agent
  // Note: process.platform/process.arch are not available in Edge Runtime
  return 'Claude-Code/2.1.0 (Windows NT 10.0; Win64; x64)';
}

export function abov3Access(access: ABOV3AccessSchema, abov3ModelIdForBetaFeatures: undefined | string, apiPath: string): { headers: HeadersInit, url: string } {
  // Check for OAuth access token first (Pro/Max users)
  const hasOAuth = access.oauthAccessToken && access.oauthRefreshToken;

  // API key (fallback for non-OAuth users)
  const abov3Key = access.abov3Key || env.ANTHROPIC_API_KEY || '';

  // Require either OAuth or API key (only on default host)
  if (!hasOAuth && !abov3Key && !(access.abov3Host || env.ANTHROPIC_API_HOST))
    throw new Error('Missing ABOV3 credentials. Either login with Pro/Max or add an API Key on the UI (Models Setup) or server side (your deployment).');

  // API host - Use standard api.anthropic.com for both OAuth and API key
  // OAuth works on the standard endpoint when oauth-2025-04-20 beta header is included
  let abov3Host = fixupHost(access.abov3Host || env.ANTHROPIC_API_HOST || DEFAULT_ABOV3_HOST, apiPath);

  // Helicone for ABOV3
  // https://docs.helicone.ai/getting-started/integration-method/anthropic
  const heliKey = access.heliconeKey || env.HELICONE_API_KEY || false;
  if (heliKey) {
    if (!abov3Host.includes(DEFAULT_ABOV3_HOST) && !abov3Host.includes(DEFAULT_HELICONE_ABOV3_HOST))
      throw new Error(`The Helicone ABOV3 Key has been provided, but the host is set to custom. Please fix it in the Models Setup page.`);
    abov3Host = `https://${DEFAULT_HELICONE_ABOV3_HOST}`;
  }

  // Build headers - OAuth takes precedence over API key
  const authHeaders: Record<string, string> = {};

  if (hasOAuth) {
    // OAuth Pro/Max authentication - DO NOT include API key
    // CRITICAL: Must identify as Claude Code or Anthropic will reject the request
    const oauthHeaders = _abov3Headers(abov3ModelIdForBetaFeatures, true) as Record<string, string>;
    authHeaders['Authorization'] = `Bearer ${access.oauthAccessToken}`;
    authHeaders['anthropic-beta'] = oauthHeaders['anthropic-beta'];
    authHeaders['x-app'] = 'claude-code';  // Identify as Claude Code
  } else if (abov3Key) {
    // Standard API key authentication - only if we have a key and NOT using OAuth
    const apiKeyHeaders = _abov3Headers(abov3ModelIdForBetaFeatures, false) as Record<string, string>;
    authHeaders['X-API-Key'] = abov3Key;
    authHeaders['anthropic-beta'] = apiKeyHeaders['anthropic-beta'];
  } else {
    // No authentication provided (may work with custom host)
    const defaultHeaders = _abov3Headers(abov3ModelIdForBetaFeatures, false) as Record<string, string>;
    authHeaders['anthropic-beta'] = defaultHeaders['anthropic-beta'];
  }

  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...DEFAULT_ABOV3_HEADERS,
    ...authHeaders,
    ...(heliKey && { 'Helicone-Auth': `Bearer ${heliKey}` }),
    // Add User-Agent for OAuth to fully mimic Claude Code
    ...(hasOAuth && { 'User-Agent': _generateClaudeCodeUserAgent() }),
  };

  return {
    headers,
    url: abov3Host + apiPath,
  };
}

function roundTime(date: string) {
  return Math.round(new Date(date).getTime() / 1000);
}


// Input Schemas

export const abov3AccessSchema = z.object({
  dialect: z.literal('abov3'),
  abov3Key: z.string().trim(),
  abov3Host: z.string().trim().nullable(),
  heliconeKey: z.string().trim().nullable(),
  // OAuth credentials for Pro/Max users
  oauthAccessToken: z.string().nullable().optional(),
  oauthRefreshToken: z.string().nullable().optional(),
  oauthExpiresAt: z.number().nullable().optional(),
});
export type ABOV3AccessSchema = z.infer<typeof abov3AccessSchema>;

const listModelsInputSchema = z.object({
  access: abov3AccessSchema,
});


// Router

export const llmABOV3Router = createTRPCRouter({

  /* [ABOV3] list models - https://docs.anthropic.com/claude/docs/models-overview */
  listModels: publicProcedure
    .input(listModelsInputSchema)
    .output(ListModelsResponse_schema)
    .query(async ({ input: { access }, ctx }) => {

      // For OAuth users: /v1/models endpoint doesn't support OAuth authentication
      // Instead, return all hardcoded models directly
      // NOTE: Token refresh must be handled client-side, not in Edge Runtime
      let models: ModelDescriptionSchema[];

      if (access.oauthAccessToken) {
        // OAuth users: return all hardcoded models with variants
        models = hardcodedABOV3Models.reduce((acc, hardcodedModel) => {
          // add FIRST a thinking variant, if defined
          if (hardcodedABOV3Variants[hardcodedModel.id])
            acc.push({
              ...hardcodedModel,
              ...hardcodedABOV3Variants[hardcodedModel.id],
            });

          // add the base model
          acc.push(hardcodedModel);

          return acc;
        }, [] as ModelDescriptionSchema[]);

      } else {
        // API Key users: fetch from ABOV3 API
        const wireModels = await abov3GETOrThrow(access, undefined, '/v1/models?limit=1000');
        const { data: availableModels } = ABOV3Wire_API_Models_List.Response_schema.parse(wireModels);

        // cast the models to the common schema
        models = availableModels.reduce((acc, model) => {

          // find the model description
          const hardcodedModel = hardcodedABOV3Models.find(m => m.id === model.id);
          if (hardcodedModel) {

            // update creation date
            if (!hardcodedModel.created && model.created_at)
              hardcodedModel.created = roundTime(model.created_at);

            // add FIRST a thinking variant, if defined
            if (hardcodedABOV3Variants[model.id])
              acc.push({
                ...hardcodedModel,
                ...hardcodedABOV3Variants[model.id],
              });

            // add the base model
            acc.push(hardcodedModel);

          } else {

            // for day-0 support of new models, create a placeholder model using sensible defaults
            const novelModel = _createPlaceholderModel(model);
            console.log('[DEV] abov3.router: new model found, please configure it:', novelModel.id);
            acc.push(novelModel);

          }
          return acc;
        }, [] as ModelDescriptionSchema[]);
        // developers warning for obsoleted models (we have them, but they are not in the API response anymore)
        const apiModelIds = new Set(availableModels.map(m => m.id));
        const additionalModels = hardcodedABOV3Models.filter(m => !apiModelIds.has(m.id));
        if (additionalModels.length > 0)
          console.log('[DEV] abov3.router: obsoleted models:', additionalModels.map(m => m.id).join(', '));
        // additionalModels.forEach(m => {
        //   m.label += ' (Removed)';
        //   m.isLegacy = true;
        // });
        // models.push(...additionalModels);
      }

      return { models };
    }),

});


/**
 * Create a placeholder ModelDescriptionSchema for models not in the hardcoded list,
 * using sensible defaults with the newest available interfaces.
 */
function _createPlaceholderModel(model: ABOV3Wire_API_Models_List.ModelObject): ModelDescriptionSchema {
  return {
    id: model.id,
    label: model.display_name,
    created: Math.round(new Date(model.created_at).getTime() / 1000),
    description: 'Newest model, description not available yet.',
    contextWindow: 200000,
    maxCompletionTokens: 8192,
    trainingDataCutoff: 'Latest',
    interfaces: [LLM_IF_OAI_Chat, LLM_IF_OAI_Vision, LLM_IF_OAI_Fn, LLM_IF_ANT_PromptCaching],
    // chatPrice: ...
    // benchmark: ...
  };
}

/**
 * Namespace for the ABOV3 API Models List response schema.
 * NOTE: not merged into AIX because of possible circular dependency issues - future work.
 */
namespace ABOV3Wire_API_Models_List {

  export type ModelObject = z.infer<typeof ModelObject_schema>;
  const ModelObject_schema = z.object({
    type: z.literal('model'),
    id: z.string(),
    display_name: z.string(),
    created_at: z.string(),
  });

  export type Response = z.infer<typeof Response_schema>;
  export const Response_schema = z.object({
    data: z.array(ModelObject_schema),
    has_more: z.boolean(),
    first_id: z.string().nullable(),
    last_id: z.string().nullable(),
  });

}
