import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * Taquin express : remettre les tuiles dans l'ordre en les faisant glisser dans la case vide. Chaque
 * grille n'est mélangée que de quelques coups (on la défait en marche arrière : toujours faisable),
 * pour tenir dans la minute. Autant de grilles que possible.
 * Les paliers changent la façon de jouer : plus mélangé (Confirmé), une grille de 4 × 4 (Expert),
 * des coups comptés : trop de coups et la grille est perdue (Maître), les deux ensemble (Légende).
 */

export const TAQUIN_DURATION_MS = 60_000;

export interface TaquinLevel {
  size: 3 | 4;
  /** Coups de mélange (sans revenir sur une position déjà vue). */
  scramble: number;
  /** Coups permis en plus du mélange (0 : pas de limite). */
  margin: number;
  /** Grilles finies en une partie pour 100 pts. */
  target: number;
}

/** Interpolation d'un palier : de `a` (1er niveau) à `b` (10e). */
const step = (i: number, a: number, b: number) => Math.round(a + ((b - a) * i) / 9);

const lvl = (size: 3 | 4, scramble: number, margin: number, target: number): TaquinLevel => ({ size, scramble, margin, target });

export const TAQUIN_LEVELS: readonly TaquinLevel[] = [
  // Débutant : 3 × 3, à peine mélangé.
  ...Array.from({ length: 10 }, (_, i) => lvl(3, step(i, 3, 6), 0, step(i, 8, 6))),
  // Confirmé : plus mélangé.
  ...Array.from({ length: 10 }, (_, i) => lvl(3, step(i, 7, 10), 0, step(i, 6, 5))),
  // Expert : 4 × 4.
  ...Array.from({ length: 10 }, (_, i) => lvl(4, step(i, 5, 9), 0, step(i, 6, 4))),
  // Maître : des coups comptés.
  ...Array.from({ length: 10 }, (_, i) => lvl(3, step(i, 7, 11), step(i, 6, 2), step(i, 5, 4))),
  // Légende : 4 × 4 et coups comptés.
  ...Array.from({ length: 10 }, (_, i) => lvl(4, step(i, 7, 11), step(i, 6, 2), step(i, 4, 3))),
];

export function taquinLevel(level: number): TaquinLevel {
  return pickLevel(TAQUIN_LEVELS, level);
}

/** Coups permis pour une grille (`null` : pas de limite). */
export const allowedMoves = (c: TaquinLevel) => (c.margin ? c.scramble + c.margin : null);

export function taquinLevelLabel(level: number): string {
  const c = taquinLevel(level);
  const allowed = allowedMoves(c);
  return [
    `${c.size} × ${c.size}`,
    tr(`mélangé en ${c.scramble} coups`, `${c.scramble}-move shuffle`),
    allowed && tr(`${allowed} coups permis`, `${allowed} moves allowed`),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** La règle affichée à l'intro. */
export function taquinRule(level: number): string {
  const c = taquinLevel(level);
  const parts = [
    tr(
      'Remets les tuiles dans l’ordre : touche une tuile voisine de la case vide pour l’y faire glisser. Une grille finie, la suivante arrive. Une minute.',
      'Put the tiles back in order: tap a tile next to the empty square to slide it in. Finish a grid and the next one appears. One minute.',
    ),
    c.margin > 0 && tr('Les coups sont comptés : trop de coups et la grille est perdue.', 'Moves are counted: too many and the grid is lost.'),
  ];
  return parts.filter(Boolean).join(' ');
}

/** Une grille : la tuile de chaque case (0 : la case vide), ligne par ligne. */
export type Board = number[];

export const solvedBoard = (size: number): Board => [...Array.from({ length: size * size - 1 }, (_, i) => i + 1), 0];
export const isSolved = (b: Board) => b.every((v, i) => v === (i === b.length - 1 ? 0 : i + 1));

/** Les cases voisines (haut, bas, gauche, droite). */
export function neighbours(size: number, cell: number): number[] {
  const r = Math.floor(cell / size);
  const c = cell % size;
  return [
    [r - 1, c],
    [r + 1, c],
    [r, c - 1],
    [r, c + 1],
  ]
    .filter(([y, x]) => y >= 0 && y < size && x >= 0 && x < size)
    .map(([y, x]) => y * size + x);
}

/** Fait glisser la tuile de la case `cell` dans la case vide, si elles se touchent ; sinon `null`. */
export function slide(board: Board, size: number, cell: number): Board | null {
  const empty = board.indexOf(0);
  if (!neighbours(size, empty).includes(cell)) return null;
  const next = [...board];
  [next[empty], next[cell]] = [next[cell], 0];
  return next;
}

/** Une grille mélangée de `scramble` coups depuis la grille rangée, sans repasser par une même position. */
export function generateTaquin(rng: Rng, level: number): Board {
  const c = taquinLevel(level);
  for (;;) {
    let board = solvedBoard(c.size);
    const seen = new Set([board.join()]);
    for (let k = 0; k < c.scramble; k++) {
      const options = neighbours(c.size, board.indexOf(0))
        .map((cell) => slide(board, c.size, cell)!)
        .filter((b) => !seen.has(b.join()));
      if (!options.length) break;
      board = rng.pick(options);
      seen.add(board.join());
    }
    if (seen.size === c.scramble + 1 && !isSolved(board)) return board;
  }
}

/** Grilles finies rapportées à l'objectif du niveau. */
export function scoreTaquin(solved: number, level: number): number {
  return countScore(solved, 0, taquinLevel(level).target);
}
