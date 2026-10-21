import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * Miroir : une grille coupée par un trait ; d'un côté une figure, de l'autre on touche les cases de
 * son reflet. La figure se valide d'elle-même quand on a touché autant de cases qu'elle en compte.
 * Autant de figures que possible en 45 s.
 * Les paliers changent la façon de jouer : une grille de 6 × 6 (Confirmé), un trait parfois
 * horizontal (Expert), la diagonale comme miroir (Maître), le demi-tour : la figure tourne autour
 * du centre, comme une carte à jouer (Légende).
 */

export const MIROIR_DURATION_MS = 45_000;

/** v : trait vertical, h : horizontal, d : diagonale, p : demi-tour autour du centre. */
export type MiroirAxis = 'v' | 'h' | 'd' | 'p';

export interface MiroirLevel {
  size: 4 | 6;
  axes: readonly MiroirAxis[];
  minCells: number;
  maxCells: number;
  /** Figures justes en une partie pour 100 pts. */
  target: number;
}

/** Interpolation d'un palier : de `a` (1er niveau) à `b` (10e). */
const step = (i: number, a: number, b: number) => Math.round(a + ((b - a) * i) / 9);

const lvl = (size: 4 | 6, axes: readonly MiroirAxis[], minCells: number, maxCells: number, target: number): MiroirLevel => ({ size, axes, minCells, maxCells, target });

export const MIROIR_LEVELS: readonly MiroirLevel[] = [
  // Débutant : 4 × 4, un trait vertical.
  ...Array.from({ length: 10 }, (_, i) => lvl(4, ['v'], step(i, 2, 3), step(i, 3, 5), step(i, 11, 9))),
  // Confirmé : 6 × 6.
  ...Array.from({ length: 10 }, (_, i) => lvl(6, ['v'], step(i, 3, 5), step(i, 5, 7), step(i, 9, 8))),
  // Expert : le trait est parfois horizontal.
  ...Array.from({ length: 10 }, (_, i) => lvl(6, ['h', 'v'], step(i, 4, 5), step(i, 6, 8), step(i, 8, 7))),
  // Maître : la diagonale fait miroir.
  ...Array.from({ length: 10 }, (_, i) => lvl(6, ['d', 'd', 'h', 'v'], step(i, 4, 5), step(i, 6, 8), step(i, 7, 6))),
  // Légende : le demi-tour, la figure tourne autour du centre.
  ...Array.from({ length: 10 }, (_, i) => lvl(6, ['p', 'p', 'd', 'h', 'v'], step(i, 5, 6), step(i, 7, 9), step(i, 6, 5))),
];

export function miroirLevel(level: number): MiroirLevel {
  return pickLevel(MIROIR_LEVELS, level);
}

export function miroirLevelLabel(level: number): string {
  const c = miroirLevel(level);
  const has = (a: MiroirAxis) => c.axes.includes(a);
  return [
    `${c.size} × ${c.size}`,
    has('p') ? tr('demi-tour', 'half turn') : has('d') ? tr('en diagonale', 'diagonal') : has('h') ? tr('trait vertical ou horizontal', 'vertical or horizontal line') : null,
    tr(`${c.minCells} à ${c.maxCells} cases`, `${c.minCells} to ${c.maxCells} squares`),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** La règle affichée à l'intro. */
export function miroirRule(level: number): string {
  const c = miroirLevel(level);
  const has = (a: MiroirAxis) => c.axes.includes(a);
  const parts = [
    tr('Complète le reflet : touche les cases de l’autre côté du trait, comme dans un miroir. 45 secondes.', 'Complete the reflection: tap the squares on the other side of the line, as in a mirror. 45 seconds.'),
    has('h') && !has('d') && tr('Le trait peut être horizontal.', 'The line can be horizontal.'),
    has('d') && !has('p') && tr('La diagonale peut faire miroir : le reflet passe de l’autre côté.', 'The diagonal can be the mirror: the reflection crosses to the other side.'),
    has('p') && tr('Demi-tour : la figure tourne autour du centre, comme une carte à jouer.', 'Half turn: the shape spins around the center, like a playing card.'),
  ];
  return parts.filter(Boolean).join(' ');
}

export interface MiroirPuzzle {
  axis: MiroirAxis;
  size: number;
  /** Cases de la figure (index ligne par ligne). */
  shape: number[];
  /** Cases de son reflet, à toucher. */
  answer: number[];
}

/** Le côté de la figure : la moitié gauche, le haut, ou sous la diagonale. */
export function isSource(axis: MiroirAxis, size: number, cell: number): boolean {
  const r = Math.floor(cell / size);
  const c = cell % size;
  if (axis === 'h') return r < size / 2;
  if (axis === 'd') return r > c;
  return c < size / 2;
}

/** Les cases de la diagonale servent de miroir : ni figure, ni reflet. */
export const isAxisCell = (axis: MiroirAxis, size: number, cell: number) => axis === 'd' && Math.floor(cell / size) === cell % size;

/** Le reflet d'une case. */
export function reflect(axis: MiroirAxis, size: number, cell: number): number {
  const r = Math.floor(cell / size);
  const c = cell % size;
  const at = (row: number, col: number) => row * size + col;
  switch (axis) {
    case 'v':
      return at(r, size - 1 - c);
    case 'h':
      return at(size - 1 - r, c);
    case 'd':
      return at(c, r);
    case 'p':
      return at(size - 1 - r, size - 1 - c);
  }
}

export function generateMiroir(rng: Rng, level: number): MiroirPuzzle {
  const c = miroirLevel(level);
  const axis = rng.pick(c.axes);
  const cells = Array.from({ length: c.size * c.size }, (_, i) => i).filter((i) => isSource(axis, c.size, i) && !isAxisCell(axis, c.size, i));
  const shape = rng
    .shuffle(cells)
    .slice(0, rng.int(c.minCells, c.maxCells))
    .sort((a, b) => a - b);
  return { axis, size: c.size, shape, answer: shape.map((i) => reflect(axis, c.size, i)).sort((a, b) => a - b) };
}

/** Figures justes rapportées à l'objectif du niveau. */
export function scoreMiroir(correct: number, level: number): number {
  return countScore(correct, 0, miroirLevel(level).target);
}
