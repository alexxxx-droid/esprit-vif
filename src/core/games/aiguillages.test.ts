import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng, deriveSeed } from '../rng';
import {
  AIGUILLAGES_LEVELS,
  aiguillagesLevel,
  aiguillagesLevelLabel,
  aiguillagesRule,
  destination,
  gameMs,
  generateAiguillages,
  overlaps,
  scoreAiguillages,
  stationCount,
  switchCount,
} from './aiguillages';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const tier = (from: number) => LEVELS.slice(from - 1, from + 9);

describe('Aiguillages', () => {
  it('a 50 niveaux, et chaque partie tient en 45 secondes environ', () => {
    expect(AIGUILLAGES_LEVELS).toHaveLength(MAX_LEVEL);
    expect(aiguillagesRule(1)).toContain('45');
    for (const level of LEVELS) {
      const ms = gameMs(aiguillagesLevel(level));
      expect(ms, `niveau ${level}`).toBeGreaterThanOrEqual(28_000);
      expect(ms, `niveau ${level}`).toBeLessThanOrEqual(48_000);
    }
  });

  it('suit les aiguillages jusqu’à une gare', () => {
    expect(destination({ depth: 1 }, [0])).toBe(0);
    expect(destination({ depth: 1 }, [1])).toBe(1);
    expect(destination({ depth: 2 }, [1, 0, 1])).toBe(3);
    expect(destination({ depth: 2 }, [0, 1, 0])).toBe(1);
    expect(destination({ depth: 3 }, [1, 0, 0, 0, 0, 1, 0])).toBe(5);
  });

  it('lance des trains vers des gares qui existent, jamais trois fois de suite la même', () => {
    for (const level of LEVELS) {
      const c = aiguillagesLevel(level);
      for (let s = 0; s < 10; s++) {
        const g = generateAiguillages(createRng(deriveSeed(level, s)), level);
        expect(g.stations).toHaveLength(stationCount(c));
        expect(new Set(g.stations).size).toBe(stationCount(c));
        expect(g.switches).toHaveLength(switchCount(c));
        expect(g.trains).toHaveLength(c.trains);
        g.trains.forEach((t, k) => {
          expect(g.stations).toContain(t.color);
          expect(t.at).toBe(k * c.spawnMs);
          if (!c.express) expect(t.express).toBe(false);
          if (k >= 2) expect(t.color === g.trains[k - 1].color && t.color === g.trains[k - 2].color).toBe(false);
        });
      }
    }
  });

  it('apporte une nouvelle façon de jouer à chaque palier', () => {
    expect(tier(1).every((l) => aiguillagesLevel(l).depth === 1 && !overlaps(aiguillagesLevel(l)))).toBe(true);
    expect(tier(11).every((l) => aiguillagesLevel(l).depth === 2 && !overlaps(aiguillagesLevel(l)))).toBe(true);
    expect(tier(21).every((l) => aiguillagesLevel(l).depth === 2 && overlaps(aiguillagesLevel(l)))).toBe(true);
    expect(tier(31).every((l) => aiguillagesLevel(l).depth === 3 && !aiguillagesLevel(l).express)).toBe(true);
    expect(tier(41).every((l) => aiguillagesLevel(l).express > 0)).toBe(true);
    for (const from of [1, 11, 21, 31, 41]) expect(new Set(tier(from).map(aiguillagesLevelLabel)).size).toBeGreaterThanOrEqual(3);
  });

  it('note les trains à bon port : 100 pts à l’objectif, l’étoile à 60 %', () => {
    for (const level of LEVELS) {
      const { target, trains } = aiguillagesLevel(level);
      expect(target).toBeLessThan(trains);
      expect(scoreAiguillages(target, level)).toBe(100);
      expect(scoreAiguillages(Math.ceil(target * 0.6), level)).toBeGreaterThanOrEqual(60);
    }
  });
});
