import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';
import { WORDS } from './words';

export interface AnagramLevel {
  /** Longueurs des mots possibles. */
  lengths: number[];
  /** Lettres en trop (leurres) mêlées aux bonnes. */
  decoys: number;
  durationMs: number;
  /** Mots trouvés pour 100 pts. */
  target: number;
}

const L = (lengths: number[], decoys: number, durationMs: number, target: number): AnagramLevel => ({
  lengths,
  decoys,
  durationMs,
  target,
});

/** Niveau 1 : la spec (mots de 5 lettres, 75 s, 8 mots = 100). */
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
];

export function anagramLevel(level: number): AnagramLevel {
  return pickLevel(ANAGRAM_LEVELS, level);
}

export function anagramLevelLabel(level: number): string {
  const c = anagramLevel(level);
  const [first, second] = c.lengths;
  const lengths =
    c.lengths.length === 1
      ? `${first} lettres`
      : c.lengths.length === 2
        ? `${first} ou ${second} lettres`
        : `${first} à ${c.lengths[c.lengths.length - 1]} lettres`;
  const decoys = c.decoys === 0 ? null : c.decoys === 1 ? '1 leurre' : `${c.decoys} leurres`;
  return [lengths, decoys, secondsLabel(c.durationMs)].filter(Boolean).join(' · ');
}

/** Clé d'anagramme : les lettres triées (« CHIEN » et « NICHE » → « CEHIN »). */
export function letterKey(word: string): string {
  return [...word].sort().join('');
}

export function buildAnagramIndex(words: readonly string[] = WORDS): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const word of words) {
    const key = letterKey(word);
    index.set(key, [...(index.get(key) ?? []), word]);
  }
  return index;
}

const INDEX = buildAnagramIndex();
const WORD_SET = new Set(WORDS);

/** Lettres les plus courantes en français : de bons leurres. */
const DECOY_LETTERS = 'EASITNRULODCMP';

/** Mélange les lettres sans jamais retomber sur un mot valable (ni le mot de départ, ni un autre). */
export function scramble(rng: Rng, word: string, index: Map<string, string[]> = INDEX): string {
  const forbidden = new Set(index.get(letterKey(word)) ?? [word]);
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = rng.shuffle([...word]).join('');
    if (!forbidden.has(candidate)) return candidate;
  }
  // Repli déterministe : décalages successifs jusqu'à sortir des mots valables.
  for (let shift = 1; shift < word.length; shift++) {
    const candidate = word.slice(shift) + word.slice(0, shift);
    if (!forbidden.has(candidate)) return candidate;
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
  const { lengths, decoys } = anagramLevel(level);
  const seen = new Set<string>();
  const deck: AnagramPuzzle[] = [];
  for (const word of rng.shuffle(WORDS.filter((w) => lengths.includes(w.length)))) {
    const key = letterKey(word);
    if (seen.has(key)) continue;
    seen.add(key);
    const letters = [...scramble(rng, word)];
    for (let i = 0; i < decoys; i++) letters.splice(rng.int(0, letters.length), 0, rng.pick([...DECOY_LETTERS]));
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
  return attempt.length === puzzle.word.length && WORD_SET.has(attempt) && fitsIn(attempt, puzzle.letters);
}

export function scoreAnagrammes(found: number, level: number): number {
  return countScore(found, 0, anagramLevel(level).target);
}
