import { byLang, extraContent, memoByLang } from '../content';
import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { clampLevel, countScore } from '../scoring';
import { categories, CATEGORIES, type Category } from './lexique';
import { anagramWords, extraKnownWords, hasRudeWord, longAnagramWords } from './words';

/**
 * Lettre manquante : « Fruit : CER_SE ». La catégorie sert d'indice et lève toute ambiguïté ;
 * les leurres sont des lettres de la même sorte (voyelle pour voyelle) qui ne forment aucun mot connu.
 * Plus haut : des leurres sosies (M pour N, B pour P), jusqu'à 4 lettres manquantes, et plus d'indice.
 */

export const LETTRE_DURATION_MS = 60_000;

export interface LettreLevel {
  minLength: number;
  maxLength: number;
  missing: 1 | 2 | 3 | 4;
  options: number;
  /** Bonnes réponses en 60 s pour 100 pts (une erreur en retire une). */
  target: number;
  /** Leurres sosies : des lettres qui se ressemblent ou sonnent pareil (M / N, B / P, C / S, A / E…). */
  twins?: boolean;
  /** Pas de catégorie en indice : le mot se devine seul (mots de 7 lettres et plus). */
  noHint?: boolean;
}

type Missing = LettreLevel['missing'];
const TWINS = 1;
const NO_HINT = 2;

const L = (minLength: number, maxLength: number, missing: Missing, options: number, target: number, flags = 0): LettreLevel => ({
  minLength,
  maxLength,
  missing,
  options,
  target,
  ...(flags & TWINS ? { twins: true } : {}),
  ...(flags & NO_HINT ? { noHint: true } : {}),
});

/** Les niveaux 1 à 20 gardent leur tirage d'origine (records et test du jour en dépendent). */
const CLASSIC_LEVELS = 20;

export const LETTRE_LEVELS: readonly LettreLevel[] = [
  L(4, 5, 1, 3, 13),
  L(4, 6, 1, 4, 13),
  L(5, 7, 1, 4, 12),
  L(6, 8, 1, 4, 12),
  L(4, 6, 1, 5, 12),
  L(7, 9, 1, 4, 11),
  L(5, 8, 1, 5, 11),
  L(8, 11, 1, 5, 10),
  L(5, 6, 2, 3, 10),
  L(6, 8, 2, 4, 10),
  L(7, 9, 1, 6, 10),
  L(6, 9, 2, 4, 9),
  L(8, 11, 2, 4, 9),
  L(5, 8, 2, 5, 9),
  L(7, 10, 2, 5, 8),
  L(9, 12, 1, 6, 9),
  L(8, 11, 2, 5, 8),
  L(9, 12, 2, 5, 8),
  L(7, 12, 2, 6, 7),
  L(9, 13, 2, 6, 7),
  // Expert : les leurres sosies, puis 3 lettres manquantes.
  L(7, 10, 2, 6, 7, TWINS),
  L(6, 9, 2, 6, 7, TWINS),
  L(8, 12, 3, 4, 8),
  L(5, 8, 2, 6, 7, TWINS),
  L(8, 12, 3, 5, 7),
  L(7, 11, 3, 5, 7, TWINS),
  L(5, 7, 2, 6, 6, TWINS),
  L(8, 13, 3, 6, 7),
  L(7, 10, 3, 6, 7, TWINS),
  L(6, 9, 3, 6, 6, TWINS),
  // Maître : plus de catégorie en indice.
  L(8, 12, 2, 6, 7, NO_HINT),
  L(8, 13, 3, 6, 7, NO_HINT),
  L(7, 11, 2, 6, 7, NO_HINT | TWINS),
  L(8, 12, 3, 6, 7, NO_HINT),
  L(7, 10, 3, 6, 7, NO_HINT),
  L(8, 12, 3, 6, 7, NO_HINT | TWINS),
  L(7, 11, 3, 6, 6, NO_HINT | TWINS),
  L(9, 13, 3, 6, 6, NO_HINT | TWINS),
  L(7, 10, 3, 6, 6, NO_HINT | TWINS),
  L(7, 9, 3, 6, 6, NO_HINT | TWINS),
  // Légende : 4 lettres manquantes, sans indice, et des mots de plus en plus courts.
  L(9, 13, 4, 5, 7, NO_HINT),
  L(8, 12, 4, 6, 7, NO_HINT),
  L(9, 13, 4, 6, 7, NO_HINT | TWINS),
  L(8, 12, 4, 6, 7, NO_HINT | TWINS),
  L(8, 11, 4, 6, 6, NO_HINT | TWINS),
  L(8, 10, 4, 6, 6, NO_HINT | TWINS),
  L(9, 12, 4, 6, 6, NO_HINT | TWINS),
  L(8, 9, 4, 6, 6, NO_HINT | TWINS),
  L(7, 9, 4, 6, 6, NO_HINT | TWINS),
  L(7, 8, 4, 6, 6, NO_HINT | TWINS),
];

export function lettreLevel(level: number): LettreLevel {
  return pickLevel(LETTRE_LEVELS, level);
}

export function lettreLevelLabel(level: number): string {
  const c = lettreLevel(level);
  return [
    tr(`Mots de ${c.minLength} à ${c.maxLength} lettres`, `Words of ${c.minLength} to ${c.maxLength} letters`),
    c.missing === 1 ? tr('1 lettre manquante', '1 missing letter') : tr(`${c.missing} lettres manquantes`, `${c.missing} missing letters`),
    tr(`${c.options} choix`, `${c.options} choices`),
    c.twins ? tr('leurres sosies', 'look-alike decoys') : null,
    c.noHint ? tr('sans indice', 'no hint') : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Règle affichée à l'intro pour les niveaux à leurres sosies, à 3 ou 4 blancs ou sans indice ;
 * `null` pour les autres, qui gardent la règle classique (une ou deux lettres, catégorie en indice).
 */
export function lettreRule(level: number): string | null {
  const c = lettreLevel(level);
  if (!c.twins && !c.noHint && c.missing <= 2) return null;
  const what =
    c.missing === 1
      ? tr('Il manque une lettre : choisis celle qui complète le mot.', 'One letter is missing: pick the one that completes the word.')
      : c.missing === 2
        ? tr('Il manque deux lettres : choisis la paire qui complète le mot.', 'Two letters are missing: pick the pair that completes the word.')
        : c.missing === 3
          ? tr('Il manque trois lettres : choisis le groupe qui complète le mot.', 'Three letters are missing: pick the set that completes the word.')
          : tr('Il manque quatre lettres : choisis le groupe qui complète le mot.', 'Four letters are missing: pick the set that completes the word.');
  const hint = c.noHint ? tr('Pas de catégorie pour t’aider.', 'No category to help you.') : tr('La catégorie te met sur la piste.', 'The category gives you a hint.');
  const twins = c.twins ? tr(' Méfie-toi des lettres sosies (M ou N, B ou P…).', ' Watch out for look-alike letters (M or N, B or P…).') : '';
  return `${what} ${hint}${twins} ${tr('60 secondes.', '60 seconds.')}`;
}

const VOWELS = 'AEIOUY';
const CONSONANTS = { fr: 'BCDFGLMNPRSTV', en: 'BCDFGHKLMNPRSTVW' };

/** Les consonnes leurres de la langue en cours. */
export function lettreConsonants(): string {
  return byLang(CONSONANTS.fr, CONSONANTS.en, (c) => c.lettre.consonants);
}

export interface LettreWord {
  word: string;
  hint: string;
}

/** Mots sans accent (en majuscules) avec leur catégorie : la seule réserve où l'on pioche. */
const lettreWordsOf = (cats: readonly Category[]): LettreWord[] =>
  cats.flatMap((c) => c.words.filter((w) => /^[a-z]+$/i.test(w)).map((w) => ({ word: w.toUpperCase(), hint: c.label })));

/** La réserve française. */
export const LETTRE_WORDS: readonly LettreWord[] = lettreWordsOf(CATEGORIES);

interface LettreLexicon {
  words: readonly LettreWord[];
  /** Tout ce qu'on sait être un mot : un leurre ne doit jamais en former un. */
  known: ReadonlySet<string>;
  /**
   * Niveaux 21 et plus : les mêmes, plus les mots de 8 lettres des Anagrammes. À part pour que le
   * tirage des niveaux 1 à 20 reste identique.
   */
  knownPlus: ReadonlySet<string>;
}

/** Un mot sans ses accents, ß compris : « PAPÁ » → « PAPA », « GRÖßE » → « GROSSE ». */
const plain = (word: string) => word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'SS');

/** Réserve et mots connus de chaque langue, calculés une fois, à la première partie. */
function lettreLexicon(): LettreLexicon {
  return memoByLang('lettre', () => {
    const cats = categories();
    const known = new Set([...anagramWords(), ...extraKnownWords(), ...cats.flatMap((c) => c.words.map((w) => w.toUpperCase()))]);
    // Autres langues : un leurre ne forme pas non plus un mot connu privé de ses accents (PAPA pour PAPÁ).
    if (extraContent()) for (const word of [...known]) known.add(plain(word));
    return {
      words: cats === CATEGORIES ? LETTRE_WORDS : lettreWordsOf(cats),
      known,
      knownPlus: new Set([...known, ...longAnagramWords()]),
    };
  });
}

/** La réserve de mots dans la langue en cours. */
export function lettreWords(): readonly LettreWord[] {
  return lettreLexicon().words;
}

/** Les mots connus dans la langue en cours (aucun leurre ne doit en former un). */
export function lettreKnownWords(): ReadonlySet<string> {
  return lettreLexicon().known;
}

/** Les mots connus des niveaux 21 et plus : ceux de `lettreKnownWords`, plus les mots de 8 lettres. */
export function lettreKnownWordsPlus(): ReadonlySet<string> {
  return lettreLexicon().knownPlus;
}

/**
 * Lettres sosies, de la même sorte (voyelle pour voyelle) : elles se ressemblent ou se confondent à
 * l'oreille. Un leurre fait d'elles a l'air d'une faute d'orthographe plausible, pas d'un mot au hasard.
 */
export const LOOKALIKES: Readonly<Record<string, string>> = {
  A: 'EO',
  E: 'AI',
  I: 'EY',
  O: 'AU',
  U: 'OI',
  Y: 'I',
  B: 'PD',
  C: 'SKG',
  D: 'TB',
  F: 'VP',
  G: 'JC',
  J: 'G',
  K: 'C',
  L: 'R',
  M: 'N',
  N: 'M',
  P: 'B',
  Q: 'CK',
  R: 'L',
  S: 'CZ',
  T: 'D',
  V: 'FW',
  W: 'V',
  X: 'S',
  Z: 'S',
};

/** Les lettres sosies de la langue en cours (la table commune, sauf si la langue a la sienne). */
export function lettreLookalikes(): Readonly<Record<string, string>> {
  return byLang(LOOKALIKES, LOOKALIKES, (c) => c.lettre.lookalikes ?? LOOKALIKES);
}

export interface LettreQuestion {
  word: string;
  hint: string;
  positions: number[];
  options: string[];
  answer: number;
}

const fill = (word: string, positions: number[], letters: string) => {
  const chars = [...word];
  positions.forEach((p, i) => {
    chars[p] = letters[i];
  });
  return chars.join('');
};

export function generateLettreQuestion(rng: Rng, level: number): LettreQuestion {
  const c = lettreLevel(level);
  const { words, known } = lettreLexicon();
  const consonants = lettreConsonants();
  const pool = words.filter(({ word }) => word.length >= c.minLength && word.length <= c.maxLength);
  for (;;) {
    const { word, hint } = rng.pick(pool);
    const positions = rng.shuffle([...word].map((_, i) => i)).slice(0, c.missing).sort((a, b) => a - b);
    const answer = positions.map((p) => word[p]).join('');
    const options = [answer];
    for (let tries = 0; options.length < c.options && tries < 200; tries++) {
      const letters = positions.map((p, i) => {
        // Une des deux lettres peut rester juste : le leurre n'en est que plus crédible.
        if (c.missing === 2 && i === 0 && rng.chance(0.35)) return word[p];
        return rng.pick([...(VOWELS.includes(word[p]) ? VOWELS : consonants)]);
      });
      const candidate = letters.join('');
      const filled = fill(word, positions, candidate);
      if (options.includes(candidate) || known.has(filled) || hasRudeWord(filled)) continue;
      options.push(candidate);
    }
    if (options.length < c.options) continue;
    const shuffled = rng.shuffle(options);
    return { word, hint, positions, options: shuffled, answer: shuffled.indexOf(answer) };
  }
}

/**
 * Niveaux 21 et plus : les blancs d'un mot donné et leurs leurres, ou `null` si le mot ne s'y prête
 * pas (trop de combinaisons forment un vrai mot).
 *
 * Chaque blanc reçoit un petit jeu de lettres : la bonne et une ou deux autres de la même sorte (des
 * sosies d'abord, aux niveaux qui les annoncent). Les leurres sont tirés parmi toutes les combinaisons
 * de ces jeux : dans chaque colonne, la bonne lettre revient à peu près aussi souvent que les autres.
 * Ni « la seule lettre différente », ni « la lettre la plus fréquente » ne trahit la réponse : il faut
 * reconnaître le mot.
 */
function questionFor(
  rng: Rng,
  c: LettreLevel,
  { word, hint }: LettreWord,
  known: ReadonlySet<string>,
  consonants: string,
  lookalikes: Readonly<Record<string, string>>,
): LettreQuestion | null {
  const positions = rng.shuffle([...word].map((_, i) => i)).slice(0, c.missing).sort((a, b) => a - b);
  const answer = positions.map((p) => word[p]).join('');
  // Lettres par blanc : 1 blanc → tous les choix ; 2 → 3 × 3 ; 3 → 3 × 2 × 2 (le blanc large au hasard) ; 4 → 2 × 2 × 2 × 2.
  const wide = rng.int(0, c.missing - 1);
  const size = (i: number) => (c.missing === 1 ? c.options + 2 : c.missing === 2 ? 3 : c.missing === 3 && i === wide ? 3 : 2);
  const sets = positions.map((p, i) => {
    const letter = word[p];
    const sameKind = [...(VOWELS.includes(letter) ? VOWELS : consonants)].filter((x) => x !== letter);
    const twins = c.twins ? rng.shuffle([...(lookalikes[letter] ?? '')].filter((x) => x !== letter)) : [];
    const others = rng.shuffle(sameKind.filter((x) => !twins.includes(x)));
    return [letter, ...[...twins, ...others].slice(0, size(i) - 1)];
  });
  let combos = [''];
  for (const set of sets) combos = combos.flatMap((prefix) => set.map((x) => prefix + x));
  const decoys = rng.shuffle(
    combos.filter((candidate) => {
      if (candidate === answer) return false;
      const filled = fill(word, positions, candidate);
      return !known.has(filled) && !hasRudeWord(filled);
    }),
  );
  if (decoys.length < c.options - 1) return null;
  const shuffled = rng.shuffle([answer, ...decoys.slice(0, c.options - 1)]);
  return { word, hint, positions, options: shuffled, answer: shuffled.indexOf(answer) };
}

export function generateLettre(rng: Rng, level: number, count = 40): LettreQuestion[] {
  if (clampLevel(level, LETTRE_LEVELS.length) <= CLASSIC_LEVELS) return Array.from({ length: count }, () => generateLettreQuestion(rng, level));
  // Niveaux 21 et plus : on fait le tour de la réserve avant de revoir un mot.
  const c = lettreLevel(level);
  const { words, knownPlus } = lettreLexicon();
  const consonants = lettreConsonants();
  const lookalikes = lettreLookalikes();
  const pool = words.filter(({ word }) => word.length >= c.minLength && word.length <= c.maxLength);
  const questions: LettreQuestion[] = [];
  let queue: LettreWord[] = [];
  for (let attempts = 0; questions.length < count && attempts < count * 20; attempts++) {
    if (!queue.length) queue = rng.shuffle(pool);
    const question = questionFor(rng, c, queue.pop()!, knownPlus, consonants, lookalikes);
    if (question) questions.push(question);
  }
  return questions;
}

export function scoreLettre(correct: number, errors: number, level: number): number {
  return countScore(correct - errors, 0, lettreLevel(level).target);
}
