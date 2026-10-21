import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng, deriveSeed } from '../rng';
import { GAMES } from './registry';
import { generateSuite, scoreSuites, SUITES_LEVELS, SUITES_MAX, suitesLevel, suitesLevelLabel, suitesRule, type Suite } from './suites';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const SEEDS = Array.from({ length: 40 }, (_, i) => deriveSeed(17, i));
const tier = (from: number) => LEVELS.slice(from - 1, from + 9);

/** La suite suit-elle bien sa règle ? */
function follows({ rule, terms }: Suite): boolean {
  const diffs = terms.slice(1).map((t, i) => t - terms[i]);
  const constant = (xs: number[]) => xs.every((x) => x === xs[0]);
  switch (rule) {
    case 'add':
      return diffs[0] > 0 && constant(diffs);
    case 'sub':
      return diffs[0] < 0 && constant(diffs);
    case 'mul':
      return [2, 3].some((f) => terms.slice(1).every((t, i) => t === terms[i] * f));
    case 'alt': {
      const gaps = (xs: number[]) => xs.slice(1).map((x, i) => x - xs[i]);
      return constant(gaps(terms.filter((_, i) => i % 2 === 0))) && constant(gaps(terms.filter((_, i) => i % 2 === 1)));
    }
    case 'grow':
      return constant(diffs.slice(1).map((x, i) => x - diffs[i])) && diffs[1] > diffs[0];
    case 'zigzag':
      return diffs.every((x, i) => (i % 2 === 0 ? x > 0 : x < 0)) && constant(diffs.filter((_, i) => i % 2 === 0)) && constant(diffs.filter((_, i) => i % 2 === 1));
    case 'square':
      return constant(diffs.slice(1).map((x, i) => x - diffs[i])) && diffs[1] - diffs[0] === 2;
    case 'fibo':
      return terms.slice(2).every((t, i) => t === terms[i] + terms[i + 1]);
  }
}

describe('Suites logiques', () => {
  it('a 50 niveaux, joue 45 s et se termine en maîtrise', () => {
    expect(SUITES_LEVELS).toHaveLength(MAX_LEVEL);
    expect(GAMES.suites.duration).toBe('45 s');
    expect(GAMES.suites.maxLevel).toBe(60);
    expect(suitesRule(1)).toContain('45');
  });

  it('tire des suites justes, d’entiers de 1 à 999, à chaque niveau', () => {
    for (const level of LEVELS) {
      const c = suitesLevel(level);
      for (const seed of SEEDS) {
        const suite = generateSuite(createRng(seed + level), level);
        expect(c.rules).toContain(suite.rule);
        expect(follows(suite), `${level} ${suite.rule} ${suite.terms.join(' ')}`).toBe(true);
        for (const t of suite.terms) {
          expect(Number.isInteger(t)).toBe(true);
          expect(t).toBeGreaterThanOrEqual(1);
          expect(t).toBeLessThanOrEqual(SUITES_MAX);
        }
        if (c.missing === 'last') expect(suite.missing).toBe(suite.terms.length - 1);
        else expect(suite.missing).toBeGreaterThanOrEqual(1);
        expect(suite.missing).toBeLessThan(suite.terms.length);
        // Assez de nombres visibles pour retrouver la règle.
        expect(suite.terms.length - 1).toBeGreaterThanOrEqual(suite.rule === 'alt' ? 6 : suite.rule === 'grow' || suite.rule === 'zigzag' || suite.rule === 'fibo' ? 5 : 4);
      }
    }
  });

  it('donne la même suite pour la même graine', () => {
    expect(generateSuite(createRng(5), 33)).toEqual(generateSuite(createRng(5), 33));
  });

  it('apporte une nouvelle façon de jouer à chaque palier', () => {
    expect(tier(1).every((l) => suitesLevel(l).missing === 'last')).toBe(true);
    expect(tier(11).every((l) => suitesLevel(l).missing === 'any' && suitesLevel(l).rules.includes('mul'))).toBe(true);
    expect(tier(21).every((l) => suitesLevel(l).rules.filter((r) => r === 'alt').length >= 2)).toBe(true);
    expect(tier(31).every((l) => suitesLevel(l).rules.includes('grow') && suitesLevel(l).rules.includes('zigzag'))).toBe(true);
    expect(tier(41).every((l) => suitesLevel(l).rules.includes('square') && suitesLevel(l).rules.includes('fibo'))).toBe(true);
    // Les objectifs ne montent jamais quand la suite se corse.
    LEVELS.slice(1).forEach((l) => expect(suitesLevel(l).target).toBeLessThanOrEqual(suitesLevel(l - 1).target));
  });

  it('a des libellés distincts d’un niveau à l’autre dans un palier', () => {
    for (const from of [1, 11, 21, 31, 41]) expect(new Set(tier(from).map(suitesLevelLabel)).size).toBeGreaterThanOrEqual(5);
  });

  it('note les bonnes réponses : 100 pts à l’objectif, l’étoile à 60 %', () => {
    for (const level of LEVELS) {
      const { target } = suitesLevel(level);
      expect(target).toBeGreaterThanOrEqual(5);
      expect(scoreSuites(target, level)).toBe(100);
      expect(scoreSuites(0, level)).toBe(0);
      expect(scoreSuites(Math.ceil(target * 0.6), level)).toBeGreaterThanOrEqual(60);
    }
  });
});
