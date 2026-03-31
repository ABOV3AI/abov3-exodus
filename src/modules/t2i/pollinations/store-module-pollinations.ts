/**
 * Pollinations.ai Settings Store
 *
 * Stores user preferences for Pollinations image generation.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { PollinationsModel, PollinationsSettings } from './pollinationsGenerateImages';
import { DEFAULT_POLLINATIONS_SETTINGS } from './pollinationsGenerateImages';


interface PollinationsStore extends PollinationsSettings {
  // Actions
  setModel: (model: PollinationsModel) => void;
  setWidth: (width: number) => void;
  setHeight: (height: number) => void;
  setSeed: (seed: number | undefined) => void;
  setNologo: (nologo: boolean) => void;
  setEnhance: (enhance: boolean) => void;
  setSize: (width: number, height: number) => void;

  // Get current settings
  getSettings: () => PollinationsSettings;
}


export const usePollinationsStore = create<PollinationsStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_POLLINATIONS_SETTINGS,

      // Actions
      setModel: (model) => set({ model }),
      setWidth: (width) => set({ width }),
      setHeight: (height) => set({ height }),
      setSeed: (seed) => set({ seed }),
      setNologo: (nologo) => set({ nologo }),
      setEnhance: (enhance) => set({ enhance }),
      setSize: (width, height) => set({ width, height }),

      // Get current settings
      getSettings: () => {
        const { model, width, height, seed, nologo, enhance } = get();
        return { model, width, height, seed, nologo, enhance };
      },
    }),
    {
      name: 'app-module-pollinations',
      version: 1,
    },
  ),
);


// Size presets for UI
export const POLLINATIONS_SIZE_PRESETS = [
  { label: 'Square (1024x1024)', width: 1024, height: 1024 },
  { label: 'Landscape (1280x720)', width: 1280, height: 720 },
  { label: 'Portrait (720x1280)', width: 720, height: 1280 },
  { label: 'Wide (1920x1080)', width: 1920, height: 1080 },
  { label: 'Tall (1080x1920)', width: 1080, height: 1920 },
  { label: 'Small Square (512x512)', width: 512, height: 512 },
] as const;


// Model display info
export const POLLINATIONS_MODEL_INFO: Record<PollinationsModel, { label: string; description: string }> = {
  flux: {
    label: 'Flux (Default)',
    description: 'High quality, balanced output',
  },
  turbo: {
    label: 'Turbo',
    description: 'Faster generation, slightly lower quality',
  },
  'flux-realism': {
    label: 'Flux Realism',
    description: 'Photorealistic style',
  },
  'flux-anime': {
    label: 'Flux Anime',
    description: 'Anime/illustration style',
  },
  'flux-3d': {
    label: 'Flux 3D',
    description: '3D rendered style',
  },
};
