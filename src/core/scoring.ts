/** Seuils d'un jeu chronométré, en secondes : 100 pts à `best` ou moins, 0 pt à `worst` ou plus. */
export interface TimeThresholds {
  best: number;
  worst: number;
}

export const MIN_BRAIN_AGE = 20;
export const MAX_BRAIN_AGE = 80;

/** Seuils de la difficulté adaptative. */
export const LEVEL_UP_AT = 75;
export const LEVEL_DOWN_BELOW = 40;

/** Ramène n'importe quelle valeur à un score entier entre 0 et 100. */
export function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.round(Math.min(100, Math.max(0, value)));
}

/** Score linéaire d'un temps (plus court = mieux). */
export function timeScore(seconds: number, { best, worst }: TimeThresholds): number {
  return clampScore(((worst - seconds) / (worst - best)) * 100);
}

/** Score linéaire d'une quantité (plus grand = mieux) : 0 pt à `zero`, 100 pts à `full`. */
export function countScore(value: number, zero: number, full: number): number {
  return clampScore(((value - zero) / (full - zero)) * 100);
}

/** Âge cérébral = arrondi(80 − 0,6 × moyenne des scores), borné entre 20 et 80. */
export function brainAge(scores: readonly number[]): number {
  if (scores.length === 0) return MAX_BRAIN_AGE;
  const mean = scores.reduce((sum, s) => sum + clampScore(s), 0) / scores.length;
  return Math.min(MAX_BRAIN_AGE, Math.max(MIN_BRAIN_AGE, Math.round(80 - 0.6 * mean)));
}

/** Niveau suivant : il monte après un bon score, descend après un score faible. */
export function adaptLevel(level: number, score: number, maxLevel: number): number {
  const current = clampLevel(level, maxLevel);
  if (score >= LEVEL_UP_AT) return Math.min(maxLevel, current + 1);
  if (score < LEVEL_DOWN_BELOW) return Math.max(1, current - 1);
  return current;
}

export function clampLevel(level: number, maxLevel: number): number {
  if (!Number.isFinite(level)) return 1;
  return Math.min(maxLevel, Math.max(1, Math.round(level)));
}
