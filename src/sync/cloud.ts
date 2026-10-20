import { mergeProgress } from '../store/merge';
import { parseBackup, type ProgressData, type ProgressStore } from '../store/progress';
import { driveClient, DriveError, type DriveClient } from './drive';
import { forgetToken, googleToken, NeedsConsent } from './google';

/**
 * Synchronisation avec le Drive : lire la copie, fusionner (rien ne se perd, voir merge.ts),
 * puis écrire de chaque côté seulement ce qui manque. Une seule synchro à la fois.
 */

export interface CloudProfile {
  name: string;
  color: number;
  character: string;
}

export interface SyncResult {
  /** La progression de l'appareil a reçu quelque chose du Drive. */
  changedLocal: boolean;
  uploaded: boolean;
  email: string;
  /** Le joueur tel qu'enregistré sur le Drive (prénom, compagnon), pour un appareil neuf. */
  remoteProfile: CloudProfile | null;
}

/** Ce qui compte pour savoir si deux progressions diffèrent (pas les réglages de l'appareil). */
export const progressKey = (d: ProgressData) => JSON.stringify([d.plays, d.tests, d.games, d.extras]);

function readProfile(text: string): CloudProfile | null {
  try {
    const raw = (JSON.parse(text) as { profile?: Partial<CloudProfile> }).profile;
    if (!raw || typeof raw.name !== 'string') return null;
    return { name: raw.name, color: Number(raw.color) || 0, character: typeof raw.character === 'string' ? raw.character : 'vif' };
  } catch {
    return null;
  }
}

export async function syncOnce(store: ProgressStore, client: DriveClient, profile: CloudProfile, knownEmail = ''): Promise<SyncResult> {
  const remote = await client.read();
  let remoteData: ProgressData | null = null;
  if (remote) {
    try {
      remoteData = parseBackup(remote.text);
    } catch {
      // Copie illisible (rare) : on la remplace par la progression de l'appareil.
      remoteData = null;
    }
  }
  const local = store.getSnapshot();
  const merged = remoteData ? mergeProgress(local, remoteData) : local;
  const changedLocal = progressKey(merged) !== progressKey(local);
  if (changedLocal) await store.replaceData(merged);
  const uploaded = !remoteData || progressKey(merged) !== progressKey(remoteData);
  if (uploaded) {
    const backup = JSON.parse(store.exportJson()) as Record<string, unknown>;
    await client.write(JSON.stringify({ ...backup, profile }), remote?.id);
  }
  return { changedLocal, uploaded, email: knownEmail || (await client.email()), remoteProfile: remote ? readProfile(remote.text) : null };
}

// ---------- État affiché (réglages) ----------

export type CloudPhase = 'idle' | 'syncing' | 'ok' | 'paused' | 'error';

let phase: CloudPhase = 'idle';
const listeners = new Set<() => void>();

export const cloudState = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => phase,
};

function setPhase(next: CloudPhase) {
  phase = next;
  for (const listener of listeners) listener();
}

let running: Promise<SyncResult | null> | null = null;

/**
 * Une synchro complète, jeton compris. `interactive` : le joueur vient de toucher un bouton,
 * on peut lui demander son accord. Renvoie null si elle n'a pas pu se faire (hors ligne, accord
 * manquant…) : l'état affiché le dit, et la prochaine occasion réessaiera.
 */
export function runSync(store: ProgressStore, profile: CloudProfile, options: { interactive: boolean; email?: string }): Promise<SyncResult | null> {
  running ??= (async () => {
    setPhase('syncing');
    try {
      let token = await googleToken(options.interactive);
      try {
        const result = await syncOnce(store, driveClient(token), profile, options.email);
        setPhase('ok');
        return result;
      } catch (error) {
        // Jeton refusé (expiré, retiré) : un nouvel essai avec un jeton neuf.
        if (!(error instanceof DriveError) || error.status !== 401) throw error;
        forgetToken();
        token = await googleToken(options.interactive);
        const result = await syncOnce(store, driveClient(token), profile, options.email);
        setPhase('ok');
        return result;
      }
    } catch (error) {
      setPhase(error instanceof NeedsConsent ? 'paused' : 'error');
      return null;
    } finally {
      running = null;
    }
  })();
  return running;
}
