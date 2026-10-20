import { afterEach, describe, expect, it } from 'vitest';
import { contentOf } from '../content';
import { NBSP } from '../format';
import { setLang, type ExtraLang, type Lang } from '../lang';
import { MAX_LEVEL, tierOf, type TierId } from '../levels';
import { createRng, hashSeed } from '../rng';
import {
  CONTRAIRES_LEVELS,
  contrairesLevel,
  contrairesLevelLabel,
  contrairesLexicon,
  contrairesRule,
  generateContraires,
  scoreContraires,
  type ChoiceQuestion,
  type ContrairesQuestion,
  type Lexicon,
} from './contraires';
import { WORDS_EN, WORDS_FR } from './contraires-words';

/**
 * Contraires : cinq paliers qui apportent chacun leur nouveauté, des listes propres à chaque langue
 * (assez de paires, sans doublon ni contradiction), des questions qui ont toujours une seule bonne
 * réponse, un générateur reproductible et un score où le hasard ne rapporte rien.
 */

/** Le français, l'anglais et chaque autre langue qui a son module de contenu. */
const LANGS: readonly Lang[] = ['fr', 'en', ...(['es', 'de', 'it', 'pt'] as const).filter((l: ExtraLang) => contentOf(l))];
const listOf = (l: Lang) => (l === 'fr' ? WORDS_FR : l === 'en' ? WORDS_EN : contentOf(l)!.contraires);
const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const SEEDS = [1, 42, 2024];
const FRENCH_MARKS = /[àâçéèêëîïôûùœ«»]|\b(le|la|les|des|du|une|et|pour|par|chaque|jusqu)\b/i;

afterEach(() => setLang('fr'));

function inLang<T>(l: Lang, fn: () => T): T {
  setLang(l);
  try {
    return fn();
  } finally {
    setLang('fr');
  }
}

const levelsOf = (tier: TierId) => LEVELS.filter((level) => tierOf(level) === tier);

/**
 * Range les mots en deux camps : ceux de même sens ensemble, les contraires en face. Renvoie les
 * mots qui ne trouvent pas de camp (une paire de contraires qui contredit les autres).
 */
function sides(lex: Lexicon): { side: Map<string, number>; conflicts: string[] } {
  const side = new Map<string, number>();
  const conflicts: string[] = [];
  for (const start of lex.familyOf.keys()) {
    if (side.has(start)) continue;
    side.set(start, 0);
    const stack = [start];
    while (stack.length) {
      const word = stack.pop()!;
      for (const l of lex.links.get(word)!) {
        const want = l.link === 'contraire' ? 1 - side.get(word)! : side.get(word)!;
        if (!side.has(l.word)) {
          side.set(l.word, want);
          stack.push(l.word);
        } else if (side.get(l.word) !== want) conflicts.push(`${word} → ${l.word}`);
      }
    }
  }
  return { side, conflicts };
}

const linked = (lex: Lexicon, a: string, b: string, link: string) => lex.links.get(a)?.some((l) => l.word === b && l.link === link) ?? false;

describe('Contraires : les niveaux', () => {
  it('a 50 niveaux, la maîtrise rejoue le niveau 50', () => {
    expect(CONTRAIRES_LEVELS).toHaveLength(MAX_LEVEL);
    expect(contrairesLevel(55)).toBe(contrairesLevel(50));
    for (const c of CONTRAIRES_LEVELS) expect(c.target).toBeGreaterThan(0);
  });

  it('apporte une nouveauté à chaque palier', () => {
    expect(contrairesLevel(1).grades).toEqual([1]);
    for (const level of levelsOf('debutant')) {
      const c = contrairesLevel(level);
      expect([c.same, c.lure, c.judgeMs, c.grades.includes(3)], `niveau ${level}`).toEqual([0, 0, undefined, false]);
    }
    for (const level of levelsOf('confirme')) {
      const c = contrairesLevel(level);
      expect(c.same, `niveau ${level}`).toBeGreaterThan(0);
      expect([c.lure, c.judgeMs, c.grades.includes(3)], `niveau ${level}`).toEqual([0, undefined, false]);
    }
    for (const level of levelsOf('expert')) {
      const c = contrairesLevel(level);
      expect(c.lure, `niveau ${level}`).toBeGreaterThan(0);
      expect([c.judgeMs, c.grades.includes(3)], `niveau ${level}`).toEqual([undefined, false]);
    }
    for (const level of levelsOf('maitre')) {
      const c = contrairesLevel(level);
      expect(c.grades, `niveau ${level}`).toContain(3);
      expect(c.judgeMs, `niveau ${level}`).toBeUndefined();
    }
    const fuses = levelsOf('legende').map((level) => contrairesLevel(level).judgeMs!);
    expect(fuses.every((ms) => ms >= 2500)).toBe(true);
    expect(fuses).toEqual([...fuses].sort((a, b) => b - a));
  });

  it('écrit les libellés et les règles en français et en anglais', () => {
    for (let level = 1; level <= 60; level++) {
      const fr = { label: contrairesLevelLabel(level), rule: contrairesRule(level) };
      const en = inLang('en', () => ({ label: contrairesLevelLabel(level), rule: contrairesRule(level) }));
      expect(fr.label.length).toBeGreaterThan(2);
      expect(fr.rule.length).toBeGreaterThan(10);
      expect(en.rule, `niveau ${level}`).not.toMatch(FRENCH_MARKS);
      expect(en.label, `niveau ${level}`).not.toMatch(FRENCH_MARKS);
      expect(en.label).not.toBe(fr.label);
      expect(en.rule).not.toBe(fr.rule);
    }
  });
});

describe.each(LANGS)('Contraires : les listes (%s)', (l) => {
  const lex = inLang(l, contrairesLexicon);
  const opposites = lex.pairs.filter((p) => p.link === 'contraire');
  const synonyms = lex.pairs.filter((p) => p.link === 'synonyme');

  it('a assez de paires, courantes et soutenues', () => {
    expect(opposites.length).toBeGreaterThanOrEqual(120);
    expect(synonyms.length).toBeGreaterThanOrEqual(80);
    for (const list of [opposites, synonyms]) {
      expect(list.filter((p) => p.grade < 3).length).toBeGreaterThanOrEqual(50);
      expect(list.filter((p) => p.grade === 3).length).toBeGreaterThanOrEqual(30);
    }
  });

  it('écrit chaque paire proprement, sans doublon', () => {
    for (const family of listOf(l))
      for (const text of family.pairs)
        for (const token of text.split(/\s+/).filter(Boolean)) expect(token.split(/[/=]/).filter(Boolean), token).toHaveLength(2);
    const keys = lex.pairs.map((p) => [p.a, p.b].sort().join('|'));
    expect(keys.filter((key, i) => keys.indexOf(key) !== i)).toEqual([]);
    for (const { a, b, kind } of lex.pairs) {
      expect(a).not.toBe(b);
      for (const word of [a, b]) {
        // Les noms allemands gardent leur majuscule.
        expect(word, word).toMatch(l === 'de' && kind === 'nom' ? /^\p{Lu}[\p{Ll}’' -]*\p{Ll}$/u : /^\p{Ll}[\p{Ll}’' -]*\p{Ll}$/u);
        expect(word).not.toContain(NBSP);
        expect(word).not.toContain('  ');
      }
    }
  });

  it('range chaque mot dans une seule famille, d’une seule nature', () => {
    const families = new Map<string, Set<number>>();
    for (const p of lex.pairs) for (const word of [p.a, p.b]) families.set(word, (families.get(word) ?? new Set()).add(p.family));
    expect([...families].filter(([, set]) => set.size > 1).map(([word]) => word)).toEqual([]);
  });

  it('ne met aucun mot dans deux paires contradictoires', () => {
    expect(sides(lex).conflicts).toEqual([]);
  });

  it('a de quoi tirer trois leurres de familles différentes, dans chaque nature et chaque registre', () => {
    for (const [key, words] of lex.pool) {
      const families = new Set(words.map((w) => lex.familyOf.get(w)));
      expect(families.size, key).toBeGreaterThanOrEqual(5);
    }
  });
});

/** Vérifie une question à choix : une seule bonne réponse, quatre mots distincts de même nature. */
function checkChoice(lex: Lexicon, side: Map<string, number>, q: ChoiceQuestion, where: string) {
  expect(q.options, where).toHaveLength(4);
  expect(new Set(q.options).size, where).toBe(4);
  const family = lex.familyOf.get(q.word);
  const kind = lex.kindOf.get(q.word);
  expect(linked(lex, q.word, q.options[q.answer], q.ask), where).toBe(true);
  for (const option of q.options) expect(lex.kindOf.get(option), `${where} : ${option}`).toBe(kind);
  // Une proposition de la même famille compte comme bonne réponse si son camp va avec la consigne.
  const good = q.options.filter((o) => lex.familyOf.get(o) === family && (side.get(o) === side.get(q.word)) === (q.ask === 'synonyme'));
  expect(good, where).toEqual([q.options[q.answer]]);
  const others = q.options.filter((_, i) => i !== q.answer && i !== q.lure);
  if (q.lure >= 0) {
    const lure = q.options[q.lure];
    expect(linked(lex, q.word, lure, q.ask === 'contraire' ? 'synonyme' : 'contraire'), `${where} : piège ${lure}`).toBe(true);
  }
  const strangerFamilies = others.map((o) => lex.familyOf.get(o));
  expect(strangerFamilies, where).not.toContain(family);
  expect(new Set(strangerFamilies).size, where).toBe(others.length);
}

describe.each(LANGS)('Contraires : les questions (%s)', (l) => {
  const lex = inLang(l, contrairesLexicon);
  const { side } = sides(lex);
  const formal = new Set(lex.pairs.filter((p) => p.grade === 3).flatMap((p) => [p.a, p.b]));
  const generate = (seed: number, level: number) => inLang(l, () => generateContraires(createRng(seed), level));

  it('donne toujours la même partie pour la même graine', () => {
    for (const level of [1, 15, 25, 35, 45]) expect(generate(7, level)).toEqual(generate(7, level));
    expect(generate(7, 1)).not.toEqual(generate(8, 1));
  });

  it('pose des questions à une seule bonne réponse, à tous les niveaux', () => {
    for (const level of LEVELS)
      for (const seed of SEEDS) {
        const questions = generate(seed, level);
        expect(questions.length).toBeGreaterThanOrEqual(60);
        questions.forEach((q, i) => {
          const where = `niveau ${level}, graine ${seed}, question ${i}`;
          if (q.type === 'choice') checkChoice(lex, side, q, where);
          else {
            const [a, b] = q.words;
            expect(lex.kindOf.get(a), where).toBe(lex.kindOf.get(b));
            if (q.link === 'aucun') expect(lex.familyOf.get(a), where).not.toBe(lex.familyOf.get(b));
            else expect(linked(lex, a, b, q.link), where).toBe(true);
          }
        });
      }
  });

  it('montre la nouveauté de chaque palier dans les questions', () => {
    const all = (tier: TierId) => levelsOf(tier).flatMap((level) => SEEDS.flatMap((seed) => generate(seed, level)));
    const choices = (qs: ContrairesQuestion[]) => qs.filter((q): q is ChoiceQuestion => q.type === 'choice');
    const debutant = all('debutant');
    expect(choices(debutant)).toHaveLength(debutant.length);
    expect(choices(debutant).every((q) => q.ask === 'contraire' && q.lure === -1)).toBe(true);
    const confirme = choices(all('confirme'));
    expect(new Set(confirme.map((q) => q.ask))).toEqual(new Set(['contraire', 'synonyme']));
    expect(confirme.every((q) => q.lure === -1)).toBe(true);
    for (const level of levelsOf('expert')) {
      const qs = choices(generate(1, level));
      expect(qs.filter((q) => q.lure >= 0).length, `niveau ${level}`).toBeGreaterThan(qs.length * 0.3);
      expect(qs.some((q) => formal.has(q.word) && !lex.links.get(q.word)!.some((x) => x.grade < 3))).toBe(false);
    }
    for (const level of levelsOf('maitre')) expect(choices(generate(1, level)).some((q) => formal.has(q.word)), `niveau ${level}`).toBe(true);
    for (const level of levelsOf('legende')) {
      const qs = generate(1, level);
      expect(qs.every((q) => q.type === 'judge')).toBe(true);
      expect(new Set(qs.map((q) => (q.type === 'judge' ? q.link : '')))).toEqual(new Set(['contraire', 'synonyme', 'aucun']));
    }
  });
});

describe('Contraires : le score', () => {
  it('reste entre 0 et 100', () => {
    for (const level of LEVELS) {
      const { target } = contrairesLevel(level);
      expect(scoreContraires(0, 0, level)).toBe(0);
      expect(scoreContraires(target, 0, level)).toBe(100);
      expect(scoreContraires(target * 3, 0, level)).toBe(100);
      expect(scoreContraires(5, 12, level)).toBe(0);
    }
  });

  it('ne rapporte rien au hasard', () => {
    for (const level of LEVELS) {
      const scores = SEEDS.map((seed) => {
        // Un joueur qui tape au hasard, avec son propre tirage (sans lien avec celui de la partie).
        const rng = createRng(hashSeed(`hasard:${seed}:${level}`));
        const questions = generateContraires(createRng(seed), level);
        let correct = 0;
        let errors = 0;
        for (const q of questions.slice(0, 40)) {
          const ok = q.type === 'choice' ? rng.int(0, 3) === q.answer : rng.pick(['contraire', 'synonyme', 'aucun']) === q.link;
          if (ok) correct++;
          else errors++;
        }
        return scoreContraires(correct, errors, level);
      });
      expect(scores.reduce((a, b) => a + b, 0) / scores.length, `niveau ${level}`).toBeLessThanOrEqual(3);
    }
  });
});
