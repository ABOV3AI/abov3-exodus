/**
 * User Features Store
 *
 * Client-side store for tracking which beta features the current user has access to.
 * This is populated on authentication and used to conditionally show/hide
 * navigation items and feature UI.
 */

import { create } from 'zustand';

// Feature flags that can be granted to users
export type FeatureFlag = 'NEPHESH' | 'TRAIN' | 'FLOWCORE' | 'ADMIN_PANEL';

// All available features (for admin UI)
export const ALL_FEATURE_FLAGS: FeatureFlag[] = ['NEPHESH', 'TRAIN', 'FLOWCORE', 'ADMIN_PANEL'];

// Human-readable labels for features
export const FEATURE_LABELS: Record<FeatureFlag, string> = {
  NEPHESH: 'Nephesh (Autonomous Agents)',
  TRAIN: 'Train (Model Training)',
  FLOWCORE: 'FlowCore (Workflow Builder)',
  ADMIN_PANEL: 'Admin Panel',
};

// Feature descriptions for UI
export const FEATURE_DESCRIPTIONS: Record<FeatureFlag, string> = {
  NEPHESH: 'Create and manage autonomous AI agents with custom skills',
  TRAIN: 'Train and fine-tune models using your own data',
  FLOWCORE: 'Build complex workflows with visual node-based editor',
  ADMIN_PANEL: 'Access administrative settings and user management',
};

interface UserFeaturesState {
  // User's granted features
  features: FeatureFlag[];

  // Whether features have been loaded
  isLoaded: boolean;

  // User role info
  isAdmin: boolean;
  isMasterDev: boolean;

  // User profile (fetched from DB, not JWT)
  avatar: string | null;
  name: string | null;

  // Actions
  setFeatures: (features: FeatureFlag[]) => void;
  setUserInfo: (info: { isAdmin: boolean; isMasterDev: boolean; avatar?: string | null; name?: string | null }) => void;
  hasFeature: (feature: FeatureFlag) => boolean;
  clearFeatures: () => void;
  setAvatar: (avatar: string | null) => void;
}

export const useUserFeatures = create<UserFeaturesState>((set, get) => ({
  features: [],
  isLoaded: false,
  isAdmin: false,
  isMasterDev: false,
  avatar: null,
  name: null,

  setFeatures: (features) =>
    set({
      features,
      isLoaded: true,
    }),

  setUserInfo: (info) =>
    set({
      isAdmin: info.isAdmin,
      isMasterDev: info.isMasterDev,
      avatar: info.avatar ?? null,
      name: info.name ?? null,
    }),

  hasFeature: (feature) => {
    const state = get();
    // Master devs and admins have all features
    if (state.isMasterDev || state.isAdmin) return true;
    return state.features.includes(feature);
  },

  clearFeatures: () =>
    set({
      features: [],
      isLoaded: false,
      isAdmin: false,
      isMasterDev: false,
      avatar: null,
      name: null,
    }),

  setAvatar: (avatar) => set({ avatar }),
}));

/**
 * Hook for checking a specific feature
 * Returns true if the user has access, false otherwise
 */
export function useHasFeature(feature: FeatureFlag): boolean {
  return useUserFeatures((state) => {
    if (state.isMasterDev || state.isAdmin) return true;
    return state.features.includes(feature);
  });
}

/**
 * Hook for checking admin access
 */
export function useIsAdmin(): boolean {
  return useUserFeatures((state) => state.isAdmin || state.isMasterDev);
}

/**
 * Hook for getting all user features
 */
export function useAllFeatures(): FeatureFlag[] {
  return useUserFeatures((state) => {
    if (state.isMasterDev || state.isAdmin) return ALL_FEATURE_FLAGS;
    return state.features;
  });
}
