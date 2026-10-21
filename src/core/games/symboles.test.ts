import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng, deriveSeed } from '../rng';
import { GAMES } from './registry';
import { generateSymboles, scoreSymboles, SYMBOLES_LEVELS, symbolesLevel, symbolesLevelLabel, symbolesRule, tableAt } from './symboles';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const tier = (from: number) => LEVELS.slice(from - 1, from + 9);

describe('Symboles', () => {
  it('a 50 niveaux et joue 45 s', () => {
    expect(SYMBOLES_LEVELS).toHaveLength(MAX_LEVEL);
    expect(GAMES.symboles.duration).toBe('45 s');
    expect(symbolesRule(1)).toContain('45');
  });

  it('tire des tables justes et une suite sans répétition immédiate', () => {
    for (const level of LEVELS) {
      const c = symbolesLevel(level);
      for (let s = 0; s < 8; s++) {
        const g = generateSymboles(createRng(deriveSeed(level, s)), level);
        const shapes = [...new Set(g.sequence)];
        expect(shapes).toHaveLength(c.symbols);
        g.sequence.forEach((shape, i) => i > 0 && expect(shape).not.toBe(g.sequence[i - 1]));
        for (const table of g.tables) expect(shapes.map((sh) => table[sh]).sort((a, b) => a - b)).toEqual(Array.from({ length: c.symbols }, (_, i) => i + 1));
        g.tables.slice(1).forEach((table, t) => expect(shapes.filter((sh) => table[sh] !== g.tables[t][sh]).length).toBeGreaterThanOrEqual(c.symbols / 2));
        expect([...g.pad].sort((a, b) => a - b)).toEqual(Array.from({ length: c.symbols }, (_, i) => i + 1));
        if (c.shuffleEvery) expect(tableAt(c, g, c.shuffleEvery)).toBe(g.tables[1]);
        else expect(g.tables).toHaveLength(1);
      }
    }
  });

  it('apporte une nouvelle façon de jouer à chaque palier', () => {
    expect(tier(1).every((l) => symbolesLevel(l).symbols === 4 && !symbolesLevel(l).shuffleEvery && !symbolesLevel(l).hideMs)).toBe(true);
    expect(tier(11).every((l) => symbolesLevel(l).symbols === 6)).toBe(true);
    expect(tier(21).every((l) => symbolesLevel(l).shuffleEvery > 0)).toBe(true);
    expect(tier(31).every((l) => symbolesLevel(l).hideMs > 0)).toBe(true);
    expect(tier(41).every((l) => symbolesLevel(l).symbols === 8 && symbolesLevel(l).mixedPad)).toBe(true);
    for (const from of [1, 11, 21, 31, 41]) expect(new Set(tier(from).map(symbolesLevelLabel)).size).toBeGreaterThanOrEqual(5);
  });

  it('retire un point par erreur : toucher au hasard ne rapporte rien', () => {
    for (const level of LEVELS) {
      const { target, symbols } = symbolesLevel(level);
      expect(scoreSymboles(target, 0, level)).toBe(100);
      expect(scoreSymboles(Math.ceil(target * 0.6), 0, level)).toBeGreaterThanOrEqual(60);
      // Au hasard : une bonne réponse sur `symbols`, le reste en erreurs.
      expect(scoreSymboles(40 / symbols, 40 - 40 / symbols, level)).toBe(0);
    }
  });
});
