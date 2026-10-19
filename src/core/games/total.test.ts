import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { formatStep, generateTotalRound, nextTotalLength, scoreTotal, TOTAL_MAX_STEP } from './total';

describe('générateur du Total cumulé', () => {
  it('garde le total toujours entre 0 et 99, du premier au dernier nombre', () => {
    for (const level of [1, 2, 3]) {
      for (let seed = 1; seed <= 300; seed++) {
        for (const length of [3, 4, 8, 12]) {
          const round = generateTotalRound(createRng(seed * 31 + length), length, level);
          expect(round.steps).toHaveLength(length);
          let running = 0;
          for (const step of round.steps) {
            expect(step).not.toBe(0);
            expect(Math.abs(step)).toBeLessThanOrEqual(TOTAL_MAX_STEP[level]);
            running += step;
            expect(running).toBeGreaterThanOrEqual(0);
            expect(running).toBeLessThanOrEqual(99);
          }
          expect(round.total).toBe(running);
        }
      }
    }
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
    expect(nextTotalLength(12, true)).toBe(12);
  });

  it('donne 100 pour cinq manches parfaites depuis 4, borné entre 0 et 100', () => {
    expect(scoreTotal(4 + 5 + 6 + 7 + 8)).toBe(100);
    expect(scoreTotal(0)).toBe(0);
    expect(scoreTotal(15)).toBe(50);
    expect(scoreTotal(60)).toBe(100);
  });

  it('écrit les nombres avec leur signe', () => {
    expect(formatStep(7)).toBe('+7');
    expect(formatStep(-3)).toBe('−3');
  });
});
