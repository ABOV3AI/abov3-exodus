/**
 * TTS Provider Abstraction Layer
 * Provides a unified interface to speak text using multiple TTS providers
 */

import type { TTSProvider, TTSSpeakOptions, TTSSpeakResult, TTSVoice } from './tts.types';
import { getTTSPreferences } from './store-tts-preferences';


/**
 * Speak text using the specified TTS provider
 *
 * @param provider - TTS provider to use ('elevenlabs' | 'pauline')
 * @param options - Speech options (text, voiceId, streaming, turbo)
 * @returns Promise with success status and optional audio base64
 */
export async function ttsSpeakText(
  provider: TTSProvider | undefined,
  options: TTSSpeakOptions,
): Promise<TTSSpeakResult> {
  // Use preferred provider if not specified
  const selectedProvider = provider || getTTSPreferences().preferredProvider;

  // Lazy import to avoid circular dependencies
  if (selectedProvider === 'elevenlabs') {
    const { elevenLabsSpeakText } = await import('~/modules/elevenlabs/elevenlabs.client');
    return await elevenLabsSpeakText(
      options.text,
      options.voiceId,
      options.audioStreaming,
      options.audioTurbo,
    );
  } else if (selectedProvider === 'pauline') {
    const { paulineSpeakText } = await import('~/modules/pauline/pauline.client');
    return await paulineSpeakText(
      options.text,
      options.voiceId,
      options.audioStreaming,
      options.audioTurbo,
    );
  }

  console.error('Unknown TTS provider:', selectedProvider);
  return { success: false };
}


/**
 * List available voices for the specified provider
 *
 * @param provider - TTS provider
 * @returns Promise with array of available voices
 */
export async function ttsListVoices(provider: TTSProvider): Promise<TTSVoice[]> {
  if (provider === 'elevenlabs') {
    // ElevenLabs voices are fetched via tRPC
    // This would typically be called from the UI component
    return [];
  } else if (provider === 'pauline') {
    const { paulineListVoices } = await import('~/modules/pauline/pauline.client');
    return await paulineListVoices();
  }

  return [];
}


/**
 * Check if a TTS provider is enabled
 *
 * @param provider - TTS provider
 * @returns boolean indicating if provider is configured and ready
 */
export async function ttsIsEnabled(provider: TTSProvider): Promise<boolean> {
  if (provider === 'elevenlabs') {
    const { isElevenLabsEnabled } = await import('~/modules/elevenlabs/elevenlabs.client');
    const { getElevenLabsData } = await import('~/modules/elevenlabs/store-module-elevenlabs');
    const { elevenLabsApiKey } = getElevenLabsData();
    return isElevenLabsEnabled(elevenLabsApiKey);
  } else if (provider === 'pauline') {
    const { isPaulineEnabled } = await import('~/modules/pauline/pauline.client');
    return isPaulineEnabled();
  }

  return false;
}


/**
 * Get the display name for a TTS provider
 */
export function getTTSProviderName(provider: TTSProvider): string {
  switch (provider) {
    case 'elevenlabs':
      return 'ElevenLabs';
    case 'pauline':
      return 'ABOV3 Pauline';
    default:
      return provider;
  }
}


/**
 * Get the description for a TTS provider
 */
export function getTTSProviderDescription(provider: TTSProvider): string {
  switch (provider) {
    case 'elevenlabs':
      return 'Cloud service, premium quality, $0.30 per 1000 characters';
    case 'pauline':
      return 'Self-hosted, high-quality voice synthesis, free, requires GPU';
    default:
      return '';
  }
}
