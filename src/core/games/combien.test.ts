import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng, deriveSeed } from '../rng';
import { COMBIEN_LEVELS, combienLevel, combienLevelLabel, combienRule, generateCombien, pileHidden, pileReadable, pileTotal, scoreCombien } from './combien';
import { GAMES } from './registry';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const tier = (from: number) => LEVELS.slice(from - 1, from + 9);

describe('Combien de cubes ?', () => {
  it('a 50 niveaux et joue 45 s', () => {
    expect(COMBIEN_LEVELS).toHaveLength(MAX_LEVEL);
    expect(GAMES.combien.duration).toBe('45 s');
    expect(combienRule(1)).toContain('45');
  });

  it('compte les cubes cachés derrière une pile', () => {
    // Sol de 2 × 2 : la case du fond (0, 0) est cachée par les trois autres, hautes de 2.
    const pile = { cols: 2, rows: 2, heights: [[1, 2], [2, 2]] };
    expect(pileTotal(pile)).toBe(7);
    expect(pileHidden(pile)).toBeGreaterThanOrEqual(1);
    expect(pileReadable({ cols: 1, rows: 2, heights: [[1], [3]] })).toBe(true);
  });

  it('tire des tas lisibles et des réponses justes, à chaque niveau', () => {
    for (const level of LEVELS) {
      const c = combienLevel(level);
      for (let s = 0; s < 15; s++) {
        const q = generateCombien(createRng(deriveSeed(level, s)), level);
        expect(c.asks).toContain(q.ask);
        for (const p of q.piles) {
          expect(p.cols).toBe(c.cols);
          expect(p.rows).toBe(c.rows);
          expect(Math.max(...p.heights.flat())).toBe(c.maxHeight);
          expect(pileReadable(p)).toBe(true);
        }
        expect(q.answer).toBeGreaterThan(0);
        const [a, b] = q.piles;
        if (q.ask === 'total') expect(q.answer).toBe(pileTotal(a));
        if (q.ask === 'missing') expect(q.answer).toBe(c.cols * c.rows * c.maxHeight - pileTotal(a));
        if (q.ask === 'hidden') expect(q.answer).toBe(pileHidden(a));
        if (q.ask === 'diff') expect(q.answer).toBe(pileTotal(a) - pileTotal(b));
        expect(q.piles).toHaveLength(q.ask === 'diff' ? 2 : 1);
        expect(q.answer).toBeLessThan(100);
      }
    }
  });

  it('apporte une nouvelle façon de jouer à chaque palier', () => {
    expect(tier(1).every((l) => combienLevel(l).asks.join() === 'total' && combienLevel(l).rows === 2)).toBe(true);
    expect(tier(11).every((l) => combienLevel(l).cols === 3 && combienLevel(l).rows === 3)).toBe(true);
    expect(tier(21).every((l) => combienLevel(l).asks.includes('missing'))).toBe(true);
    expect(tier(31).every((l) => combienLevel(l).asks.includes('diff'))).toBe(true);
    expect(tier(41).every((l) => combienLevel(l).asks.includes('hidden'))).toBe(true);
    for (const from of [1, 11, 21, 31, 41]) expect(new Set(tier(from).map(combienLevelLabel)).size).toBeGreaterThanOrEqual(1);
  });

  it('note les bonnes réponses : 100 pts à l’objectif, l’étoile à 60 %', () => {
    for (const level of LEVELS) {
      const { target } = combienLevel(level);
      expect(scoreCombien(target, level)).toBe(100);
      expect(scoreCombien(Math.ceil(target * 0.6), level)).toBeGreaterThanOrEqual(60);
    }
  });
});
