import { tr } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * Du plus petit au plus grand : des nombres apparaissent dans des cases puis se cachent ;
 * il faut toucher les cases dans l'ordre croissant (ou décroissant), de mémoire.
 */

export interface OrdreLevel {
  min: number;
  max: number;
  /** Grille 4 × 4, 5 × 5 ou 6 × 6. */
  size: 4 | 5 | 6;
  /** Temps d'affichage par nombre. */
  showMs: number;
  descending: boolean;
  /** Les nombres apparaissent un par un au lieu de tous ensemble. */
  sequential: boolean;
  /** Nombres proches : tirés dans une fenêtre de `spread` valeurs consécutives (0 : toute la plage). */
  spread: number;
  /** Un nombre barré, à ne pas toucher, pour `decoyEvery` nombres à ranger (0 : aucun). */
  decoyEvery: number;
  /** Barème : `zero` nombres retenus = 0 pt, `full` = 100 pts. */
  zero: number;
  full: number;
}

interface Options {
  size?: 4 | 5 | 6;
  descending?: boolean;
  sequential?: boolean;
  spread?: number;
  decoyEvery?: number;
}

const L = (min: number, max: number, showMs: number, { size = 4, descending = false, sequential = false, spread = 0, decoyEvery = 0 }: Options = {}) => ({
  min,
  max,
  size,
  showMs,
  descending,
  sequential,
  spread,
  decoyEvery,
  zero: 3,
  full: 9,
});

/** Niveaux 21 à 50 : `star` est la série qui donne la première étoile (6 : barème 3 → 8 ; 5 : 2 → 7). */
const X = (star: 5 | 6, min: number, max: number, showMs: number, options: Options): OrdreLevel => ({
  ...L(min, max, showMs, { size: 6, ...options }),
  zero: star === 5 ? 2 : 3,
  full: star === 5 ? 7 : 8,
});

/**
 * Expert (21-30) : nombres à trois chiffres, de −99 à 99, grille 6 × 6. Maître (31-40) : des nombres barrés
 * à ignorer se glissent parmi les autres. Légende (41-50) : nombres très proches (une fenêtre de 20 valeurs),
 * un par un, jusqu'à 0,3 s chacun.
 */
export const ORDRE_LEVELS: readonly OrdreLevel[] = [
  L(1, 9, 900),
  L(1, 20, 800),
  L(1, 50, 750),
  L(1, 9, 600),
  L(1, 99, 700),
  L(1, 20, 800, { descending: true }),
  L(1, 50, 550),
  L(1, 20, 700, { sequential: true }),
  L(1, 99, 500),
  L(1, 50, 650, { descending: true }),
  L(1, 50, 600, { sequential: true }),
  L(1, 99, 550, { size: 5 }),
  L(1, 99, 500, { descending: true }),
  L(1, 50, 600, { sequential: true, descending: true }),
  L(1, 99, 450, { size: 5 }),
  L(-20, 20, 600),
  L(1, 99, 500, { sequential: true }),
  L(1, 99, 450, { size: 5, descending: true }),
  L(-50, 50, 500),
  L(-50, 50, 450, { sequential: true, descending: true }),
  // Expert
  X(6, 100, 999, 500, {}),
  X(6, 1, 99, 400, { descending: true }),
  X(6, 100, 999, 450, { size: 5, sequential: true }),
  X(6, -99, 99, 400, { descending: true }),
  X(6, 100, 999, 450, { descending: true }),
  X(6, 100, 999, 550, { sequential: true }),
  X(6, -99, 99, 450, { sequential: true }),
  X(6, 100, 999, 400, { descending: true }),
  X(6, 100, 999, 500, { sequential: true, descending: true }),
  X(6, -99, 99, 400, { sequential: true, descending: true }),
  // Maître
  X(6, 100, 999, 500, { decoyEvery: 3 }),
  X(6, -99, 99, 500, { descending: true, decoyEvery: 3 }),
  X(6, 1, 99, 500, { sequential: true, decoyEvery: 3 }),
  X(6, 100, 999, 500, { descending: true, decoyEvery: 3 }),
  X(6, 100, 999, 550, { sequential: true, decoyEvery: 3 }),
  X(6, -99, 99, 500, { sequential: true, decoyEvery: 3 }),
  X(6, 100, 999, 400, { descending: true, decoyEvery: 3 }),
  X(6, 100, 999, 550, { sequential: true, descending: true, decoyEvery: 3 }),
  X(6, -99, 99, 450, { sequential: true, descending: true, decoyEvery: 3 }),
  X(6, 100, 999, 500, { sequential: true, decoyEvery: 2 }),
  // Légende
  X(5, 100, 999, 500, { sequential: true, decoyEvery: 3, spread: 20 }),
  X(5, 100, 999, 450, { descending: true, decoyEvery: 2, spread: 20 }),
  X(5, -99, 99, 400, { sequential: true, decoyEvery: 3, spread: 20 }),
  X(5, 100, 999, 450, { sequential: true, descending: true, decoyEvery: 3, spread: 20 }),
  X(5, 100, 999, 450, { sequential: true, decoyEvery: 2, spread: 20 }),
  X(5, -99, 99, 400, { sequential: true, descending: true, decoyEvery: 2, spread: 20 }),
  X(5, 100, 999, 400, { sequential: true, decoyEvery: 2, spread: 20 }),
  X(5, 100, 999, 400, { sequential: true, descending: true, decoyEvery: 2, spread: 20 }),
  X(5, 100, 999, 350, { sequential: true, descending: true, decoyEvery: 2, spread: 20 }),
  X(5, 100, 999, 300, { sequential: true, descending: true, decoyEvery: 2, spread: 20 }),
];

export function ordreLevel(level: number): OrdreLevel {
  return pickLevel(ORDRE_LEVELS, level);
}

export function ordreLevelLabel(level: number): string {
  const c = ordreLevel(level);
  const show = secondsLabel(c.showMs);
  return [
    tr(`de ${c.min} à ${c.max}`, `${c.min} to ${c.max}`),
    c.descending ? tr('du plus grand au plus petit', 'largest to smallest') : tr('du plus petit au plus grand', 'smallest to largest'),
    c.sequential && tr('un par un', 'one at a time'),
    tr(`${show} par nombre`, `${show} per number`),
    c.size > 4 && tr(`grille ${c.size} × ${c.size}`, `${c.size} × ${c.size} grid`),
    c.spread > 0 && tr('nombres très proches', 'very close numbers'),
    c.decoyEvery > 0 && tr('nombres barrés à ignorer', 'crossed-out numbers to skip'),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Plus longue séquence possible : 12 au plus, et jamais plus de nombres que la plage n'en contient. */
export function ordreMaxSpan(level: number): number {
  const c = ordreLevel(level);
  return Math.min(12, c.spread || c.max - c.min + 1, c.size * c.size);
}

/** Nombres barrés d'une série de `count` nombres à ranger (dans la limite des cases et des valeurs). */
export function ordreDecoyCount(count: number, level: number): number {
  const c = ordreLevel(level);
  if (!c.decoyEvery) return 0;
  return Math.min(Math.floor(count / c.decoyEvery), c.size * c.size - count, (c.spread || c.max - c.min + 1) - count);
}

export interface OrdreDecoy {
  cell: number;
  value: number;
}

export interface OrdreRound {
  /** Case de chaque nombre. */
  cells: number[];
  values: number[];
  /** Cases dans l'ordre où il faut les toucher. */
  order: number[];
  /** Nombres barrés : ils se montrent avec les autres, mais il ne faut pas toucher leur case. */
  decoys: OrdreDecoy[];
  /** Ordre d'apparition des cases, au niveau « un par un » (nombres barrés compris). */
  show: number[];
}

export function generateOrdreRound(rng: Rng, length: number, level: number): OrdreRound {
  const c = ordreLevel(level);
  const count = Math.min(length, ordreMaxSpan(level));
  const shuffled = rng.shuffle(Array.from({ length: c.size * c.size }, (_, i) => i));
  const cells = shuffled.slice(0, count);
  // Nombres proches : une fenêtre de `spread` valeurs, placée au hasard dans la plage.
  const low = c.spread ? rng.int(c.min, c.max - c.spread + 1) : c.min;
  const pool = rng.shuffle(Array.from({ length: c.spread || c.max - c.min + 1 }, (_, i) => low + i));
  const values = pool.slice(0, count);
  const sorted = cells.map((cell, i) => ({ cell, value: values[i] })).sort((a, b) => (c.descending ? b.value - a.value : a.value - b.value));
  const decoyCount = ordreDecoyCount(count, level);
  const decoys = shuffled.slice(count, count + decoyCount).map((cell, k) => ({ cell, value: pool[count + k] }));
  // Un par un, les nombres barrés se glissent parmi les autres, jamais en premier.
  const show = decoys.length ? [cells[0], ...rng.shuffle([...cells.slice(1), ...decoys.map((d) => d.cell)])] : cells;
  return { cells, values, order: sorted.map((x) => x.cell), decoys, show };
}

/** Niveaux 1 à 20 : même barème que la Matrice (3 nombres retenus = 0 pt, 9 = 100 pts) ; au-delà, celui du niveau. */
export function scoreOrdre(best: number, level = 1): number {
  const { zero, full } = ordreLevel(level);
  return countScore(best, zero, full);
}
