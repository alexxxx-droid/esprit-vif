import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { PlayOutcome } from '../core/types';
import { gameLevel, gameUnlocked, officialTests, parseBackup, progressionInput, ProgressStore, testInProgress } from './progress';
import { createMemoryStorage, openIndexedDbStorage } from './storage';

const outcome = (score: number): PlayOutcome => ({ score, stats: { timeMs: 30_000 }, headline: `${score} pts`, lines: [] });
const at = (day: number, hour = 10) => new Date(2026, 9, day, hour);

async function freshStore() {
  return ProgressStore.load(createMemoryStorage());
}

describe('parties et records', () => {
  it('enregistre un premier score, puis un nouveau record seulement s’il est battu', async () => {
    const store = await freshStore();
    const first = await store.recordPlay({ gameId: 'calcul', level: 1, mode: 'free', seed: 1, outcome: outcome(60) });
    expect(first.record).toBe('first');
    const worse = await store.recordPlay({ gameId: 'calcul', level: 1, mode: 'daily', seed: 2, outcome: outcome(50) });
    expect(worse.record).toBeNull();
    const better = await store.recordPlay({ gameId: 'calcul', level: 1, mode: 'daily', seed: 3, outcome: outcome(70) });
    expect(better.record).toBe('new');
    expect(better.previousBest?.score).toBe(60);
    expect(store.getSnapshot().plays).toHaveLength(3);
  });

  it('adapte le niveau en entraînement libre seulement', async () => {
    const store = await freshStore();
    await store.recordPlay({ gameId: 'stroop', level: 1, mode: 'free', seed: 1, outcome: outcome(90) });
    expect(gameLevel(store.getSnapshot(), 'stroop')).toBe(2);
    await store.recordPlay({ gameId: 'stroop', level: 1, mode: 'daily', seed: 1, outcome: outcome(95) });
    expect(gameLevel(store.getSnapshot(), 'stroop')).toBe(2);
    await store.recordPlay({ gameId: 'stroop', level: 2, mode: 'free', seed: 1, outcome: outcome(10) });
    expect(gameLevel(store.getSnapshot(), 'stroop')).toBe(1);
  });
});

describe('test du jour', () => {
  async function playTest(store: ProgressStore, now: Date, scores: number[]) {
    const test = await store.startTest(['calcul', 'stroop', 'schulte'], now);
    const ids = ['calcul', 'stroop', 'schulte'] as const;
    let current = test;
    for (let i = 0; i < ids.length; i++) {
      const saved = await store.recordPlay(
        { gameId: ids[i], level: 1, mode: 'daily', seed: i, outcome: outcome(scores[i]), testId: test.id },
        now,
      );
      current = await store.addTestResult(test.id, saved.play, now);
    }
    return current;
  }

  it('calcule l’âge cérébral à la fin du 3e jeu', async () => {
    const store = await freshStore();
    const test = await playTest(store, at(19), [70, 80, 90]);
    expect(test.done).toBe(true);
    expect(test.brainAge).toBe(32);
  });

  it('n’accepte qu’un seul test officiel par jour', async () => {
    const store = await freshStore();
    const first = await playTest(store, at(19, 9), [50, 50, 50]);
    const second = await playTest(store, at(19, 20), [90, 90, 90]);
    const nextDay = await playTest(store, at(20, 8), [60, 60, 60]);
    expect(first.official).toBe(true);
    expect(second.official).toBe(false);
    expect(nextDay.official).toBe(true);
    expect(officialTests(store.getSnapshot()).map((t) => t.brainAge)).toEqual([50, 44]);
  });

  it('garde un test commencé pour pouvoir le continuer, et l’abandonne si on en relance un', async () => {
    const store = await freshStore();
    const test = await store.startTest(['calcul', 'stroop', 'schulte'], at(19));
    expect(testInProgress(store.getSnapshot(), '2026-10-19')?.id).toBe(test.id);
    await store.startTest(['calcul', 'stroop', 'schulte'], at(19, 11));
    expect(store.getSnapshot().tests).toHaveLength(1);
  });
});

describe('sauvegarde JSON', () => {
  it('exporte puis réimporte la progression à l’identique', async () => {
    const store = await freshStore();
    await store.recordPlay({ gameId: 'schulte', level: 1, mode: 'free', seed: 9, outcome: outcome(88) });
    await store.updateSettings({ sound: false });
    const json = store.exportJson();

    const other = await freshStore();
    await other.importJson(json);
    expect(other.getSnapshot().plays).toEqual(store.getSnapshot().plays);
    expect(other.getSnapshot().settings.sound).toBe(false);
    expect(other.getSnapshot().games.schulte?.bests[1]?.score).toBe(88);
  });

  it('refuse un fichier qui n’est pas une sauvegarde', () => {
    expect(() => parseBackup('pas du json')).toThrow();
    expect(() => parseBackup('{"app":"autre","format":1,"plays":[],"tests":[]}')).toThrow();
    expect(() => parseBackup('{"app":"esprit-vif","format":99,"plays":[],"tests":[]}')).toThrow();
  });
});

describe('stockage IndexedDB', () => {
  it('relit ce qui a été écrit, même après réouverture', async () => {
    const storage = await openIndexedDbStorage('esprit-vif-test');
    const store = await ProgressStore.load(storage);
    await store.recordPlay({ gameId: 'calcul', level: 1, mode: 'free', seed: 1, outcome: outcome(42) });
    await store.updateSettings({ theme: 'dark' });

    const reopened = await ProgressStore.load(await openIndexedDbStorage('esprit-vif-test'));
    expect(reopened.getSnapshot().plays.map((p) => p.score)).toEqual([42]);
    expect(reopened.getSnapshot().settings.theme).toBe('dark');

    await reopened.reset();
    const cleared = await ProgressStore.load(await openIndexedDbStorage('esprit-vif-test'));
    expect(cleared.getSnapshot().plays).toEqual([]);
    expect(cleared.getSnapshot().settings.theme).toBe('dark');
  });
});

describe('séances, marathons et duels', () => {
  it('sont comptés, sauvegardés et restaurés', async () => {
    const store = await freshStore();
    await store.completeSession('2026-10-19');
    await store.completeSession('2026-10-19');
    expect(await store.recordMarathon('calcul', 180)).toBe(true);
    expect(await store.recordMarathon('calcul', 120)).toBe(false);
    await store.recordDuel();
    const other = await freshStore();
    await other.importJson(store.exportJson());
    expect(other.getSnapshot().extras).toEqual({
      sessions: ['2026-10-19'],
      marathons: { calcul: { best: 180, count: 2 } },
      duels: 1,
    });
    expect(progressionInput(other.getSnapshot()).marathons).toBe(2);
  });

  it('ne conseille jamais un niveau encore verrouillé', async () => {
    const store = await freshStore();
    await store.recordPlay({ gameId: 'calcul', level: 1, mode: 'free', seed: 1, outcome: outcome(90) });
    expect(gameLevel(store.getSnapshot(), 'calcul')).toBe(2);
    expect(gameUnlocked(store.getSnapshot(), 'calcul')).toBe(2);
    await store.recordPlay({ gameId: 'calcul', level: 2, mode: 'free', seed: 1, outcome: outcome(40) });
    expect(gameUnlocked(store.getSnapshot(), 'calcul')).toBe(2);
  });
});
