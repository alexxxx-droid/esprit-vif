import { lang, tr, type Lang } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';
import { anagramWords, hasRudeWord, longAnagramWords } from './words';

export interface AnagramLevel {
  /** Longueurs des mots possibles. */
  lengths: number[];
  /** Lettres en trop (leurres) mêlées aux bonnes. */
  decoys: number;
  durationMs: number;
  /** Mots trouvés pour 100 pts. */
  target: number;
  /** Leurres sosies (dès le niveau 23) : ils copient des lettres du mot, au lieu de lettres courantes. */
  twins?: boolean;
}

const L = (lengths: number[], decoys: number, durationMs: number, target: number, twins = false): AnagramLevel =>
  twins ? { lengths, decoys, durationMs, target, twins } : { lengths, decoys, durationMs, target };

const TWINS = true;

/**
 * Niveau 1 : la spec (mots de 5 lettres, 75 s, 8 mots = 100). Expert (21-30) : les mots de 8 lettres,
 * puis les leurres sosies. Maître (31-40) : chrono serré et jusqu'à 4 leurres. Légende (41-50) :
 * des leurres sosies partout, jusqu'à 12 lettres pour un mot de 8, en 40 à 45 s.
 */
export const ANAGRAM_LEVELS: readonly AnagramLevel[] = [
  L([5], 0, 75_000, 8),
  L([5, 6], 0, 75_000, 7),
  L([6], 0, 75_000, 7),
  L([5], 1, 75_000, 7),
  L([6, 7], 0, 75_000, 6),
  L([7], 0, 75_000, 6),
  L([6], 1, 75_000, 6),
  L([5], 2, 75_000, 6),
  L([7], 1, 75_000, 5),
  L([6], 2, 75_000, 5),
  L([5], 1, 60_000, 6),
  L([7], 2, 75_000, 5),
  L([6], 1, 60_000, 5),
  L([5, 6, 7], 1, 60_000, 5),
  L([7], 1, 60_000, 4),
  L([6], 2, 60_000, 4),
  L([5], 3, 60_000, 5),
  L([7], 2, 60_000, 4),
  L([6], 3, 60_000, 4),
  L([7], 3, 60_000, 4),
  // Expert : les mots de 8 lettres, puis les leurres sosies.
  L([7, 8], 2, 60_000, 4),
  L([8], 1, 55_000, 4),
  L([7], 2, 55_000, 4, TWINS),
  L([8], 2, 65_000, 4),
  L([6, 7, 8], 2, 50_000, 4, TWINS),
  L([8], 1, 55_000, 4, TWINS),
  L([7], 3, 60_000, 4, TWINS),
  L([8], 2, 65_000, 4, TWINS),
  L([5, 6, 7, 8], 3, 45_000, 4),
  L([8], 3, 50_000, 3),
  // Maître : chrono serré, jusqu'à 4 leurres.
  L([8], 2, 40_000, 3),
  L([7], 4, 40_000, 3),
  L([8], 2, 45_000, 3, TWINS),
  L([6, 7, 8], 4, 40_000, 3),
  L([8], 3, 50_000, 3, TWINS),
  L([7, 8], 4, 50_000, 3, TWINS),
  L([8], 4, 50_000, 3),
  L([8], 3, 45_000, 3, TWINS),
  L([5, 6, 7, 8], 4, 50_000, 4, TWINS),
  L([8], 4, 50_000, 3, TWINS),
  // Légende : des leurres sosies partout, 40 à 45 s.
  L([7, 8], 3, 45_000, 3, TWINS),
  L([6, 7, 8], 4, 45_000, 3, TWINS),
  L([8], 3, 40_000, 3, TWINS),
  L([7], 4, 40_000, 3, TWINS),
  L([7, 8], 4, 45_000, 3, TWINS),
  L([5, 6, 7, 8], 4, 40_000, 3, TWINS),
  L([8], 4, 45_000, 3, TWINS),
  L([6, 7, 8], 4, 40_000, 3, TWINS),
  L([7, 8], 4, 40_000, 3, TWINS),
  L([8], 4, 40_000, 3, TWINS),
];

export function anagramLevel(level: number): AnagramLevel {
  return pickLevel(ANAGRAM_LEVELS, level);
}

export function anagramLevelLabel(level: number): string {
  const c = anagramLevel(level);
  const [first, second] = c.lengths;
  const last = c.lengths[c.lengths.length - 1];
  const lengths =
    c.lengths.length === 1
      ? tr(`${first} lettres`, `${first} letters`)
      : c.lengths.length === 2
        ? tr(`${first} ou ${second} lettres`, `${first} or ${second} letters`)
        : tr(`${first} à ${last} lettres`, `${first} to ${last} letters`);
  const decoys =
    c.decoys === 0
      ? null
      : c.twins
        ? c.decoys === 1
          ? tr('1 leurre sosie', '1 look-alike decoy')
          : tr(`${c.decoys} leurres sosies`, `${c.decoys} look-alike decoys`)
        : c.decoys === 1
          ? tr('1 leurre', '1 decoy')
          : tr(`${c.decoys} leurres`, `${c.decoys} decoys`);
  return [lengths, decoys, secondsLabel(c.durationMs)].filter(Boolean).join(' · ');
}

/** Clé d'anagramme : les lettres triées (« CHIEN » et « NICHE » → « CEHIN »). */
export function letterKey(word: string): string {
  return [...word].sort().join('');
}

/** Index des anagrammes : par défaut, celui de la liste de la langue en cours. */
export function buildAnagramIndex(words: readonly string[] = anagramWords()): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const word of words) {
    const key = letterKey(word);
    index.set(key, [...(index.get(key) ?? []), word]);
  }
  return index;
}

interface Lexicon {
  words: readonly string[];
  index: Map<string, string[]>;
  set: ReadonlySet<string>;
  /** Lettres les plus courantes de la langue : de bons leurres. */
  decoys: string;
}

/** Lettres les plus courantes, par langue. */
const DECOY_LETTERS: Record<Lang, string> = { fr: 'EASITNRULODCMP', en: 'ETAOINSRHLDCUM' };

/** Liste, index et leurres de chaque langue, calculés une fois, à la première partie. */
const lexicons = new Map<Lang, Lexicon>();

function lexicon(): Lexicon {
  const current = lang();
  let lex = lexicons.get(current);
  if (!lex) {
    // Les mots de 8 lettres viennent après : le tirage des niveaux 1 à 20 (5 à 7 lettres) ne change pas.
    const words = [...anagramWords(), ...longAnagramWords()];
    lex = { words, index: buildAnagramIndex(words), set: new Set(words), decoys: DECOY_LETTERS[current] };
    lexicons.set(current, lex);
  }
  return lex;
}

/** Mélange les lettres sans jamais retomber sur un mot valable (ni le mot de départ, ni un autre). */
export function scramble(rng: Rng, word: string, index: Map<string, string[]> = lexicon().index): string {
  const forbidden = new Set(index.get(letterKey(word)) ?? [word]);
  const acceptable = (candidate: string) => !forbidden.has(candidate) && !hasRudeWord(candidate);
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = rng.shuffle([...word]).join('');
    if (acceptable(candidate)) return candidate;
  }
  // Repli déterministe : décalages successifs jusqu'à sortir des mots valables.
  for (let shift = 1; shift < word.length; shift++) {
    const candidate = word.slice(shift) + word.slice(0, shift);
    if (acceptable(candidate)) return candidate;
  }
  return [...word].reverse().join('');
}

export interface AnagramPuzzle {
  word: string;
  /** Lettres proposées : celles du mot, mélangées, plus d'éventuels leurres. */
  letters: string;
}

/** Suite de mots mélangés pour une partie (sans doublon, et sans deux anagrammes l'une de l'autre). */
export function anagramDeck(rng: Rng, level: number): AnagramPuzzle[] {
  const { lengths, decoys, twins } = anagramLevel(level);
  const lex = lexicon();
  const seen = new Set<string>();
  const deck: AnagramPuzzle[] = [];
  for (const word of rng.shuffle(lex.words.filter((w) => lengths.includes(w.length)))) {
    const key = letterKey(word);
    if (seen.has(key)) continue;
    seen.add(key);
    const scrambled = scramble(rng, word, lex.index);
    // Leurres sosies : des copies de lettres du mot (un A de plus dans JARDIN), impossibles à écarter d'office.
    const decoyPool = [...(twins ? word : lex.decoys)];
    // Un leurre glissé au mauvais endroit ne doit pas former de grossièreté non plus.
    let letters: string[];
    let tries = 0;
    do {
      letters = [...scrambled];
      for (let i = 0; i < decoys; i++) letters.splice(rng.int(0, letters.length), 0, rng.pick(decoyPool));
    } while (hasRudeWord(letters.join('')) && ++tries < 20);
    deck.push({ word, letters: letters.join('') });
  }
  return deck;
}

/** Un mot tient-il dans les lettres proposées (chaque lettre utilisée au plus une fois) ? */
function fitsIn(attempt: string, letters: string): boolean {
  const pool = [...letters];
  for (const ch of attempt) {
    const i = pool.indexOf(ch);
    if (i < 0) return false;
    pool.splice(i, 1);
  }
  return true;
}

/** Toute réponse de la liste, de la bonne longueur et formée des lettres proposées, est acceptée. */
export function isAnagramAnswer(attempt: string, puzzle: AnagramPuzzle): boolean {
  return attempt.length === puzzle.word.length && lexicon().set.has(attempt) && fitsIn(attempt, puzzle.letters);
}

export function scoreAnagrammes(found: number, level: number): number {
  return countScore(found, 0, anagramLevel(level).target);
}
