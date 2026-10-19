import { describe, expect, it } from 'vitest';
import { addDays } from './daily';
import { challengeProgress, seasonOf, seasonPlays, SEASONS, weeklyChallenge, weekliesDone, weekStart } from './events';
import { GAMES } from './games/registry';

describe('Saisons', () => {
  it('reconnaît la saison du jour', () => {
    expect(seasonOf('2026-10-19')?.id).toBe('halloween');
    expect(seasonOf('2026-11-02')?.id).toBe('halloween');
    expect(seasonOf('2026-11-03')).toBeNull();
    expect(seasonOf('2026-12-24')?.id).toBe('noel');
    expect(seasonOf('2027-07-14')?.id).toBe('ete');
  });

  it('compte les parties de la saison, par année si besoin', () => {
    const halloween = SEASONS[0];
    const plays = [
      { gameId: 'calcul' as const, score: 50, day: '2025-10-31' },
      { gameId: 'calcul' as const, score: 50, day: '2026-10-20' },
      { gameId: 'calcul' as const, score: 50, day: '2026-11-10' },
    ];
    expect(seasonPlays(plays, halloween)).toBe(2);
    expect(seasonPlays(plays, halloween, '2026')).toBe(1);
  });
});

describe('Défi de la semaine', () => {
  it('commence le lundi et reste le même toute la semaine', () => {
    expect(weekStart('2026-10-19')).toBe('2026-10-19');
    expect(weekStart('2026-10-25')).toBe('2026-10-19');
    expect(weekStart('2026-10-26')).toBe('2026-10-26');
    const monday = weeklyChallenge('2026-10-19');
    expect(weeklyChallenge('2026-10-23')).toEqual(monday);
    expect(monday.week).toBe('2026-10-19');
    expect(monday.target).toBeGreaterThan(0);
  });

  it('suit l’avancement et compte les défis relevés', () => {
    // On cherche une semaine dont le défi porte sur la variété, pour le remplir à coup sûr.
    let week = '2026-01-05';
    while (weeklyChallenge(week).kind !== 'variety') week = addDays(week, 7);
    const challenge = weeklyChallenge(week);
    const plays = Object.keys(GAMES)
      .slice(0, challenge.target)
      .map((gameId, i) => ({ gameId: gameId as keyof typeof GAMES, score: 40, day: addDays(week, i % 7) }));
    expect(challengeProgress(challenge, plays, [])).toBe(challenge.target);
    expect(weekliesDone(plays, [])).toBeGreaterThanOrEqual(1);
    expect(challengeProgress(challenge, plays.map((p) => ({ ...p, day: addDays(p.day, 7) })), [])).toBe(0);
  });
});
