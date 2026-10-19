import { useMemo, useSyncExternalStore } from 'react';
import { isGameId } from '../core/games/registry';
import type { GameId } from '../core/types';

/** Routage par le fragment d'URL (#/…) : fonctionne tel quel sur GitHub Pages et dans l'APK. */
export type Route =
  | { name: 'home' }
  | { name: 'training' }
  | { name: 'progress' }
  | { name: 'settings' }
  | { name: 'play'; gameId: GameId }
  | { name: 'test' }
  | { name: 'report'; testId: string };

export function parseHash(hash: string): Route {
  const [head, arg] = hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map((part) => decodeURIComponent(part));
  switch (head) {
    case undefined:
      return { name: 'home' };
    case 'entrainement':
      return { name: 'training' };
    case 'progres':
      return { name: 'progress' };
    case 'reglages':
      return { name: 'settings' };
    case 'test':
      return { name: 'test' };
    case 'jeu':
      return arg && isGameId(arg) ? { name: 'play', gameId: arg } : { name: 'training' };
    case 'bilan':
      return arg ? { name: 'report', testId: arg } : { name: 'home' };
    default:
      return { name: 'home' };
  }
}

export function routeHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'training':
      return '#/entrainement';
    case 'progress':
      return '#/progres';
    case 'settings':
      return '#/reglages';
    case 'test':
      return '#/test';
    case 'play':
      return `#/jeu/${route.gameId}`;
    case 'report':
      return `#/bilan/${encodeURIComponent(route.testId)}`;
  }
}

/** Change d'écran ; `replace` évite d'empiler l'historique (onglets, fin de partie). */
export function navigate(route: Route, { replace = false } = {}) {
  const hash = routeHash(route);
  if (location.hash === hash) return;
  if (replace) location.replace(hash);
  else location.hash = hash;
}

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => location.hash);
  return useMemo(() => parseHash(hash), [hash]);
}
