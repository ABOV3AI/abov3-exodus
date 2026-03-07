/**
 * Nephesh App Store - Client-side state management for Nephesh UI
 * Uses Zustand with localStorage persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import type { NepheshProfile, NepheshJob } from '~/modules/nephesh/nephesh.types';

//
// UI State Types
//

export type NepheshViewMode = 'profiles' | 'jobs' | 'skills' | 'memory';

interface NepheshUIState {
  // View mode
  viewMode: NepheshViewMode;

  // Selected profile
  selectedProfileId: string | null;

  // Profile editor
  isEditorOpen: boolean;
  editorProfileId: string | null; // null = new profile

  // Jobs view
  jobsFilter: {
    status?: 'IDLE' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'ERROR';
    profileId?: string;
  };

  // Skills marketplace
  selectedSkillId: string | null;

  // Memory browser
  memorySearchQuery: string;

  // Drawer state
  isDrawerOpen: boolean;
}

interface NepheshDataCache {
  // Cached profiles (synced from server)
  profiles: NepheshProfile[];
  profilesLastFetch: number | null;

  // Cached jobs
  jobs: NepheshJob[];
  jobsLastFetch: number | null;
}

interface NepheshStore extends NepheshUIState, NepheshDataCache {
  // UI Actions
  setViewMode: (mode: NepheshViewMode) => void;
  setSelectedProfile: (profileId: string | null) => void;
  openEditor: (profileId: string | null) => void;
  closeEditor: () => void;
  setJobsFilter: (filter: Partial<NepheshUIState['jobsFilter']>) => void;
  setSelectedSkill: (skillId: string | null) => void;
  setMemorySearchQuery: (query: string) => void;
  setDrawerOpen: (isOpen: boolean) => void;

  // Data Actions
  setCachedProfiles: (profiles: NepheshProfile[]) => void;
  updateCachedProfile: (profile: NepheshProfile) => void;
  removeCachedProfile: (profileId: string) => void;
  setCachedJobs: (jobs: NepheshJob[]) => void;
  updateCachedJob: (job: NepheshJob) => void;

  // Reset
  resetUI: () => void;
}

const initialUIState: NepheshUIState = {
  viewMode: 'profiles',
  selectedProfileId: null,
  isEditorOpen: false,
  editorProfileId: null,
  jobsFilter: {},
  selectedSkillId: null,
  memorySearchQuery: '',
  isDrawerOpen: true,
};

const initialDataCache: NepheshDataCache = {
  profiles: [],
  profilesLastFetch: null,
  jobs: [],
  jobsLastFetch: null,
};

export const useNepheshStore = create<NepheshStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...initialUIState,
      ...initialDataCache,

      // UI Actions
      setViewMode: (mode) => set({ viewMode: mode }),

      setSelectedProfile: (profileId) => set({ selectedProfileId: profileId }),

      openEditor: (profileId) =>
        set({
          isEditorOpen: true,
          editorProfileId: profileId,
        }),

      closeEditor: () =>
        set({
          isEditorOpen: false,
          editorProfileId: null,
        }),

      setJobsFilter: (filter) =>
        set((state) => ({
          jobsFilter: { ...state.jobsFilter, ...filter },
        })),

      setSelectedSkill: (skillId) => set({ selectedSkillId: skillId }),

      setMemorySearchQuery: (query) => set({ memorySearchQuery: query }),

      setDrawerOpen: (isOpen) => set({ isDrawerOpen: isOpen }),

      // Data Actions
      setCachedProfiles: (profiles) =>
        set({
          profiles,
          profilesLastFetch: Date.now(),
        }),

      updateCachedProfile: (profile) =>
        set((state) => ({
          profiles: state.profiles.some((p) => p.id === profile.id)
            ? state.profiles.map((p) => (p.id === profile.id ? profile : p))
            : [...state.profiles, profile],
        })),

      removeCachedProfile: (profileId) =>
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== profileId),
          selectedProfileId: state.selectedProfileId === profileId ? null : state.selectedProfileId,
        })),

      setCachedJobs: (jobs) =>
        set({
          jobs,
          jobsLastFetch: Date.now(),
        }),

      updateCachedJob: (job) =>
        set((state) => ({
          jobs: state.jobs.some((j) => j.id === job.id)
            ? state.jobs.map((j) => (j.id === job.id ? job : j))
            : [...state.jobs, job],
        })),

      // Reset
      resetUI: () => set(initialUIState),
    }),
    {
      name: 'nephesh-storage',
      partialize: (state) => ({
        // Only persist UI state, not cached data
        viewMode: state.viewMode,
        selectedProfileId: state.selectedProfileId,
        jobsFilter: state.jobsFilter,
        isDrawerOpen: state.isDrawerOpen,
      }),
    }
  )
);

//
// Selector Hooks - Using useShallow to prevent infinite re-renders
//

export const useNepheshUI = () =>
  useNepheshStore(
    useShallow((state) => ({
      viewMode: state.viewMode,
      selectedProfileId: state.selectedProfileId,
      isEditorOpen: state.isEditorOpen,
      editorProfileId: state.editorProfileId,
      jobsFilter: state.jobsFilter,
      selectedSkillId: state.selectedSkillId,
      memorySearchQuery: state.memorySearchQuery,
      isDrawerOpen: state.isDrawerOpen,
    }))
  );

export const useNepheshProfiles = () =>
  useNepheshStore(
    useShallow((state) => ({
      profiles: state.profiles,
      profilesLastFetch: state.profilesLastFetch,
    }))
  );

export const useNepheshJobs = () =>
  useNepheshStore(
    useShallow((state) => ({
      jobs: state.jobs,
      jobsLastFetch: state.jobsLastFetch,
    }))
  );

export const useSelectedProfile = () => {
  const selectedProfileId = useNepheshStore((state) => state.selectedProfileId);
  const profiles = useNepheshStore((state) => state.profiles);
  return profiles.find((p) => p.id === selectedProfileId) || null;
};

//
// Actions Export
//

export const nepheshActions = {
  setViewMode: (mode: NepheshViewMode) => useNepheshStore.getState().setViewMode(mode),
  setSelectedProfile: (profileId: string | null) => useNepheshStore.getState().setSelectedProfile(profileId),
  openEditor: (profileId: string | null) => useNepheshStore.getState().openEditor(profileId),
  closeEditor: () => useNepheshStore.getState().closeEditor(),
  setJobsFilter: (filter: Partial<NepheshUIState['jobsFilter']>) => useNepheshStore.getState().setJobsFilter(filter),
  setSelectedSkill: (skillId: string | null) => useNepheshStore.getState().setSelectedSkill(skillId),
  setMemorySearchQuery: (query: string) => useNepheshStore.getState().setMemorySearchQuery(query),
  setDrawerOpen: (isOpen: boolean) => useNepheshStore.getState().setDrawerOpen(isOpen),
  setCachedProfiles: (profiles: NepheshProfile[]) => useNepheshStore.getState().setCachedProfiles(profiles),
  updateCachedProfile: (profile: NepheshProfile) => useNepheshStore.getState().updateCachedProfile(profile),
  removeCachedProfile: (profileId: string) => useNepheshStore.getState().removeCachedProfile(profileId),
  setCachedJobs: (jobs: NepheshJob[]) => useNepheshStore.getState().setCachedJobs(jobs),
  updateCachedJob: (job: NepheshJob) => useNepheshStore.getState().updateCachedJob(job),
  resetUI: () => useNepheshStore.getState().resetUI(),
};
