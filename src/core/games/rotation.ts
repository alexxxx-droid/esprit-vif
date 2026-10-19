import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * Rotation mentale : retrouver la pièce du modèle, tournée, parmi d'autres pièces
 * puis parmi ses propres reflets dans un miroir (le vrai piège).
 */

export const ROTATION_DURATION_MS = 60_000;

/** Un carré de la pièce : [colonne, ligne], ligne vers le bas. */
export type Cell = readonly [number, number];
export type Piece = readonly Cell[];

export interface RotationLevel {
  /** Nombre de carrés de chaque pièce. */
  size: number;
  /** Propositions à l'écran. */
  options: number;
  /** Combien de propositions sont des reflets du modèle (les autres : d'autres pièces). */
  mirrors: number;
  /** Bonnes réponses en 60 s pour 100 pts (une erreur en retire une). */
  target: number;
}

const L = (size: number, options: number, mirrors: number, target: number): RotationLevel => ({ size, options, mirrors, target });

export const ROTATION_LEVELS: readonly RotationLevel[] = [
  L(4, 2, 0, 14),
  L(4, 3, 0, 14),
  L(4, 2, 1, 13),
  L(4, 3, 1, 13),
  L(5, 3, 0, 12),
  L(4, 3, 2, 12),
  L(5, 3, 1, 12),
  L(5, 4, 1, 11),
  L(5, 3, 2, 11),
  L(5, 4, 2, 11),
  L(6, 3, 1, 10),
  L(5, 4, 3, 10),
  L(6, 4, 1, 10),
  L(6, 3, 2, 9),
  L(6, 4, 2, 9),
  L(7, 3, 2, 9),
  L(6, 4, 3, 8),
  L(7, 4, 2, 8),
  L(7, 4, 3, 8),
  L(8, 4, 3, 7),
];

export function rotationLevel(level: number): RotationLevel {
  return pickLevel(ROTATION_LEVELS, level);
}

export function rotationLevelLabel(level: number): string {
  const c = rotationLevel(level);
  const mirrors = c.mirrors === 0 ? 'sans miroir' : c.mirrors === 1 ? '1 reflet piège' : `${c.mirrors} reflets pièges`;
  return `Pièces de ${c.size} carrés · ${c.options} choix · ${mirrors}`;
}

/** Ramène la pièce dans le coin haut-gauche, carrés triés : deux pièces identiques ont la même forme normalisée. */
export function normalize(piece: Piece): Piece {
  const minX = Math.min(...piece.map(([x]) => x));
  const minY = Math.min(...piece.map(([, y]) => y));
  return piece.map(([x, y]) => [x - minX, y - minY] as const).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

const pieceKey = (piece: Piece) =>
  normalize(piece)
    .map(([x, y]) => `${x},${y}`)
    .join(' ');

/** Quarts de tour dans le sens des aiguilles d'une montre. */
export function rotate(piece: Piece, quarterTurns: number): Piece {
  let out = piece;
  for (let i = 0; i < ((quarterTurns % 4) + 4) % 4; i++) out = out.map(([x, y]) => [-y, x] as const);
  return normalize(out);
}

export function mirror(piece: Piece): Piece {
  return normalize(piece.map(([x, y]) => [-x, y] as const));
}

const rotationKeys = (piece: Piece) => [0, 1, 2, 3].map((t) => pieceKey(rotate(piece, t)));

export function sameUpToRotation(a: Piece, b: Piece): boolean {
  return rotationKeys(a).includes(pieceKey(b));
}

/** Même pièce, à une rotation ou un retournement près. */
export function congruent(a: Piece, b: Piece): boolean {
  return sameUpToRotation(a, b) || sameUpToRotation(mirror(a), b);
}

export function pieceSize(piece: Piece): { width: number; height: number } {
  return { width: Math.max(...piece.map(([x]) => x)) + 1, height: Math.max(...piece.map(([, y]) => y)) + 1 };
}

const STEPS: readonly Cell[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Plus grande longueur d'une pièce : toutes les pièces d'une question se dessinent à la même échelle. */
export function pieceSpan(size: number): number {
  return size <= 6 ? 4 : 5;
}

/** Pièce d'un seul tenant, pas trop étirée pour rester lisible sur un téléphone. */
export function randomPiece(rng: Rng, size: number): Piece {
  const maxSpan = pieceSpan(size);
  for (;;) {
    const cells: Cell[] = [[0, 0]];
    while (cells.length < size) {
      const [x, y] = rng.pick(cells);
      const [dx, dy] = rng.pick(STEPS);
      if (!cells.some(([a, b]) => a === x + dx && b === y + dy)) cells.push([x + dx, y + dy]);
    }
    const piece = normalize(cells);
    const { width, height } = pieceSize(piece);
    if (Math.max(width, height) <= maxSpan) return piece;
  }
}

export type OptionKind = 'same' | 'mirror' | 'other';

export interface RotationPuzzle {
  model: Piece;
  options: Piece[];
  kinds: OptionKind[];
  answer: number;
}

/** Une pièce sans symétrie de rotation ni de miroir : ses reflets ne peuvent jamais se confondre avec elle. */
function isAsymmetric(piece: Piece): boolean {
  return new Set(rotationKeys(piece)).size === 4 && !sameUpToRotation(piece, mirror(piece));
}

export function generateRotationPuzzle(rng: Rng, level: number): RotationPuzzle {
  const c = rotationLevel(level);
  // Un carré plein ne change pas en tournant : il faut au moins deux allures différentes.
  let model = randomPiece(rng, c.size);
  while (c.mirrors > 0 ? !isAsymmetric(model) : new Set(rotationKeys(model)).size < 2) model = randomPiece(rng, c.size);
  const turns = rng.shuffle([1, 2, 3]).find((t) => pieceKey(rotate(model, t)) !== pieceKey(model)) ?? 1;
  const items: { piece: Piece; kind: OptionKind }[] = [{ piece: rotate(model, turns), kind: 'same' }];
  for (const turns of rng.shuffle([0, 1, 2, 3]).slice(0, c.mirrors)) items.push({ piece: rotate(mirror(model), turns), kind: 'mirror' });
  const others: Piece[] = [];
  while (items.length < c.options) {
    const other = randomPiece(rng, c.size);
    if (congruent(other, model) || others.some((o) => congruent(o, other))) continue;
    others.push(other);
    items.push({ piece: rotate(other, rng.int(0, 3)), kind: 'other' });
  }
  const shuffled = rng.shuffle(items);
  return {
    model,
    options: shuffled.map((item) => item.piece),
    kinds: shuffled.map((item) => item.kind),
    answer: shuffled.findIndex((item) => item.kind === 'same'),
  };
}

/** De quoi tenir 60 s, même en répondant très vite. */
export function generateRotation(rng: Rng, level: number, count = 40): RotationPuzzle[] {
  return Array.from({ length: count }, () => generateRotationPuzzle(rng, level));
}

export function scoreRotation(correct: number, errors: number, level: number): number {
  return countScore(correct - errors, 0, rotationLevel(level).target);
}
