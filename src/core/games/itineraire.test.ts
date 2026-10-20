import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng } from '../rng';
import { follow, generateIti, heading, ITI_LEVELS, ITI_TRIALS, itiLevel, scoreIti } from './itineraire';

describe('Itinéraire', () => {
  it('a 50 niveaux', () => {
    expect(ITI_LEVELS).toHaveLength(MAX_LEVEL);
  });

  it('trace des trajets qui restent dans la grille et arrivent là où les flèches mènent', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const c = itiLevel(level);
      const rows = c.rows ?? c.size;
      const trials = generateIti(createRng(level * 13), level);
      expect(trials).toHaveLength(ITI_TRIALS);
      for (const t of trials) {
        expect(t.moves).toHaveLength(c.moves);
        let at = t.start;
        let walked = 0;
        for (const [i, move] of t.moves.entries()) {
          expect(move.steps).toBeGreaterThanOrEqual(1);
          expect(move.steps).toBeLessThanOrEqual(c.maxSteps);
          const step = heading(move.dir);
          if (i > 0) expect(step.dc + heading(t.moves[i - 1].dir).dc !== 0 || step.dr + heading(t.moves[i - 1].dir).dr !== 0).toBe(true);
          // Un rocher peut arrêter la course : on s'arrête juste devant (au moins une case parcourue).
          const cells = follow(at, move, t.rocks);
          expect(cells.length).toBeGreaterThanOrEqual(1);
          walked += cells.length;
          at = cells[cells.length - 1];
          expect(at.col).toBeGreaterThanOrEqual(0);
          expect(at.row).toBeGreaterThanOrEqual(0);
          expect(at.col).toBeLessThan(c.size);
          expect(at.row).toBeLessThan(rows);
        }
        expect(t.end).toEqual(at);
        expect(t.end).not.toEqual(t.start);
        expect(t.path).toHaveLength(1 + walked);
        expect(t.path.at(-1)).toEqual(t.end);
        if (!c.rocks) expect(walked).toBe(t.moves.reduce((sum, m) => sum + m.steps, 0));
      }
    }
    expect(generateIti(createRng(4), 12)).toEqual(generateIti(createRng(4), 12));
    expect(generateIti(createRng(4), 45)).toEqual(generateIti(createRng(4), 45));
  });

  it('note la part de trajets retrouvés', () => {
    expect(scoreIti(ITI_TRIALS)).toBe(100);
    expect(scoreIti(6)).toBe(75);
  });
});
