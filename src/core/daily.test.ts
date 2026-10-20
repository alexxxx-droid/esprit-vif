import { describe, expect, it } from 'vitest';
import { COACH_TIPS, coachTip } from './coach';
import {
  addDays,
  addMonths,
  bestStreak,
  monthGrid,
  currentStreak,
  currentStreakDetail,
  dailyGames,
  dailySeed,
  dayIndex,
  dayKey,
  hasOfficialTest,
  streakHorizon,
} from './daily';
import { DAILY_POOL } from './games/registry';

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
  const span = (from: string, days: number) => Array.from({ length: days }, (_, i) => addDays(from, i));
  const domainOf = (id: string) => DAILY_POOL.findIndex((games) => games.includes(id as never));

  it('tire 3 jeux de 3 domaines différents, toujours les mêmes pour une date donnée', () => {
    for (const day of span('2026-10-01', 90)) {
      const games = dailyGames(day, DAILY_POOL);
      expect(games).toHaveLength(3);
      expect(new Set(games.map(domainOf)).size).toBe(3);
      expect(dailyGames(day, DAILY_POOL)).toEqual(games);
    }
  });

  it('ne repropose jamais un jeu le lendemain, et fait le tour d’un domaine avant d’y revenir', () => {
    const days = span('2026-10-01', 400);
    const picks = days.map((day) => dailyGames(day, DAILY_POOL));
    for (let i = 1; i < picks.length; i++) for (const id of picks[i]) expect(picks[i - 1]).not.toContain(id);
    DAILY_POOL.forEach((games, domain) => {
      const sequence = picks.flat().filter((id) => domainOf(id) === domain);
      for (let i = 1; i < sequence.length; i++) expect(sequence[i]).not.toBe(sequence[i - 1]);
      // Sur n'importe quelle suite de 2 tours, chaque jeu du domaine revient au moins une fois.
      for (let i = 0; i + 2 * games.length <= sequence.length; i += games.length) {
        expect(new Set(sequence.slice(i, i + 2 * games.length)).size).toBe(games.length);
      }
    });
  });

  it('équilibre les domaines : chacun revient un jour sur deux', () => {
    const counts = new Array(DAILY_POOL.length).fill(0);
    // 10 cycles complets de 20 jours (les 20 trios de domaines).
    let start = '2026-10-01';
    while (dayIndex(start) % 20 !== 0) start = addDays(start, 1);
    for (const day of span(start, 200)) for (const id of dailyGames(day, DAILY_POOL)) counts[domainOf(id)]++;
    expect(counts.every((c) => c === 100)).toBe(true);
  });

  it('se contente de ce qui existe quand il manque des domaines', () => {
    expect(dailyGames('2026-10-19', [['calcul'], [], ['stroop']])).toEqual(['calcul', 'stroop']);
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

describe('calendrier', () => {
  it('commence le lundi et compte les jours du mois', () => {
    const october = monthGrid(2026, 10); // le 1er octobre 2026 est un jeudi
    expect(october.slice(0, 4)).toEqual([null, null, null, '2026-10-01']);
    expect(october.filter(Boolean)).toHaveLength(31);
    expect(monthGrid(2028, 2).filter(Boolean)).toHaveLength(29);
    expect(monthGrid(2026, 6)[0]).toBe('2026-06-01'); // un lundi
  });

  it('passe d’un mois à l’autre, années comprises', () => {
    expect(addMonths(2026, 1, -1)).toEqual([2025, 12]);
    expect(addMonths(2026, 12, 1)).toEqual([2027, 1]);
    expect(addMonths(2026, 10, 0)).toEqual([2026, 10]);
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

  it('pardonne un jour de repos par semaine, jamais deux jours d’affilée', () => {
    expect(currentStreak(['2026-10-16', '2026-10-17', '2026-10-19'], '2026-10-19')).toBe(3);
    // Hier manqué, aujourd'hui pas encore joué : la série tient encore.
    expect(currentStreakDetail(['2026-10-16', '2026-10-17'], '2026-10-19')).toEqual({ count: 2, rests: ['2026-10-18'] });
    // Deux repos à moins de 7 jours : la série s'arrête au second.
    expect(currentStreak(['2026-10-10', '2026-10-11', '2026-10-13', '2026-10-14', '2026-10-16'], '2026-10-16')).toBe(3);
    expect(currentStreak(['2026-10-06', '2026-10-07', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-16'], '2026-10-16')).toBe(9);
    expect(bestStreak(['2026-10-01', '2026-10-02', '2026-10-04', '2026-10-05'])).toBe(4);
  });

  it('retrouve la meilleure série', () => {
    expect(bestStreak(['2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-07'])).toBe(3);
    expect(bestStreak([])).toBe(0);
  });
});

describe('mot du coach', () => {
  it('change chaque jour et reste le même toute la journée', () => {
    expect(coachTip('2026-10-19')).toBe(coachTip('2026-10-19'));
    expect(coachTip('2026-10-19')).not.toBe(coachTip('2026-10-20'));
    expect(COACH_TIPS.length).toBeGreaterThanOrEqual(50);
  });
});

describe('horizon de la série (widget)', () => {
  it('dit jusqu’à quand la série tient sans jouer, jour de repos compris', () => {
    expect(streakHorizon([], '2026-10-19')).toEqual({ count: 0, until: null });
    // Joué hier et avant-hier, pas aujourd'hui : la série tient encore demain (jour de repos), plus après.
    const days = ['2026-10-17', '2026-10-18'];
    const h = streakHorizon(days, '2026-10-19');
    expect(h.count).toBe(2);
    expect(h.until).toBe('2026-10-20');
    expect(streakHorizon([...days, '2026-10-19'], '2026-10-19')).toEqual({ count: 3, until: '2026-10-21' });
  });
});
