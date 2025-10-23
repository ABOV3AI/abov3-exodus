import * as React from 'react';
import { type StoreApi, useStore } from 'zustand';

import { useShallowStable } from '~/common/util/hooks/useShallowObject';

import type { PrismStore } from './store-prism_vanilla';


export type PrismStoreApi = Readonly<StoreApi<PrismStore>>;


export const usePrismStore = <T, >(prismStore: PrismStoreApi, selector: (store: PrismStore) => T): T =>
  useStore(prismStore, selector);

/*export const useIsBeamOpen = (beamStore?: PrismStoreApi) => {
  const [open, setOpen] = React.useState(false);

  // attach to the current beamStore
  React.useEffect(() => {
    if (!beamStore) {
      setOpen(false);
      return;
    }
    setOpen(beamStore.getState().isOpen);
    return beamStore.subscribe((state: BeamState, prevState: BeamState) => {
      (state.isOpen !== prevState.isOpen) && setOpen(state.isOpen);
    });
  }, [beamStore]);

  return open;
};*/

export function useArePrismsOpen(prismStores: (PrismStoreApi | null)[]): boolean[] {

  // state
  const [_changeVersion, setChangeVersion] = React.useState(0);

  // [effect] monitor the stores for changes
  React.useEffect(() => {
    const updateIfOpenChanges = (state: PrismStore, prevState: PrismStore) => {
      if (state.isOpen !== prevState.isOpen)
        setChangeVersion(version => version + 1);
    };

    // monitor the open status of all stores
    const unsubscribes = prismStores.filter(store => !!store).map((prismStore) => {
      return prismStore?.subscribe(updateIfOpenChanges);
    });

    // unsubscribe on cleanup or when the stores change
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe?.());
  }, [prismStores]);

  return useShallowStable(prismStores.map(prismStore => prismStore?.getState().isOpen ?? false));
}