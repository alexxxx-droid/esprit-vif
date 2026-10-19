import type { Rng } from '../rng';
import { clampLevel, clampScore } from '../scoring';

/** Consonnes seulement : pas de mot qui se forme par hasard, pas de confusion O/0. */
export const NBACK_LETTERS = ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'V'];
export const NBACK_TRIALS = 20;
export const NBACK_TARGETS = 6; // 30 % des essais
export const NBACK_STEP_MS = 2500;
export const NBACK_SHOW_MS = 2000;
export const NBACK_MAX_LEVEL = 3;

export interface NBackSequence {
  n: number;
  /** n lettres d'amorce, puis les 20 essais notés. */
  letters: string[];
  /** Vrai si la lettre est identique à celle d'il y a n positions. */
  targets: boolean[];
}

export function generateNBack(rng: Rng, level: number): NBackSequence {
  const n = clampLevel(level, NBACK_MAX_LEVEL);
  const total = n + NBACK_TRIALS;
  const scored = Array.from({ length: NBACK_TRIALS }, (_, i) => i + n);
  const targetPositions = new Set(rng.shuffle(scored).slice(0, NBACK_TARGETS));
  const letters: string[] = [];
  for (let i = 0; i < total; i++) {
    if (targetPositions.has(i)) {
      letters.push(letters[i - n]);
    } else {
      const avoid = i >= n ? letters[i - n] : null;
      letters.push(rng.pick(NBACK_LETTERS.filter((l) => l !== avoid)));
    }
  }
  const targets = letters.map((letter, i) => i >= n && letter === letters[i - n]);
  return { n, letters, targets };
}

export interface NBackTally {
  hits: number;
  misses: number;
  falseAlarms: number;
  correctRejections: number;
}

/** Compte bonnes réponses et bonnes abstentions sur les essais notés. */
export function tallyNBack(sequence: NBackSequence, responses: readonly boolean[]): NBackTally {
  const tally: NBackTally = { hits: 0, misses: 0, falseAlarms: 0, correctRejections: 0 };
  for (let i = sequence.n; i < sequence.letters.length; i++) {
    const pressed = responses[i] === true;
    if (sequence.targets[i]) {
      if (pressed) tally.hits++;
      else tally.misses++;
    } else if (pressed) tally.falseAlarms++;
    else tally.correctRejections++;
  }
  return tally;
}

/** Précision équilibrée : moyenne du taux de bonnes réponses et du taux de bonnes abstentions. */
export function balancedAccuracy(t: NBackTally): number {
  const targets = t.hits + t.misses;
  const others = t.correctRejections + t.falseAlarms;
  const hitRate = targets ? t.hits / targets : 1;
  const rejectRate = others ? t.correctRejections / others : 1;
  return (hitRate + rejectRate) / 2;
}

/**
 * Plafond selon N : 70 pts au mieux à N = 1, 100 à N = 2 ;
 * à N = 3, les 100 pts sont atteints dès 80 % de précision utile.
 */
export const NBACK_GAIN: Record<number, number> = { 1: 70, 2: 100, 3: 125 };

export function scoreNBack(tally: NBackTally, level: number): number {
  // 50 % de précision équilibrée = répondre au hasard (ou toujours pareil) : 0 pt.
  const useful = Math.max(0, (balancedAccuracy(tally) - 0.5) / 0.5);
  return clampScore(useful * NBACK_GAIN[clampLevel(level, NBACK_MAX_LEVEL)]);
}
