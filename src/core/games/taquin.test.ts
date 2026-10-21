import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng, deriveSeed } from '../rng';
import { GAMES } from './registry';
import { allowedMoves, generateTaquin, isSolved, slide, solvedBoard, TAQUIN_LEVELS, taquinLevel, taquinLevelLabel, taquinRule, scoreTaquin } from './taquin';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const tier = (from: number) => LEVELS.slice(from - 1, from + 9);

/** Plus court chemin vers la grille rangée (parcours en largeur, borné). */
function distance(board: number[], size: number, limit: number): number {
  const goal = solvedBoard(size).join();
  let frontier = [board];
  const seen = new Set([board.join()]);
  for (let d = 0; d <= limit; d++) {
    if (frontier.some((b) => b.join() === goal)) return d;
    const next: number[][] = [];
    for (const b of frontier) {
      for (let cell = 0; cell < size * size; cell++) {
        const n = slide(b, size, cell);
        if (n && !seen.has(n.join())) {
          seen.add(n.join());
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  return Infinity;
}

describe('Taquin express', () => {
  it('a 50 niveaux et dure une minute', () => {
    expect(TAQUIN_LEVELS).toHaveLength(MAX_LEVEL);
    expect(GAMES.taquin.duration).toBe('≈ 1 min');
    expect(taquinRule(1)).toContain('minute');
  });

  it('fait glisser seulement une tuile voisine de la case vide', () => {
    const b = solvedBoard(3);
    expect(slide(b, 3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7, 0, 8]);
    expect(slide(b, 3, 0)).toBeNull();
    expect(isSolved(b)).toBe(true);
  });

  it('mélange des grilles faisables dans les coups permis', () => {
    for (const level of LEVELS) {
      const c = taquinLevel(level);
      for (let s = 0; s < 6; s++) {
        const board = generateTaquin(createRng(deriveSeed(level, s)), level);
        expect([...board].sort((a, b) => a - b)).toEqual(Array.from({ length: c.size * c.size }, (_, i) => i));
        expect(isSolved(board)).toBe(false);
        // Mélangée de `scramble` coups : on la range en autant de coups au plus (et en 2 au moins).
        if (c.size === 3) {
          const d = distance(board, 3, c.scramble);
          expect(d).toBeLessThanOrEqual(c.scramble);
          expect(d).toBeGreaterThanOrEqual(Math.min(2, c.scramble));
        }
        const allowed = allowedMoves(c);
        if (allowed) expect(allowed).toBeGreaterThan(c.scramble);
      }
    }
  });

  it('apporte une nouvelle façon de jouer à chaque palier', () => {
    expect(tier(1).every((l) => taquinLevel(l).size === 3 && !taquinLevel(l).margin)).toBe(true);
    expect(tier(11).every((l) => taquinLevel(l).scramble > taquinLevel(10).scramble)).toBe(true);
    expect(tier(21).every((l) => taquinLevel(l).size === 4 && !taquinLevel(l).margin)).toBe(true);
    expect(tier(31).every((l) => taquinLevel(l).size === 3 && taquinLevel(l).margin > 0)).toBe(true);
    expect(tier(41).every((l) => taquinLevel(l).size === 4 && taquinLevel(l).margin > 0)).toBe(true);
    for (const from of [1, 11, 21, 31, 41]) expect(new Set(tier(from).map(taquinLevelLabel)).size).toBeGreaterThanOrEqual(4);
  });

  it('note les grilles finies', () => {
    for (const level of LEVELS) {
      const { target } = taquinLevel(level);
      expect(scoreTaquin(target, level)).toBe(100);
      expect(scoreTaquin(Math.ceil(target * 0.6), level)).toBeGreaterThanOrEqual(60);
    }
  });
});
