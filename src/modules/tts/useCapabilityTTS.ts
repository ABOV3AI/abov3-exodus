/**
 * TTS Capability Hook
 * Checks if TTS is available for the currently selected provider
 */

import { useTTSPreferences } from './store-tts-preferences';
import { getTTSProviderName } from './tts.client';
import type { CapabilityTTSSpeechSynthesis } from '~/common/components/useCapabilities';


export function useCapabilityTTS(): CapabilityTTSSpeechSynthesis {
  const { preferredProvider } = useTTSPreferences();

  // Lazy import capability checks to avoid circular dependencies
  let mayWork = false;

  if (preferredProvider === 'elevenlabs') {
    // Check ElevenLabs capability
    const { useCapability } = require('~/modules/elevenlabs/elevenlabs.client');
    const elevenlabsCapability = useCapability();
    mayWork = elevenlabsCapability.mayWork;
  } else if (preferredProvider === 'pauline') {
    // Check ABOV3 Pauline capability
    const { useCapability } = require('~/modules/pauline/pauline.client');
    const paulineCapability = useCapability();
    mayWork = paulineCapability.mayWork;
  }

  return {
    mayWork,
    provider: preferredProvider,
    providerName: getTTSProviderName(preferredProvider),
  };
}
