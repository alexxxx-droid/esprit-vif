import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng, deriveSeed } from '../rng';
import { generateMiroir, isAxisCell, isSource, MIROIR_LEVELS, miroirLevel, miroirLevelLabel, miroirRule, reflect, scoreMiroir } from './miroir';
import { GAMES } from './registry';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const tier = (from: number) => LEVELS.slice(from - 1, from + 9);

describe('Miroir', () => {
  it('a 50 niveaux et joue 45 s', () => {
    expect(MIROIR_LEVELS).toHaveLength(MAX_LEVEL);
    expect(GAMES.miroir.duration).toBe('45 s');
    expect(miroirRule(1)).toContain('45');
  });

  it('reflète chaque case de l’autre côté, et deux reflets ramènent au départ', () => {
    for (const axis of ['v', 'h', 'd', 'p'] as const) {
      for (const size of [4, 6]) {
        for (let cell = 0; cell < size * size; cell++) {
          const r = reflect(axis, size, cell);
          expect(reflect(axis, size, r)).toBe(cell);
          if (isAxisCell(axis, size, cell)) expect(r).toBe(cell);
          else expect(isSource(axis, size, r)).toBe(!isSource(axis, size, cell));
        }
      }
    }
    expect(reflect('v', 4, 0)).toBe(3);
    expect(reflect('h', 4, 1)).toBe(13);
    expect(reflect('d', 4, 4)).toBe(1);
    expect(reflect('p', 4, 4)).toBe(11);
  });

  it('tire des figures du bon côté, à chaque niveau', () => {
    for (const level of LEVELS) {
      const c = miroirLevel(level);
      for (let s = 0; s < 30; s++) {
        const p = generateMiroir(createRng(deriveSeed(level, s)), level);
        expect(c.axes).toContain(p.axis);
        expect(p.shape.length).toBeGreaterThanOrEqual(c.minCells);
        expect(p.shape.length).toBeLessThanOrEqual(c.maxCells);
        expect(new Set(p.shape).size).toBe(p.shape.length);
        for (const cell of p.shape) expect(isSource(p.axis, p.size, cell) && !isAxisCell(p.axis, p.size, cell)).toBe(true);
        expect(p.answer).toEqual(p.shape.map((cell) => reflect(p.axis, p.size, cell)).sort((a, b) => a - b));
      }
    }
  });

  it('apporte une nouvelle façon de jouer à chaque palier', () => {
    expect(tier(1).every((l) => miroirLevel(l).size === 4 && miroirLevel(l).axes.join() === 'v')).toBe(true);
    expect(tier(11).every((l) => miroirLevel(l).size === 6)).toBe(true);
    expect(tier(21).every((l) => miroirLevel(l).axes.includes('h'))).toBe(true);
    expect(tier(31).every((l) => miroirLevel(l).axes.includes('d'))).toBe(true);
    expect(tier(41).every((l) => miroirLevel(l).axes.includes('p'))).toBe(true);
    for (const from of [1, 11, 21, 31, 41]) expect(new Set(tier(from).map(miroirLevelLabel)).size).toBeGreaterThanOrEqual(3);
  });

  it('note les figures justes : 100 pts à l’objectif, l’étoile à 60 %', () => {
    for (const level of LEVELS) {
      const { target } = miroirLevel(level);
      expect(scoreMiroir(target, level)).toBe(100);
      expect(scoreMiroir(Math.ceil(target * 0.6), level)).toBeGreaterThanOrEqual(60);
    }
  });
});
