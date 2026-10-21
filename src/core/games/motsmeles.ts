import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';
import { categories } from './lexique';

/**
 * Mots mêlés : une grille de lettres cache quelques mots d'une même famille ; on touche la première
 * lettre puis la dernière d'un mot (dans un sens ou dans l'autre). Une grille finie, la suivante
 * arrive ; autant de mots que possible en 45 s. Les mots viennent du lexique de la langue du joueur ;
 * dans la grille, ils s'écrivent en capitales sans accents.
 * Les paliers changent la façon de jouer : des mots en diagonale (Confirmé), des mots à l'envers
 * (Expert), la liste cachée : seulement la famille et le nombre de mots (Maître), une grille de
 * 8 × 8 dans les huit directions (Légende).
 */

export const MELES_DURATION_MS = 45_000;

/** Un pas dans la grille : [ligne, colonne]. */
export type Direction = readonly [number, number];
const E: Direction = [0, 1];
const S: Direction = [1, 0];
const SE: Direction = [1, 1];
const NE: Direction = [-1, 1];
const W: Direction = [0, -1];
const N: Direction = [-1, 0];
const NW: Direction = [-1, -1];
const SW: Direction = [1, -1];

export interface MelesLevel {
  size: number;
  /** Mots cachés par grille. */
  words: number;
  minLength: number;
  maxLength: number;
  directions: readonly Direction[];
  /** La liste des mots n'est pas montrée : seulement leur famille et leur nombre. */
  hiddenList: boolean;
  /** Mots trouvés en une partie pour 100 pts. */
  target: number;
}

/** Interpolation d'un palier : de `a` (1er niveau) à `b` (10e). */
const step = (i: number, a: number, b: number) => Math.round(a + ((b - a) * i) / 9);

const lvl = (size: number, words: number, minLength: number, maxLength: number, directions: readonly Direction[], hiddenList: boolean, target: number): MelesLevel => ({
  size,
  words,
  minLength,
  maxLength,
  directions,
  hiddenList,
  target,
});

export const MELES_LEVELS: readonly MelesLevel[] = [
  // Débutant : 6 × 6, de gauche à droite et de haut en bas.
  ...Array.from({ length: 10 }, (_, i) => lvl(6, 3, 3, i < 5 ? 5 : 6, [E, S], false, step(i, 9, 8))),
  // Confirmé : 7 × 7, des mots en diagonale.
  ...Array.from({ length: 10 }, (_, i) => lvl(7, i < 5 ? 3 : 4, 3, 6, [E, S, SE, NE], false, step(i, 8, 7))),
  // Expert : des mots à l'envers.
  ...Array.from({ length: 10 }, (_, i) => lvl(7, 4, 4, i < 5 ? 6 : 7, [E, S, SE, W, N], false, step(i, 7, 6))),
  // Maître : la liste est cachée, seulement la famille et le nombre de mots.
  ...Array.from({ length: 10 }, (_, i) => lvl(7, i < 5 ? 4 : 5, 4, i < 5 ? 6 : 7, [E, S, SE, NE, W, N], true, step(i, 6, 5))),
  // Légende : 8 × 8, dans les huit directions.
  ...Array.from({ length: 10 }, (_, i) => lvl(8, i < 5 ? 4 : 5, 4, 8, [E, S, SE, NE, W, N, NW, SW], true, step(i, 5, 4))),
];

export function melesLevel(level: number): MelesLevel {
  return pickLevel(MELES_LEVELS, level);
}

export function melesLevelLabel(level: number): string {
  const c = melesLevel(level);
  const reversed = c.directions.includes(W);
  return [
    `${c.size} × ${c.size}`,
    tr(`${c.words} mots`, `${c.words} words`),
    c.directions.length === 8
      ? tr('dans tous les sens', 'every direction')
      : reversed
        ? tr('à l’envers aussi', 'backwards too')
        : c.directions.includes(SE)
          ? tr('en diagonale', 'diagonal')
          : null,
    c.hiddenList && tr('liste cachée', 'hidden list'),
    tr(`${c.minLength} à ${c.maxLength} lettres`, `${c.minLength} to ${c.maxLength} letters`),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** La règle affichée à l'intro. */
export function melesRule(level: number): string {
  const c = melesLevel(level);
  const reversed = c.directions.includes(W);
  const parts = [
    tr(
      'Retrouve les mots cachés : touche la première lettre, puis la dernière. Une grille finie, la suivante arrive. 45 secondes.',
      'Find the hidden words: tap the first letter, then the last. Finish a grid and the next one appears. 45 seconds.',
    ),
    c.directions.includes(SE) && !reversed && tr('Des mots se cachent en diagonale.', 'Some words hide diagonally.'),
    reversed && c.directions.length < 8 && tr('Des mots s’écrivent à l’envers.', 'Some words are written backwards.'),
    c.directions.length === 8 && tr('Les mots vont dans tous les sens.', 'Words run in every direction.'),
    c.hiddenList && tr('La liste est cachée : tu ne connais que la famille des mots et leur nombre.', 'The list is hidden: you only know the words’ family and how many there are.'),
  ];
  return parts.filter(Boolean).join(' ');
}

/** Un mot tel qu'il s'écrit dans la grille : capitales, sans accents ni ligatures. */
export function gridSpelling(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .toUpperCase();
}

export interface MelesWord {
  /** Le mot du lexique, tel qu'on l'affiche dans la liste. */
  word: string;
  /** Sa graphie dans la grille. */
  letters: string;
  /** Ses cases, de la première lettre à la dernière. */
  cells: number[];
}

export interface MelesGrid {
  size: number;
  letters: string[];
  /** « des fruits » : la famille des mots, pour la liste cachée. */
  family: string;
  words: MelesWord[];
}

/** Les cases d'une droite de `length` cases depuis `start`, ou `null` si elle sort de la grille. */
export function lineCells(size: number, start: number, [dr, dc]: Direction, length: number): number[] | null {
  const r0 = Math.floor(start / size);
  const c0 = start % size;
  const cells: number[] = [];
  for (let k = 0; k < length; k++) {
    const r = r0 + dr * k;
    const c = c0 + dc * k;
    if (r < 0 || r >= size || c < 0 || c >= size) return null;
    cells.push(r * size + c);
  }
  return cells;
}

/** Les cases entre deux cases alignées (en ligne, en colonne ou en diagonale), bornes comprises ; `null` sinon. */
export function segment(size: number, from: number, to: number): number[] | null {
  const dr = Math.floor(to / size) - Math.floor(from / size);
  const dc = (to % size) - (from % size);
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const length = Math.max(Math.abs(dr), Math.abs(dc)) + 1;
  return lineCells(size, from, [Math.sign(dr), Math.sign(dc)], length);
}

const ALL_DIRECTIONS: readonly Direction[] = [E, S, SE, NE, W, N, NW, SW];

/** Combien de fois un mot se lit dans la grille, dans les huit directions. */
export function occurrences(grid: Pick<MelesGrid, 'size' | 'letters'>, letters: string): number {
  let count = 0;
  for (let start = 0; start < grid.size * grid.size; start++) {
    for (const d of ALL_DIRECTIONS) {
      const cells = lineCells(grid.size, start, d, letters.length);
      if (cells && cells.every((cell, k) => grid.letters[cell] === letters[k])) count++;
    }
  }
  // Un palindrome se lit deux fois sur la même droite.
  return letters === [...letters].reverse().join('') ? count / 2 : count;
}

export function generateMeles(rng: Rng, level: number): MelesGrid {
  const c = melesLevel(level);
  const cells = c.size * c.size;
  for (;;) {
    const category = rng.pick(categories());
    const pool = rng.shuffle(
      [...new Set(category.words)].filter((w) => {
        const letters = gridSpelling(w);
        return /^[A-Z]+$/.test(letters) && letters.length >= c.minLength && letters.length <= c.maxLength;
      }),
    );
    const chosen: string[] = [];
    for (const w of pool) {
      const letters = gridSpelling(w);
      // Pas un mot dans un autre (CHAT dans CHATON), ni deux mots qui s'écrivent pareil sans accents.
      if (chosen.some((o) => gridSpelling(o).includes(letters) || letters.includes(gridSpelling(o)))) continue;
      chosen.push(w);
      if (chosen.length === c.words) break;
    }
    if (chosen.length < c.words) continue;
    // Les plus longs d'abord : ils sont les plus durs à placer.
    chosen.sort((a, b) => gridSpelling(b).length - gridSpelling(a).length);
    const grid: (string | null)[] = Array.from({ length: cells }, () => null);
    const words: MelesWord[] = [];
    for (const word of chosen) {
      const letters = gridSpelling(word);
      for (let attempt = 0; attempt < 120; attempt++) {
        const line = lineCells(c.size, rng.int(0, cells - 1), rng.pick(c.directions), letters.length);
        if (!line || !line.every((cell, k) => grid[cell] === null || grid[cell] === letters[k])) continue;
        line.forEach((cell, k) => (grid[cell] = letters[k]));
        words.push({ word, letters, cells: line });
        break;
      }
    }
    if (words.length < c.words) continue;
    // Les cases libres prennent des lettres des mots de la famille : la grille ne se devine pas à l'œil.
    const filler = category.words.map(gridSpelling).join('').replace(/[^A-Z]/g, '');
    for (let attempt = 0; attempt < 20; attempt++) {
      const letters = grid.map((l) => l ?? filler[rng.int(0, filler.length - 1)]);
      const candidate = { size: c.size, letters };
      // Chaque mot se lit une seule fois : pas de deuxième exemplaire né du remplissage.
      if (words.every((w) => occurrences(candidate, w.letters) === 1)) {
        words.sort((a, b) => a.word.localeCompare(b.word));
        return { size: c.size, letters, family: category.plural, words };
      }
    }
  }
}

/** Mots trouvés rapportés à l'objectif du niveau. */
export function scoreMeles(found: number, level: number): number {
  return countScore(found, 0, melesLevel(level).target);
}
