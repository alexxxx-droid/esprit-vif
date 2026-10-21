import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';
import { categories } from './lexique';
import { gridSpelling } from './motsmeles';

/**
 * Pendu express : deviner un mot lettre par lettre, avec sa famille comme indice ; trop d'erreurs et
 * le mot est perdu, un autre arrive. Autant de mots que possible en une minute. Les mots viennent
 * du lexique de la langue du joueur, écrits en capitales sans accents.
 * Les paliers changent la façon de jouer : seule la première lettre est donnée (Confirmé), aucune
 * lettre donnée (Expert), plus d'indice de famille (Maître), des mots longs et trois erreurs
 * permises seulement (Légende).
 */

export const PENDU_DURATION_MS = 60_000;
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export interface PenduLevel {
  minLength: number;
  maxLength: number;
  /** Lettres données d'emblée : la première et la dernière, la première seule, ou aucune. */
  given: 'ends' | 'first' | 'none';
  /** La famille du mot est donnée comme indice. */
  hint: boolean;
  /** Erreurs permises par mot. */
  lives: number;
  /** Mots trouvés en une partie pour 100 pts. */
  target: number;
}

/** Interpolation d'un palier : de `a` (1er niveau) à `b` (10e). */
const step = (i: number, a: number, b: number) => Math.round(a + ((b - a) * i) / 9);

const lvl = (minLength: number, maxLength: number, given: PenduLevel['given'], hint: boolean, lives: number, target: number): PenduLevel => ({
  minLength,
  maxLength,
  given,
  hint,
  lives,
  target,
});

export const PENDU_LEVELS: readonly PenduLevel[] = [
  // Débutant : des mots courts, la première et la dernière lettre données.
  ...Array.from({ length: 10 }, (_, i) => lvl(4, i < 5 ? 5 : 6, 'ends', true, step(i, 7, 6), step(i, 7, 6))),
  // Confirmé : seule la première lettre.
  ...Array.from({ length: 10 }, (_, i) => lvl(5, i < 5 ? 6 : 7, 'first', true, step(i, 6, 5), step(i, 6, 5))),
  // Expert : aucune lettre donnée.
  ...Array.from({ length: 10 }, (_, i) => lvl(5, 7, 'none', true, step(i, 6, 5), step(i, 5, 4))),
  // Maître : plus d'indice de famille.
  ...Array.from({ length: 10 }, (_, i) => lvl(5, 7, 'none', false, step(i, 6, 5), 4)),
  // Légende : des mots longs, trois erreurs permises.
  ...Array.from({ length: 10 }, (_, i) => lvl(7, i < 5 ? 9 : 10, 'none', false, 3, step(i, 4, 3))),
];

export function penduLevel(level: number): PenduLevel {
  return pickLevel(PENDU_LEVELS, level);
}

export function penduLevelLabel(level: number): string {
  const c = penduLevel(level);
  return [
    tr(`mots de ${c.minLength} à ${c.maxLength} lettres`, `${c.minLength} to ${c.maxLength} letters`),
    c.given === 'ends' ? tr('première et dernière lettres', 'first and last letters') : c.given === 'first' ? tr('première lettre', 'first letter') : null,
    !c.hint && tr('sans indice', 'no hint'),
    tr(`${c.lives} erreurs permises`, `${c.lives} mistakes allowed`),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** La règle affichée à l'intro. */
export function penduRule(level: number): string {
  const c = penduLevel(level);
  const parts = [
    c.hint
      ? tr('Devine le mot lettre par lettre : sa famille te met sur la piste.', 'Guess the word letter by letter: its family gives you a clue.')
      : tr('Devine le mot lettre par lettre, sans indice.', 'Guess the word letter by letter, with no clue.'),
    c.given === 'ends' && tr('La première et la dernière lettre sont données.', 'The first and last letters are given.'),
    c.given === 'first' && tr('La première lettre est donnée.', 'The first letter is given.'),
    tr(`${c.lives} erreurs et le mot est perdu. Une minute.`, `${c.lives} mistakes and the word is lost. One minute.`),
  ];
  return parts.filter(Boolean).join(' ');
}

export interface PenduWord {
  /** Le mot du lexique, tel qu'on le montre à la fin. */
  word: string;
  /** Sa graphie à deviner : capitales sans accents. */
  letters: string;
  /** « Fruit » : la famille, pour l'indice. */
  family: string;
  /** Les lettres données d'emblée. */
  given: string[];
}

/** Les mots d'une partie : jamais deux fois le même, ni deux de suite de la même famille. */
export function generatePendu(rng: Rng, level: number, count = 30): PenduWord[] {
  const c = penduLevel(level);
  const pool = categories().flatMap((cat) =>
    [...new Set(cat.words)]
      .map((word) => ({ word, letters: gridSpelling(word), family: cat.label }))
      .filter((w) => /^[A-Z]+$/.test(w.letters) && w.letters.length >= c.minLength && w.letters.length <= c.maxLength),
  );
  const words: PenduWord[] = [];
  const used = new Set<string>();
  for (const w of rng.shuffle(pool)) {
    if (used.has(w.letters) || words[words.length - 1]?.family === w.family) continue;
    used.add(w.letters);
    const given = c.given === 'ends' ? [w.letters[0], w.letters[w.letters.length - 1]] : c.given === 'first' ? [w.letters[0]] : [];
    // Les lettres données ne dévoilent jamais plus de la moitié du mot (YOYO serait déjà trouvé).
    if ([...w.letters].filter((l) => given.includes(l)).length > w.letters.length / 2) continue;
    words.push({ ...w, given });
    if (words.length === count) break;
  }
  return words;
}

/** Le mot est-il trouvé avec ces lettres ? */
export const solved = (w: PenduWord, letters: readonly string[]) => [...w.letters].every((l) => letters.includes(l) || w.given.includes(l));

/** Mots trouvés rapportés à l'objectif du niveau. */
export function scorePendu(found: number, level: number): number {
  return countScore(found, 0, penduLevel(level).target);
}
