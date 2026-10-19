import { NBSP } from '../format';
import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * Horloges : lire une horloge à aiguilles, dire l'heure qu'il sera plus tard,
 * ou le temps écoulé entre deux horloges. Quatre propositions, 60 secondes.
 */

export const HORLOGES_DURATION_MS = 60_000;
export const HALF_DAY = 720;

export type HorlogeMode = 'read' | 'later' | 'elapsed';
/** Chiffres sur le cadran : tous, seulement 12-3-6-9, ou aucun. */
export type Numerals = 'all' | 'quarters' | 'none';

export interface HorlogeLevel {
  modes: HorlogeMode[];
  /** Précision des heures affichées, en minutes. */
  step: number;
  numerals: Numerals;
  /** Écart maximum (modes « plus tard » et « temps écoulé »), en minutes. */
  maxDelta: number;
  /** Bonnes réponses en 60 s pour 100 pts (une erreur en retire une). */
  target: number;
}

const L = (modes: HorlogeMode[], step: number, numerals: Numerals, maxDelta: number, target: number): HorlogeLevel => ({ modes, step, numerals, maxDelta, target });
const ALL: HorlogeMode[] = ['read', 'later', 'elapsed'];
const MOVES: HorlogeMode[] = ['later', 'elapsed'];

export const HORLOGES_LEVELS: readonly HorlogeLevel[] = [
  L(['read'], 30, 'all', 0, 14),
  L(['read'], 15, 'all', 0, 14),
  L(['read'], 5, 'all', 0, 13),
  L(['read', 'later'], 15, 'all', 120, 12),
  L(['read'], 5, 'quarters', 0, 12),
  L(['read', 'later'], 5, 'all', 90, 12),
  L(['elapsed'], 15, 'all', 180, 11),
  L(ALL, 5, 'all', 240, 11),
  L(['read'], 1, 'all', 0, 11),
  L(MOVES, 5, 'quarters', 240, 10),
  L(['read'], 1, 'quarters', 0, 10),
  L(ALL, 5, 'quarters', 300, 10),
  L(MOVES, 5, 'quarters', 360, 10),
  L(['read'], 1, 'none', 0, 10),
  L(ALL, 5, 'none', 360, 9),
  L(MOVES, 1, 'quarters', 300, 9),
  L(ALL, 1, 'quarters', 420, 9),
  L(MOVES, 5, 'none', 480, 8),
  L(ALL, 1, 'none', 480, 8),
  L(MOVES, 1, 'none', 600, 8),
];

export function horlogesLevel(level: number): HorlogeLevel {
  return pickLevel(HORLOGES_LEVELS, level);
}

/** Noms des modes et des cadrans : [français, anglais], choisis à l'affichage. */
const MODE_NAMES: Record<HorlogeMode, readonly [string, string]> = {
  read: ['lire l’heure', 'tell the time'],
  later: ['heure d’arrivée', 'time later'],
  elapsed: ['temps écoulé', 'time elapsed'],
};
const NUMERAL_NAMES: Record<Numerals, readonly [string, string]> = {
  all: ['cadran chiffré', 'all numbers'],
  quarters: ['4 chiffres', '4 numbers'],
  none: ['sans chiffres', 'no numbers'],
};

function stepName(step: number): string {
  if (step === 1) return tr('à la minute', 'to the minute');
  if (step === 30) return tr('à la demi-heure', 'to the half hour');
  if (step === 15) return tr('au quart d’heure', 'to the quarter hour');
  return tr(`à ${step}${NBSP}min`, `to ${step}${NBSP}min`);
}

export function horlogesLevelLabel(level: number): string {
  const c = horlogesLevel(level);
  const label = [c.modes.map((m) => tr(...MODE_NAMES[m])).join(', '), stepName(c.step), tr(...NUMERAL_NAMES[c.numerals])].join(' · ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const pad = (n: number) => String(n).padStart(2, '0');
const wrap = (t: number) => ((t % HALF_DAY) + HALF_DAY) % HALF_DAY;

/** 135 → « 2 h 15 » (« 2:15 » en anglais ; cadran de 12 heures : 0 se lit 12). */
export function formatClock(t: number): string {
  const m = wrap(t);
  const h = Math.floor(m / 60) || 12;
  return tr(`${h}${NBSP}h${NBSP}${pad(m % 60)}`, `${h}:${pad(m % 60)}`);
}

/** 45 → « 45 min », 60 → « 1 h », 85 → « 1 h 25 » (« 1 hr 25 min » en anglais). */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}${NBSP}min`;
  const h = Math.floor(minutes / 60);
  if (!(minutes % 60)) return tr(`${h}${NBSP}h`, `${h}${NBSP}hr`);
  return tr(`${h}${NBSP}h${NBSP}${pad(minutes % 60)}`, `${h}${NBSP}hr${NBSP}${minutes % 60}${NBSP}min`);
}

export interface HorlogeQuestion {
  mode: HorlogeMode;
  /** Heure de l'horloge (minutes depuis 12 h 00). */
  clock: number;
  /** Seconde horloge (temps écoulé). */
  clock2: number | null;
  /** Durée à ajouter (mode « plus tard »). */
  delta: number;
  options: string[];
  answer: number;
}

function randomTime(rng: Rng, step: number): number {
  return rng.int(0, HALF_DAY / step - 1) * step;
}

/** Les pièges classiques : aiguilles inversées, heure voisine, minutes voisines, lecture en miroir. */
function clockTraps(t: number, step: number): number[] {
  const h = Math.floor(t / 60) || 12;
  const m = t % 60;
  const swapped = (Math.round(m / 5) % 12) * 60 + ((h % 12) * 5);
  return [swapped, t + 60, t - 60, t + Math.max(step, 5), t - Math.max(step, 5), HALF_DAY - t, t + 30].map(wrap);
}

function durationTraps(d: number, step: number): number[] {
  return [d + 60, d - 60, d + Math.max(step, 5), d - Math.max(step, 5), HALF_DAY - d, d + 30, d - 30].filter((x) => x > 0 && x < HALF_DAY);
}

function withTraps(rng: Rng, answer: number, traps: number[], format: (v: number) => string, fallback: () => number) {
  const values = [answer];
  for (const trap of rng.shuffle(traps)) if (values.length < 4 && !values.includes(trap)) values.push(trap);
  while (values.length < 4) {
    const v = fallback();
    if (!values.includes(v)) values.push(v);
  }
  const shuffled = rng.shuffle(values);
  return { options: shuffled.map(format), answer: shuffled.indexOf(answer) };
}

export function generateHorlogeQuestion(rng: Rng, level: number): HorlogeQuestion {
  const c = horlogesLevel(level);
  const mode = rng.pick(c.modes);
  const clock = randomTime(rng, c.step);
  if (mode === 'read') {
    return { mode, clock, clock2: null, delta: 0, ...withTraps(rng, clock, clockTraps(clock, c.step), formatClock, () => randomTime(rng, c.step)) };
  }
  const deltaStep = Math.max(c.step, 5);
  const delta = rng.int(Math.ceil(20 / deltaStep), Math.floor(c.maxDelta / deltaStep)) * deltaStep;
  if (mode === 'later') {
    const answer = wrap(clock + delta);
    return { mode, clock, clock2: null, delta, ...withTraps(rng, answer, [...clockTraps(answer, c.step), wrap(clock - delta)], formatClock, () => randomTime(rng, c.step)) };
  }
  const traps = durationTraps(delta, c.step);
  return {
    mode,
    clock,
    clock2: wrap(clock + delta),
    delta: 0,
    ...withTraps(rng, delta, traps, formatDuration, () => rng.int(1, Math.floor(c.maxDelta / deltaStep)) * deltaStep),
  };
}

export function generateHorloges(rng: Rng, level: number, count = 40): HorlogeQuestion[] {
  return Array.from({ length: count }, () => generateHorlogeQuestion(rng, level));
}

export function scoreHorloges(correct: number, errors: number, level: number): number {
  return countScore(correct - errors, 0, horlogesLevel(level).target);
}

/** Angles des aiguilles, en degrés depuis midi, sens des aiguilles d'une montre. */
export function handAngles(t: number): { hour: number; minute: number } {
  const m = wrap(t);
  return { hour: m / 2, minute: (m % 60) * 6 };
}
