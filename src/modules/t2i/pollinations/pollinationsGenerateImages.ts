/**
 * Pollinations.ai Image Generation Provider
 *
 * Free, no API key required image generation service.
 * Uses Stable Diffusion models via simple REST API.
 *
 * API: https://image.pollinations.ai/prompt/{prompt}
 * Docs: https://pollinations.ai/
 */

import type { T2iCreateImageOutput } from '../t2i.server';


// Pollinations API configuration
const POLLINATIONS_API_BASE = 'https://image.pollinations.ai/prompt';

// Supported models
export const POLLINATIONS_MODELS = {
  flux: 'flux',           // Default, high quality
  turbo: 'turbo',         // Faster generation
  'flux-realism': 'flux-realism',  // Realistic style
  'flux-anime': 'flux-anime',      // Anime style
  'flux-3d': 'flux-3d',            // 3D render style
} as const;

export type PollinationsModel = keyof typeof POLLINATIONS_MODELS;

// Generation settings
export interface PollinationsSettings {
  model: PollinationsModel;
  width: number;
  height: number;
  seed?: number;
  nologo: boolean;  // Remove Pollinations watermark
  enhance: boolean; // Enhance prompt with AI
}

// Default settings
export const DEFAULT_POLLINATIONS_SETTINGS: PollinationsSettings = {
  model: 'flux',
  width: 1024,
  height: 1024,
  nologo: true,
  enhance: true,
};


/**
 * Build Pollinations API URL with parameters
 */
function buildPollinationsUrl(prompt: string, settings: PollinationsSettings): string {
  // Encode prompt for URL
  const encodedPrompt = encodeURIComponent(prompt);

  // Build query params
  const params = new URLSearchParams();
  params.set('model', settings.model);
  params.set('width', settings.width.toString());
  params.set('height', settings.height.toString());
  if (settings.seed !== undefined) {
    params.set('seed', settings.seed.toString());
  }
  if (settings.nologo) {
    params.set('nologo', 'true');
  }
  if (settings.enhance) {
    params.set('enhance', 'true');
  }

  return `${POLLINATIONS_API_BASE}/${encodedPrompt}?${params.toString()}`;
}


/**
 * Fetch image from URL and convert to base64
 */
async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Pollinations API error: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  const mimeType = blob.type || 'image/png';

  // Convert blob to base64
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64 = btoa(binary);

  return { base64, mimeType };
}


/**
 * Generate images using Pollinations.ai
 *
 * @param prompt - Text prompt for image generation
 * @param count - Number of images to generate (generates sequentially with different seeds)
 * @param settings - Optional generation settings override
 */
export async function pollinationsGenerateImagesOrThrow(
  prompt: string,
  count: number = 1,
  settings: Partial<PollinationsSettings> = {},
): Promise<T2iCreateImageOutput[]> {

  const finalSettings: PollinationsSettings = {
    ...DEFAULT_POLLINATIONS_SETTINGS,
    ...settings,
  };

  const results: T2iCreateImageOutput[] = [];

  // Generate images (sequentially for different seeds)
  for (let i = 0; i < count; i++) {
    // Use different seed for each image if generating multiple
    const imageSettings = {
      ...finalSettings,
      seed: finalSettings.seed !== undefined
        ? finalSettings.seed + i
        : Math.floor(Math.random() * 2147483647),
    };

    const url = buildPollinationsUrl(prompt, imageSettings);
    console.log(`[Pollinations] Generating image ${i + 1}/${count}: ${url}`);

    try {
      const { base64, mimeType } = await fetchImageAsBase64(url);

      results.push({
        base64Data: `data:${mimeType};base64,${base64}`,
        mimeType,
        width: imageSettings.width,
        height: imageSettings.height,
        altText: prompt,
        generatorName: `Pollinations ${imageSettings.model}`,
        parameters: {
          model: imageSettings.model,
          width: imageSettings.width,
          height: imageSettings.height,
          seed: imageSettings.seed,
        },
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`[Pollinations] Error generating image ${i + 1}:`, error);
      throw error;
    }
  }

  return results;
}


/**
 * Get current generator name for UI display
 */
export function pollinationsCurrentGeneratorName(): string {
  return 'Pollinations AI';
}
