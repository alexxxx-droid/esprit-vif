import { plural } from '../format';
import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * Tours de Hanoï : déplacer les disques d'un piquet à l'autre, un à la fois, jamais un grand sur un
 * petit, pour arriver à la position voulue. Chaque tour rapporte d'autant plus qu'il demande peu de
 * coups (le meilleur nombre, divisé par les coups joués). Autant de tours que possible en une minute.
 * Les paliers changent la façon de jouer : quatre disques (Confirmé), un départ mélangé (Expert), un
 * modèle à reproduire plutôt qu'une pile (Maître), des coups comptés : au-delà, le tour est perdu
 * (Légende).
 */

export const HANOI_DURATION_MS = 60_000;
export const PEGS = 3;

export interface HanoiLevel {
  disks: 3 | 4;
  /** Départ : la pile sur le piquet de gauche, ou une position mélangée. */
  mixedStart: boolean;
  /** But : la pile sur le piquet de droite, ou un modèle mélangé. */
  modelGoal: boolean;
  /** Coups permis en plus du meilleur (0 : pas de limite). */
  margin: number;
  /** Points (un tour au meilleur nombre de coups vaut 1) pour 100 pts. */
  target: number;
}

/** Interpolation d'un palier : de `a` (1er niveau) à `b` (10e). */
const step = (i: number, a: number, b: number) => Math.round(a + ((b - a) * i) / 9);

const lvl = (disks: 3 | 4, mixedStart: boolean, modelGoal: boolean, margin: number, target: number): HanoiLevel => ({ disks, mixedStart, modelGoal, margin, target });

export const HANOI_LEVELS: readonly HanoiLevel[] = [
  // Débutant : trois disques, de gauche à droite.
  ...Array.from({ length: 10 }, (_, i) => lvl(3, false, false, 0, step(i, 4, 5))),
  // Confirmé : quatre disques.
  ...Array.from({ length: 10 }, (_, i) => lvl(4, false, false, 0, step(i, 2, 3))),
  // Expert : un départ mélangé.
  ...Array.from({ length: 10 }, (_, i) => lvl(i < 5 ? 3 : 4, true, false, 0, step(i, 4, 3))),
  // Maître : un modèle à reproduire.
  ...Array.from({ length: 10 }, (_, i) => lvl(i < 5 ? 3 : 4, true, true, 0, step(i, 4, 3))),
  // Légende : des coups comptés.
  ...Array.from({ length: 10 }, (_, i) => lvl(i < 5 ? 3 : 4, true, true, step(i, 3, 1), 3)),
];

export function hanoiLevel(level: number): HanoiLevel {
  return pickLevel(HANOI_LEVELS, level);
}

export function hanoiLevelLabel(level: number): string {
  const c = hanoiLevel(level);
  return [
    tr(`${c.disks} disques`, `${c.disks} disks`),
    c.mixedStart && !c.modelGoal && tr('départ mélangé', 'mixed start'),
    c.modelGoal && tr('modèle à reproduire', 'copy the model'),
    c.margin > 0 && tr(plural(c.margin, 'coup de marge', 'coups de marge'), plural(c.margin, 'spare move')),
    tr(`objectif ${c.target}`, `target ${c.target}`),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** La règle affichée à l'intro. */
export function hanoiRule(level: number): string {
  const c = hanoiLevel(level);
  const parts = [
    c.modelGoal
      ? tr('Reproduis le modèle : touche un piquet, puis un autre, pour y poser son disque du dessus.', 'Copy the model: tap a peg, then another, to move its top disk there.')
      : tr('Amène toute la pile sur le piquet de droite : touche un piquet, puis un autre, pour y poser son disque du dessus.', 'Move the whole stack to the right peg: tap a peg, then another, to move its top disk there.'),
    tr('Jamais un grand disque sur un petit. Moins de coups, plus de points. Une minute.', 'Never a big disk on a small one. Fewer moves, more points. One minute.'),
    c.margin > 0 && tr('Les coups sont comptés : au-delà de la marge, le tour est perdu.', 'Moves are counted: past the margin, the round is lost.'),
  ];
  return parts.filter(Boolean).join(' ');
}

/** Une position : le piquet de chaque disque, du plus petit (0) au plus grand. */
export type Position = number[];

/** Le disque du dessus d'un piquet (le plus petit qui s'y trouve), ou -1 s'il est vide. */
export const topOf = (p: Position, peg: number) => p.findIndex((at) => at === peg);

/** Déplace le disque du dessus de `from` sur `to`, si c'est permis ; sinon `null`. */
export function move(p: Position, from: number, to: number): Position | null {
  if (from === to) return null;
  const disk = topOf(p, from);
  if (disk < 0) return null;
  const top = topOf(p, to);
  if (top >= 0 && top < disk) return null;
  const next = [...p];
  next[disk] = to;
  return next;
}

/** Le meilleur nombre de coups d'une position à une autre (parcours en largeur des 3^n positions). */
export function bestMoves(from: Position, to: Position): number {
  const goal = to.join();
  let frontier = [from];
  const seen = new Set([from.join()]);
  for (let d = 0; frontier.length; d++) {
    if (frontier.some((p) => p.join() === goal)) return d;
    const next: Position[] = [];
    for (const p of frontier) {
      for (let a = 0; a < PEGS; a++) {
        for (let b = 0; b < PEGS; b++) {
          const n = move(p, a, b);
          if (n && !seen.has(n.join())) {
            seen.add(n.join());
            next.push(n);
          }
        }
      }
    }
    frontier = next;
  }
  return Infinity;
}

export interface HanoiRound {
  start: Position;
  goal: Position;
  best: number;
}

const randomPosition = (rng: Rng, disks: number): Position => Array.from({ length: disks }, () => rng.int(0, PEGS - 1));

export function generateHanoi(rng: Rng, level: number, count = 12): HanoiRound[] {
  const c = hanoiLevel(level);
  const pile = (peg: number) => Array.from({ length: c.disks }, () => peg);
  return Array.from({ length: count }, () => {
    for (;;) {
      const start = c.mixedStart ? randomPosition(rng, c.disks) : pile(0);
      const goal = c.modelGoal ? randomPosition(rng, c.disks) : pile(PEGS - 1);
      const best = bestMoves(start, goal);
      // Un vrai tour : au moins 3 coups (toute position est faisable, chaque disque pouvant aller partout).
      if (best >= Math.min(3, 2 ** c.disks - 1)) return { start, goal, best };
    }
  });
}

/** Coups permis pour un tour (`null` : pas de limite). */
export const allowedFor = (c: HanoiLevel, round: HanoiRound) => (c.margin ? round.best + c.margin : null);

/** Les points d'un tour fini : le meilleur nombre de coups divisé par les coups joués. */
export const roundPoints = (round: HanoiRound, used: number) => round.best / Math.max(used, round.best);

/** Points cumulés rapportés à l'objectif du niveau. */
export function scoreHanoi(points: number, level: number): number {
  return countScore(points, 0, hanoiLevel(level).target);
}
