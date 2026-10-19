import type { Rng } from '../rng';
import { clampLevel, timeScore, type TimeThresholds } from '../scoring';

export interface SchulteBoard {
  size: number;
  /** Nombres de 1 à size², dans l'ordre des cases (ligne par ligne). */
  numbers: number[];
  /** Niveau 3 : inclinaison (degrés) et taille relative de chaque nombre, pour brouiller la lecture. */
  tilts: number[];
  scales: number[];
}

export const SCHULTE_PENALTY_MS = 1000;
export const SCHULTE_MAX_LEVEL = 3;

/** Niveau 1 : grille 5×5 (barème de la spec). Niveau 2 : 6×6. Niveau 3 : 6×6 avec nombres inclinés. */
export const SCHULTE_THRESHOLDS: Record<number, TimeThresholds> = {
  1: { best: 14, worst: 60 },
  2: { best: 24, worst: 90 },
  3: { best: 28, worst: 100 },
};

export function schulteSize(level: number): number {
  return clampLevel(level, SCHULTE_MAX_LEVEL) === 1 ? 5 : 6;
}

export function generateSchulte(rng: Rng, level: number): SchulteBoard {
  const lvl = clampLevel(level, SCHULTE_MAX_LEVEL);
  const size = schulteSize(lvl);
  const count = size * size;
  const numbers = rng.shuffle(Array.from({ length: count }, (_, i) => i + 1));
  const tilts = numbers.map(() => (lvl === 3 ? rng.int(-30, 30) : 0));
  const scales = numbers.map(() => (lvl === 3 ? rng.int(80, 125) / 100 : 1));
  return { size, numbers, tilts, scales };
}

/** Temps total + 1 s par erreur, converti en score selon le niveau. */
export function scoreSchulte(elapsedMs: number, errors: number, level: number): number {
  const seconds = (elapsedMs + errors * SCHULTE_PENALTY_MS) / 1000;
  return timeScore(seconds, SCHULTE_THRESHOLDS[clampLevel(level, SCHULTE_MAX_LEVEL)]);
}
