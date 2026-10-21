import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng } from '../rng';
import { formatStep, generateTotalRound, nextTotalLength, scoreTotal, totalLevel, totalMaxValue, totalPerfectPoints } from './total';

describe('générateur du Total cumulé', () => {
  it('garde le total toujours entre 0 et le maximum du niveau (99 jusqu’au niveau 20), à tous les niveaux', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const { maxStep } = totalLevel(level);
      const max = totalMaxValue(level);
      if (level <= 20) expect(max).toBe(99);
      for (let seed = 1; seed <= 80; seed++) {
        for (const length of [3, 4, 8, 14]) {
          const round = generateTotalRound(createRng(seed * 31 + length), length, level);
          expect(round.steps).toHaveLength(length);
          if (level <= 20) expect(round.kinds).toBeUndefined();
          let running = 0;
          round.steps.forEach((step, i) => {
            const kind = round.kinds?.[i] ?? 'add';
            if (kind === 'times') {
              expect([2, 3]).toContain(step);
              running *= step;
            } else {
              expect(step).not.toBe(0);
              expect(Math.abs(step)).toBeLessThanOrEqual(maxStep);
              if (kind === 'add') running += step;
            }
            expect(running).toBeGreaterThanOrEqual(0);
            expect(running).toBeLessThanOrEqual(max);
          });
          expect(round.total).toBe(running);
        }
      }
    }
    // 16 000 manches : plus de 5 s quand toute la suite tourne en parallèle.
  }, 30_000);

  it('démarre à 4 nombres au niveau 1, comme la spec', () => {
    expect(totalLevel(1).start).toBe(4);
  });

  it('mélange additions et soustractions', () => {
    const steps = Array.from({ length: 50 }, (_, s) => generateTotalRound(createRng(s), 8, 2).steps).flat();
    expect(steps.some((s) => s < 0)).toBe(true);
    expect(steps.some((s) => s > 0)).toBe(true);
  });
});

describe('déroulé et score du Total cumulé', () => {
  it('allonge la suite après une réussite, la raccourcit après un échec', () => {
    expect(nextTotalLength(4, true)).toBe(5);
    expect(nextTotalLength(4, false)).toBe(3);
    expect(nextTotalLength(3, false)).toBe(3);
  });

  it('donne 100 pour cinq manches parfaites, borné entre 0 et 100', () => {
    expect(totalPerfectPoints(1)).toBe(30);
    expect(scoreTotal(30, 1)).toBe(100);
    expect(scoreTotal(15, 1)).toBe(50);
    expect(scoreTotal(0, 1)).toBe(0);
    for (let level = 1; level <= MAX_LEVEL; level++) {
      expect(scoreTotal(totalPerfectPoints(level), level)).toBe(100);
      expect(scoreTotal(500, level)).toBe(100);
    }
  });

  it('écrit les nombres avec leur signe', () => {
    expect(formatStep(7)).toBe('+7');
    expect(formatStep(-3)).toBe('−3');
  });
});
