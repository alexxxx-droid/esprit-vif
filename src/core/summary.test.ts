import { describe, expect, it } from 'vitest';
import { durationLabel, gameHistory, monthlyReport, previousMonth, recentPlays, totals, weeklyRecap, type SummaryPlay } from './summary';

const play = (day: string, score: number, stats: Record<string, number> = {}, durationMs?: number, hour = 9): SummaryPlay => ({
  gameId: 'calcul',
  level: 1,
  score,
  day,
  at: `${day}T${String(hour).padStart(2, '0')}:00:00.000Z`,
  mode: 'free',
  stats,
  ...(durationMs ? { durationMs } : {}),
});

describe('chiffres des Progrès', () => {
  it('additionne le temps de jeu des seules parties dont la durée est connue', () => {
    const t = totals([play('2026-10-19', 50, {}, 60_000), play('2026-10-19', 60), play('2026-10-20', 70, {}, 30_000)]);
    expect(t).toMatchObject({ plays: 3, days: 2, timeMs: 90_000, timedPlays: 2 });
  });

  it('calcule la précision sur les jeux qui comptent les erreurs, et le temps de réaction là où il existe', () => {
    const t = totals([
      play('2026-10-20', 80, { correct: 18, errors: 2 }),
      play('2026-10-20', 60, { correct: 6, errors: 4 }),
      play('2026-10-20', 90, { found: 8 }),
      play('2026-10-20', 70, { correct: 20, meanRt: 500 }),
      play('2026-10-20', 70, { hits: 30, meanRt: 700 }),
    ]);
    expect(t.accuracy).toBe(80);
    expect(t.accuracyPlays).toBe(2);
    expect(t.reactionMs).toBe(600);
    expect(t.reactionPlays).toBe(2);
  });

  it('ne fabrique rien sans données', () => {
    expect(totals([])).toMatchObject({ plays: 0, days: 0, timeMs: 0, accuracy: null, reactionMs: null });
  });

  it('compare la semaine en cours (du lundi) à la précédente', () => {
    const plays = [play('2026-10-12', 40), play('2026-10-18', 60), play('2026-10-19', 80, {}, 120_000), play('2026-10-20', 90)];
    const { current, previous } = weeklyRecap(plays, '2026-10-21');
    expect(current).toEqual({ week: '2026-10-19', plays: 2, days: 2, timeMs: 120_000, average: 85 });
    expect(previous).toEqual({ week: '2026-10-12', plays: 2, days: 2, timeMs: 0, average: 50 });
  });

  it('montre les dernières parties d’abord', () => {
    const plays = [play('2026-10-18', 1), play('2026-10-20', 3), play('2026-10-19', 2)];
    expect(recentPlays(plays, 2).map((p) => p.score)).toEqual([3, 2]);
  });

  it('écrit une durée lisible', () => {
    expect(durationLabel(40_000)).toBe('40 s');
    expect(durationLabel(42 * 60_000)).toBe('42 min');
    expect(durationLabel(185 * 60_000)).toBe('3 h 05');
  });

  it('résume l’historique d’un jeu : record, 10 dernières parties face aux 10 d’avant', () => {
    const plays = Array.from({ length: 20 }, (_, i) => play(`2026-10-${String(1 + i).padStart(2, '0')}`, i < 10 ? 50 : 70, { correct: i < 10 ? 6 : 9, errors: i < 10 ? 4 : 1 }));
    const h = gameHistory([...plays, { ...play('2026-10-21', 99), gameId: 'stroop' }], 'calcul');
    expect(h).toMatchObject({ plays: 20, best: 70, recent: 70, before: 50, accuracy: { recent: 90, before: 60 }, reaction: { recent: null, before: null } });
    expect(gameHistory(plays.slice(0, 2), 'calcul').before).toBeNull();
  });

  it('fait le bilan d’un mois à partir des seules parties du mois', () => {
    const sept = Array.from({ length: 4 }, (_, i) => play(`2026-09-1${i}`, 50));
    const oct = [
      ...Array.from({ length: 4 }, (_, i) => play(`2026-10-0${i + 1}`, 70 + i, {}, 60_000)),
      { ...play('2026-10-05', 90), gameId: 'stroop' as const },
      { ...play('2026-11-01', 99), gameId: 'stroop' as const },
    ];
    const tests = [
      { day: '2026-10-02', official: true, done: true, brainAge: 38 },
      { day: '2026-10-03', official: true, done: true, brainAge: 35 },
      { day: '2026-10-03', official: false, done: true, brainAge: 20 },
    ];
    const r = monthlyReport([...sept, ...oct], tests, '2026-10');
    expect(r).toMatchObject({ plays: 5, days: 5, timeMs: 240_000, tests: 2, bestAge: 35, previous: { plays: 4, days: 4 } });
    expect(r.favorite).toEqual({ gameId: 'calcul', plays: 4 });
    expect(r.bestGain).toEqual({ gameId: 'calcul', before: 50, now: 72 });
    expect(r.records).toBe(4);
    expect(r.domains).toEqual({ calcul: 4, attention: 1 });
    expect(previousMonth('2026-01')).toBe('2025-12');
  });

  it('laisse vide un mois sans partie, sans rien inventer', () => {
    const r = monthlyReport([], [], '2026-10');
    expect(r).toMatchObject({ plays: 0, average: null, favorite: null, bestGain: null, bestAge: null });
  });
});

