import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng, deriveSeed } from '../rng';
import { allowedFor, bestMoves, generateHanoi, HANOI_LEVELS, hanoiLevel, hanoiLevelLabel, hanoiRule, move, roundPoints, scoreHanoi } from './hanoi';
import { GAMES } from './registry';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const tier = (from: number) => LEVELS.slice(from - 1, from + 9);

describe('Tours de Hanoï', () => {
  it('a 50 niveaux et dure une minute', () => {
    expect(HANOI_LEVELS).toHaveLength(MAX_LEVEL);
    expect(GAMES.hanoi.duration).toBe('≈ 1 min');
    expect(hanoiRule(1)).toContain('minute');
  });

  it('interdit un grand disque sur un petit, et trouve le meilleur nombre de coups', () => {
    // Disque 0 (petit) à gauche, disque 1 au milieu : on ne pose pas le 1 sur le 0.
    expect(move([0, 1], 1, 0)).toBeNull();
    expect(move([0, 1], 0, 1)).toEqual([1, 1]);
    expect(move([0, 0], 2, 1)).toBeNull();
    expect(bestMoves([0, 0, 0], [2, 2, 2])).toBe(7);
    expect(bestMoves([0, 0, 0, 0], [2, 2, 2, 2])).toBe(15);
    expect(bestMoves([2, 2, 2], [2, 2, 2])).toBe(0);
  });

  it('tire des tours faisables, à la bonne forme pour chaque palier', () => {
    for (const level of LEVELS) {
      const c = hanoiLevel(level);
      for (const round of generateHanoi(createRng(deriveSeed(level, 2)), level)) {
        expect(round.start).toHaveLength(c.disks);
        expect(round.best).toBe(bestMoves(round.start, round.goal));
        expect(round.best).toBeGreaterThanOrEqual(3);
        if (!c.mixedStart) expect(round.start.every((p) => p === 0)).toBe(true);
        if (!c.modelGoal) expect(round.goal.every((p) => p === 2)).toBe(true);
        const allowed = allowedFor(c, round);
        if (c.margin) expect(allowed).toBe(round.best + c.margin);
        else expect(allowed).toBeNull();
      }
    }
  });

  it('apporte une nouvelle façon de jouer à chaque palier', () => {
    expect(tier(1).every((l) => hanoiLevel(l).disks === 3 && !hanoiLevel(l).mixedStart)).toBe(true);
    expect(tier(11).every((l) => hanoiLevel(l).disks === 4 && !hanoiLevel(l).mixedStart)).toBe(true);
    expect(tier(21).every((l) => hanoiLevel(l).mixedStart && !hanoiLevel(l).modelGoal)).toBe(true);
    expect(tier(31).every((l) => hanoiLevel(l).modelGoal && !hanoiLevel(l).margin)).toBe(true);
    expect(tier(41).every((l) => hanoiLevel(l).margin > 0)).toBe(true);
    for (const from of [1, 11, 21, 31, 41]) expect(new Set(tier(from).map(hanoiLevelLabel)).size).toBeGreaterThanOrEqual(2);
  });

  it('donne plus de points à un tour fini en peu de coups', () => {
    const round = { start: [0, 0, 0], goal: [2, 2, 2], best: 7 };
    expect(roundPoints(round, 7)).toBe(1);
    expect(roundPoints(round, 14)).toBe(0.5);
    for (const level of LEVELS) {
      const { target } = hanoiLevel(level);
      expect(scoreHanoi(target, level)).toBe(100);
      expect(scoreHanoi(target * 0.6, level)).toBeGreaterThanOrEqual(60);
    }
  });
});
