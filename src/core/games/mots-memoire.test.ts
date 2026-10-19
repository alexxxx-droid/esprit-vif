import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng } from '../rng';
import { categoriesLevel, generateCategories, scoreCategories } from './categories';
import { generateLettre, LETTRE_WORDS, lettreLevel, scoreLettre } from './lettre';
import { CATEGORIES, categoryOf } from './lexique';
import { generateMots, motsLevel, scoreMots } from './mots';
import { generatePaires, pairesLevel, scorePaires } from './paires';
import { WORDS } from './words';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const SEEDS = Array.from({ length: 10 }, (_, i) => i * 4241 + 17);

describe('Lexique', () => {
  it('range chaque mot dans une seule catégorie, avec de quoi piocher', () => {
    const seen = new Map<string, string>();
    for (const c of CATEGORIES) {
      expect(c.words.length).toBeGreaterThanOrEqual(16);
      for (const w of c.words) {
        expect(seen.get(w), `${w} est dans ${seen.get(w)} et ${c.id}`).toBeUndefined();
        seen.set(w, c.id);
      }
    }
    for (const family of new Set(CATEGORIES.map((c) => c.family))) {
      expect(CATEGORIES.filter((c) => c.family === family).length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('Mots à retenir', () => {
  it('montre autant de mots déjà vus que de nouveaux, jamais les mêmes', () => {
    for (const level of LEVELS) {
      const c = motsLevel(level);
      for (const seed of SEEDS) {
        const round = generateMots(createRng(seed + level), level);
        expect(round.study).toHaveLength(c.count);
        expect(new Set(round.study).size).toBe(c.count);
        expect(round.probes).toHaveLength(c.count * 2);
        expect(new Set(round.probes.map((p) => p.word)).size).toBe(c.count * 2);
        for (const p of round.probes) expect(round.study.includes(p.word)).toBe(p.seen);
        if (c.lures === 'category') {
          const studied = new Set(round.study.map((w) => categoryOf(w)?.id));
          for (const p of round.probes) expect(studied.has(categoryOf(p.word)?.id)).toBe(true);
        }
      }
    }
  });

  it('ne récompense pas le hasard', () => {
    const { count } = motsLevel(1);
    expect(scoreMots(count, 0, 1)).toBe(100);
    expect(scoreMots(count, count, 1)).toBe(0);
    expect(scoreMots(count / 2, 0, 1)).toBe(50);
  });
});

describe('Lettre manquante', () => {
  it('a des mots pour chaque niveau', () => {
    for (const level of LEVELS) {
      const c = lettreLevel(level);
      expect(LETTRE_WORDS.filter(({ word }) => word.length >= c.minLength && word.length <= c.maxLength).length).toBeGreaterThanOrEqual(15);
    }
  });

  it('propose une seule lettre qui forme un mot connu', () => {
    const known = new Set([...WORDS, ...LETTRE_WORDS.map((w) => w.word)]);
    for (const level of LEVELS) {
      const c = lettreLevel(level);
      for (const seed of SEEDS.slice(0, 4)) {
        for (const q of generateLettre(createRng(seed + level), level, 12)) {
          expect(q.word.length).toBeGreaterThanOrEqual(c.minLength);
          expect(q.word.length).toBeLessThanOrEqual(c.maxLength);
          expect(q.positions).toHaveLength(c.missing);
          expect(q.options).toHaveLength(c.options);
          expect(new Set(q.options).size).toBe(c.options);
          expect(q.options[q.answer]).toBe(q.positions.map((p) => q.word[p]).join(''));
          q.options.forEach((letters, i) => {
            const chars = [...q.word];
            q.positions.forEach((p, k) => {
              chars[p] = letters[k];
            });
            expect(known.has(chars.join(''))).toBe(i === q.answer);
          });
        }
      }
    }
  });

  it('compte une erreur contre une bonne réponse', () => {
    const { target } = lettreLevel(1);
    expect(scoreLettre(target, 0, 1)).toBe(100);
    expect(scoreLettre(target, target, 1)).toBe(0);
  });
});

describe('Catégories', () => {
  it('cache un seul intrus, venu de loin puis de la même famille', () => {
    for (const level of LEVELS) {
      const c = categoriesLevel(level);
      for (const seed of SEEDS) {
        for (const q of generateCategories(createRng(seed + level), level, 10)) {
          expect(q.words).toHaveLength(c.words);
          expect(new Set(q.words).size).toBe(c.words);
          q.words.forEach((w, i) => expect(categoryOf(w)).toBe(i === q.answer ? q.intruder : q.main));
          if (c.near === 0) expect(q.intruder.family).not.toBe(q.main.family);
          if (c.near === 1) expect(q.intruder.family).toBe(q.main.family);
        }
      }
    }
    expect(scoreCategories(categoriesLevel(1).target, 0, 1)).toBe(100);
  });
});

describe('Paires', () => {
  it('distribue chaque face deux fois, des faces toutes différentes sans compter la couleur', () => {
    for (const level of LEVELS) {
      const c = pairesLevel(level);
      expect((c.pairs * 2) % c.cols).toBe(0);
      for (const seed of SEEDS) {
        const deck = generatePaires(createRng(seed + level), level);
        expect(deck.faces).toHaveLength(c.pairs);
        expect(deck.cards).toHaveLength(c.pairs * 2);
        expect(new Set(deck.faces.map((f) => `${f.shape}-${f.filled}`)).size).toBe(c.pairs);
        for (let i = 0; i < c.pairs; i++) expect(deck.cards.filter((x) => x === i)).toHaveLength(2);
        if (c.similar) expect(deck.faces.every((f) => f.color === 0)).toBe(true);
      }
    }
  });

  it('note les paires trouvées et l’économie de coups', () => {
    const { pairs } = pairesLevel(1);
    expect(scorePaires(pairs, pairs, 1)).toBe(100);
    expect(scorePaires(pairs, pairs * 4, 1)).toBe(70);
    expect(scorePaires(0, 5, 1)).toBe(0);
    expect(scorePaires(pairs / 2, pairs / 2, 1)).toBe(50);
  });
});
