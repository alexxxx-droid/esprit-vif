import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng, deriveSeed } from '../rng';
import { generateManque, MANQUE_LEVELS, MANQUE_ROUNDS, manqueLevel, manqueLevelLabel, manqueRule, scoreManque } from './manque';
import { GAMES } from './registry';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const tier = (from: number) => LEVELS.slice(from - 1, from + 9);
const key = (i: { shape: number; color: number }) => `${i.shape}-${i.color}`;

describe('Qui manque ?', () => {
  it('a 50 niveaux et tient en moins d’une minute', () => {
    expect(MANQUE_LEVELS).toHaveLength(MAX_LEVEL);
    expect(GAMES.manque.duration).toBe('≈ 50 s');
    expect(manqueRule(1)).toContain(String(MANQUE_ROUNDS));
    // Étude, puis 2 s pour répondre et 0,6 s de pause, à chaque manche.
    for (const level of LEVELS) {
      const c = manqueLevel(level);
      const study = c.sequential ? c.items * c.studyMs : c.studyMs;
      expect(MANQUE_ROUNDS * (study + 2600), `niveau ${level}`).toBeLessThanOrEqual(60_000);
    }
  });

  it('fait disparaître les bonnes formes et ne propose que des formes jamais montrées en plus', () => {
    for (const level of LEVELS) {
      const c = manqueLevel(level);
      for (const round of generateManque(createRng(deriveSeed(level, 1)), level)) {
        expect(round.shown).toHaveLength(c.items);
        expect(new Set(round.shown.map(key)).size).toBe(c.items);
        if (!c.lookalike) {
          expect(new Set(round.shown.map((i) => i.shape)).size).toBe(c.items);
          expect(new Set(round.shown.map((i) => i.color)).size).toBe(c.items);
        }
        expect(round.gone).toHaveLength(c.missing);
        const missing = round.gone.map((k) => key(round.shown[k]));
        const rest = round.rest.filter((i) => i !== null).map((i) => key(i!));
        expect(rest).toHaveLength(c.items - c.missing);
        for (const m of missing) expect(rest).not.toContain(m);
        if (c.samePlace) round.rest.forEach((item, k) => expect(item === null ? round.gone.includes(k) : key(item) === key(round.shown[k])).toBe(true));
        expect(round.options).toHaveLength(c.missing === 2 ? 6 : 4);
        expect(new Set(round.options.map(key)).size).toBe(round.options.length);
        const shownKeys = round.shown.map(key);
        for (const o of round.options) if (!missing.includes(key(o))) expect(shownKeys).not.toContain(key(o));
        for (const m of missing) expect(round.options.map(key)).toContain(m);
      }
    }
  });

  it('apporte une nouvelle façon de jouer à chaque palier', () => {
    expect(tier(1).every((l) => manqueLevel(l).samePlace && !manqueLevel(l).lookalike)).toBe(true);
    expect(tier(11).every((l) => !manqueLevel(l).samePlace && !manqueLevel(l).lookalike)).toBe(true);
    expect(tier(21).every((l) => manqueLevel(l).lookalike && manqueLevel(l).missing === 1)).toBe(true);
    expect(tier(31).every((l) => manqueLevel(l).missing === 2)).toBe(true);
    expect(tier(41).every((l) => manqueLevel(l).sequential)).toBe(true);
    for (const from of [1, 11, 21, 31, 41]) expect(new Set(tier(from).map(manqueLevelLabel)).size).toBeGreaterThanOrEqual(5);
  });

  it('note les manches réussies', () => {
    for (const level of LEVELS) {
      const { target } = manqueLevel(level);
      expect(scoreManque(target, level)).toBe(100);
      expect(scoreManque(MANQUE_ROUNDS, level)).toBe(100);
      expect(scoreManque(Math.ceil(target * 0.6), level)).toBeGreaterThanOrEqual(60);
    }
  });
});
