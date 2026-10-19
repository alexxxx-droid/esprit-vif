import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { generateIntrus, INTRUS_PAIRS, intrusSize, scoreIntrus } from './intrus';

describe('générateur de L’intrus', () => {
  it('place un seul symbole différent, dans la grille', () => {
    const rng = createRng(17);
    let previous;
    for (let i = 0; i < 500; i++) {
      const size = rng.int(3, 6);
      const board = generateIntrus(rng, size, rng.int(1, 3), previous);
      expect(board.odd).not.toBe(board.base);
      expect(board.oddIndex).toBeGreaterThanOrEqual(0);
      expect(board.oddIndex).toBeLessThan(size * size);
      if (previous) expect([board.base, board.odd].sort()).not.toEqual([previous.base, previous.odd].sort());
      previous = board;
    }
  });

  it('n’utilise que des paires de symboles différents', () => {
    for (const pair of INTRUS_PAIRS) expect(pair.base).not.toBe(pair.odd);
  });

  it('fait grandir la grille de 3 × 3 à 6 × 6 au niveau 1', () => {
    expect(intrusSize(0, 1)).toBe(3);
    expect(intrusSize(5, 1)).toBe(4);
    expect(intrusSize(10, 1)).toBe(5);
    expect(intrusSize(15, 1)).toBe(6);
    expect(intrusSize(40, 1)).toBe(6);
  });
});

describe('score de L’intrus', () => {
  it('donne 100 pour 20 trouvés au niveau 1, borné entre 0 et 100', () => {
    expect(scoreIntrus(20, 1)).toBe(100);
    expect(scoreIntrus(10, 1)).toBe(50);
    expect(scoreIntrus(0, 1)).toBe(0);
    for (let found = 0; found < 60; found++) {
      for (const level of [1, 2, 3]) {
        const score = scoreIntrus(found, level);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    }
  });
});
