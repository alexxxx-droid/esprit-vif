import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng, deriveSeed } from '../rng';
import { CODE_LEVELS, codeLevel, codeLevelLabel, codePoints, codeRule, generateCodes, hintCounts, pegHints, scoreCode } from './code';
import { GAMES } from './registry';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const tier = (from: number) => LEVELS.slice(from - 1, from + 9);

describe('Code secret', () => {
  it('a 50 niveaux et dure une minute au plus', () => {
    expect(CODE_LEVELS).toHaveLength(MAX_LEVEL);
    expect(GAMES.code.duration).toBe('≈ 1 min');
    expect(codeRule(1)).toContain('minute');
  });

  it('donne des indices justes, couleurs répétées comprises', () => {
    expect(pegHints([0, 1, 2], [0, 2, 3])).toEqual(['good', 'near', 'miss']);
    expect(pegHints([1, 1, 2], [1, 2, 1])).toEqual(['good', 'near', 'near']);
    // Un seul pion rouge dans le code : un seul indice pour deux rouges proposés.
    expect(pegHints([0, 1, 2], [1, 1, 1])).toEqual(['miss', 'good', 'miss']);
    expect(pegHints([3, 0, 0, 1], [0, 3, 3, 0])).toEqual(['near', 'near', 'miss', 'near']);
    expect(hintCounts([0, 1, 2, 3], [0, 2, 1, 4])).toEqual({ good: 1, near: 2 });
    expect(hintCounts([2, 2, 1], [2, 2, 1])).toEqual({ good: 3, near: 0 });
  });

  it('tire des codes à la bonne forme, à chaque niveau', () => {
    for (const level of LEVELS) {
      const c = codeLevel(level);
      for (let s = 0; s < 20; s++) {
        const codes = generateCodes(createRng(deriveSeed(level, s)), level);
        expect(codes).toHaveLength(c.codes);
        for (const code of codes) {
          expect(code).toHaveLength(c.pegs);
          for (const v of code) expect(v >= 0 && v < c.colors).toBe(true);
          if (c.repeats) expect(new Set(code).size).toBeLessThan(c.pegs);
          else expect(new Set(code).size).toBe(c.pegs);
        }
      }
    }
  });

  it('apporte une nouvelle façon de jouer à chaque palier', () => {
    expect(tier(1).every((l) => codeLevel(l).pegs === 3 && !codeLevel(l).repeats && codeLevel(l).hints === 'pegs')).toBe(true);
    expect(tier(11).every((l) => codeLevel(l).pegs === 4)).toBe(true);
    expect(tier(21).every((l) => codeLevel(l).repeats && codeLevel(l).hints === 'pegs')).toBe(true);
    expect(tier(31).every((l) => codeLevel(l).hints === 'counts' && !codeLevel(l).repeats)).toBe(true);
    expect(tier(41).every((l) => codeLevel(l).hints === 'counts' && codeLevel(l).repeats)).toBe(true);
    for (const from of [1, 11, 21, 31, 41]) expect(new Set(tier(from).map(codeLevelLabel)).size).toBeGreaterThanOrEqual(2);
  });

  it('note chaque code selon ses essais, puis la moyenne', () => {
    for (const level of LEVELS) {
      const c = codeLevel(level);
      expect(codePoints(1, level)).toBe(100);
      expect(codePoints(c.par, level)).toBe(100);
      expect(codePoints(c.tries, level)).toBeGreaterThan(0);
      expect(codePoints(null, level)).toBe(0);
      expect(scoreCode(Array.from({ length: c.codes }, () => c.par), level)).toBe(100);
      // Un essai de plus que le bon joueur à chaque code garde l'étoile.
      expect(scoreCode(Array.from({ length: c.codes }, () => c.par + 1), level)).toBeGreaterThanOrEqual(60);
      expect(scoreCode([], level)).toBe(0);
    }
  });
});
