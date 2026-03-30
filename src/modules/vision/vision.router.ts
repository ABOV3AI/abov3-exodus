/**
 * Vision router - server-side image analysis using Ollama vision models
 *
 * This router enables text-only models to "see" images by using a dedicated
 * vision model (like llava) to generate descriptions that can be passed back
 * to the main model.
 */

import * as z from 'zod/v4';
import { TRPCError } from '@trpc/server';

import { createTRPCRouter, publicProcedure } from '~/server/trpc/trpc.server';
import { env } from '~/server/env';


// Default settings
const DEFAULT_OLLAMA_HOST = 'http://127.0.0.1:11434';
const VISION_API_PATH = '/api/chat';

// Vision models in order of preference (will try to find first available)
const VISION_MODEL_PREFERENCES = [
  // Qwen3-vl variants (preferred - best quality)
  'qwen3-vl:235b-instruct',
  'qwen3-vl:235b',
  'qwen3-vl:72b',
  'qwen3-vl:32b',
  'qwen3-vl',
  // Qwen2.5-vl variants
  'qwen2.5-vl:72b',
  'qwen2.5-vl:32b',
  'qwen2.5-vl:7b',
  // Llama3.2-vision
  'llama3.2-vision:90b',
  'llama3.2-vision:11b',
  // Devstral (fallback)
  'devstral-small:24b',
  'devstral-small',
  'devstral',
  // Other vision models
  'llava:34b',
  'llava:13b',
  'llava:7b',
  'llava',
  'bakllava',
  'moondream',
  'minicpm-v',
];

// Cache for detected vision model (per host)
const detectedModelCache: Map<string, { model: string; timestamp: number }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;  // 5 minutes


/**
 * Detect the best available vision model on the Ollama server
 */
async function detectVisionModel(ollamaHost: string): Promise<string | null> {
  // Check cache first
  const cached = detectedModelCache.get(ollamaHost);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.model;
  }

  try {
    const response = await fetch(`${ollamaHost}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.warn(`[Vision] Failed to list models: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const availableModels = (data.models || []).map((m: any) => m.name || m.model);

    // Find the best available vision model based on our preference order
    for (const preferred of VISION_MODEL_PREFERENCES) {
      // Check for exact match or prefix match (e.g., "llava" matches "llava:latest")
      const match = availableModels.find((m: string) =>
        m === preferred ||
        m.startsWith(preferred + ':') ||
        m.startsWith(preferred.split(':')[0] + ':')
      );
      if (match) {
        console.log(`[Vision] Detected vision model: ${match}`);
        detectedModelCache.set(ollamaHost, { model: match, timestamp: Date.now() });
        return match;
      }
    }

    // Try to find any model with vision-related names
    const visionKeywords = ['qwen3-vl', 'qwen2.5-vl', 'devstral', 'llava', 'vision', 'vl', 'bakllava', 'moondream', 'minicpm'];
    for (const model of availableModels) {
      const modelLower = model.toLowerCase();
      if (visionKeywords.some(kw => modelLower.includes(kw))) {
        console.log(`[Vision] Found vision model by keyword: ${model}`);
        detectedModelCache.set(ollamaHost, { model, timestamp: Date.now() });
        return model;
      }
    }

    console.warn('[Vision] No vision model found on server. Available models:', availableModels.join(', '));
    return null;
  } catch (error: any) {
    console.error('[Vision] Error detecting models:', error.message);
    return null;
  }
}


/**
 * Get the vision model to use (configured, detected, or error)
 */
async function getVisionModel(ollamaHost: string, overrideModel?: string): Promise<string> {
  // 1. Use explicit override if provided
  if (overrideModel) {
    return overrideModel;
  }

  // 2. Use environment variable if set
  if (env.OLLAMA_VISION_MODEL) {
    return env.OLLAMA_VISION_MODEL;
  }

  // 3. Auto-detect from available models
  const detected = await detectVisionModel(ollamaHost);
  if (detected) {
    return detected;
  }

  // 4. Throw error - no vision model available
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: 'No vision model available. Please install a vision model on Ollama (e.g., ollama pull llava:13b) or set OLLAMA_VISION_MODEL environment variable.',
  });
}


// Input schemas
const analyzeImageInputSchema = z.object({
  imageBase64: z.string().min(100),  // Base64 encoded image (with or without data URL prefix)
  question: z.string().min(1).default('What is in this image?'),
  detailLevel: z.enum(['brief', 'normal', 'detailed']).default('normal'),
  visionModel: z.string().optional(),  // Override default vision model
  ollamaHost: z.string().optional(),   // Override default Ollama host
});

const extractTextInputSchema = z.object({
  imageBase64: z.string().min(100),
  contentType: z.enum(['text', 'code', 'table', 'auto']).default('auto'),
  visionModel: z.string().optional(),
  ollamaHost: z.string().optional(),
});


// Output schemas
const visionResultSchema = z.object({
  result: z.string(),
  model: z.string(),
  processingTimeMs: z.number(),
});


/**
 * Call Ollama vision model with an image
 */
async function callVisionModel(
  ollamaHost: string,
  model: string,
  imageBase64: string,
  prompt: string,
): Promise<{ response: string; model: string; processingTimeMs: number }> {
  const startTime = Date.now();

  // Strip data URL prefix if present
  let base64Data = imageBase64;
  if (base64Data.includes(',')) {
    base64Data = base64Data.split(',')[1] || base64Data;
  }

  // Build Ollama chat request with image
  const requestBody = {
    model,
    messages: [
      {
        role: 'user',
        content: prompt,
        images: [base64Data],  // Ollama expects array of base64 strings
      },
    ],
    stream: false,
  };

  const url = `${ollamaHost}${VISION_API_PATH}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama vision request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const processingTimeMs = Date.now() - startTime;

    // Extract response from Ollama chat format
    const responseText = data.message?.content || data.response || '';

    return {
      response: responseText,
      model: data.model || model,
      processingTimeMs,
    };
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new TRPCError({
        code: 'SERVICE_UNAVAILABLE',
        message: `Cannot connect to Ollama at ${ollamaHost}. Make sure Ollama is running and a vision model (like llava) is available.`,
      });
    }
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Vision analysis failed: ${error.message}`,
    });
  }
}


/**
 * Build prompt based on detail level
 */
function buildAnalysisPrompt(question: string, detailLevel: 'brief' | 'normal' | 'detailed'): string {
  switch (detailLevel) {
    case 'brief':
      return `${question}\n\nRespond in 1-2 concise sentences.`;
    case 'detailed':
      return `${question}\n\nProvide a comprehensive, detailed analysis. Include all relevant details, colors, text, layout, and any other notable elements.`;
    case 'normal':
    default:
      return question;
  }
}


/**
 * Build prompt for text extraction
 */
function buildExtractionPrompt(contentType: 'text' | 'code' | 'table' | 'auto'): string {
  switch (contentType) {
    case 'code':
      return 'Extract and transcribe all code visible in this image. Preserve the exact formatting, indentation, and syntax. Output only the code, no explanations.';
    case 'table':
      return 'Extract the table data from this image. Format it as a markdown table if possible, preserving the structure and alignment.';
    case 'text':
      return 'Read and transcribe all text visible in this image. Preserve the original formatting and layout as much as possible.';
    case 'auto':
    default:
      return 'Extract and transcribe all text, code, or data visible in this image. If it contains code, preserve the formatting. If it contains a table, format it appropriately.';
  }
}


export const visionRouter = createTRPCRouter({

  /**
   * Analyze an image and get a description
   */
  analyzeImage: publicProcedure
    .input(analyzeImageInputSchema)
    .output(visionResultSchema)
    .mutation(async ({ input }) => {
      const ollamaHost = input.ollamaHost || env.OLLAMA_API_HOST || DEFAULT_OLLAMA_HOST;
      const model = await getVisionModel(ollamaHost, input.visionModel);
      const prompt = buildAnalysisPrompt(input.question, input.detailLevel);

      const result = await callVisionModel(ollamaHost, model, input.imageBase64, prompt);

      return {
        result: result.response,
        model: result.model,
        processingTimeMs: result.processingTimeMs,
      };
    }),

  /**
   * Extract text/code from an image (OCR)
   */
  extractText: publicProcedure
    .input(extractTextInputSchema)
    .output(visionResultSchema)
    .mutation(async ({ input }) => {
      const ollamaHost = input.ollamaHost || env.OLLAMA_API_HOST || DEFAULT_OLLAMA_HOST;
      const model = await getVisionModel(ollamaHost, input.visionModel);
      const prompt = buildExtractionPrompt(input.contentType);

      const result = await callVisionModel(ollamaHost, model, input.imageBase64, prompt);

      return {
        result: result.response,
        model: result.model,
        processingTimeMs: result.processingTimeMs,
      };
    }),

  /**
   * Check if vision capabilities are available
   */
  checkAvailability: publicProcedure
    .input(z.object({
      ollamaHost: z.string().optional(),
    }))
    .output(z.object({
      available: z.boolean(),
      models: z.array(z.string()),
      error: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const ollamaHost = input.ollamaHost || env.OLLAMA_API_HOST || DEFAULT_OLLAMA_HOST;

      try {
        // Check for available models
        const response = await fetch(`${ollamaHost}/api/tags`);
        if (!response.ok) {
          return {
            available: false,
            models: [],
            error: `Cannot connect to Ollama: ${response.status}`,
          };
        }

        const data = await response.json();
        const models = (data.models || [])
          .map((m: any) => m.name || m.model)
          .filter((name: string) => {
            // Filter for known vision models
            const nameLower = name.toLowerCase();
            return (
              nameLower.includes('qwen3-vl') ||
              nameLower.includes('qwen2.5-vl') ||
              nameLower.includes('devstral') ||
              nameLower.includes('llava') ||
              nameLower.includes('bakllava') ||
              nameLower.includes('moondream') ||
              nameLower.includes('llama3.2-vision') ||
              nameLower.includes('minicpm-v') ||
              nameLower.includes('vision')
            );
          });

        return {
          available: models.length > 0,
          models,
        };
      } catch (error: any) {
        return {
          available: false,
          models: [],
          error: error.message,
        };
      }
    }),

});
