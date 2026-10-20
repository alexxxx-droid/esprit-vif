import { useMemo, useSyncExternalStore } from 'react';
import { isGameId } from '../core/games/registry';
import { DOMAIN_ORDER } from '../core/games/registry';
import type { Domain, GameId } from '../core/types';

/** Routage par le fragment d'URL (#/…) : fonctionne tel quel sur GitHub Pages et dans l'APK. */
export type Route =
  | { name: 'home' }
  | { name: 'training'; domain?: Domain }
  | { name: 'progress' }
  | { name: 'settings' }
  | { name: 'play'; gameId: GameId }
  | { name: 'test' }
  | { name: 'start-test' }
  | { name: 'report'; testId: string }
  | { name: 'session' }
  | { name: 'marathon'; domain: Domain | null }
  | { name: 'duel' }
  | { name: 'party' }
  | { name: 'challenge'; code: string | null }
  | { name: 'transfer' }
  | { name: 'wardrobe' }
  | { name: 'premium' }
  | { name: 'history'; gameId: GameId };

const isDomain = (value: string | undefined): value is Domain => DOMAIN_ORDER.includes(value as Domain);

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
      return isDomain(arg) ? { name: 'training', domain: arg } : { name: 'training' };
    case 'progres':
      return { name: 'progress' };
    case 'reglages':
      return { name: 'settings' };
    case 'test':
      return { name: 'test' };
    case 'test-du-jour':
      return { name: 'start-test' };
    case 'jeu':
      return arg && isGameId(arg) ? { name: 'play', gameId: arg } : { name: 'training' };
    case 'bilan':
      return arg ? { name: 'report', testId: arg } : { name: 'home' };
    case 'seance':
      return { name: 'session' };
    case 'marathon':
      return { name: 'marathon', domain: isDomain(arg) ? arg : null };
    case 'duel':
      return { name: 'duel' };
    case 'fete':
      return { name: 'party' };
    case 'defi':
      return { name: 'challenge', code: arg ?? null };
    case 'transfert':
      return { name: 'transfer' };
    case 'vestiaire':
      return { name: 'wardrobe' };
    case 'premium':
      return { name: 'premium' };
    case 'historique':
      return arg && isGameId(arg) ? { name: 'history', gameId: arg } : { name: 'progress' };
    default:
      return { name: 'home' };
  }
}

export function routeHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'training':
      return route.domain ? `#/entrainement/${route.domain}` : '#/entrainement';
    case 'progress':
      return '#/progres';
    case 'settings':
      return '#/reglages';
    case 'test':
      return '#/test';
    case 'start-test':
      return '#/test-du-jour';
    case 'play':
      return `#/jeu/${route.gameId}`;
    case 'report':
      return `#/bilan/${encodeURIComponent(route.testId)}`;
    case 'session':
      return '#/seance';
    case 'marathon':
      return route.domain ? `#/marathon/${route.domain}` : '#/marathon';
    case 'duel':
      return '#/duel';
    case 'party':
      return '#/fete';
    case 'challenge':
      return route.code ? `#/defi/${route.code}` : '#/defi';
    case 'transfer':
      return '#/transfert';
    case 'wardrobe':
      return '#/vestiaire';
    case 'premium':
      return '#/premium';
    case 'history':
      return `#/historique/${route.gameId}`;
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
