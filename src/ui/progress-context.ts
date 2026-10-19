import { createContext, useContext, useSyncExternalStore } from 'react';
import type { ProgressData, ProgressStore } from '../store/progress';

export const ProgressContext = createContext<ProgressStore | null>(null);

export function useStore(): ProgressStore {
  const store = useContext(ProgressContext);
  if (!store) throw new Error('ProgressContext manquant');
  return store;
}

/** Instantané de la progression, rafraîchi à chaque changement. */
export function useProgress(): ProgressData {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
