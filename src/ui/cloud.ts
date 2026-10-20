import { useEffect, useEffectEvent, useRef, useSyncExternalStore } from 'react';
import { isCharacterId } from '../core/characters';
import type { ProfileManager } from '../store/profiles';
import type { ProgressStore } from '../store/progress';
import { cloudState, progressKey, runSync, type SyncResult } from '../sync/cloud';
import { cloudConfigured } from '../sync/google';
import { useProfileManager } from './profiles-context';
import { useProgress, useStore } from './progress-context';

/** Délai après une partie avant de synchroniser : on regroupe les parties enchaînées. */
const DEBOUNCE_MS = 4000;

/**
 * Une synchronisation pour le joueur actif, puis la mise à jour du lien (compte, heure) et,
 * sur un appareil neuf, du prénom et du compagnon enregistrés sur le Drive.
 */
export async function syncProgress(store: ProgressStore, manager: ProfileManager, interactive: boolean): Promise<SyncResult | null> {
  const { active } = manager.getSnapshot();
  const { cloud } = store.getSnapshot().settings;
  const result = await runSync(store, { name: active.name, color: active.color, character: active.character }, { interactive, email: cloud.email });
  if (!result) return null;
  await store.updateSettings({ cloud: { linked: true, email: result.email, lastSync: new Date().toISOString() } });
  const remote = result.remoteProfile;
  if (remote?.name && !active.name) {
    await manager.update(active.id, { name: remote.name, color: remote.color, ...(isCharacterId(remote.character) ? { character: remote.character } : {}) });
  }
  return result;
}

export function useCloudPhase() {
  return useSyncExternalStore(cloudState.subscribe, cloudState.get);
}

/** Synchronise en arrière-plan quand le joueur a lié son Drive : à l'ouverture, après chaque partie, en quittant. */
export function useCloudSync() {
  const data = useProgress();
  const store = useStore();
  const manager = useProfileManager();
  const linked = cloudConfigured() && data.settings.cloud.linked;
  const synced = useRef<string | null>(null);

  const sync = useEffectEvent(async () => {
    const key = progressKey(store.getSnapshot());
    if (key === synced.current) return;
    if (await syncProgress(store, manager, false)) synced.current = progressKey(store.getSnapshot());
  });

  useEffect(() => {
    if (!linked) return;
    const id = window.setTimeout(() => void sync(), synced.current === null ? 800 : DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [linked, data.plays, data.tests, data.games, data.extras]);

  useEffect(() => {
    if (!linked) return;
    const onHide = () => {
      if (document.visibilityState === 'hidden') void sync();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [linked]);
}
