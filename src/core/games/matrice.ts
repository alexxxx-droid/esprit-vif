import type { Rng } from '../rng';
import { clampLevel, countScore } from '../scoring';

export const MATRICE_SIZE = 4;
export const MATRICE_CELLS = MATRICE_SIZE * MATRICE_SIZE;
export const MATRICE_START = 3;
export const MATRICE_MAX_SPAN = 12;
export const MATRICE_MAX_FAILURES = 2;
export const MATRICE_MAX_LEVEL = 3;

/** Durée d'allumage de chaque case : le niveau change le rythme de la séquence. */
export const MATRICE_FLASH_MS: Record<number, number> = { 1: 800, 2: 620, 3: 460 };

export function matriceFlashMs(level: number): number {
  return MATRICE_FLASH_MS[clampLevel(level, MATRICE_MAX_LEVEL)];
}

/** Séquence de cases toutes différentes. */
export function generateSequence(rng: Rng, length: number, cells = MATRICE_CELLS): number[] {
  return rng.shuffle(Array.from({ length: cells }, (_, i) => i)).slice(0, Math.min(length, cells));
}

export interface MatriceState {
  /** Longueur de la prochaine séquence. */
  span: number;
  /** Plus longue séquence reproduite sans faute. */
  best: number;
  failures: number;
  rounds: number;
  done: boolean;
}

export function initialMatrice(): MatriceState {
  return { span: MATRICE_START, best: 0, failures: 0, rounds: 0, done: false };
}

/** +1 case à chaque réussite ; la partie s'arrête au 2e échec (ou au plafond). */
export function nextMatrice(state: MatriceState, success: boolean): MatriceState {
  if (success) {
    return {
      span: Math.min(MATRICE_MAX_SPAN, state.span + 1),
      best: Math.max(state.best, state.span),
      failures: state.failures,
      rounds: state.rounds + 1,
      done: state.span >= MATRICE_MAX_SPAN,
    };
  }
  const failures = state.failures + 1;
  return { ...state, failures, rounds: state.rounds + 1, done: failures >= MATRICE_MAX_FAILURES };
}

/** 3 cases retenues = 0 pt, 9 cases = 100 pts. */
export function scoreMatrice(best: number): number {
  return countScore(best, 3, 9);
}
