import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setLang } from '../lang';
import { MAX_LEVEL } from '../levels';
import { createRng } from '../rng';
import { categoriesLevel, categoriesLevelLabel, generateCategories, scoreCategories } from './categories';
import { generateLettre, LETTRE_WORDS, lettreKnownWords, lettreLevel, lettreLevelLabel, lettreWords, scoreLettre } from './lettre';
import { categories, CATEGORIES, CATEGORIES_EN, categoryOf } from './lexique';
import { generateMots, motsLevel, motsLevelLabel, scoreMots } from './mots';
import { generatePaires, pairesLevel, pairesLevelLabel, scorePaires } from './paires';
import { COMMON_WORDS_EN, hasRudeWord, WORDS, WORDS_EN } from './words';

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

describe('Lexique anglais', () => {
  beforeEach(() => setLang('en'));
  afterEach(() => setLang('fr'));

  it('reprend les mêmes catégories et familles, avec de quoi piocher', () => {
    expect(categories()).toBe(CATEGORIES_EN);
    expect(CATEGORIES_EN.map((c) => [c.id, c.family])).toEqual(CATEGORIES.map((c) => [c.id, c.family]));
    for (const c of CATEGORIES_EN) {
      expect(c.words.length, c.id).toBeGreaterThanOrEqual(16);
      expect(c.label).toMatch(/^[A-Z][a-z]+( [a-z]+)*$/);
      expect(c.plural).toMatch(/^[a-z]+( [a-z]+)*$/);
    }
  });

  it('range chaque mot anglais dans une seule catégorie, en minuscules sauf les noms propres', () => {
    const seen = new Map<string, string>();
    const proper = new Set(['pays', 'calendrier']);
    for (const c of CATEGORIES_EN) {
      for (const w of c.words) {
        expect(seen.get(w.toLowerCase()), `${w} est dans ${seen.get(w.toLowerCase())} et ${c.id}`).toBeUndefined();
        seen.set(w.toLowerCase(), c.id);
        if (proper.has(c.id)) expect(w).toMatch(/^[A-Z][a-z]+$/);
        else if (c.id === 'espace') expect(w).toMatch(/^([a-z]+|[A-Z][a-z]+)$/);
        else expect(w).toMatch(/^[a-z]+(-[a-z]+)*$/);
      }
    }
    // Les mots à double sens qui rendraient l'intrus discutable restent dehors.
    for (const ambiguous of ['orange', 'bat', 'seal', 'crane', 'date', 'trunk', 'pitcher', 'fan', 'kite', 'turkey', 'rose', 'violet', 'lime', 'olive', 'salmon', 'triangle', 'crater', 'pyramid']) {
      expect(seen.has(ambiguous), ambiguous).toBe(false);
    }
  });

  it('Mots à retenir pioche en anglais, pièges de même catégorie compris', () => {
    const english = new Set(CATEGORIES_EN.flatMap((c) => c.words));
    for (const level of LEVELS) {
      const c = motsLevel(level);
      for (const seed of SEEDS.slice(0, 4)) {
        const round = generateMots(createRng(seed + level), level);
        expect(round.study).toHaveLength(c.count);
        expect(new Set(round.probes.map((p) => p.word)).size).toBe(c.count * 2);
        for (const p of round.probes) expect(english.has(p.word)).toBe(true);
        if (c.lures === 'category') {
          const studied = new Set(round.study.map((w) => categoryOf(w)?.id));
          for (const p of round.probes) expect(studied.has(categoryOf(p.word)?.id)).toBe(true);
        }
      }
    }
    expect(motsLevelLabel(1)).toMatch(/^6 words · 15\Ws to read them$/);
    expect(motsLevelLabel(6)).toContain('same-category traps');
  });

  it('Lettre manquante pioche des mots anglais (A à Z) avec un indice anglais', () => {
    const labels = new Set(CATEGORIES_EN.map((c) => c.label));
    expect(lettreWords()).not.toBe(LETTRE_WORDS);
    for (const { word, hint } of lettreWords()) {
      expect(word).toMatch(/^[A-Z]+$/);
      expect(labels.has(hint)).toBe(true);
    }
    for (const level of LEVELS) {
      const c = lettreLevel(level);
      expect(lettreWords().filter(({ word }) => word.length >= c.minLength && word.length <= c.maxLength).length).toBeGreaterThanOrEqual(15);
    }
    expect(lettreLevelLabel(1)).toBe('Words of 4 to 5 letters · 1 missing letter · 3 choices');
  });

  it('Lettre manquante : un seul choix forme un mot anglais connu, jamais une grossièreté', () => {
    const known = lettreKnownWords();
    for (const w of WORDS_EN) expect(known.has(w)).toBe(true);
    for (const { word } of lettreWords()) expect(known.has(word)).toBe(true);
    // Les mots courts courants comptent aussi : « WAS_ » ne propose jamais H (WASH).
    for (const w of COMMON_WORDS_EN) expect(w).toMatch(/^[A-Z]{4,8}$/);
    expect(known.has('WASH')).toBe(true);
    expect(known.has('GREY')).toBe(true);
    for (const level of LEVELS) {
      const c = lettreLevel(level);
      for (const seed of SEEDS.slice(0, 4)) {
        for (const q of generateLettre(createRng(seed + level), level, 12)) {
          expect(q.word.length).toBeGreaterThanOrEqual(c.minLength);
          expect(q.word.length).toBeLessThanOrEqual(c.maxLength);
          expect(q.options).toHaveLength(c.options);
          expect(new Set(q.options).size).toBe(c.options);
          expect(q.options[q.answer]).toBe(q.positions.map((p) => q.word[p]).join(''));
          q.options.forEach((letters, i) => {
            const chars = [...q.word];
            q.positions.forEach((p, k) => {
              chars[p] = letters[k];
            });
            expect(known.has(chars.join(''))).toBe(i === q.answer);
            // Le mot lui-même peut en contenir une suite innocente (PEACOCK) ; un leurre, jamais.
            if (i !== q.answer) expect(hasRudeWord(chars.join(''))).toBe(false);
          });
        }
      }
    }
  });

  it('Catégories cache un intrus anglais, et dit sa catégorie en anglais', () => {
    for (const level of LEVELS) {
      const c = categoriesLevel(level);
      for (const seed of SEEDS.slice(0, 4)) {
        for (const q of generateCategories(createRng(seed + level), level, 10)) {
          expect(q.words).toHaveLength(c.words);
          expect(new Set(q.words).size).toBe(c.words);
          expect(CATEGORIES_EN).toContain(q.main);
          q.words.forEach((w, i) => expect(categoryOf(w)).toBe(i === q.answer ? q.intruder : q.main));
          if (c.near === 0) expect(q.intruder.family).not.toBe(q.main.family);
          if (c.near === 1) expect(q.intruder.family).toBe(q.main.family);
        }
      }
    }
    expect(categoriesLevelLabel(1)).toBe('4 words · easy odd ones');
  });

  it('libelle les niveaux de Paires en anglais', () => {
    expect(pairesLevelLabel(1)).toMatch(/^6 pairs · 3\Ws preview$/);
    expect(pairesLevelLabel(5)).toBe('8 pairs · no preview');
    expect(pairesLevelLabel(9)).toBe('6 pairs · no preview · similar shapes');
    setLang('fr');
    expect(pairesLevelLabel(5)).toBe('8 paires · sans aperçu');
    expect(categories()).toBe(CATEGORIES);
    expect(new Set(WORDS).has('CHIEN')).toBe(true);
  });
});
