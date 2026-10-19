import type { Rng } from '../rng';
import { clampLevel, clampScore } from '../scoring';

export const TOTAL_ROUNDS = 5;
export const TOTAL_START_LENGTH = 4;
export const TOTAL_MIN_LENGTH = 3;
export const TOTAL_MAX_LENGTH = 12;
export const TOTAL_MAX_LEVEL = 3;
export const TOTAL_MAX_VALUE = 99;

/** Le niveau change le rythme de défilement et la taille des nombres. */
export const TOTAL_STEP_MS: Record<number, number> = { 1: 1500, 2: 1150, 3: 850 };
export const TOTAL_MAX_STEP: Record<number, number> = { 1: 9, 2: 15, 3: 25 };

export interface TotalRound {
  /** Nombres signés qui défilent (+7, −3…). */
  steps: number[];
  total: number;
}

/** Une manche : le total partiel reste toujours entre 0 et 99. */
export function generateTotalRound(rng: Rng, length: number, level: number): TotalRound {
  const lvl = clampLevel(level, TOTAL_MAX_LEVEL);
  const steps: number[] = [];
  let total = 0;
  for (let i = 0; i < length; i++) {
    const magnitude = rng.int(1, TOTAL_MAX_STEP[lvl]);
    const canAdd = total + magnitude <= TOTAL_MAX_VALUE;
    const canSubtract = total - magnitude >= 0;
    const subtract = canSubtract && (!canAdd || rng.chance(0.45));
    const step = subtract ? -magnitude : magnitude;
    steps.push(step);
    total += step;
  }
  return { steps, total };
}

/** Longueur de la manche suivante : +1 après une réussite, −1 après un échec. */
export function nextTotalLength(length: number, success: boolean): number {
  return success ? Math.min(TOTAL_MAX_LENGTH, length + 1) : Math.max(TOTAL_MIN_LENGTH, length - 1);
}

/** Points = somme des longueurs des manches réussies ; 5 manches parfaites depuis 4 (4+5+6+7+8 = 30) = 100. */
export const TOTAL_PERFECT_POINTS = 30;

export function scoreTotal(points: number): number {
  return clampScore((points / TOTAL_PERFECT_POINTS) * 100);
}

export function formatStep(step: number): string {
  return step >= 0 ? `+${step}` : `−${-step}`;
}
