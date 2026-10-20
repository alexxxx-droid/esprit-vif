import { useSyncExternalStore } from 'react';
import { playBackend, testBackend, webBackend } from '../premium/billing';
import { PremiumController, type PremiumState } from '../premium/premium';
import { platform } from './platform';

/**
 * Mode test de la boutique : seulement en développement (`npm run dev`) ou dans une version construite
 * exprès (`vite build --mode billingtest`). Jamais dans le site publié ni dans l'APK de production.
 */
export const BILLING_TEST = import.meta.env.DEV || import.meta.env.MODE === 'billingtest' || import.meta.env.VITE_BILLING_TEST === '1';

let controller: PremiumController | null = null;

/**
 * La boutique, créée une fois : le mode test s'il a été demandé à la construction (il passe avant
 * tout, APK de test compris), sinon Google Play dans l'appli Android, et rien sur le site.
 */
export function premiumController(): PremiumController {
  if (!controller) {
    const api = platform().billing;
    controller = new PremiumController(BILLING_TEST ? testBackend() : api ? playBackend(api) : webBackend);
    void controller.init();
  }
  return controller;
}

export function usePremiumState(): PremiumState {
  const c = premiumController();
  return useSyncExternalStore(c.subscribe, c.getState);
}
