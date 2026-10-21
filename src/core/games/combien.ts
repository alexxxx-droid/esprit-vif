import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';
import { visibleFaces, type Cube, type Solid } from './cubes';

/**
 * Combien de cubes ? Des cubes empilés en relief sur un sol quadrillé ; on tape la réponse au pavé.
 * Un cube repose toujours sur le sol ou sur un autre cube : une pile se compte jusqu'en bas, même
 * cachée. Le dessus de chaque pile reste visible, sans quoi le compte serait impossible.
 * Autant de réponses que possible en 45 s.
 * Les paliers changent la façon de jouer : un sol de 3 × 3 et des piles de trois (Confirmé), combien
 * en manque-t-il pour remplir le pavé (Expert), deux tas : combien de plus à gauche (Maître),
 * combien de cubes sont tout à fait cachés (Légende).
 */

export const COMBIEN_DURATION_MS = 45_000;

/** total : tous les cubes ; missing : ceux qui manquent pour un pavé plein ; diff : l'écart entre deux tas ; hidden : ceux qu'on ne voit pas du tout. */
export type CombienAsk = 'total' | 'missing' | 'diff' | 'hidden';

export interface CombienLevel {
  /** Le sol : `cols` cases de gauche à droite (axe x), `rows` de profondeur (axe y). */
  cols: number;
  rows: number;
  maxHeight: number;
  asks: readonly CombienAsk[];
  /** Bonnes réponses en une partie pour 100 pts. */
  target: number;
}

/** Interpolation d'un palier : de `a` (1er niveau) à `b` (10e). */
const step = (i: number, a: number, b: number) => Math.round(a + ((b - a) * i) / 9);

const lvl = (cols: number, rows: number, maxHeight: number, asks: readonly CombienAsk[], target: number): CombienLevel => ({ cols, rows, maxHeight, asks, target });

export const COMBIEN_LEVELS: readonly CombienLevel[] = [
  // Débutant : un petit sol, des piles de deux, puis de trois.
  ...Array.from({ length: 10 }, (_, i) => lvl(i < 4 ? 2 : 3, 2, i < 6 ? 2 : 3, ['total'], step(i, 9, 8))),
  // Confirmé : un sol de 3 × 3 ; des cubes se cachent derrière les autres.
  ...Array.from({ length: 10 }, (_, i) => lvl(3, 3, 3, ['total'], step(i, 7, 6))),
  // Expert : combien en manque-t-il pour remplir le pavé ?
  ...Array.from({ length: 10 }, (_, i) => lvl(3, i < 5 ? 2 : 3, 3, ['missing', 'missing', 'total'], step(i, 6, 5))),
  // Maître : deux tas côte à côte, combien de plus dans celui de gauche ?
  ...Array.from({ length: 10 }, (_, i) => lvl(i < 5 ? 2 : 3, 2, 3, ['diff', 'diff', 'missing', 'total'], 5)),
  // Légende : combien de cubes sont tout à fait cachés ?
  ...Array.from({ length: 10 }, (_, i) => lvl(3, 3, i < 5 ? 3 : 4, ['hidden', 'hidden', 'diff', 'missing', 'total'], step(i, 5, 4))),
];

export function combienLevel(level: number): CombienLevel {
  return pickLevel(COMBIEN_LEVELS, level);
}

export function combienLevelLabel(level: number): string {
  const c = combienLevel(level);
  const has = (a: CombienAsk) => c.asks.includes(a);
  return [
    tr(`sol de ${c.cols} × ${c.rows}`, `${c.cols} × ${c.rows} floor`),
    tr(`piles de ${c.maxHeight} au plus`, `stacks up to ${c.maxHeight}`),
    has('hidden') ? tr('cubes cachés', 'hidden cubes') : has('diff') ? tr('deux tas', 'two piles') : has('missing') ? tr('cubes manquants', 'missing cubes') : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** La règle affichée à l'intro. */
export function combienRule(level: number): string {
  const c = combienLevel(level);
  const has = (a: CombienAsk) => c.asks.includes(a);
  const parts = [
    tr(
      'Compte les cubes et tape le nombre. Chaque cube repose sur le sol ou sur un autre cube, même s’il est caché. 45 secondes.',
      'Count the cubes and type the number. Every cube sits on the floor or on another cube, even when hidden. 45 seconds.',
    ),
    has('missing') && tr('Parfois : combien en manque-t-il pour remplir le pavé (tout le sol, aussi haut que la plus haute pile) ?', 'Sometimes: how many are missing to fill the box (the whole floor, as high as the tallest stack)?'),
    has('diff') && tr('Ou deux tas : combien de cubes de plus dans celui de gauche ?', 'Or two piles: how many more cubes in the left one?'),
    has('hidden') && tr('Ou combien de cubes sont tout à fait cachés, invisibles d’ici ?', 'Or how many cubes are completely hidden from view?'),
  ];
  return parts.filter(Boolean).join(' ');
}

/** Un tas : la hauteur de chaque case du sol, `heights[y][x]`. */
export interface Pile {
  cols: number;
  rows: number;
  heights: number[][];
}

export interface CombienQuestion {
  ask: CombienAsk;
  piles: Pile[];
  answer: number;
}

export function pileSolid(p: Pile): Solid {
  const cubes: Cube[] = [];
  for (let y = 0; y < p.rows; y++) for (let x = 0; x < p.cols; x++) for (let z = 0; z < p.heights[y][x]; z++) cubes.push([x, y, z]);
  return cubes;
}

export const pileTotal = (p: Pile) => p.heights.flat().reduce((a, b) => a + b, 0);

/** Cubes dont on ne voit aucune face. */
export const pileHidden = (p: Pile) => visibleFaces(pileSolid(p)).filter((faces) => faces.size === 0).length;

/** Le dessus de chaque pile se voit (au moins un triangle) : sinon sa hauteur ne se devine pas. */
export function pileReadable(p: Pile): boolean {
  const solid = pileSolid(p);
  const faces = visibleFaces(solid);
  return solid.every(([x, y, z], i) => z !== p.heights[y][x] - 1 || faces[i].has('top'));
}

function drawPile(rng: Rng, c: CombienLevel): Pile {
  for (;;) {
    const heights = Array.from({ length: c.rows }, () => Array.from({ length: c.cols }, () => (rng.chance(0.15) ? 0 : rng.int(1, c.maxHeight))));
    const pile = { cols: c.cols, rows: c.rows, heights };
    // Au moins une pile à la hauteur maximale du niveau, et un tas pas trop vide.
    if (Math.max(...heights.flat()) !== c.maxHeight || pileTotal(pile) < c.cols * c.rows) continue;
    if (pileReadable(pile)) return pile;
  }
}

export function generateCombien(rng: Rng, level: number): CombienQuestion {
  const c = combienLevel(level);
  const ask = rng.pick(c.asks);
  for (;;) {
    const pile = drawPile(rng, c);
    const total = pileTotal(pile);
    if (ask === 'total') return { ask, piles: [pile], answer: total };
    if (ask === 'missing') {
      const answer = c.cols * c.rows * Math.max(...pile.heights.flat()) - total;
      if (answer > 0) return { ask, piles: [pile], answer };
      continue;
    }
    if (ask === 'hidden') {
      const answer = pileHidden(pile);
      if (answer > 0) return { ask, piles: [pile], answer };
      continue;
    }
    const other = drawPile(rng, c);
    const [left, right] = pileTotal(pile) >= pileTotal(other) ? [pile, other] : [other, pile];
    const answer = pileTotal(left) - pileTotal(right);
    if (answer > 0) return { ask, piles: [left, right], answer };
  }
}

/** Bonnes réponses rapportées à l'objectif du niveau. */
export function scoreCombien(correct: number, level: number): number {
  return countScore(correct, 0, combienLevel(level).target);
}
