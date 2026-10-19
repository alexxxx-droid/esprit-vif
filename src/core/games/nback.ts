import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { clampScore } from '../scoring';

/** Consonnes seulement : pas de mot qui se forme par hasard, pas de confusion O/0. */
export const NBACK_LETTERS = ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'V'];
/** Cases de la grille 3 × 3 des positions. */
export const NBACK_POSITIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
export const NBACK_TRIALS = 20;
export const NBACK_TARGETS = 6; // 30 % des essais, dans chaque flux
/** Blanc entre deux stimuli, pour qu'une répétition se voie. */
export const NBACK_GAP_MS = 500;

/** Lettres seules, positions seules, ou les deux à la fois (« double » retour). */
export type NBackMode = 'letter' | 'position' | 'dual';

export interface NBackLevel {
  n: number;
  mode: NBackMode;
  /** Durée d'un essai (stimulus + blanc). */
  stepMs: number;
  /** Points pour une précision utile parfaite (plafonnés à 100) : plafond selon N et le mode. */
  gain: number;
}

const L = (n: number, mode: NBackMode, stepMs: number, gain: number): NBackLevel => ({ n, mode, stepMs, gain });

/** Niveau 1 : N = 1 (70 pts au mieux). Niveau 2 : N = 2, celui du test du jour (100 pts au mieux). */
export const NBACK_LEVELS: readonly NBackLevel[] = [
  L(1, 'letter', 2500, 70),
  L(2, 'letter', 2500, 100),
  L(2, 'letter', 2200, 105),
  L(1, 'position', 2500, 80),
  L(2, 'position', 2500, 105),
  L(3, 'letter', 2500, 120),
  L(1, 'dual', 2700, 100),
  L(2, 'letter', 1900, 115),
  L(3, 'position', 2500, 125),
  L(2, 'dual', 2800, 125),
  L(3, 'letter', 2100, 130),
  L(4, 'letter', 2500, 140),
  L(2, 'dual', 2400, 135),
  L(3, 'position', 2100, 135),
  L(3, 'dual', 2800, 150),
  L(4, 'letter', 2100, 150),
  L(4, 'position', 2500, 155),
  L(3, 'dual', 2400, 160),
  L(4, 'dual', 2800, 170),
  L(4, 'dual', 2400, 180),
];

/** [français, anglais], choisis à l'affichage. */
const MODE_LABELS: Record<NBackMode, readonly [string, string]> = {
  letter: ['lettres', 'letters'],
  position: ['positions', 'positions'],
  dual: ['lettres et positions', 'letters and positions'],
};

export function nbackLevel(level: number): NBackLevel {
  return pickLevel(NBACK_LEVELS, level);
}

export function nbackLevelLabel(level: number): string {
  const c = nbackLevel(level);
  return [tr(`${c.n} en arrière`, `${c.n} back`), tr(...MODE_LABELS[c.mode]), c.stepMs < 2500 && tr('rapide', 'fast')].filter(Boolean).join(' · ');
}

export interface NBackStream<T> {
  values: T[];
  /** Vrai si la valeur est identique à celle d'il y a n positions. */
  targets: boolean[];
}

export interface NBackSequence {
  n: number;
  mode: NBackMode;
  /** n stimuli d'amorce, puis les 20 essais notés. */
  length: number;
  letter: NBackStream<string> | null;
  position: NBackStream<number> | null;
}

/** Un flux de stimuli avec exactement 6 cibles parmi les 20 essais notés. */
export function generateStream<T>(rng: Rng, n: number, pool: readonly T[]): NBackStream<T> {
  const total = n + NBACK_TRIALS;
  const scored = Array.from({ length: NBACK_TRIALS }, (_, i) => i + n);
  const targetPositions = new Set(rng.shuffle(scored).slice(0, NBACK_TARGETS));
  const values: T[] = [];
  for (let i = 0; i < total; i++) {
    if (targetPositions.has(i)) values.push(values[i - n]);
    else {
      const avoid = i >= n ? values[i - n] : undefined;
      values.push(rng.pick(pool.filter((v) => v !== avoid)));
    }
  }
  return { values, targets: values.map((v, i) => i >= n && v === values[i - n]) };
}

export function generateNBack(rng: Rng, level: number): NBackSequence {
  const { n, mode } = nbackLevel(level);
  return {
    n,
    mode,
    length: n + NBACK_TRIALS,
    letter: mode === 'position' ? null : generateStream(rng, n, NBACK_LETTERS),
    position: mode === 'letter' ? null : generateStream(rng, n, NBACK_POSITIONS),
  };
}

export interface NBackTally {
  hits: number;
  misses: number;
  falseAlarms: number;
  correctRejections: number;
}

/** Compte bonnes réponses et bonnes abstentions d'un flux, sur les essais notés. */
export function tallyStream(stream: NBackStream<unknown>, n: number, responses: readonly boolean[]): NBackTally {
  const tally: NBackTally = { hits: 0, misses: 0, falseAlarms: 0, correctRejections: 0 };
  for (let i = n; i < stream.values.length; i++) {
    const pressed = responses[i] === true;
    if (stream.targets[i]) {
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

/** 50 % de précision équilibrée = répondre au hasard, ou toujours pareil : 0 pt. */
export function usefulAccuracy(tallies: readonly NBackTally[]): number {
  if (tallies.length === 0) return 0;
  const mean = tallies.reduce((sum, t) => sum + balancedAccuracy(t), 0) / tallies.length;
  return Math.max(0, (mean - 0.5) / 0.5);
}

export function scoreNBack(tallies: readonly NBackTally[], level: number): number {
  return clampScore(usefulAccuracy(tallies) * nbackLevel(level).gain);
}

// ---------- Essai guidé ----------

/**
 * Séquences fixes de l'essai guidé (sans chrono) : environ un tiers de « pareil ». À 2 en arrière,
 * un piège : la lettre est la même qu'au coup d'avant, mais pas qu'il y a deux coups.
 */
const TUTORIAL_LETTERS: Record<1 | 2, string[]> = {
  1: ['K', 'R', 'R', 'T', 'T', 'B', 'K', 'K', 'M', 'M', 'S'],
  2: ['K', 'R', 'K', 'T', 'T', 'D', 'B', 'T', 'B', 'M', 'S', 'M'],
};
const LETTER_CELLS: Record<string, number> = { K: 4, R: 0, T: 8, D: 2, B: 6, M: 3, S: 1 };

export interface TutorialTrials {
  n: 1 | 2;
  values: (string | number)[];
  /** Vrai si la valeur est la même qu'il y a n coups. */
  targets: boolean[];
}

export function tutorialTrials(n: 1 | 2, channel: 'letter' | 'position'): TutorialTrials {
  const letters = TUTORIAL_LETTERS[n];
  const values = channel === 'letter' ? letters : letters.map((l) => LETTER_CELLS[l]);
  return { n, values, targets: values.map((v, i) => i >= n && v === values[i - n]) };
}
