import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { DConversationId } from '~/common/stores/chat/chat.conversation';
import type { DLLMId } from '~/common/stores/llms/llms.types';
import { agiUuid } from '~/common/util/idUtils';

import type { FFactoryId } from './gather/instructions/prism.gather.factories';


/// Presets (persisted as zustand store) ///

export interface BeamConfigSnapshot {
  id: string;
  name: string;
  rayLlmIds: DLLMId[];
  gatherFactoryId?: FFactoryId | null;  // added post launch
  gatherLlmId?: DLLMId | null;          // added post launch
}


interface ModuleBeamState {

  // stored
  presets: BeamConfigSnapshot[];
  lastConfig: BeamConfigSnapshot | null;
  cardAdd: boolean;
  cardScrolling: boolean;
  scatterShowLettering: boolean;
  scatterShowPrevMessages: boolean;
  gatherAutoStartAfterScatter: boolean;
  gatherShowAllPrompts: boolean;

  // non-stored, temporary but useful for the UI
  openPrismConversationIds: Record<string, boolean>;

}

interface ModuleBeamStore extends ModuleBeamState {
  addPreset: (name: string, rayLlmIds: DLLMId[], gatherLlmId: DLLMId | null, gatherFactoryId: FFactoryId | null) => void;
  deletePreset: (id: string) => void;
  renamePreset: (id: string, name: string) => void;

  updateLastConfig: (update: Partial<BeamConfigSnapshot>) => void;
  deleteLastConfig: () => void;

  toggleCardAdd: () => void;
  toggleCardScrolling: () => void;
  toggleScatterShowLettering: () => void;
  toggleScatterShowPrevMessages: () => void;
  toggleGatherAutoStartAfterScatter: () => void;
  toggleGatherShowAllPrompts: () => void;

  setPrismOpenForConversation: (conversationId: DConversationId, isOpen: boolean) => void;
  clearPrismOpenForConversation: (conversationId: DConversationId) => void;
}


export const useModulePrismStore = create<ModuleBeamStore>()(persist(
  (_set, _get) => ({

    presets: [],
    lastConfig: null,
    cardAdd: true,
    cardScrolling: false,
    scatterShowLettering: false,
    scatterShowPrevMessages: false,
    gatherShowAllPrompts: false,
    gatherAutoStartAfterScatter: false,
    openPrismConversationIds: {},


    addPreset: (name, rayLlmIds, gatherLlmId, gatherFactoryId) => _set(state => ({
      presets: [...state.presets, {
        id: agiUuid('prism-preset-config'),
        name,
        rayLlmIds,
        gatherLlmId: gatherLlmId ?? undefined,
        gatherFactoryId: gatherFactoryId ?? undefined,
      }],
    })),

    deletePreset: (id) => _set(state => ({
      presets: state.presets.filter(preset => preset.id !== id),
    })),

    renamePreset: (id, name) => _set(state => ({
      presets: state.presets.map(preset => preset.id === id ? { ...preset, name } : preset),
    })),


    updateLastConfig: (update) => _set(({ lastConfig }) => ({
      lastConfig: !lastConfig
        ? { id: 'current', name: '', rayLlmIds: [], ...update }
        : { ...lastConfig, ...update },
    })),

    deleteLastConfig: () => _set({ lastConfig: null }),


    toggleCardAdd: () => _set(state => ({ cardAdd: !state.cardAdd })),

    toggleCardScrolling: () => _set(state => ({ cardScrolling: !state.cardScrolling })),

    toggleScatterShowLettering: () => _set(state => ({ scatterShowLettering: !state.scatterShowLettering })),

    toggleScatterShowPrevMessages: () => _set(state => ({ scatterShowPrevMessages: !state.scatterShowPrevMessages })),

    toggleGatherAutoStartAfterScatter: () => _set(state => ({ gatherAutoStartAfterScatter: !state.gatherAutoStartAfterScatter })),

    toggleGatherShowAllPrompts: () => _set(state => ({ gatherShowAllPrompts: !state.gatherShowAllPrompts })),

    setPrismOpenForConversation: (conversationId, isOpen) => _set(state => {
      const openBeams = { ...state.openPrismConversationIds };
      if (isOpen)
        openBeams[conversationId] = true;
      else
        delete openBeams[conversationId];
      return { openPrismConversationIds: openBeams };
    }),

    clearPrismOpenForConversation: (conversationId) => _set(state => {
      const openBeams = { ...state.openPrismConversationIds };
      delete openBeams[conversationId];
      return { openPrismConversationIds: openBeams };
    }),

  }), {
    name: 'app-module-prism',
    version: 1,

    partialize: (state) => {
      // exclude openPrismConversationIds from persistence
      const { openPrismConversationIds, ...persistedState } = state;
      return persistedState;
    },

    migrate: (state: any, fromVersion: number): Omit<ModuleBeamState, 'openPrismConversationIds'> => {
      // 0 -> 1: rename 'scatterPresets' to 'presets'
      if (state && fromVersion === 0 && !state.presets)
        return { ...state, presets: state.scatterPresets || [] };
      return state;
    },
  },
));


export function getPrismCardScrolling() {
  return useModulePrismStore.getState().cardScrolling;
}

export function usePrismCardScrolling() {
  return useModulePrismStore((state) => state.cardScrolling);
}

export function useBeamScatterShowLettering() {
  return useModulePrismStore((state) => state.scatterShowLettering);
}

export function useIsPrismOpenForConversation(conversationId: DConversationId | null): boolean {
  return useModulePrismStore(state => conversationId ? state.openPrismConversationIds[conversationId] ?? false : false);
}

export function updateBeamLastConfig(update: Partial<BeamConfigSnapshot>) {
  useModulePrismStore.getState().updateLastConfig(update);
}