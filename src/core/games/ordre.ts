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
  /** Grille 4 × 4 ou 5 × 5. */
  size: 4 | 5;
  /** Temps d'affichage par nombre. */
  showMs: number;
  descending: boolean;
  /** Les nombres apparaissent un par un au lieu de tous ensemble. */
  sequential: boolean;
}

const L = (min: number, max: number, showMs: number, { size = 4, descending = false, sequential = false } = {}): OrdreLevel => ({
  min,
  max,
  size: size as 4 | 5,
  showMs,
  descending,
  sequential,
});

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
    c.size === 5 && tr('grille 5 × 5', '5 × 5 grid'),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Plus longue séquence possible : 12 au plus, et jamais plus de nombres que la plage n'en contient. */
export function ordreMaxSpan(level: number): number {
  const c = ordreLevel(level);
  return Math.min(12, c.max - c.min + 1, c.size * c.size);
}

export interface OrdreRound {
  /** Case de chaque nombre. */
  cells: number[];
  values: number[];
  /** Cases dans l'ordre où il faut les toucher. */
  order: number[];
}

export function generateOrdreRound(rng: Rng, length: number, level: number): OrdreRound {
  const c = ordreLevel(level);
  const count = Math.min(length, ordreMaxSpan(level));
  const cells = rng.shuffle(Array.from({ length: c.size * c.size }, (_, i) => i)).slice(0, count);
  const pool = rng.shuffle(Array.from({ length: c.max - c.min + 1 }, (_, i) => c.min + i));
  const values = pool.slice(0, count);
  const sorted = cells.map((cell, i) => ({ cell, value: values[i] })).sort((a, b) => (c.descending ? b.value - a.value : a.value - b.value));
  return { cells, values, order: sorted.map((x) => x.cell) };
}

/** Même barème que la Matrice : 3 nombres retenus = 0 pt, 9 = 100 pts. */
export function scoreOrdre(best: number): number {
  return countScore(best, 3, 9);
}
