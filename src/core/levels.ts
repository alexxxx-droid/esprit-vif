import { NBSP } from './format';
import { clampLevel } from './scoring';

/** Nombre de niveaux de chaque jeu. */
export const MAX_LEVEL = 20;

/** Étoiles d'un niveau : 1 dès 60 pts (le niveau suivant se débloque), 2 dès 80, 3 dès 95. */
export const STAR_THRESHOLDS = [60, 80, 95] as const;
export const UNLOCK_SCORE = STAR_THRESHOLDS[0];

export type Stars = 0 | 1 | 2 | 3;

export function starsFor(score: number): Stars {
  return STAR_THRESHOLDS.filter((threshold) => score >= threshold).length as Stars;
}

/** Configuration d'un niveau dans une table (une ligne par niveau). */
export function pickLevel<T>(table: readonly T[], level: number): T {
  return table[clampLevel(level, table.length) - 1];
}

const decimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** 1500 → « 1,5 s », pour les libellés de niveau. */
export function secondsLabel(ms: number): string {
  return `${decimal.format(ms / 1000)}${NBSP}s`;
}
