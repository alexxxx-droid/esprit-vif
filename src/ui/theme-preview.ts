import { useSyncExternalStore } from 'react';
import type { ThemeId } from '../core/themes';

/**
 * Essayer un thème avant de l'avoir : le temps de l'écran Premium, l'appli entière prend ses
 * couleurs. Rien n'est enregistré ; en quittant l'écran, le thème du joueur revient.
 */
let preview: ThemeId | null = null;
const listeners = new Set<() => void>();

export function setThemePreview(id: ThemeId | null) {
  if (preview === id) return;
  preview = id;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useThemePreview(): ThemeId | null {
  return useSyncExternalStore(subscribe, () => preview, () => null);
}
