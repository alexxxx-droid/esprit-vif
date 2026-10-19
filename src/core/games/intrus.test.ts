import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng } from '../rng';
import { generateIntrus, INTRUS_PAIRS, intrusLevel, intrusSize, scoreIntrus, type IntrusBoard } from './intrus';

describe('générateur de L’intrus', () => {
  it('place un seul symbole différent (autre symbole ou miroir), à tous les niveaux', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const config = intrusLevel(level);
      const rng = createRng(level * 17);
      let previous: IntrusBoard | undefined;
      for (let i = 0; i < 60; i++) {
        const size = rng.int(3, 6);
        const board = generateIntrus(rng, size, level, previous);
        expect(board.odd !== board.base || board.mirrored).toBe(true);
        if (board.mirrored) expect(config.mirror).toBe(true);
        expect(board.oddIndex).toBeGreaterThanOrEqual(0);
        expect(board.oddIndex).toBeLessThan(size * size);
        expect(board.tilts).toHaveLength(size * size);
        if (!config.tilt) expect(board.tilts.every((tilt) => tilt === 0)).toBe(true);
        previous = board;
      }
    }
  });

  it('n’utilise que des paires de symboles différents', () => {
    for (const pair of INTRUS_PAIRS) expect(pair.base).not.toBe(pair.odd);
  });

  it('fait grandir la grille de 3 × 3 à 6 × 6 au niveau 1 (spec)', () => {
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
    for (let found = 0; found < 60; found += 3) {
      for (let level = 1; level <= MAX_LEVEL; level++) {
        const score = scoreIntrus(found, level);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    }
  });
});
