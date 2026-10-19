import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

/** Événement « beforeinstallprompt » (Chrome, Edge) : absent des types DOM standard. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PwaState {
  /** Une nouvelle version est téléchargée et attend qu'on recharge. */
  needRefresh: boolean;
  /** Tout est en cache : l'appli marche désormais sans réseau. */
  offlineReady: boolean;
  /** Le navigateur propose l'installation. */
  canInstall: boolean;
}

let state: PwaState = { needRefresh: false, offlineReady: false, canInstall: false };
const listeners = new Set<() => void>();
let updateServiceWorker: ((reload?: boolean) => Promise<void>) | null = null;
let installEvent: BeforeInstallPromptEvent | null = null;

function update(patch: Partial<PwaState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Service worker (mode hors ligne) et proposition d'installation. Uniquement dans le navigateur. */
export function setupPwa() {
  updateServiceWorker = registerSW({
    onNeedRefresh: () => update({ needRefresh: true }),
    onOfflineReady: () => update({ offlineReady: true }),
  });
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installEvent = event as BeforeInstallPromptEvent;
    update({ canInstall: true });
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
    update({ canInstall: false });
  });
}

export function usePwa(): PwaState {
  return useSyncExternalStore(subscribe, () => state);
}

export async function applyUpdate() {
  await updateServiceWorker?.(true);
}

export function dismissOfflineReady() {
  update({ offlineReady: false });
}

export async function promptInstall(): Promise<boolean> {
  if (!installEvent) return false;
  const event = installEvent;
  installEvent = null;
  update({ canInstall: false });
  await event.prompt();
  return (await event.userChoice).outcome === 'accepted';
}
