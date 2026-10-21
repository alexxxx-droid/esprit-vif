import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng, deriveSeed } from '../rng';
import { generateRegle, regleAnswer, REGLE_LEVELS, regleLevel, regleLevelLabel, regleRule, scoreRegle } from './regle';
import { GAMES } from './registry';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const tier = (from: number) => LEVELS.slice(from - 1, from + 9);

describe('Changement de règle', () => {
  it('a 50 niveaux et joue 45 s', () => {
    expect(REGLE_LEVELS).toHaveLength(MAX_LEVEL);
    expect(GAMES.regle.duration).toBe('45 s');
    expect(regleRule(1)).toContain('45');
  });

  it('donne le bon côté pour chaque règle, et l’inverse en contre-ordre', () => {
    expect(regleAnswer({ rule: 'parite', number: 3, top: true, inverse: false })).toBe(0);
    expect(regleAnswer({ rule: 'parite', number: 8, top: true, inverse: false })).toBe(1);
    expect(regleAnswer({ rule: 'taille', number: 4, top: false, inverse: false })).toBe(0);
    expect(regleAnswer({ rule: 'taille', number: 7, top: false, inverse: false })).toBe(1);
    expect(regleAnswer({ rule: 'place', number: 7, top: true, inverse: false })).toBe(0);
    expect(regleAnswer({ rule: 'place', number: 7, top: false, inverse: true })).toBe(0);
  });

  it('change de règle comme le niveau le dit, sans 5 ni deux nombres pareils de suite', () => {
    for (const level of LEVELS) {
      const c = regleLevel(level);
      const cards = generateRegle(createRng(deriveSeed(level, 3)), level);
      const switches = cards.slice(1).filter((card, k) => card.rule !== cards[k].rule).length;
      cards.forEach((card, k) => {
        expect(c.rules).toContain(card.rule);
        expect(card.number).not.toBe(5);
        expect(card.number >= 1 && card.number <= 9).toBe(true);
        if (k > 0) expect(card.number).not.toBe(cards[k - 1].number);
        if (c.block && k > 0 && k % c.block !== 0) expect(card.rule).toBe(cards[k - 1].rule);
        if (!c.inverse) expect(card.inverse).toBe(false);
      });
      if (c.block) expect(switches).toBe(Math.ceil(cards.length / c.block) - 1);
      else expect(switches / cards.length).toBeGreaterThan(c.switchChance * 0.6);
    }
  });

  it('apporte une nouvelle façon de jouer à chaque palier', () => {
    expect(tier(1).every((l) => regleLevel(l).block > 0 && regleLevel(l).rules.length === 2)).toBe(true);
    expect(tier(11).every((l) => !regleLevel(l).block && regleLevel(l).rules.length === 2)).toBe(true);
    expect(tier(21).every((l) => regleLevel(l).rules.includes('place') && regleLevel(l).labels)).toBe(true);
    expect(tier(31).every((l) => !regleLevel(l).labels && !regleLevel(l).inverse)).toBe(true);
    expect(tier(41).every((l) => regleLevel(l).inverse > 0)).toBe(true);
    for (const from of [1, 11, 21, 31, 41]) expect(new Set(tier(from).map(regleLevelLabel)).size).toBeGreaterThanOrEqual(3);
  });

  it('retire un point par erreur : répondre au hasard ne rapporte rien', () => {
    for (const level of LEVELS) {
      const { target } = regleLevel(level);
      expect(scoreRegle(target, 0, level)).toBe(100);
      expect(scoreRegle(Math.ceil(target * 0.6), 0, level)).toBeGreaterThanOrEqual(60);
      expect(scoreRegle(20, 20, level)).toBe(0);
    }
  });
});
