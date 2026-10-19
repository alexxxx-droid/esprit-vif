import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng } from '../rng';
import { generateSequence, initialMatrice, matriceLevel, nextMatrice, scoreMatrice } from './matrice';

describe('générateur de la Matrice', () => {
  it('donne des cases distinctes, toutes dans la grille du niveau', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const cells = matriceLevel(level).size ** 2;
      for (let seed = 1; seed <= 40; seed++) {
        for (const length of [3, 6, 9, 12]) {
          const sequence = generateSequence(createRng(seed), length, cells);
          expect(sequence).toHaveLength(length);
          expect(new Set(sequence).size).toBe(length);
          for (const cell of sequence) {
            expect(cell).toBeGreaterThanOrEqual(0);
            expect(cell).toBeLessThan(cells);
          }
        }
      }
    }
  });

  it('respecte la spec au niveau 1 : grille 4 × 4', () => {
    expect(matriceLevel(1).size).toBe(4);
    expect(matriceLevel(1).reverse).toBe(false);
  });
});

describe('déroulé de la Matrice', () => {
  it('commence à 3 cases et en ajoute une à chaque réussite', () => {
    let state = initialMatrice();
    expect(state.span).toBe(3);
    state = nextMatrice(state, true);
    state = nextMatrice(state, true);
    expect(state.span).toBe(5);
    expect(state.best).toBe(4);
  });

  it('s’arrête après deux échecs, même non consécutifs', () => {
    let state = initialMatrice();
    state = nextMatrice(state, false);
    expect(state.done).toBe(false);
    state = nextMatrice(state, true);
    state = nextMatrice(state, false);
    expect(state.done).toBe(true);
    expect(state.best).toBe(3);
  });
});

describe('score de la Matrice', () => {
  it('vaut 0 pour 3 cases et 100 pour 9 cases, borné entre les deux', () => {
    expect(scoreMatrice(0)).toBe(0);
    expect(scoreMatrice(3)).toBe(0);
    expect(scoreMatrice(6)).toBe(50);
    expect(scoreMatrice(9)).toBe(100);
    expect(scoreMatrice(12)).toBe(100);
  });
});
