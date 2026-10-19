import type { Rng } from '../rng';
import { clampLevel, countScore } from '../scoring';
import { WORDS } from './words';

export const ANAGRAM_DURATION_MS = 75_000;
export const ANAGRAM_MAX_LEVEL = 3;

/** Longueur des mots selon le niveau. */
export const ANAGRAM_LENGTHS: Record<number, readonly number[]> = { 1: [5], 2: [5, 6], 3: [6, 7] };

/** Mots trouvés pour 100 pts : 8 au niveau 1 (spec), moins quand les mots s'allongent. */
export const ANAGRAM_TARGET: Record<number, number> = { 1: 8, 2: 7, 3: 6 };

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
  letters: string;
}

/** Suite de mots mélangés pour une partie (sans doublon, et sans deux anagrammes l'une de l'autre). */
export function anagramDeck(rng: Rng, level: number): AnagramPuzzle[] {
  const lengths = ANAGRAM_LENGTHS[clampLevel(level, ANAGRAM_MAX_LEVEL)];
  const seen = new Set<string>();
  const deck: AnagramPuzzle[] = [];
  for (const word of rng.shuffle(WORDS.filter((w) => lengths.includes(w.length)))) {
    const key = letterKey(word);
    if (seen.has(key)) continue;
    seen.add(key);
    deck.push({ word, letters: scramble(rng, word) });
  }
  return deck;
}

/** Toute réponse de la liste formée des mêmes lettres est acceptée. */
export function isAnagramAnswer(attempt: string, word: string, index: Map<string, string[]> = INDEX): boolean {
  return letterKey(attempt) === letterKey(word) && (index.get(letterKey(word)) ?? [word]).includes(attempt);
}

export function scoreAnagrammes(found: number, level: number): number {
  return countScore(found, 0, ANAGRAM_TARGET[clampLevel(level, ANAGRAM_MAX_LEVEL)]);
}
