import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng, deriveSeed } from '../rng';
import { generateGrand, GRAND_LEVELS, grandLevel, grandLevelLabel, grandRule, scoreGrand } from './grand';
import { GAMES } from './registry';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const tier = (from: number) => LEVELS.slice(from - 1, from + 9);

describe('Le plus grand ?', () => {
  it('a 50 niveaux et joue 45 s', () => {
    expect(GRAND_LEVELS).toHaveLength(MAX_LEVEL);
    expect(GAMES.grand.duration).toBe('45 s');
    expect(grandRule(1)).toContain('45');
  });

  it('tire des calculs justes, entiers, avec une seule bonne réponse', () => {
    for (const level of LEVELS) {
      const c = grandLevel(level);
      for (let s = 0; s < 30; s++) {
        const q = generateGrand(createRng(deriveSeed(level, s)), level);
        expect(q.calcs).toHaveLength(c.options);
        for (const k of q.calcs) {
          expect(c.signs).toContain(k.sign);
          const v = k.sign === '+' ? k.a + k.b : k.sign === '−' ? k.a - k.b : k.sign === '×' ? k.a * k.b : k.a / k.b;
          expect(k.value).toBe(v);
          expect(Number.isInteger(k.value) && k.value > 0).toBe(true);
        }
        const values = q.calcs.map((k) => k.value);
        if (q.answer === -1) {
          expect(c.equal).toBeGreaterThan(0);
          expect(values[0]).toBe(values[1]);
        } else {
          expect(new Set(values).size).toBe(values.length);
          expect(values[q.answer]).toBe(q.smallest ? Math.min(...values) : Math.max(...values));
        }
        if (!c.smallest) expect(q.smallest).toBe(false);
      }
    }
  });

  it('apporte une nouvelle façon de jouer à chaque palier', () => {
    expect(tier(1).every((l) => grandLevel(l).signs.join() === '+')).toBe(true);
    expect(tier(11).every((l) => grandLevel(l).signs.includes('×') && !grandLevel(l).equal)).toBe(true);
    expect(tier(21).every((l) => grandLevel(l).equal > 0 && grandLevel(l).maxGap > 0)).toBe(true);
    expect(tier(31).every((l) => grandLevel(l).options === 3 && !grandLevel(l).smallest)).toBe(true);
    expect(tier(41).every((l) => grandLevel(l).smallest > 0)).toBe(true);
    for (const from of [1, 11, 21, 31, 41]) expect(new Set(tier(from).map(grandLevelLabel)).size).toBeGreaterThanOrEqual(5);
  });

  it('retire un point par erreur : répondre au hasard ne rapporte rien', () => {
    for (const level of LEVELS) {
      const { target } = grandLevel(level);
      expect(scoreGrand(target, 0, level)).toBe(100);
      expect(scoreGrand(Math.ceil(target * 0.6), 0, level)).toBeGreaterThanOrEqual(60);
      expect(scoreGrand(15, 15, level)).toBe(0);
    }
  });
});
