import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng } from '../rng';
import { DIRS, generateIti, ITI_LEVELS, ITI_TRIALS, itiLevel, scoreIti } from './itineraire';

describe('Itinéraire', () => {
  it('a 20 niveaux', () => {
    expect(ITI_LEVELS).toHaveLength(MAX_LEVEL);
  });

  it('trace des trajets qui restent dans la grille et arrivent là où les flèches mènent', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const c = itiLevel(level);
      const trials = generateIti(createRng(level * 13), level);
      expect(trials).toHaveLength(ITI_TRIALS);
      for (const t of trials) {
        expect(t.moves).toHaveLength(c.moves);
        let at = t.start;
        for (const [i, move] of t.moves.entries()) {
          expect(move.steps).toBeGreaterThanOrEqual(1);
          expect(move.steps).toBeLessThanOrEqual(c.maxSteps);
          if (i > 0) expect(DIRS[move.dir].dc + DIRS[t.moves[i - 1].dir].dc !== 0 || DIRS[move.dir].dr + DIRS[t.moves[i - 1].dir].dr !== 0).toBe(true);
          at = { col: at.col + DIRS[move.dir].dc * move.steps, row: at.row + DIRS[move.dir].dr * move.steps };
          expect(at.col).toBeGreaterThanOrEqual(0);
          expect(at.row).toBeGreaterThanOrEqual(0);
          expect(at.col).toBeLessThan(c.size);
          expect(at.row).toBeLessThan(c.size);
        }
        expect(t.end).toEqual(at);
        expect(t.end).not.toEqual(t.start);
        expect(t.path).toHaveLength(1 + t.moves.reduce((sum, m) => sum + m.steps, 0));
        expect(t.path.at(-1)).toEqual(t.end);
      }
    }
    expect(generateIti(createRng(4), 12)).toEqual(generateIti(createRng(4), 12));
  });

  it('note la part de trajets retrouvés', () => {
    expect(scoreIti(ITI_TRIALS)).toBe(100);
    expect(scoreIti(6)).toBe(75);
  });
});
