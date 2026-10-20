import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { GameId, PlayOutcome } from '../core/types';
import { gameLevel, gameUnlocked, officialTests, parseBackup, progressionInput, ProgressStore, SCHEMA_VERSION, testInProgress } from './progress';
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
      challenges: [],
      friends: [],
      wardrobe: [],
    });
    expect(progressionInput(other.getSnapshot()).marathons).toBe(2);
  });

  it('gardent les défis entre amies, sans doublon, et les restaurent', async () => {
    const store = await freshStore();
    const link = { id: 'd1', seed: 9, level: 5, games: ['calcul', 'matrice', 'rotation'] as GameId[], from: 'Léa', scores: [70, 80, 90], day: '2026-10-19' };
    const lea = link.games.map((gameId, i) => ({ challenge: 'd1', name: 'Léa', me: false, gameId, score: link.scores[i], day: link.day }));
    const mine = link.games.map((gameId) => ({ challenge: 'd1', name: 'Alex', me: true, gameId, score: 60, day: link.day }));
    await store.recordChallenge(link, lea);
    await store.recordChallenge(link, [...lea, ...mine]);
    const other = await freshStore();
    await other.importJson(store.exportJson());
    const extras = other.getSnapshot().extras;
    expect(extras.challenges).toEqual([{ id: 'd1', seed: 9, level: 5, games: link.games, from: 'Léa', day: '2026-10-19' }]);
    expect(extras.friends).toHaveLength(6);
    expect(progressionInput(other.getSnapshot()).challenges).toBe(1);
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

describe('bilan de départ', () => {
  it('ouvre d’emblée les niveaux placés, sans médaille ni étoile offerte', async () => {
    const store = await freshStore();
    await store.placeLevels({ calcul: 3, total: 3 });
    const data = store.getSnapshot();
    expect(gameUnlocked(data, 'calcul')).toBe(3);
    expect(gameLevel(data, 'calcul')).toBe(3);
    expect(gameUnlocked(data, 'stroop')).toBe(1);
    expect(progressionInput(data).bests.calcul).toEqual({});
    // Un mauvais score ne referme pas ce que le bilan a ouvert.
    await store.recordPlay({ gameId: 'calcul', level: 3, mode: 'free', seed: 1, outcome: outcome(10) });
    expect(gameUnlocked(store.getSnapshot(), 'calcul')).toBe(3);
    expect(gameLevel(store.getSnapshot(), 'calcul')).toBe(2);
    const reloaded = parseBackup(store.exportJson());
    expect(reloaded.games.calcul?.start).toBe(3);
  });
});

describe('fiabilité et migrations', () => {
  /** Une base telle que l'écrivait la v2.0 (sans numéro de schéma, sans durée). */
  const v20Base = () => ({
    plays: [
      { id: 'p1', gameId: 'calcul', level: 1, mode: 'free', seed: 1, score: 72, stats: {}, headline: '72 pts', at: '2026-10-01T08:00:00.000Z', day: '2026-10-01' },
      { id: 'p2', gameId: 'calcul', level: 2, mode: 'free', seed: 2, score: 40, stats: {}, headline: '40 pts', at: '2026-10-01T08:05:00.000Z', day: '2026-10-01' },
    ],
    tests: [],
    kv: {
      settings: { sound: false, theme: 'dark' },
      games: { calcul: { level: 2, bests: { 1: { score: 72, headline: '72 pts', day: '2026-10-01' }, 2: { score: 40, headline: '40 pts', day: '2026-10-01' } } } },
      extras: { sessions: ['2026-10-01'], marathons: {}, duels: 1 },
    },
  });

  it('lit une base de la v2.0 sans rien perdre, puis la réécrit au schéma actuel', async () => {
    const storage = createMemoryStorage(v20Base());
    Object.defineProperty(storage, 'persistent', { value: true });
    const store = await ProgressStore.load(storage);
    const data = store.getSnapshot();
    expect(data.plays.map((p) => p.score)).toEqual([72, 40]);
    expect(data.settings.sound).toBe(false);
    expect(data.settings.language).toBe('auto');
    expect(gameUnlocked(data, 'calcul')).toBe(2);
    expect(data.extras.sessions).toEqual(['2026-10-01']);
    expect(data.extras.challenges).toEqual([]);
    expect((await storage.readAll()).kv.schema).toBe(SCHEMA_VERSION);
  });

  it('ne réécrit jamais une base venue d’une version plus récente', async () => {
    const base = { ...v20Base(), kv: { ...v20Base().kv, schema: SCHEMA_VERSION + 1, futur: 'garder' } };
    const storage = createMemoryStorage(base);
    Object.defineProperty(storage, 'persistent', { value: true });
    await ProgressStore.load(storage);
    expect((await storage.readAll()).kv.futur).toBe('garder');
  });

  it('retrouve un meilleur score perdu entre deux écritures (appli tuée)', async () => {
    const base = v20Base();
    base.plays.push({ id: 'p3', gameId: 'calcul', level: 2, mode: 'free', seed: 3, score: 85, stats: {}, headline: '85 pts', at: '2026-10-02T08:00:00.000Z', day: '2026-10-02' });
    const store = await ProgressStore.load(createMemoryStorage(base));
    expect(store.getSnapshot().games.calcul?.bests[2]).toEqual({ score: 85, headline: '85 pts', day: '2026-10-02' });
    expect(gameUnlocked(store.getSnapshot(), 'calcul')).toBe(3);
  });

  it('termine un test du jour dont le dernier résultat n’a pas été écrit', async () => {
    const store = await freshStore();
    const games: GameId[] = ['calcul', 'stroop', 'schulte'];
    const test = await store.startTest(games, at(19));
    for (const [i, gameId] of games.entries()) {
      const saved = await store.recordPlay({ gameId, level: 1, mode: 'daily', seed: i, outcome: outcome(80), testId: test.id }, at(19));
      // Le 3e résultat n'atteint jamais le test : l'appli s'est arrêtée juste avant.
      if (i < 2) await store.addTestResult(test.id, saved.play, at(19));
    }
    const reloaded = parseBackup(store.exportJson());
    const repaired = reloaded.tests.find((t) => t.id === test.id);
    expect(repaired?.done).toBe(true);
    expect(repaired?.official).toBe(true);
    expect(repaired?.brainAge).toBe(32);
    // Recharger une seconde fois ne change plus rien (aucune récompense comptée deux fois).
    expect(parseBackup(JSON.stringify({ app: 'esprit-vif', format: 1, ...reloaded })).tests).toEqual(reloaded.tests);
  });

  it('garde la durée d’une partie, et écarte une durée absurde', async () => {
    const store = await freshStore();
    await store.recordPlay({ gameId: 'calcul', level: 1, mode: 'free', seed: 1, outcome: { ...outcome(50), durationMs: 41_234.6 } });
    await store.recordPlay({ gameId: 'calcul', level: 1, mode: 'free', seed: 2, outcome: { ...outcome(50), durationMs: 9e9 } });
    const plays = parseBackup(store.exportJson()).plays;
    expect(plays[0].durationMs).toBe(41_235);
    expect(plays[1].durationMs).toBeUndefined();
  });
});

describe('vestiaire', () => {
  it('achète un chapeau avec les étincelles, une seule fois, et le garde dans la sauvegarde', async () => {
    const store = await freshStore();
    // 20 parties à 100 pts sur 2 jours : 2 × 25 étincelles (plafond quotidien).
    for (let i = 0; i < 20; i++) await store.recordPlay({ gameId: 'calcul', level: 1, mode: 'free', seed: i, outcome: outcome(100) }, at(10 + (i % 2)));
    await expect(store.buyHat('viking')).rejects.toThrow(/étincelles/);
    await store.buyHat('casquette', at(12));
    await expect(store.buyHat('casquette')).rejects.toThrow(/Déjà/);
    await expect(store.buyHat('couronne')).rejects.toThrow();
    await store.updateSettings({ hat: 'casquette' });
    const restored = parseBackup(store.exportJson());
    expect(restored.extras.wardrobe).toEqual([{ id: 'casquette', cost: 40, day: '2026-10-12' }]);
    expect(restored.settings.hat).toBe('casquette');
  });

  it('écarte un achat illisible ou en double, et un chapeau inconnu', () => {
    const json = JSON.stringify({
      app: 'esprit-vif',
      format: 1,
      plays: [],
      tests: [],
      settings: { hat: 'sombrero-geant' },
      extras: { wardrobe: [{ id: 'bob', cost: 60, day: '2026-10-21' }, { id: 'bob', cost: 60, day: '2026-10-20' }, { id: 'inconnu', cost: 1, day: '2026-10-20' }, { id: 'fez', cost: -5, day: 'x' }] },
    });
    const data = parseBackup(json);
    expect(data.extras.wardrobe).toEqual([{ id: 'bob', cost: 60, day: '2026-10-20' }]);
    expect(data.settings.hat).toBe('');
  });
});
