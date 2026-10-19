import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { generateSchulte, scoreSchulte } from './schulte';

describe('générateur de la Table de Schulte', () => {
  it('place chaque nombre de 1 à n² une seule fois', () => {
    for (const level of [1, 2, 3]) {
      for (let seed = 1; seed <= 100; seed++) {
        const board = generateSchulte(createRng(seed), level);
        const count = board.size * board.size;
        expect([...board.numbers].sort((a, b) => a - b)).toEqual(Array.from({ length: count }, (_, i) => i + 1));
        expect(board.tilts).toHaveLength(count);
        expect(board.scales).toHaveLength(count);
      }
    }
  });

  it('utilise une grille 5 × 5 au niveau 1, 6 × 6 ensuite', () => {
    expect(generateSchulte(createRng(1), 1).size).toBe(5);
    expect(generateSchulte(createRng(1), 2).size).toBe(6);
    expect(generateSchulte(createRng(1), 3).size).toBe(6);
  });

  it('ne brouille les nombres qu’au niveau 3', () => {
    expect(generateSchulte(createRng(4), 1).tilts.every((t) => t === 0)).toBe(true);
    expect(generateSchulte(createRng(4), 3).tilts.some((t) => t !== 0)).toBe(true);
  });
});

describe('score de la Table de Schulte', () => {
  it('suit le barème : 100 à 14 s, 0 à 60 s, +1 s par erreur', () => {
    expect(scoreSchulte(14_000, 0, 1)).toBe(100);
    expect(scoreSchulte(60_000, 0, 1)).toBe(0);
    expect(scoreSchulte(35_000, 2, 1)).toBe(50); // 35 + 2 = 37 s
  });

  it('reste entre 0 et 100', () => {
    const rng = createRng(13);
    for (let i = 0; i < 500; i++) {
      const score = scoreSchulte(rng.int(0, 200_000), rng.int(0, 30), rng.int(1, 3));
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});
