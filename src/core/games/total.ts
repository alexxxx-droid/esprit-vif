import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { clampScore } from '../scoring';

export const TOTAL_ROUNDS = 5;
export const TOTAL_MIN_LENGTH = 3;
export const TOTAL_MAX_LENGTH = 14;
export const TOTAL_MAX_VALUE = 99;

export interface TotalLevel {
  /** Plus grand nombre qui peut défiler (jamais plus de 49 : le total reste entre 0 et 99). */
  maxStep: number;
  /** Durée d'affichage de chaque nombre. */
  stepMs: number;
  /** Longueur de la première manche (4 selon la spec). */
  start: number;
}

const L = (maxStep: number, stepMs: number, start = 4): TotalLevel => ({ maxStep, stepMs, start });

export const TOTAL_LEVELS: readonly TotalLevel[] = [
  L(9, 1500),
  L(12, 1400),
  L(15, 1300),
  L(9, 1100),
  L(20, 1250),
  L(12, 1050, 5),
  L(25, 1200),
  L(15, 1000, 5),
  L(30, 1150),
  L(20, 950, 5),
  L(9, 800, 6),
  L(30, 1000, 5),
  L(25, 900, 6),
  L(40, 1100, 5),
  L(30, 850, 6),
  L(15, 750, 7),
  L(40, 900, 6),
  L(30, 750, 7),
  L(45, 800, 7),
  L(49, 700, 8),
];

export function totalLevel(level: number): TotalLevel {
  return pickLevel(TOTAL_LEVELS, level);
}

export function totalLevelLabel(level: number): string {
  const c = totalLevel(level);
  return [`Jusqu’à ${c.maxStep}`, `un nombre toutes les ${secondsLabel(c.stepMs)}`, c.start > 4 && `départ à ${c.start}`]
    .filter(Boolean)
    .join(' · ');
}

export interface TotalRound {
  /** Nombres signés qui défilent (+7, −3…). */
  steps: number[];
  total: number;
}

/** Une manche : le total partiel reste toujours entre 0 et 99. */
export function generateTotalRound(rng: Rng, length: number, level: number): TotalRound {
  const { maxStep } = totalLevel(level);
  const steps: number[] = [];
  let total = 0;
  for (let i = 0; i < length; i++) {
    const magnitude = rng.int(1, maxStep);
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

/** Points pour cinq manches parfaites : 4 + 5 + 6 + 7 + 8 = 30 au niveau 1. */
export function totalPerfectPoints(level: number): number {
  const { start } = totalLevel(level);
  return TOTAL_ROUNDS * start + (TOTAL_ROUNDS * (TOTAL_ROUNDS - 1)) / 2;
}

/** Points = somme des longueurs des manches réussies. */
export function scoreTotal(points: number, level: number): number {
  return clampScore((points / totalPerfectPoints(level)) * 100);
}

export function formatStep(step: number): string {
  return step >= 0 ? `+${step}` : `−${-step}`;
}
