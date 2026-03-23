import * as React from 'react';

import { getBackendCapabilities } from '~/modules/backend/store-backend-capabilities';

import { AudioLivePlayer } from '~/common/util/audio/AudioLivePlayer';
import { AudioPlayer } from '~/common/util/audio/AudioPlayer';
import { apiStream } from '~/common/util/trpc.client';
import { convert_Base64_To_UInt8Array } from '~/common/util/blobUtils';
import { useUIPreferencesStore } from '~/common/stores/store-ui';

import type { TTSProviderCapability, TTSSpeakResult, TTSVoice, TTSVoiceCloneOptions, TTSVoiceCloneResult } from '~/modules/tts/tts.types';
import { getPaulineData, usePaulineData } from './store-module-pauline';


export const isValidPaulineEndpoint = (endpoint?: string) => {
  if (!endpoint) return false;
  const trimmed = endpoint.trim();

  // Must start with http:// or https://
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return false;
  }

  // Must have more than just the protocol (e.g., "https://" alone is invalid)
  if (trimmed === 'http://' || trimmed === 'https://') {
    return false;
  }

  // Try to parse as URL to validate format
  try {
    const url = new URL(trimmed);
    // Must have a hostname (e.g., not just "https://")
    return url.hostname.length > 0;
  } catch {
    return false;
  }
};

export const isPaulineEnabled = (endpoint?: string) =>
  endpoint ? isValidPaulineEndpoint(endpoint)
    : getBackendCapabilities().hasVoicePauline;


export function useCapability(): TTSProviderCapability {
  const [clientEndpoint] = usePaulineData();

  return React.useMemo(() => {
    const isConfiguredServerSide = getBackendCapabilities().hasVoicePauline;
    const isConfiguredClientSide = clientEndpoint ? isValidPaulineEndpoint(clientEndpoint) : false;
    const mayWork = isConfiguredServerSide || isConfiguredClientSide;
    return { mayWork, isConfiguredServerSide, isConfiguredClientSide };
  }, [clientEndpoint]);
}


/**
 * Speaks text using ABOV3 Pauline TTS
 * @returns Object with success status and optionally the audio base64 (when not streaming)
 */
export async function paulineSpeakText(text: string, voiceId: string | undefined, audioStreaming: boolean, audioTurbo: boolean): Promise<TTSSpeakResult> {
  // Early validation
  if (!(text?.trim())) {
    // console.log('Pauline: No text to speak');
    return { success: false };
  }

  const { paulineEndpoint, paulineVoiceId } = getPaulineData();
  if (!isPaulineEnabled(paulineEndpoint)) {
    // console.warn('Pauline: Service not enabled or configured');
    return { success: false };
  }

  const { preferredLanguage } = useUIPreferencesStore.getState();
  const nonEnglish = !(preferredLanguage?.toLowerCase()?.startsWith('en'));

  // audio live player instance, if needed
  let liveAudioPlayer: AudioLivePlayer | undefined;
  let playbackStarted = false;
  let audioBase64: string | undefined;

  try {

    const stream = await apiStream.pauline.speech.mutate({
      endpoint: paulineEndpoint,
      voiceId: voiceId || paulineVoiceId,
      text: text,
      nonEnglish,
      audioStreaming,
      audioTurbo,
    });

    for await (const piece of stream) {

      // Pauline stream buffer
      if (piece.audioChunk) {
        try {
          // create the live audio player as needed with combined tempo + speed playback rate
          if (!liveAudioPlayer) {
            const { paulineSpeed, paulineTempo } = getPaulineData();
            // Combine tempo and speed for client-side playback rate
            const combinedRate = paulineTempo * paulineSpeed;
            const playbackRate = audioTurbo ? Math.min(combinedRate * 1.15, 2.0) : combinedRate;
            liveAudioPlayer = new AudioLivePlayer(playbackRate);
          }

          // enqueue a decoded audio chunk - this will throw on malformed base64 data
          const chunkArray = convert_Base64_To_UInt8Array(piece.audioChunk.base64, 'paulineSpeakText (chunk)');
          liveAudioPlayer.enqueueChunk(chunkArray.buffer);
          playbackStarted = true;
        } catch (audioError) {
          console.error('Pauline audio chunk error:', audioError);
          return { success: false };
        }
      }

      // Pauline full audio buffer
      else if (piece.audio) {
        try {
          // return base64 for potential reuse
          if (!audioStreaming)
            audioBase64 = piece.audio.base64;

          // Get combined tempo + speed from store for client-side playback rate
          const { paulineSpeed, paulineTempo } = getPaulineData();
          // Combine tempo and speed for client-side playback rate
          const combinedRate = paulineTempo * paulineSpeed;
          const playbackRate = audioTurbo ? Math.min(combinedRate * 1.15, 2.0) : combinedRate;

          // play the audio buffer with client-side playback rate
          const audioArray = convert_Base64_To_UInt8Array(piece.audio.base64, 'paulineSpeakText');
          void AudioPlayer.playBuffer(audioArray.buffer, playbackRate); // fire/forget
          playbackStarted = true;
        } catch (audioError) {
          console.error('Pauline audio buffer error:', audioError);
          return { success: false };
        }
      }

      // Errors
      else if (piece.errorMessage) {
        console.error('Pauline error:', piece.errorMessage);
        return { success: false };
      } else if (piece.warningMessage) {
        console.warn('Pauline warning:', piece.warningMessage);
        // Continue processing warnings
      } else if (piece.control === 'start' || piece.control === 'end') {
        // Control messages - continue processing
      } else {
        console.log('Pauline unknown piece:', piece);
      }
    }
    return { success: playbackStarted, audioBase64 };
  } catch (error) {
    console.error('Pauline playback error:', error);
    return { success: false };
  }
}


/**
 * List available voices from ABOV3 Pauline
 */
export async function paulineListVoices(): Promise<TTSVoice[]> {
  try {
    const { paulineEndpoint } = getPaulineData();
    if (!isPaulineEnabled(paulineEndpoint)) {
      return [];
    }

    // This would be called from UI components via tRPC
    // For now, return empty array - component will use tRPC query directly
    return [];
  } catch (error) {
    console.error('Pauline listVoices error:', error);
    return [];
  }
}


/**
 * Clone a voice from audio samples
 * NOTE: Voice cloning is not currently implemented for ABOV3 Pauline
 */
export async function paulineCloneVoice(options: TTSVoiceCloneOptions): Promise<TTSVoiceCloneResult> {
  // Voice cloning not yet implemented
  return {
    success: false,
    errorMessage: 'Voice cloning is not currently available for ABOV3 Pauline',
  };
}
