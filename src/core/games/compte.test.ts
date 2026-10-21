import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng, deriveSeed } from '../rng';
import { apply, canReach, COMPTE_LEVELS, compteLevel, compteLevelLabel, compteRule, generateCompte, scoreCompte } from './compte';
import { GAMES } from './registry';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const SEEDS = Array.from({ length: 20 }, (_, i) => deriveSeed(23, i));
const tier = (from: number) => LEVELS.slice(from - 1, from + 9);

describe('Le compte est bon', () => {
  it('a 50 niveaux et joue 45 s', () => {
    expect(COMPTE_LEVELS).toHaveLength(MAX_LEVEL);
    expect(GAMES.compte.duration).toBe('45 s');
    expect(compteRule(1)).toContain('45');
  });

  it('ne calcule qu’avec des entiers positifs', () => {
    expect(apply(7, '−', 7)).toBeNull();
    expect(apply(3, '−', 8)).toBeNull();
    expect(apply(9, '÷', 2)).toBeNull();
    expect(apply(12, '÷', 4)).toBe(3);
    expect(apply(6, '×', 7)).toBe(42);
    expect(canReach([3, 5], 15, 1)).toBe(true);
    expect(canReach([3, 5], 16, 1)).toBe(false);
  });

  it('tire des comptes faisables, sans raccourci, à chaque niveau', () => {
    for (const level of LEVELS) {
      const c = compteLevel(level);
      for (const seed of SEEDS) {
        const p = generateCompte(createRng(seed + level), level);
        expect(p.plates).toHaveLength(c.plates);
        expect(p.target).toBeGreaterThanOrEqual(c.minTarget);
        expect(p.target).toBeLessThanOrEqual(c.maxTarget);
        expect(p.plates).not.toContain(p.target);
        if (c.big) expect(p.plates.filter((v) => v >= 25)).toHaveLength(1);
        else for (const v of p.plates) expect(v).toBeLessThanOrEqual(c.maxSmall);
        // La solution rejoue juste, avec les plaques du tirage, chacune une fois.
        const pool = [...p.plates];
        for (const s of p.solution) {
          expect(c.signs).toContain(s.sign);
          expect(apply(s.a, s.sign, s.b)).toBe(s.result);
          for (const v of [s.a, s.b]) {
            const k = pool.indexOf(v);
            expect(k, `${level} ${p.plates} → ${p.target}`).toBeGreaterThanOrEqual(0);
            pool.splice(k, 1);
          }
          pool.push(s.result);
        }
        expect(p.solution).toHaveLength(c.ops);
        expect(p.solution[p.solution.length - 1].result).toBe(p.target);
        if (c.once) expect(new Set(p.solution.map((s) => s.sign)).size).toBe(c.ops);
        expect(canReach(p.plates, p.target, c.ops - 1)).toBe(false);
      }
    }
  });

  it('apporte une nouvelle façon de jouer à chaque palier', () => {
    expect(tier(1).every((l) => compteLevel(l).ops === 1 && !compteLevel(l).signs.includes('×'))).toBe(true);
    expect(tier(11).every((l) => compteLevel(l).ops === 2 && compteLevel(l).signs.includes('×'))).toBe(true);
    expect(tier(21).every((l) => compteLevel(l).ops === 3 && compteLevel(l).signs.includes('÷'))).toBe(true);
    expect(tier(31).every((l) => compteLevel(l).big && !compteLevel(l).once)).toBe(true);
    expect(tier(41).every((l) => compteLevel(l).once)).toBe(true);
    for (const from of [1, 11, 21, 31, 41]) expect(new Set(tier(from).map(compteLevelLabel)).size).toBeGreaterThanOrEqual(5);
  });

  it('note les comptes trouvés : 100 pts à l’objectif, l’étoile à 60 %', () => {
    for (const level of LEVELS) {
      const { target } = compteLevel(level);
      expect(target).toBeGreaterThanOrEqual(3);
      expect(scoreCompte(target, level)).toBe(100);
      expect(scoreCompte(Math.ceil(target * 0.6), level)).toBeGreaterThanOrEqual(60);
    }
  });
});
