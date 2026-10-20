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
  /**
   * Pièges par flux : des essais non cibles où revient la valeur d'il y a n − 1 ou n + 1 coups
   * (« presque pareil »), pour qui répond au sentiment de déjà-vu sans compter.
   */
  lures: number;
}

const L = (n: number, mode: NBackMode, stepMs: number, gain: number): NBackLevel => ({ n, mode, stepMs, gain, lures: 0 });

/**
 * Charge d'un niveau, en « crans de N » : N, + 1,5 en double, + 1 par 0,4 s de rythme gagné sous 2,5 s,
 * + 0,25 par piège. Elle ne baisse jamais du niveau 20 au niveau 50.
 */
export function nbackLoad(c: Pick<NBackLevel, 'n' | 'mode' | 'stepMs' | 'lures'>): number {
  return c.n + (c.mode === 'dual' ? 1.5 : 0) + (2500 - c.stepMs) / 400 + c.lures * 0.25;
}

/**
 * Niveaux 21 à 50 : le plafond de points suit la charge (180 à la charge du niveau 20, + 20 par cran),
 * pour que la première étoile reste à portée (environ 62 à 67 % de précision équilibrée).
 */
const X = (n: number, mode: NBackMode, stepMs: number, lures: number): NBackLevel => {
  const load = nbackLoad({ n, mode, stepMs, lures });
  return { n, mode, stepMs, lures, gain: Math.round((180 + 20 * (load - 5.75)) / 5) * 5 };
};

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
  // Expert : 5 en arrière, puis les pièges (n ± 1) ; 6 en arrière pour finir.
  X(5, 'letter', 2200, 0),
  X(5, 'position', 2200, 0),
  X(4, 'letter', 2200, 4),
  X(3, 'dual', 2200, 4),
  X(5, 'letter', 2000, 0),
  X(4, 'position', 2000, 4),
  X(4, 'dual', 2400, 3),
  X(5, 'position', 2200, 3),
  X(6, 'letter', 2300, 0),
  X(4, 'dual', 2200, 4),
  // Maître : 6 en arrière avec pièges, double retour à 5.
  X(6, 'letter', 2300, 3),
  X(6, 'position', 2300, 3),
  X(5, 'dual', 2500, 3),
  X(5, 'letter', 1900, 5),
  X(4, 'dual', 2000, 5),
  X(6, 'position', 2100, 4),
  X(5, 'dual', 2200, 4),
  X(6, 'letter', 2000, 4),
  X(5, 'dual', 2100, 4),
  X(6, 'position', 1900, 5),
  // Légende : pièges en nombre (jusqu'à 8 essais sur 14 non cibles), rythme jusqu'à 1,7 s (2 s en double).
  X(5, 'dual', 2100, 5),
  X(6, 'letter', 1800, 5),
  X(5, 'dual', 2000, 5),
  X(6, 'position', 1800, 6),
  X(5, 'dual', 2000, 6),
  X(6, 'letter', 1700, 6),
  X(6, 'position', 1700, 6),
  X(5, 'dual', 2000, 7),
  X(6, 'letter', 1700, 7),
  X(5, 'dual', 2000, 8),
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
  const pace = c.stepMs <= 1800 ? tr('très rapide', 'very fast') : c.stepMs < 2500 && tr('rapide', 'fast');
  return [tr(`${c.n} en arrière`, `${c.n} back`), tr(...MODE_LABELS[c.mode]), pace, c.lures > 0 && tr('pièges', 'traps')].filter(Boolean).join(' · ');
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

/**
 * Un flux de stimuli avec exactement 6 cibles parmi les 20 essais notés. Avec des pièges, certains essais
 * non cibles reprennent la valeur d'il y a n − 1 ou n + 1 coups (jamais celle d'il y a n : ce serait une cible).
 */
export function generateStream<T>(rng: Rng, n: number, pool: readonly T[], lures = 0): NBackStream<T> {
  const total = n + NBACK_TRIALS;
  const scored = Array.from({ length: NBACK_TRIALS }, (_, i) => i + n);
  const targetPositions = new Set(rng.shuffle(scored).slice(0, NBACK_TARGETS));
  const lurePositions =
    lures > 0 ? new Set(rng.shuffle(scored.filter((i) => i > n && !targetPositions.has(i))).slice(0, lures)) : new Set<number>();
  const values: T[] = [];
  for (let i = 0; i < total; i++) {
    if (targetPositions.has(i)) values.push(values[i - n]);
    else {
      const avoid = i >= n ? values[i - n] : undefined;
      const near = lurePositions.has(i) ? [n > 1 ? values[i - n + 1] : undefined, values[i - n - 1]].filter((v) => v !== undefined && v !== avoid) : [];
      values.push(near.length > 0 ? (rng.pick(near) as T) : rng.pick(pool.filter((v) => v !== avoid)));
    }
  }
  return { values, targets: values.map((v, i) => i >= n && v === values[i - n]) };
}

/** Essais notés non cibles dont la valeur est celle d'il y a n − 1 ou n + 1 coups : les « presque pareil ». */
export function countLures(stream: NBackStream<unknown>, n: number): number {
  let count = 0;
  for (let i = n; i < stream.values.length; i++) {
    const v = stream.values[i];
    if (!stream.targets[i] && ((n > 1 && v === stream.values[i - n + 1]) || (i > n && v === stream.values[i - n - 1]))) count++;
  }
  return count;
}

export function generateNBack(rng: Rng, level: number): NBackSequence {
  const { n, mode, lures } = nbackLevel(level);
  return {
    n,
    mode,
    length: n + NBACK_TRIALS,
    letter: mode === 'position' ? null : generateStream(rng, n, NBACK_LETTERS, lures),
    position: mode === 'letter' ? null : generateStream(rng, n, NBACK_POSITIONS, lures),
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
