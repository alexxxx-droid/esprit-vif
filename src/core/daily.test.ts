import { describe, expect, it } from 'vitest';
import {
  addDays,
  bestStreak,
  currentStreak,
  dailyGames,
  dailySeed,
  dayIndex,
  dayKey,
  hasOfficialTest,
} from './daily';

describe('dayKey et addDays', () => {
  it('formate le jour local', () => {
    expect(dayKey(new Date(2026, 9, 19, 23, 59))).toBe('2026-10-19');
    expect(dayKey(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
  });

  it('passe les fins de mois et d’année', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(dayIndex('2026-10-20') - dayIndex('2026-10-19')).toBe(1);
  });
});

describe('dailyGames', () => {
  const rotation = ['schulte', 'stroop', 'calcul'] as const;

  it('contient toujours Calcul éclair et Couleurs piégées, puis un 3e jeu', () => {
    const games = dailyGames('2026-10-19', rotation);
    expect(games).toHaveLength(3);
    expect(games.slice(0, 2)).toEqual(['calcul', 'stroop']);
  });

  it('fait tourner le 3e jeu d’un jour sur l’autre', () => {
    const thirds = Array.from({ length: 3 }, (_, i) => dailyGames(addDays('2026-10-19', i), rotation)[2]);
    expect(new Set(thirds).size).toBe(3);
  });

  it('donne une graine propre au jour et au jeu', () => {
    expect(dailySeed('2026-10-19', 'calcul')).toBe(dailySeed('2026-10-19', 'calcul'));
    expect(dailySeed('2026-10-19', 'calcul')).not.toBe(dailySeed('2026-10-20', 'calcul'));
    expect(dailySeed('2026-10-19', 'calcul')).not.toBe(dailySeed('2026-10-19', 'stroop'));
  });
});

describe('un seul test officiel par jour', () => {
  it('ne compte que les tests officiels terminés du jour', () => {
    const tests = [
      { day: '2026-10-18', official: true, done: true },
      { day: '2026-10-19', official: true, done: false },
      { day: '2026-10-19', official: false, done: true },
    ];
    expect(hasOfficialTest(tests, '2026-10-19')).toBe(false);
    expect(hasOfficialTest(tests, '2026-10-18')).toBe(true);
    expect(hasOfficialTest([...tests, { day: '2026-10-19', official: true, done: true }], '2026-10-19')).toBe(true);
  });
});

describe('séries de jours', () => {
  it('compte les jours consécutifs jusqu’à aujourd’hui', () => {
    expect(currentStreak(['2026-10-17', '2026-10-18', '2026-10-19'], '2026-10-19')).toBe(3);
  });

  it('garde la série d’hier tant que la journée n’est pas finie', () => {
    expect(currentStreak(['2026-10-17', '2026-10-18'], '2026-10-19')).toBe(2);
  });

  it('retombe à zéro après un jour manqué', () => {
    expect(currentStreak(['2026-10-15', '2026-10-16'], '2026-10-19')).toBe(0);
    expect(currentStreak([], '2026-10-19')).toBe(0);
  });

  it('traverse les changements de mois et ignore les doublons', () => {
    expect(currentStreak(['2026-09-30', '2026-10-01', '2026-10-01'], '2026-10-01')).toBe(2);
  });

  it('retrouve la meilleure série', () => {
    expect(bestStreak(['2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-07'])).toBe(3);
    expect(bestStreak([])).toBe(0);
  });
});
