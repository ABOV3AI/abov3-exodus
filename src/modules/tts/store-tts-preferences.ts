import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { TTSProvider } from './tts.types';


interface TTSPreferencesStore {

  // TTS Provider Selection
  preferredProvider: TTSProvider;
  setPreferredProvider: (provider: TTSProvider) => void;

}

export const useTTSPreferencesStore = create<TTSPreferencesStore>()(
  persist(
    (set) => ({

      // Default to ABOV3 Pauline for new users (free, self-hosted)
      // Existing users with ElevenLabs will have their preference preserved
      preferredProvider: 'pauline',
      setPreferredProvider: (preferredProvider: TTSProvider) => set({ preferredProvider }),

    }),
    {
      name: 'app-tts-preferences',
    }),
);

export const useTTSPreferences = () => {
  const preferredProvider = useTTSPreferencesStore(state => state.preferredProvider);
  const setPreferredProvider = useTTSPreferencesStore(state => state.setPreferredProvider);
  return { preferredProvider, setPreferredProvider };
};

export const getTTSPreferences = () => useTTSPreferencesStore.getState();
