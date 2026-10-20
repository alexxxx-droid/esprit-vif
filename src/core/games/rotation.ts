import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';
import { congruentSolids, mirrorSolid, orientations, picture, randomSolid, type Solid } from './cubes';

/**
 * Rotation mentale : retrouver la pièce du modèle, tournée, parmi d'autres pièces
 * puis parmi ses propres reflets dans un miroir (le vrai piège).
 * Expert (21-30) : pièces de 9 et 10 carrés, jusqu'à 6 choix, propositions penchées (angle libre).
 * Maître et Légende (31-50) : pièces en relief, des cubes tournés dans l'espace.
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
  /** Propositions penchées d'un angle libre : on ne peut plus les comparer case par case. */
  tilt?: true;
  /** Pièces en relief : `size` cubes, tournés dans l'espace. */
  solid?: true;
}

const L = (size: number, options: number, mirrors: number, target: number): RotationLevel => ({ size, options, mirrors, target });
const T = (size: number, options: number, mirrors: number, target: number): RotationLevel => ({ ...L(size, options, mirrors, target), tilt: true });
const S = (size: number, options: number, mirrors: number, target: number): RotationLevel => ({ ...L(size, options, mirrors, target), solid: true });

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
  // Expert : de plus grandes pièces, plus de choix, puis des propositions penchées.
  L(9, 4, 2, 7),
  L(9, 4, 3, 7),
  L(8, 5, 3, 7),
  L(9, 5, 3, 6),
  T(8, 4, 2, 6),
  T(9, 4, 3, 6),
  L(10, 5, 4, 6),
  T(9, 5, 3, 5),
  T(10, 5, 4, 5),
  T(10, 6, 4, 5),
  // Maître : les pièces en relief.
  S(6, 3, 1, 7),
  S(6, 3, 2, 7),
  S(6, 4, 2, 6),
  S(7, 3, 1, 6),
  S(7, 3, 2, 6),
  S(7, 4, 2, 5),
  S(7, 4, 3, 5),
  S(8, 3, 2, 5),
  S(8, 4, 2, 5),
  S(8, 4, 3, 5),
  // Légende : plus de cubes, plus de choix, presque que des reflets.
  S(8, 5, 3, 5),
  S(8, 5, 4, 4),
  S(9, 4, 3, 4),
  S(9, 5, 3, 4),
  S(9, 5, 4, 4),
  S(9, 6, 4, 4),
  S(10, 5, 3, 4),
  S(10, 5, 4, 4),
  S(10, 6, 4, 4),
  S(10, 6, 5, 4),
];

export function rotationLevel(level: number): RotationLevel {
  return pickLevel(ROTATION_LEVELS, level);
}

export function rotationLevelLabel(level: number): string {
  const c = rotationLevel(level);
  const mirrors =
    c.mirrors === 0
      ? tr('sans miroir', 'no mirror images')
      : c.mirrors === 1
        ? tr('1 reflet piège', '1 mirror-image trap')
        : tr(`${c.mirrors} reflets pièges`, `${c.mirrors} mirror-image traps`);
  if (c.solid) return tr(`Pièces en relief de ${c.size} cubes · ${c.options} choix · ${mirrors}`, `3D pieces of ${c.size} cubes · ${c.options} choices · ${mirrors}`);
  const tilt = c.tilt ? tr(' · pièces penchées', ' · tilted pieces') : '';
  return tr(`Pièces de ${c.size} carrés · ${c.options} choix · ${mirrors}${tilt}`, `${c.size}-square pieces · ${c.options} choices · ${mirrors}${tilt}`);
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

/** Pièces plates (niveaux 1 à 30). */
export interface FlatPuzzle {
  model: Piece;
  options: Piece[];
  kinds: OptionKind[];
  answer: number;
  /** Propositions penchées : angle de chacune, en degrés (sens des aiguilles d'une montre). */
  tilts?: number[];
  solid?: undefined;
}

/** Pièces en relief (niveaux 31 à 50). */
export interface SolidPuzzle {
  solid: true;
  model: Solid;
  options: Solid[];
  kinds: OptionKind[];
  answer: number;
}

export type RotationPuzzle = FlatPuzzle | SolidPuzzle;

/** Angles des pièces penchées : jamais droits, pour qu'on ne puisse pas comparer case par case. */
export const TILTS: readonly number[] = [-75, -60, -45, -30, -15, 15, 30, 45, 60, 75];

/** Une pièce sans symétrie de rotation ni de miroir : ses reflets ne peuvent jamais se confondre avec elle. */
function isAsymmetric(piece: Piece): boolean {
  return new Set(rotationKeys(piece)).size === 4 && !sameUpToRotation(piece, mirror(piece));
}

/**
 * Pièces en relief. Le dessin isométrique doit être sans ambiguïté : chaque cube montre au moins une
 * face entière, la bonne proposition ne peut pas se lire comme un reflet du modèle (ni l'inverse), et
 * deux propositions ne se dessinent jamais pareil.
 */
function generateSolidPuzzle(rng: Rng, c: RotationLevel): SolidPuzzle {
  const looks = new Map<Solid, { key: string; readable: boolean }>();
  const look = (s: Solid) => {
    let p = looks.get(s);
    if (!p) {
      const { key, visible } = picture(s);
      p = { key, readable: visible.every((n) => n >= 2) };
      looks.set(s, p);
    }
    return p;
  };
  const drawing = (s: Solid) => look(s).key;
  const readable = (s: Solid) => look(s).readable;
  for (;;) {
    const shape = randomSolid(rng, c.size);
    const views = orientations(shape);
    const mirrorViews = orientations(mirrorSolid(shape));
    const lookLikeModel = new Set(views.map(drawing));
    const lookLikeMirror = new Set(mirrorViews.map(drawing));
    // Le modèle : une allure lisible qui ne se confond avec aucune allure de son reflet.
    const models = views.filter((v) => readable(v) && !lookLikeMirror.has(drawing(v)));
    if (!models.length) continue;
    const model = rng.pick(models);
    const same = views.filter((v) => drawing(v) !== drawing(model) && readable(v) && !lookLikeMirror.has(drawing(v)));
    const mirrors = mirrorViews.filter((v) => readable(v) && !lookLikeModel.has(drawing(v)));
    if (!same.length || mirrors.length < c.mirrors) continue;
    const items: { piece: Solid; kind: OptionKind }[] = [{ piece: rng.pick(same), kind: 'same' }];
    for (const m of rng.shuffle(mirrors).slice(0, c.mirrors)) items.push({ piece: m, kind: 'mirror' });
    const others: Solid[] = [];
    for (let tries = 0; items.length < c.options && tries < 40; tries++) {
      const other = randomSolid(rng, c.size, false);
      if (congruentSolids(other, shape) || others.some((o) => congruentSolids(o, other))) continue;
      const looks = orientations(other).filter((v) => readable(v) && !lookLikeModel.has(drawing(v)));
      if (!looks.length) continue;
      others.push(other);
      items.push({ piece: rng.pick(looks), kind: 'other' });
    }
    if (items.length < c.options || new Set(items.map((i) => drawing(i.piece))).size < items.length) continue;
    const shuffled = rng.shuffle(items);
    return {
      solid: true,
      model,
      options: shuffled.map((item) => item.piece),
      kinds: shuffled.map((item) => item.kind),
      answer: shuffled.findIndex((item) => item.kind === 'same'),
    };
  }
}

export function generateRotationPuzzle(rng: Rng, level: number): RotationPuzzle {
  const c = rotationLevel(level);
  if (c.solid) return generateSolidPuzzle(rng, c);
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
  const puzzle: FlatPuzzle = {
    model,
    options: shuffled.map((item) => item.piece),
    kinds: shuffled.map((item) => item.kind),
    answer: shuffled.findIndex((item) => item.kind === 'same'),
  };
  // Tirées après tout le reste : les niveaux sans pièces penchées restent tirés comme avant.
  if (c.tilt) puzzle.tilts = shuffled.map(() => rng.pick(TILTS));
  return puzzle;
}

/** De quoi tenir 60 s, même en répondant très vite (24 pièces en relief : chacune demande plusieurs secondes). */
export function generateRotation(rng: Rng, level: number, count = rotationLevel(level).solid ? 24 : 40): RotationPuzzle[] {
  return Array.from({ length: count }, () => generateRotationPuzzle(rng, level));
}

export function scoreRotation(correct: number, errors: number, level: number): number {
  return countScore(correct - errors, 0, rotationLevel(level).target);
}
