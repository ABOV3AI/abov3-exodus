/**
 * TTS Provider Abstraction Types
 * Provides a unified interface for multiple TTS providers (ElevenLabs, ABOV3 Pauline, etc.)
 */

export type TTSProvider = 'elevenlabs' | 'pauline';

export interface TTSSpeakOptions {
  text: string;
  voiceId?: string;
  audioStreaming: boolean;
  audioTurbo: boolean;
}

export interface TTSSpeakResult {
  success: boolean;
  audioBase64?: string; // Available when not streaming
}

export interface TTSVoice {
  id: string;
  name: string;
  description: string | null;
  previewUrl: string | null;
  category: string;
  default: boolean;
}

export interface TTSProviderCapability {
  mayWork: boolean;
  isConfiguredServerSide: boolean;
  isConfiguredClientSide: boolean;
}

export interface TTSProviderInterface {
  /**
   * Speak text using the provider
   */
  speak(options: TTSSpeakOptions): Promise<TTSSpeakResult>;

  /**
   * List available voices
   */
  listVoices(): Promise<TTSVoice[]>;

  /**
   * Check if provider is enabled and configured
   */
  isEnabled(): boolean;

  /**
   * Get provider capability information
   */
  getCapability(): TTSProviderCapability;
}

export interface TTSVoiceCloneOptions {
  name: string;
  audioSamples: string[]; // base64 encoded audio samples
  description?: string;
}

export interface TTSVoiceCloneResult {
  success: boolean;
  voiceId?: string;
  errorMessage?: string;
}
