import { afterEach, describe, expect, it } from 'vitest';
import { LANGS, setLang } from '../lang';
import { MAX_LEVEL } from '../levels';
import { createRng, deriveSeed } from '../rng';
import { generatePendu, PENDU_LEVELS, penduLevel, penduLevelLabel, penduRule, scorePendu, solved } from './pendu';
import { GAMES } from './registry';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const tier = (from: number) => LEVELS.slice(from - 1, from + 9);

describe('Pendu express', () => {
  afterEach(() => setLang('fr'));

  it('a 50 niveaux et dure une minute', () => {
    expect(PENDU_LEVELS).toHaveLength(MAX_LEVEL);
    expect(GAMES.pendu.duration).toBe('≈ 1 min');
    expect(penduRule(1)).toContain('minute');
  });

  it('tire assez de mots, sans doublon, dans toutes les langues et à chaque palier', () => {
    for (const lang of LANGS) {
      setLang(lang);
      for (const level of [1, 6, 11, 16, 21, 31, 41, 46, 50]) {
        const c = penduLevel(level);
        const words = generatePendu(createRng(deriveSeed(level, 4)), level);
        expect(words.length, `${lang} ${level}`).toBe(30);
        expect(new Set(words.map((w) => w.letters)).size).toBe(30);
        words.forEach((w, k) => {
          expect(w.letters).toMatch(/^[A-Z]+$/);
          expect(w.letters.length).toBeGreaterThanOrEqual(c.minLength);
          expect(w.letters.length).toBeLessThanOrEqual(c.maxLength);
          if (k > 0) expect(w.family).not.toBe(words[k - 1].family);
          expect(w.given).toHaveLength(c.given === 'ends' ? 2 : c.given === 'first' ? 1 : 0);
          expect([...w.letters].filter((l) => w.given.includes(l)).length).toBeLessThanOrEqual(w.letters.length / 2);
        });
      }
    }
  });

  it('reconnaît un mot trouvé, lettres données comprises', () => {
    const w = { word: 'pomme', letters: 'POMME', family: 'Fruit', given: ['P', 'E'] };
    expect(solved(w, ['O', 'M'])).toBe(true);
    expect(solved(w, ['O'])).toBe(false);
  });

  it('apporte une nouvelle façon de jouer à chaque palier', () => {
    expect(tier(1).every((l) => penduLevel(l).given === 'ends')).toBe(true);
    expect(tier(11).every((l) => penduLevel(l).given === 'first')).toBe(true);
    expect(tier(21).every((l) => penduLevel(l).given === 'none' && penduLevel(l).hint)).toBe(true);
    expect(tier(31).every((l) => !penduLevel(l).hint && penduLevel(l).lives > 3)).toBe(true);
    expect(tier(41).every((l) => penduLevel(l).lives === 3 && penduLevel(l).minLength >= 7)).toBe(true);
    for (const from of [1, 11, 21, 31, 41]) expect(new Set(tier(from).map(penduLevelLabel)).size).toBeGreaterThanOrEqual(2);
  });

  it('note les mots trouvés', () => {
    for (const level of LEVELS) {
      const { target } = penduLevel(level);
      expect(scorePendu(target, level)).toBe(100);
      expect(scorePendu(Math.ceil(target * 0.6), level)).toBeGreaterThanOrEqual(60);
    }
  });
});
