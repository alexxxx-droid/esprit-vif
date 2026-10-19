import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

export const MATRICE_START = 3;
export const MATRICE_MAX_SPAN = 12;
export const MATRICE_MAX_FAILURES = 2;

export interface MatriceLevel {
  size: 4 | 5;
  /** Durée d'allumage de chaque case. */
  flashMs: number;
  /** Reproduire la séquence à l'envers. */
  reverse: boolean;
}

const L = (size: 4 | 5, flashMs: number, reverse = false): MatriceLevel => ({ size, flashMs, reverse });

/** Niveau 1 : la spec (4 × 4, 3 cases au départ). Ensuite : rythme plus vif, grille 5 × 5, ordre inversé. */
export const MATRICE_LEVELS: readonly MatriceLevel[] = [
  L(4, 800),
  L(4, 700),
  L(4, 600),
  L(5, 750),
  L(4, 800, true),
  L(5, 650),
  L(4, 500),
  L(5, 750, true),
  L(4, 600, true),
  L(5, 550),
  L(4, 420),
  L(5, 650, true),
  L(5, 480),
  L(4, 480, true),
  L(5, 420),
  L(5, 550, true),
  L(4, 350),
  L(5, 360),
  L(5, 450, true),
  L(5, 380, true),
];

export function matriceLevel(level: number): MatriceLevel {
  return pickLevel(MATRICE_LEVELS, level);
}

export function matriceLevelLabel(level: number): string {
  const c = matriceLevel(level);
  return [`${c.size} × ${c.size}`, `${secondsLabel(c.flashMs)} par case`, c.reverse && 'à l’envers'].filter(Boolean).join(' · ');
}

/** Séquence de cases toutes différentes. */
export function generateSequence(rng: Rng, length: number, cells: number): number[] {
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

/** 3 cases retenues = 0 pt, 9 cases = 100 pts (barème de la spec, le même à tous les niveaux). */
export function scoreMatrice(best: number): number {
  return countScore(best, 3, 9);
}
