import { describe, expect, it } from 'vitest';
import { addDays } from './daily';
import {
  dailyObjectives,
  markPlays,
  objectiveLabel,
  objectivesDone,
  OBJECTIVES_START,
  playSparks,
  SPARKS,
  sparksEarned,
  type HistoryPlay,
} from './objectives';
import { GAME_ORDER } from './games/registry';
import type { GameId } from './types';

let clock = 0;
const play = (gameId: GameId, score: number, day: string, level = 1): HistoryPlay => ({
  gameId,
  level,
  score,
  day,
  at: `${day}T08:${String(clock++ % 60).padStart(2, '0')}:00.000Z`,
});

describe('records et étoiles, partie par partie', () => {
  it('ne compte pas une première partie comme un record, et chaque étoile une seule fois', () => {
    const marked = markPlays([play('calcul', 70, '2026-10-20'), play('calcul', 65, '2026-10-20'), play('calcul', 96, '2026-10-21'), play('calcul', 97, '2026-10-22')]);
    expect(marked.map((m) => m.record)).toEqual([false, false, true, true]);
    expect(marked.map((m) => m.stars)).toEqual([1, 0, 2, 0]);
  });
});

describe('objectifs du jour', () => {
  const day = '2026-10-25';

  it('propose 3 objectifs stables pour une journée, et rien avant leur lancement', () => {
    const first = dailyObjectives(day, [], []);
    expect(first).toHaveLength(3);
    expect(dailyObjectives(day, [play('stroop', 50, day)], []).map((s) => s.objective)).toEqual(first.map((s) => s.objective));
    expect(dailyObjectives(addDays(OBJECTIVES_START, -1), [], [])).toEqual([]);
    for (const s of first) expect(objectiveLabel(s.objective).length).toBeGreaterThan(8);
  });

  it('donne des objectifs simples à un débutant, sans record à battre', () => {
    for (let i = 0; i < 60; i++) {
      const kinds = dailyObjectives(addDays(day, i), [], []).map((s) => s.objective.kind);
      expect(kinds).not.toContain('record');
      expect(kinds).not.toContain('stars');
      expect(kinds).not.toContain('rare');
    }
  });

  it('se valide avec les parties du jour, et ne compte ni la veille ni le lendemain', () => {
    const plays = [play('calcul', 90, addDays(day, -1)), play('calcul', 90, addDays(day, -1))];
    const before = dailyObjectives(day, plays, []);
    const volume = before.find((s) => s.objective.kind === 'plays')!;
    expect(volume.progress).toBe(0);
    const today = [...plays, ...Array.from({ length: volume.objective.target }, (_, i) => play(GAME_ORDER[i], 70, day))];
    expect(dailyObjectives(day, today, []).find((s) => s.objective.kind === 'plays')?.done).toBe(true);
    expect(dailyObjectives(addDays(day, 1), today, []).find((s) => s.objective.kind === 'plays')?.progress).toBe(0);
  });

  it('valide le test du jour avec le seul test officiel terminé', () => {
    // Un joueur débutant reçoit « test » ou « score » : on cherche une journée avec « test ».
    const testDay = Array.from({ length: 30 }, (_, i) => addDays(day, i)).find((d) => dailyObjectives(d, [], []).some((s) => s.objective.kind === 'test'))!;
    const status = (tests: { day: string; official: boolean; done: boolean }[]) =>
      dailyObjectives(testDay, [play('calcul', 50, testDay)], tests).find((s) => s.objective.kind === 'test')!;
    expect(status([{ day: testDay, official: false, done: true }]).done).toBe(false);
    expect(status([{ day: testDay, official: true, done: false }]).done).toBe(false);
    expect(status([{ day: testDay, official: true, done: true }]).done).toBe(true);
  });

  it('ne verse jamais deux fois le même objectif, même en rejouant toute la journée', () => {
    const plays = Array.from({ length: 40 }, (_, i) => play(GAME_ORDER[i % GAME_ORDER.length], 99, day));
    const done = objectivesDone(plays, [{ day, official: true, done: true }]);
    expect(done.length).toBeLessThanOrEqual(3);
    expect(new Set(done.map((o) => o.id)).size).toBe(done.length);
  });

  it('compte les objectifs de toutes les journées en un passage, comme jour par jour', () => {
    const plays: HistoryPlay[] = [];
    for (let d = 0; d < 20; d++) for (let k = 0; k < (d % 4) + 1; k++) plays.push(play(GAME_ORDER[(d * 3 + k) % GAME_ORDER.length], 40 + ((d * 7 + k * 13) % 60), addDays(day, d), 1 + (k % 2)));
    const tests = [{ day: addDays(day, 2), official: true, done: true }];
    const daily = Array.from({ length: 20 }, (_, d) => dailyObjectives(addDays(day, d), plays, tests).filter((s) => s.done).length).reduce((a, b) => a + b, 0);
    expect(objectivesDone(plays, tests)).toHaveLength(daily);
  });
});

describe('étincelles', () => {
  it('rapportent de 1 à 5 par partie selon le score', () => {
    expect([0, 24, 25, 50, 99, 100].map(playSparks)).toEqual([1, 1, 2, 3, 4, 5]);
  });

  it('plafonnent les étincelles de parties chaque jour', () => {
    const before = '2026-10-10';
    const plays = Array.from({ length: 30 }, () => play('calcul', 100, before));
    expect(sparksEarned({ plays, tests: [], sessions: [] })).toBe(SPARKS.playsPerDay);
  });

  it('ajoutent le test du jour officiel, une fois par jour', () => {
    const before = '2026-10-10';
    const plays = [play('calcul', 0, before)];
    const tests = [
      { day: before, official: true, done: true },
      { day: before, official: false, done: true },
    ];
    expect(sparksEarned({ plays, tests, sessions: [] })).toBe(1 + SPARKS.test);
  });
});
