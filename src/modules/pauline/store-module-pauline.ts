import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import type { TTSVoice } from '~/modules/tts/tts.types';


interface ModulePaulineStore {

  // ABOV3 Pauline TTS settings

  paulineEndpoint: string;
  setPaulineEndpoint: (endpoint: string) => void;

  paulineVoiceId: string;
  setPaulineVoiceId: (voiceId: string) => void;

  paulineSpeed: number;
  setPaulineSpeed: (speed: number) => void;

  paulineTempo: number;
  setPaulineTempo: (tempo: number) => void;

  // Custom cloned voices
  customVoices: TTSVoice[];
  addCustomVoice: (voice: TTSVoice) => void;
  removeCustomVoice: (voiceId: string) => void;

}

export const usePaulineStore = create<ModulePaulineStore>()(
  persist(
    (set) => ({

      // ABOV3 Pauline TTS settings
      paulineEndpoint: 'https://pauline.abov3.ai',
      setPaulineEndpoint: (paulineEndpoint: string) => set({ paulineEndpoint }),

      paulineVoiceId: 'Emily.wav',
      setPaulineVoiceId: (paulineVoiceId: string) => set({ paulineVoiceId }),

      paulineSpeed: 1.0,
      setPaulineSpeed: (paulineSpeed: number) => set({ paulineSpeed }),

      paulineTempo: 0.95,
      setPaulineTempo: (paulineTempo: number) => set({ paulineTempo }),

      // Custom cloned voices
      customVoices: [],
      addCustomVoice: (voice: TTSVoice) => set((state) => ({
        customVoices: [...state.customVoices, voice],
      })),
      removeCustomVoice: (voiceId: string) => set((state) => ({
        customVoices: state.customVoices.filter(v => v.id !== voiceId),
      })),

    }),
    {
      name: 'app-module-pauline',
      // Migrate from old Fish Speech store
      onRehydrateStorage: () => (state) => {
        // Check if migration is needed
        const oldData = localStorage.getItem('app-module-fishspeech');
        if (oldData && state) {
          try {
            const parsed = JSON.parse(oldData);
            if (parsed.state) {
              console.log('[Migration] Migrating Fish Speech settings to ABOV3 Pauline');

              // Migrate endpoint if it exists and current endpoint is default
              if (parsed.state.fishSpeechEndpoint && state.paulineEndpoint === 'https://pauline.abov3.ai') {
                state.paulineEndpoint = parsed.state.fishSpeechEndpoint;
              }

              // Migrate voice ID if it exists and current voice is default
              if (parsed.state.fishSpeechVoiceId && state.paulineVoiceId === 'alloy') {
                state.paulineVoiceId = parsed.state.fishSpeechVoiceId;
              }

              // Migrate custom voices if they exist
              if (parsed.state.customVoices && Array.isArray(parsed.state.customVoices)) {
                state.customVoices = parsed.state.customVoices;
              }

              console.log('[Migration] Migration complete - settings preserved');
            }
          } catch (e) {
            console.error('[Migration] Failed to migrate Fish Speech settings:', e);
          }
        }
      },
    }),
);

export const usePaulineEndpoint = (): [string, (endpoint: string) => void] => {
  const endpoint = usePaulineStore(state => state.paulineEndpoint);
  const setPaulineEndpoint = usePaulineStore(state => state.setPaulineEndpoint);
  return [endpoint, setPaulineEndpoint];
};

export const usePaulineVoiceId = (): [string, (voiceId: string) => void] => {
  const voiceId = usePaulineStore(state => state.paulineVoiceId);
  const setPaulineVoiceId = usePaulineStore(state => state.setPaulineVoiceId);
  return [voiceId, setPaulineVoiceId];
};

export const usePaulineSpeed = (): [number, (speed: number) => void] => {
  const speed = usePaulineStore(state => state.paulineSpeed);
  const setPaulineSpeed = usePaulineStore(state => state.setPaulineSpeed);
  return [speed, setPaulineSpeed];
};

export const usePaulineTempo = (): [number, (tempo: number) => void] => {
  const tempo = usePaulineStore(state => state.paulineTempo);
  const setPaulineTempo = usePaulineStore(state => state.setPaulineTempo);
  return [tempo, setPaulineTempo];
};

export const usePaulineData = (): [string, string] =>
  usePaulineStore(useShallow(state => [state.paulineEndpoint, state.paulineVoiceId]));

export const usePaulineCustomVoices = (): [TTSVoice[], (voice: TTSVoice) => void, (voiceId: string) => void] => {
  const customVoices = usePaulineStore(state => state.customVoices);
  const addCustomVoice = usePaulineStore(state => state.addCustomVoice);
  const removeCustomVoice = usePaulineStore(state => state.removeCustomVoice);
  return [customVoices, addCustomVoice, removeCustomVoice];
};

export const getPaulineData = (): { paulineEndpoint: string, paulineVoiceId: string, paulineSpeed: number, paulineTempo: number, customVoices: TTSVoice[] } =>
  usePaulineStore.getState();
