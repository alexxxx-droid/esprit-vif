import { useSyncExternalStore } from 'react';
import { playBackend, testBackend, webBackend } from '../premium/billing';
import { PremiumController, type PremiumState } from '../premium/premium';
import { platform } from './platform';

/**
 * Mode test de la boutique : seulement en développement (`npm run dev`) ou dans une version construite
 * exprès (`vite build --mode billingtest`). Jamais dans le site publié ni dans l'APK de production.
 */
export const BILLING_TEST = import.meta.env.DEV || import.meta.env.MODE === 'billingtest';

let controller: PremiumController | null = null;

/** La boutique, créée une fois : Google Play dans l'appli Android, rien sur le site, ou le mode test. */
export function premiumController(): PremiumController {
  if (!controller) {
    const api = platform().billing;
    controller = new PremiumController(api ? playBackend(api) : BILLING_TEST ? testBackend() : webBackend);
    void controller.init();
  }
  return controller;
}

export function usePremiumState(): PremiumState {
  const c = premiumController();
  return useSyncExternalStore(c.subscribe, c.getState);
}
