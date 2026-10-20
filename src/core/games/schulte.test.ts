import { describe, expect, it } from 'vitest';
import { MAX_LEVEL, pickLevel } from '../levels';
import { createRng } from '../rng';
import { generateSchulte, SCHULTE_LEVELS, schulteCells, schulteSequence, scoreSchulte } from './schulte';

describe('générateur de la Table de Schulte', () => {
  it('place chaque symbole de la suite une seule fois, à tous les niveaux', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const config = pickLevel(SCHULTE_LEVELS, level);
      for (let seed = 1; seed <= 30; seed++) {
        const board = generateSchulte(createRng(seed), level);
        const count = config.size * config.size;
        expect(board.size).toBe(config.size);
        expect(board.cells).toHaveLength(count);
        // Avec des leurres, la suite ne couvre que les bleus ; sinon, toute la grille.
        expect(board.sequence).toHaveLength(config.decoys ? Math.ceil(count / 2) : count);
        expect([...board.cells].sort()).toEqual([...schulteCells(config.size, config.order, config.decoys)].sort());
        for (const id of board.sequence) expect(board.cells).toContain(id);
        expect(new Set(board.cells).size).toBe(count);
        expect(board.tilts.some((tilt) => tilt !== 0)).toBe(config.tilt);
      }
    }
  });

  it('respecte la spec au niveau 1 : grille 5 × 5, nombres de 1 à 25', () => {
    const board = generateSchulte(createRng(1), 1);
    expect(board.size).toBe(5);
    expect(board.sequence).toEqual(Array.from({ length: 25 }, (_, i) => String(i + 1)));
  });

  it('construit les suites à rebours, alphabétique et alternée', () => {
    expect(schulteSequence(5, 'desc').slice(0, 3)).toEqual(['25', '24', '23']);
    expect(schulteSequence(5, 'alpha').slice(-2)).toEqual(['X', 'Y']);
    expect(schulteSequence(5, 'alt').slice(0, 6)).toEqual(['1', 'A', '2', 'B', '3', 'C']);
    expect(schulteSequence(6, 'alt')).toHaveLength(36);
    expect(schulteSequence(6, 'alt').at(-1)).toBe('R');
  });
});

describe('score de la Table de Schulte', () => {
  it('suit le barème : 100 à 14 s, 0 à 60 s, +1 s par erreur', () => {
    expect(scoreSchulte(14_000, 0, 1)).toBe(100);
    expect(scoreSchulte(60_000, 0, 1)).toBe(0);
    expect(scoreSchulte(35_000, 2, 1)).toBe(50);
  });

  it('reste entre 0 et 100', () => {
    const rng = createRng(13);
    for (let i = 0; i < 500; i++) {
      const score = scoreSchulte(rng.int(0, 300_000), rng.int(0, 30), rng.int(1, MAX_LEVEL));
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});
