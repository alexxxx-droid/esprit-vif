import { tr } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';
import { generateFromKinds, type CalcKind, type CalcQuestion } from './calcul';

/**
 * Pluie de calculs : des gouttes tombent, chacune porte un calcul. On tape le résultat avant
 * qu'elles touchent l'eau. Trois gouttes perdues et c'est fini.
 */

export const PLUIE_DURATION_MS = 60_000;
export const PLUIE_LIVES = 3;

export interface PluieLevel {
  kinds: CalcKind[];
  /** Temps de chute d'une goutte, du ciel à l'eau. */
  fallMs: number;
  /** Une nouvelle goutte toutes les… */
  spawnMs: number;
  lanes: 3 | 4;
}

const L = (kinds: CalcKind[], fallMs: number, spawnMs: number, lanes: 3 | 4 = 4): PluieLevel => ({ kinds, fallMs, spawnMs, lanes });

export const PLUIE_LEVELS: readonly PluieLevel[] = [
  L(['add1', 'sub1'], 9000, 3200, 3),
  L(['add1', 'sub1', 'mul1'], 8500, 3000, 3),
  L(['add1', 'sub1', 'mul1'], 7500, 2700, 3),
  L(['add2', 'sub2'], 8500, 3200, 3),
  L(['mul1'], 7000, 2500, 3),
  L(['add2', 'sub2', 'mul1'], 7500, 2700),
  L(['mul12'], 7500, 2800),
  L(['add1', 'sub1', 'mul1'], 6000, 2100),
  L(['mul12', 'div12'], 7500, 2800),
  L(['add100', 'sub100'], 7500, 2700),
  L(['add2', 'sub2', 'mul12'], 6500, 2400),
  L(['mulTeen', 'divTwo'], 7500, 2800),
  L(['mul12', 'div12', 'add100'], 6000, 2200),
  L(['add1', 'sub1', 'mul1'], 4800, 1700),
  L(['add3', 'sub3'], 7500, 2800),
  L(['mul12', 'div12'], 5500, 2000),
  L(['chainAddSub', 'mul12'], 6500, 2500),
  L(['mulTeen', 'divTwo', 'add100'], 5500, 2100),
  L(['mul12', 'div12', 'add2', 'sub2'], 4800, 1800),
  L(['square', 'mul2x1', 'div3'], 6500, 2400),
];

export function pluieLevel(level: number): PluieLevel {
  return pickLevel(PLUIE_LEVELS, level);
}

/** Gouttes résolues pour 100 pts : 80 % de celles qui tombent en une minute. */
export function pluieTarget(level: number): number {
  return Math.round((PLUIE_DURATION_MS / pluieLevel(level).spawnMs) * 0.8);
}

export function pluieLevelLabel(level: number): string {
  const c = pluieLevel(level);
  const fall = secondsLabel(c.fallMs);
  const spawn = secondsLabel(c.spawnMs);
  return tr(`Chute en ${fall} · une goutte toutes les ${spawn}`, `Falls in ${fall} · a new drop every ${spawn}`);
}

export interface PluieDrop {
  id: number;
  question: CalcQuestion;
  lane: number;
  /** Moment d'apparition, en ms depuis le début. */
  spawnAt: number;
}

/** Toute la pluie d'une partie, prévue à l'avance : rejouable à l'identique. */
export function generatePluie(rng: Rng, level: number): PluieDrop[] {
  const c = pluieLevel(level);
  const count = Math.floor(PLUIE_DURATION_MS / c.spawnMs);
  const questions = generateFromKinds(rng, c.kinds, count);
  let previousLane = -1;
  return questions.map((question, id) => {
    const lanes = Array.from({ length: c.lanes }, (_, i) => i).filter((l) => l !== previousLane);
    const lane = rng.pick(lanes);
    previousLane = lane;
    return { id, question, lane, spawnAt: 600 + id * c.spawnMs };
  });
}

export function scorePluie(solved: number, level: number): number {
  return countScore(solved, 0, pluieTarget(level));
}
