import { create } from 'zustand';
import { persist } from 'zustand/middleware';


/**
 * Network Mode: Controls whether the application can make external API calls
 * - 'online': Normal mode, all models work
 * - 'air-gapped': Isolated mode, only ABOV3 and local models work
 */
export type NetworkMode = 'online' | 'air-gapped';


interface NetworkModeStore {
  // State
  networkMode: NetworkMode;

  // Actions
  setNetworkMode: (mode: NetworkMode) => void;
  toggleNetworkMode: () => void;
}


export const useNetworkModeStore = create<NetworkModeStore>()(
  persist(
    (set, get) => ({
      // Default to online mode
      networkMode: 'online',

      setNetworkMode: (mode: NetworkMode) => {
        set({ networkMode: mode });
      },

      toggleNetworkMode: () => {
        const current = get().networkMode;
        set({ networkMode: current === 'online' ? 'air-gapped' : 'online' });
      },
    }),
    {
      name: 'app-network-mode',
    }
  )
);


// Convenience hooks for reading network mode
export const useNetworkMode = (): NetworkMode => useNetworkModeStore(state => state.networkMode);
export const useIsOnlineMode = (): boolean => useNetworkModeStore(state => state.networkMode === 'online');
export const useIsAirGappedMode = (): boolean => useNetworkModeStore(state => state.networkMode === 'air-gapped');

// Non-reactive getter for use in non-React contexts
export const getNetworkMode = (): NetworkMode => useNetworkModeStore.getState().networkMode;
