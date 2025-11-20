/**
 * TTS Capability Hook
 * Checks if TTS is available for the currently selected provider
 */

import { useTTSPreferences } from './store-tts-preferences';
import { getTTSProviderName } from './tts.client';
import type { CapabilityTTSSpeechSynthesis } from '~/common/components/useCapabilities';

// Import capability hooks at module level to avoid conditional hook calls
import { useCapability as useElevenLabsCapability } from '~/modules/elevenlabs/elevenlabs.client';
import { useCapability as usePaulineCapability } from '~/modules/pauline/pauline.client';


export function useCapabilityTTS(): CapabilityTTSSpeechSynthesis {
  const { preferredProvider } = useTTSPreferences();

  // Call all hooks unconditionally (required by React hooks rules)
  const elevenlabsCapability = useElevenLabsCapability();
  const paulineCapability = usePaulineCapability();

  // Determine if TTS may work based on active provider
  const mayWork = preferredProvider === 'elevenlabs'
    ? elevenlabsCapability.mayWork
    : preferredProvider === 'pauline'
    ? paulineCapability.mayWork
    : false;

  return {
    mayWork,
    provider: preferredProvider,
    providerName: getTTSProviderName(preferredProvider),
  };
}
