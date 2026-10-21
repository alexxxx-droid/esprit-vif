import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng, deriveSeed } from '../rng';
import { exits, generateMaze, LABY_LEVELS, labyLevel, labyLevelLabel, labyRule, scoreLaby, shortest } from './labyrinthe';
import { GAMES } from './registry';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const tier = (from: number) => LEVELS.slice(from - 1, from + 9);

describe('Labyrinthe éclair', () => {
  it('a 50 niveaux et dure une minute', () => {
    expect(LABY_LEVELS).toHaveLength(MAX_LEVEL);
    expect(GAMES.labyrinthe.duration).toBe('≈ 1 min');
    expect(labyRule(1)).toContain('minute');
  });

  it('creuse des labyrinthes parfaits : toutes les cases reliées, un seul chemin', () => {
    for (const level of LEVELS) {
      const c = labyLevel(level);
      for (let s = 0; s < 5; s++) {
        const m = generateMaze(createRng(deriveSeed(level, s)), level);
        const cells = c.size * c.size;
        // Un arbre : autant de passages que de cases moins une, et tout est relié depuis l'entrée.
        expect(m.right.filter(Boolean).length + m.down.filter(Boolean).length).toBe(cells - 1);
        const seen = new Set([m.start]);
        const queue = [m.start];
        while (queue.length) {
          for (const n of exits(m, queue.shift()!)) {
            if (seen.has(n)) continue;
            seen.add(n);
            queue.push(n);
          }
        }
        expect(seen.size).toBe(cells);
        const path = shortest(m, m.start, m.exit);
        expect(path[0]).toBe(m.start);
        expect(path[path.length - 1]).toBe(m.exit);
        if (c.key) {
          expect(m.key).not.toBeNull();
          expect(path).not.toContain(m.key);
        } else expect(m.key).toBeNull();
      }
    }
  });

  it('apporte une nouvelle façon de jouer à chaque palier', () => {
    expect(tier(1).every((l) => !labyLevel(l).fog && !labyLevel(l).key && !labyLevel(l).wallsMs && labyLevel(l).size <= 6)).toBe(true);
    expect(tier(11).every((l) => labyLevel(l).size === 7)).toBe(true);
    expect(tier(21).every((l) => labyLevel(l).fog)).toBe(true);
    expect(tier(31).every((l) => labyLevel(l).key && !labyLevel(l).fog)).toBe(true);
    expect(tier(41).every((l) => labyLevel(l).wallsMs > 0)).toBe(true);
    for (const from of [1, 11, 21, 31, 41]) expect(new Set(tier(from).map(labyLevelLabel)).size).toBeGreaterThanOrEqual(2);
  });

  it('note les labyrinthes finis', () => {
    for (const level of LEVELS) {
      const { target } = labyLevel(level);
      expect(scoreLaby(target, level)).toBe(100);
      expect(scoreLaby(Math.ceil(target * 0.6), level)).toBeGreaterThanOrEqual(60);
    }
  });
});
