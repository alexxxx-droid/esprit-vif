import { byLang, memoByLang } from '../content';
import { localized, tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';
import { WORDS_EN, WORDS_FR, type WordFamily, type WordKind } from './contraires-words';

/**
 * Contraires : un mot, une consigne (« le contraire de… »), quatre propositions ; on touche la bonne.
 * Cinq paliers : des contraires courants, sans piège ; puis la consigne alterne entre « le contraire »
 * et « le même sens », annoncée par un badge de couleur ; dès le niveau 21, un piège se glisse parmi
 * les propositions (un mot de même sens quand on demande le contraire, et inversement) ; au palier
 * Maître, des mots rares et soutenus. Au palier Légende, une autre façon de jouer : deux mots,
 * contraires, même sens ou sans rapport ? Il faut trancher avant la fin de la mèche.
 *
 * Les mots viennent de `contraires-words.ts`, écrits pour le français et pour l'anglais (les autres
 * langues jouent en anglais en attendant leur liste). Les leurres sont toujours pris dans d'autres
 * familles de sens que le mot demandé : aucun ne peut passer pour une bonne réponse.
 */

export const CONTRAIRES_DURATION_MS = 60_000;

/** Registre des mots : 1 très courant, 2 courant, 3 soutenu (rare). */
export type Grade = 1 | 2 | 3;
/** Ce que demande la consigne : le contraire, ou un mot de même sens. */
export type Ask = 'contraire' | 'synonyme';
/** Le lien entre deux mots, au palier Légende. */
export type Link = Ask | 'aucun';

export interface ContrairesLevel {
  /** Registres des mots demandés. */
  grades: readonly Grade[];
  /** Part des consignes « même sens » (0 : toujours « le contraire de »). */
  same: number;
  /** Part des questions avec un piège : un mot de même sens quand on demande le contraire, et inversement. */
  lure: number;
  /** Palier Légende : deux mots à juger, en ce temps au plus par paire (ms, avant les réglages de rythme). */
  judgeMs?: number;
  /** Bonnes réponses moins erreurs en 60 s pour 100 pts (au hasard : 0). */
  target: number;
}

const L = (grades: Grade[], same: number, lure: number, target: number, judgeMs?: number): ContrairesLevel =>
  judgeMs ? { grades, same, lure, target, judgeMs } : { grades, same, lure, target };

export const CONTRAIRES_LEVELS: readonly ContrairesLevel[] = [
  // Débutant : des contraires courants, sans piège.
  L([1], 0, 0, 12),
  L([1], 0, 0, 13),
  L([1], 0, 0, 14),
  L([1], 0, 0, 15),
  L([1, 2], 0, 0, 14),
  L([1, 2], 0, 0, 15),
  L([1, 2], 0, 0, 16),
  L([2], 0, 0, 14),
  L([1, 2], 0, 0, 17),
  L([2], 0, 0, 15),
  // Confirmé : la consigne alterne entre « le contraire » et « le même sens ».
  L([1], 0.25, 0, 13),
  L([1, 2], 0.3, 0, 14),
  L([1, 2], 0.35, 0, 14),
  L([1, 2], 0.4, 0, 15),
  L([1, 2], 0.5, 0, 15),
  L([2], 0.4, 0, 14),
  L([1, 2], 0.5, 0, 16),
  L([2], 0.5, 0, 15),
  L([1, 2], 0.5, 0, 17),
  L([2], 0.5, 0, 16),
  // Expert : des pièges parmi les propositions.
  L([1, 2], 0.3, 0.5, 13),
  L([1, 2], 0.4, 0.6, 14),
  L([1, 2], 0.4, 0.7, 14),
  L([1, 2], 0.5, 0.8, 15),
  L([2], 0.5, 0.8, 14),
  L([1, 2], 0.5, 1, 15),
  L([2], 0.5, 0.9, 15),
  L([1, 2], 0.5, 1, 16),
  L([2], 0.5, 1, 16),
  L([1, 2], 0.5, 1, 17),
  // Maître : des mots rares et soutenus.
  L([2, 3], 0.3, 0.3, 12),
  L([3], 0.3, 0.3, 11),
  L([2, 3], 0.4, 0.5, 13),
  L([3], 0.4, 0.5, 12),
  L([2, 3], 0.5, 0.6, 13),
  L([3], 0.5, 0.6, 12),
  L([3], 0.5, 0.7, 13),
  L([2, 3], 0.5, 0.8, 14),
  L([3], 0.5, 0.8, 13),
  L([3], 0.5, 1, 14),
  // Légende : deux mots, contraires, même sens ou sans rapport ? La mèche raccourcit.
  L([2, 3], 0, 0, 15, 4500),
  L([2, 3], 0, 0, 16, 4300),
  L([3], 0, 0, 15, 4200),
  L([2, 3], 0, 0, 17, 4000),
  L([3], 0, 0, 16, 3900),
  L([2, 3], 0, 0, 18, 3700),
  L([3], 0, 0, 17, 3600),
  L([2, 3], 0, 0, 19, 3400),
  L([3], 0, 0, 18, 3200),
  L([2, 3], 0, 0, 20, 3000),
];

export function contrairesLevel(level: number): ContrairesLevel {
  return pickLevel(CONTRAIRES_LEVELS, level);
}

const GRADE_LABELS = {
  '1': { fr: 'mots simples', en: 'simple words' },
  '1,2': { fr: 'mots courants', en: 'everyday words' },
  '2': { fr: 'mots moins courants', en: 'less common words' },
  '2,3': { fr: 'mots courants et soutenus', en: 'everyday and formal words' },
  '3': { fr: 'mots rares et soutenus', en: 'rare, formal words' },
};

export function contrairesLevelLabel(level: number): string {
  const c = contrairesLevel(level);
  const words = localized(GRADE_LABELS[c.grades.join(',') as keyof typeof GRADE_LABELS]);
  const mode = c.judgeMs
    ? tr('deux mots à juger', 'two words to judge')
    : c.lure
      ? tr('contraire ou même sens · pièges', 'opposite or same meaning · traps')
      : c.same
        ? tr('contraire ou même sens', 'opposite or same meaning')
        : tr('contraires', 'opposites');
  return tr(`${mode} · ${words} · objectif ${c.target}`, `${mode} · ${words} · target ${c.target}`);
}

export function contrairesRule(level: number): string {
  const c = contrairesLevel(level);
  if (c.judgeMs)
    return tr(
      'Deux mots : contraires, même sens ou sans rapport ? Tranche vite, chaque paire a sa mèche. 60 secondes.',
      'Two words: opposites, same meaning or unrelated? Decide fast, each pair has a time limit. 60 seconds.',
    );
  if (c.grades.includes(3))
    return tr(
      'Des mots rares et soutenus : le contraire ou le même sens ? Méfie-toi des pièges. 60 secondes.',
      'Rare, formal words: opposite or same meaning? Beware of traps. 60 seconds.',
    );
  if (c.lure)
    return tr(
      'Attention aux pièges : quand on demande le contraire, un mot de même sens se glisse parmi les propositions, et inversement. 60 secondes.',
      'Watch out for traps: when you are asked for the opposite, a word with the same meaning hides among the choices, and vice versa. 60 seconds.',
    );
  if (c.same)
    return tr(
      'Lis bien la consigne : le contraire ou le même sens ? Touche le bon mot parmi les quatre. 60 secondes.',
      'Read the instruction carefully: opposite or same meaning? Tap the right word among the four. 60 seconds.',
    );
  return tr(
    'Touche le contraire du mot parmi les quatre propositions. Chaque erreur annule une bonne réponse. 60 secondes.',
    'Tap the opposite of the word among the four choices. Each mistake cancels out a correct answer. 60 seconds.',
  );
}

/** Une paire du lexique : deux mots, contraires ou de même sens. */
export interface WordPair {
  a: string;
  b: string;
  link: Ask;
  grade: Grade;
  kind: WordKind;
  /** Le rang de la famille de sens dans la liste. */
  family: number;
}

export interface Lexicon {
  pairs: readonly WordPair[];
  familyOf: ReadonlyMap<string, number>;
  kindOf: ReadonlyMap<string, WordKind>;
  /** Les liens directs de chaque mot. */
  links: ReadonlyMap<string, readonly { word: string; link: Ask; grade: Grade }[]>;
  /** Les mots de chaque nature et de chaque registre : `pool.get('adj-1')`. */
  pool: ReadonlyMap<string, readonly string[]>;
}

const poolKey = (kind: WordKind, grade: Grade) => `${kind}-${grade}`;

/** Lit les familles (« a/b » : contraires, « a=b » : même sens) et range les mots. */
export function parseFamilies(families: readonly WordFamily[]): Lexicon {
  const pairs: WordPair[] = [];
  const familyOf = new Map<string, number>();
  const kindOf = new Map<string, WordKind>();
  const links = new Map<string, { word: string; link: Ask; grade: Grade }[]>();
  const pool = new Map<string, Set<string>>();
  families.forEach(({ kind, pairs: texts }, family) => {
    texts.forEach((text, i) => {
      const grade = (i + 1) as Grade;
      for (const token of text.split(/\s+/).filter(Boolean)) {
        const link: Ask = token.includes('/') ? 'contraire' : 'synonyme';
        const [a, b] = token.split(/[/=]/).map((w) => w.replaceAll('_', ' '));
        pairs.push({ a, b, link, grade, kind, family });
        for (const [word, other] of [
          [a, b],
          [b, a],
        ]) {
          familyOf.set(word, family);
          kindOf.set(word, kind);
          links.set(word, [...(links.get(word) ?? []), { word: other, link, grade }]);
          const key = poolKey(kind, grade);
          pool.set(key, (pool.get(key) ?? new Set()).add(word));
        }
      }
    });
  });
  return { pairs, familyOf, kindOf, links, pool: new Map([...pool].map(([key, words]) => [key, [...words]])) };
}

/** Les familles de la langue en cours : sa liste, ou l'anglaise pour une langue qui n'en a pas encore. */
export function contrairesFamilies(): readonly WordFamily[] {
  return byLang(WORDS_FR, WORDS_EN, (c) => c.contraires);
}

/** Le lexique de la langue en cours. */
export function contrairesLexicon(): Lexicon {
  return memoByLang('contraires', () => parseFamilies(contrairesFamilies()));
}

export interface ChoiceQuestion {
  type: 'choice';
  ask: Ask;
  word: string;
  options: readonly string[];
  answer: number;
  /** Le rang du piège parmi les propositions, ou -1. */
  lure: number;
}

/** Palier Légende : deux mots, et le lien qui les unit. */
export interface JudgeQuestion {
  type: 'judge';
  words: readonly [string, string];
  link: Link;
}

export type ContrairesQuestion = ChoiceQuestion | JudgeQuestion;

/** Assez de questions pour les plus rapides : le jeu reprend au début s'il les épuise. */
const QUESTIONS = 80;
/** Une famille de sens attend tant de questions avant de revenir. */
const SPACING = 6;

/** Une pioche mélangée, remélangée une fois vide ; on y prend le premier candidat qui convient. */
function deck<T>(rng: Rng, items: readonly T[]) {
  let pile: T[] = [];
  return (ok: (item: T) => boolean): T => {
    if (pile.length === 0) pile = rng.shuffle(items);
    const i = pile.findIndex(ok);
    return pile.splice(Math.max(0, i), 1)[0];
  };
}

/**
 * Des mots sans rapport avec la famille `family` : même nature, même registre si possible, chacun
 * d'une famille différente (deux leurres ne forment jamais une paire entre eux).
 */
function strangers(rng: Rng, lex: Lexicon, kind: WordKind, grades: readonly Grade[], family: number, count: number, avoid: ReadonlySet<string>): string[] {
  const out: string[] = [];
  const used = new Set([family]);
  for (const grade of [...grades, 1, 2, 3] as Grade[]) {
    for (const word of rng.shuffle(lex.pool.get(poolKey(kind, grade)) ?? [])) {
      if (out.length === count) return out;
      const f = lex.familyOf.get(word)!;
      if (used.has(f) || avoid.has(word)) continue;
      used.add(f);
      out.push(word);
    }
  }
  return out;
}

interface Candidate {
  word: string;
  answer: string;
  pair: WordPair;
  /** Les pièges possibles : les mots liés au mot demandé par l'autre lien. */
  lures: readonly string[];
}

function candidates(lex: Lexicon, c: ContrairesLevel, ask: Ask): Candidate[] {
  const top = Math.max(...c.grades);
  return lex.pairs
    .filter((pair) => pair.link === ask && c.grades.includes(pair.grade))
    .flatMap((pair) =>
      [
        [pair.a, pair.b],
        [pair.b, pair.a],
      ].map(([word, answer]) => ({
        word,
        answer,
        pair,
        lures: lex.links
          .get(word)!
          .filter((l) => l.link !== ask && l.grade <= top && l.word !== answer)
          .map((l) => l.word),
      })),
    );
}

function choiceQuestions(rng: Rng, lex: Lexicon, c: ContrairesLevel): ChoiceQuestion[] {
  const draws = (['contraire', 'synonyme'] as const).map((ask) => {
    const all = candidates(lex, c, ask);
    const lured = all.filter((cand) => cand.lures.length > 0);
    return { all: deck(rng, all), lured: lured.length ? deck(rng, lured) : null };
  });
  const recent: number[] = [];
  const out: ChoiceQuestion[] = [];
  while (out.length < QUESTIONS) {
    const ask: Ask = rng.chance(c.same) ? 'synonyme' : 'contraire';
    const draw = draws[ask === 'contraire' ? 0 : 1];
    const wantLure = c.lure > 0 && rng.chance(c.lure) && draw.lured !== null;
    const cand = (wantLure ? draw.lured! : draw.all)((cand) => !recent.includes(cand.pair.family));
    const lure = wantLure ? rng.pick(cand.lures) : null;
    const extra = lure === null ? [] : [lure];
    const others = strangers(rng, lex, cand.pair.kind, [cand.pair.grade, ...c.grades], cand.pair.family, 3 - extra.length, new Set());
    const options = rng.shuffle([cand.answer, ...extra, ...others]);
    out.push({ type: 'choice', ask, word: cand.word, options, answer: options.indexOf(cand.answer), lure: lure === null ? -1 : options.indexOf(lure) });
    recent.push(cand.pair.family);
    if (recent.length > SPACING) recent.shift();
  }
  return out;
}

function judgeQuestions(rng: Rng, lex: Lexicon, c: ContrairesLevel): JudgeQuestion[] {
  const pairs = lex.pairs.filter((pair) => c.grades.includes(pair.grade));
  const draws = {
    contraire: deck(rng, pairs.filter((pair) => pair.link === 'contraire')),
    synonyme: deck(rng, pairs.filter((pair) => pair.link === 'synonyme')),
    aucun: deck(rng, pairs),
  };
  const recent: number[] = [];
  const out: JudgeQuestion[] = [];
  // Les trois réponses reviennent à parts égales, dans un ordre tiré à chaque tour.
  let links: Link[] = [];
  while (out.length < QUESTIONS) {
    if (links.length === 0) links = rng.shuffle(['contraire', 'synonyme', 'aucun'] as const);
    const link = links.pop()!;
    const pair = draws[link]((pair) => !recent.includes(pair.family));
    let words: [string, string] = [pair.a, pair.b];
    if (link === 'aucun') {
      const [stranger] = strangers(rng, lex, pair.kind, [pair.grade], pair.family, 1, new Set());
      words = [rng.chance(0.5) ? pair.a : pair.b, stranger];
      recent.push(lex.familyOf.get(stranger)!);
    }
    if (rng.chance(0.5)) words.reverse();
    out.push({ type: 'judge', words, link });
    recent.push(pair.family);
    while (recent.length > SPACING) recent.shift();
  }
  return out;
}

/** La suite des questions d'une partie : la même graine donne toujours la même partie. */
export function generateContraires(rng: Rng, level: number): ContrairesQuestion[] {
  const c = contrairesLevel(level);
  const lex = contrairesLexicon();
  return c.judgeMs ? judgeQuestions(rng, lex, c) : choiceQuestions(rng, lex, c);
}

export function scoreContraires(correct: number, errors: number, level: number): number {
  return countScore(correct - errors, 0, contrairesLevel(level).target);
}
