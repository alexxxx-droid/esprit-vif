import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { PlayOutcome } from '../core/types';
import { ProgressStore } from '../store/progress';
import { createMemoryStorage } from '../store/storage';
import { progressKey, syncOnce } from './cloud';
import { driveClient } from './drive';

const outcome = (score: number): PlayOutcome => ({ score, stats: {}, headline: `${score} pts`, lines: [] });
const profile = { name: 'Alex', color: 1, character: 'pomme' };

/** Un Drive en mémoire, qui répond comme l'API de Google aux appels de l'appli. */
function fakeDrive() {
  let file: string | null = null;
  const calls: string[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push(`${method} ${url.split('?')[0].replace('https://www.googleapis.com', '')}`);
    if (!/^Bearer \S+$/.test(String(new Headers(init?.headers).get('Authorization')))) return new Response('', { status: 401 });
    const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
    if (url.includes('/about')) return json({ user: { emailAddress: 'alex@example.com' } });
    if (method === 'GET' && url.includes('/files?')) return json({ files: file === null ? [] : [{ id: 'f1' }] });
    if (method === 'GET' && url.includes('/files/f1?alt=media')) return new Response(file ?? '');
    if (method === 'POST') {
      // Envoi en plusieurs parties : métadonnées, puis le contenu.
      const parts = String(init?.body).split(/--esprit-vif-[a-z0-9]+/);
      file = parts[2].split('\r\n\r\n').slice(1).join('\r\n\r\n').trim();
      return json({ id: 'f1' });
    }
    if (method === 'PATCH') {
      file = String(init?.body);
      return json({ id: 'f1' });
    }
    return new Response('', { status: 404 });
  }) as typeof fetch;
  return { client: driveClient('jeton', fetchImpl), fetchImpl, calls, read: () => file };
}

async function device() {
  return ProgressStore.load(createMemoryStorage());
}

describe('synchronisation par le Drive', () => {
  it('fait converger le téléphone et la tablette, sans rien perdre', async () => {
    const drive = fakeDrive();
    const phone = await device();
    const tablet = await device();
    await phone.recordPlay({ gameId: 'calcul', level: 1, mode: 'free', seed: 1, outcome: outcome(90) }, new Date('2026-10-18T10:00:00Z'));

    const first = await syncOnce(phone, drive.client, profile);
    expect(first).toMatchObject({ changedLocal: false, uploaded: true, email: 'alex@example.com', remoteProfile: null });
    expect(JSON.parse(drive.read()!).profile).toEqual(profile);

    await tablet.recordPlay({ gameId: 'matrice', level: 1, mode: 'free', seed: 2, outcome: outcome(70) }, new Date('2026-10-19T08:00:00Z'));
    const second = await syncOnce(tablet, drive.client, profile, 'alex@example.com');
    expect(second).toMatchObject({ changedLocal: true, uploaded: true, remoteProfile: profile });
    expect(tablet.getSnapshot().plays).toHaveLength(2);

    const third = await syncOnce(phone, drive.client, profile, 'alex@example.com');
    expect(third).toMatchObject({ changedLocal: true, uploaded: false });
    expect(progressKey(phone.getSnapshot())).toBe(progressKey(tablet.getSnapshot()));

    // Plus rien à faire : une synchro de plus ne réécrit rien.
    const writes = drive.calls.filter((c) => c.startsWith('POST') || c.startsWith('PATCH')).length;
    const idle = await syncOnce(tablet, drive.client, profile, 'alex@example.com');
    expect(idle).toMatchObject({ changedLocal: false, uploaded: false });
    expect(drive.calls.filter((c) => c.startsWith('POST') || c.startsWith('PATCH'))).toHaveLength(writes);
  });

  it('refuse sans jeton, et remplace une copie illisible', async () => {
    const drive = fakeDrive();
    const phone = await device();
    await expect(syncOnce(phone, driveClient('', drive.fetchImpl), profile)).rejects.toMatchObject({ status: 401 });
    await drive.client.write('pas du JSON');
    await phone.recordPlay({ gameId: 'stroop', level: 1, mode: 'free', seed: 1, outcome: outcome(50) });
    const result = await syncOnce(phone, drive.client, profile);
    expect(result.uploaded).toBe(true);
    expect(JSON.parse(drive.read()!).plays).toHaveLength(1);
  });
});
