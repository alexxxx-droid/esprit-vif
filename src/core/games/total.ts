import { tr } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { clampScore } from '../scoring';

export const TOTAL_ROUNDS = 5;
export const TOTAL_MIN_LENGTH = 3;
export const TOTAL_MAX_LENGTH = 14;
export const TOTAL_MAX_VALUE = 99;

export interface TotalLevel {
  /** Plus grand nombre qui peut défiler (au plus la moitié du total maximum : on peut toujours ajouter ou retirer). */
  maxStep: number;
  /** Durée d'affichage de chaque nombre. */
  stepMs: number;
  /** Longueur de la première manche (4 selon la spec). */
  start: number;
  /** Plus grand total possible : 99 jusqu'au niveau 20, puis jusqu'à 999. */
  maxValue?: number;
  /** Part des nombres barrés : ils défilent mais ne comptent pas (niveaux Maître et Légende). */
  decoys?: number;
  /** Part des « ×2 » (et « ×3 ») qui multiplient le total. */
  times?: number;
  /** Plus grand multiplicateur. */
  maxFactor?: 2 | 3;
}

type TotalTwists = Pick<TotalLevel, 'decoys' | 'times' | 'maxFactor'>;

const L = (maxStep: number, stepMs: number, start = 4): TotalLevel => ({ maxStep, stepMs, start });
/** Niveaux 21 et plus : totaux à trois chiffres, puis nombres barrés et multiplications. */
const X = (maxStep: number, stepMs: number, start: number, maxValue: number, twists: TotalTwists = {}): TotalLevel => ({
  maxStep,
  stepMs,
  start,
  maxValue,
  ...twists,
});

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
  // Expert : le total monte jusqu'à 199, 299, 499 puis 999.
  X(30, 1100, 5, 199),
  X(49, 1050, 5, 199),
  X(60, 1100, 5, 299),
  X(30, 900, 6, 199),
  X(75, 1100, 5, 499),
  X(49, 900, 6, 299),
  X(99, 1150, 5, 999),
  X(60, 850, 6, 499),
  X(99, 1000, 6, 999),
  X(60, 700, 8, 299),
  // Maître : des nombres barrés à ignorer, des « ×2 » qui doublent le total.
  X(30, 1000, 5, 199, { decoys: 0.25 }),
  X(49, 950, 6, 299, { decoys: 0.25 }),
  X(20, 1100, 5, 199, { times: 0.2 }),
  X(99, 900, 6, 999),
  X(60, 900, 6, 499, { decoys: 0.25 }),
  X(30, 950, 6, 299, { times: 0.2 }),
  X(99, 850, 7, 999, { decoys: 0.2 }),
  X(49, 900, 6, 499, { times: 0.2 }),
  X(75, 800, 7, 999, { decoys: 0.2, times: 0.15 }),
  X(99, 650, 8, 999, { decoys: 0.25 }),
  // Légende : nombres jusqu'à 199, « ×3 », tout à la fois.
  X(99, 700, 7, 999, { times: 0.2, maxFactor: 3 }),
  X(150, 950, 6, 999, { decoys: 0.2 }),
  X(49, 600, 8, 499, { times: 0.2, decoys: 0.2 }),
  X(199, 1000, 6, 999),
  X(99, 600, 8, 999, { decoys: 0.25 }),
  X(150, 800, 7, 999, { times: 0.2, decoys: 0.2, maxFactor: 3 }),
  X(99, 550, 8, 999, { times: 0.2, maxFactor: 3 }),
  X(199, 850, 7, 999, { decoys: 0.25, times: 0.15, maxFactor: 3 }),
  X(150, 650, 8, 999, { decoys: 0.25, times: 0.2, maxFactor: 3 }),
  X(199, 600, 9, 999, { decoys: 0.25, times: 0.2, maxFactor: 3 }),
];

export function totalLevel(level: number): TotalLevel {
  return pickLevel(TOTAL_LEVELS, level);
}

/** Plus grand total possible au niveau donné (99 jusqu'au niveau 20). */
export function totalMaxValue(level: number): number {
  return totalLevel(level).maxValue ?? TOTAL_MAX_VALUE;
}

export function totalLevelLabel(level: number): string {
  const c = totalLevel(level);
  const step = secondsLabel(c.stepMs);
  const max = totalMaxValue(level);
  return [
    tr(`Jusqu’à ${c.maxStep}`, `Up to ${c.maxStep}`),
    tr(`un nombre toutes les ${step}`, `a number every ${step}`),
    c.start > 4 && tr(`départ à ${c.start}`, `starts at ${c.start}`),
    max > TOTAL_MAX_VALUE && tr(`total jusqu’à ${max}`, `totals up to ${max}`),
    c.times && (c.maxFactor === 3 ? tr('des ×2 et ×3', '×2 and ×3 steps') : tr('des ×2', '×2 steps')),
    c.decoys && tr('nombres barrés', 'crossed-out numbers'),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** La règle affichée à l'intro : les multiplications et les nombres barrés s'y ajoutent quand le niveau en a. */
export function totalRule(level: number): string {
  const c = totalLevel(level);
  return [
    tr('Additionne de tête les nombres qui défilent, puis donne le total final.', 'Add up the numbers in your head as they go by, then give the final total.'),
    c.times &&
      (c.maxFactor === 3
        ? tr('« ×2 » double le total, « ×3 » le triple.', '“×2” doubles the total, “×3” triples it.')
        : tr('« ×2 » double le total.', '“×2” doubles the total.')),
    c.decoys && tr('Les nombres barrés ne comptent pas.', 'Crossed-out numbers don’t count.'),
  ]
    .filter(Boolean)
    .join(' ');
}

/** `add` : s'ajoute au total (signé) ; `times` : le multiplie ; `decoy` : barré, ne compte pas. */
export type TotalStepKind = 'add' | 'times' | 'decoy';

export interface TotalRound {
  /** Nombres signés qui défilent (+7, −3…), ou le multiplicateur d'un « ×2 ». */
  steps: number[];
  /** Nature de chaque nombre, aux seuls niveaux qui mélangent (nombres barrés, ×2) : absent = que des + et des −. */
  kinds?: TotalStepKind[];
  total: number;
}

/**
 * Une manche : le total partiel reste toujours entre 0 et le maximum du niveau (99 jusqu'au niveau 20).
 * Jamais deux nombres barrés de suite ; un « ×2 » suit toujours une addition ou une soustraction.
 */
export function generateTotalRound(rng: Rng, length: number, level: number): TotalRound {
  const { maxStep, decoys = 0, times = 0, maxFactor = 2 } = totalLevel(level);
  const maxValue = totalMaxValue(level);
  const steps: number[] = [];
  const kinds: TotalStepKind[] = [];
  let total = 0;
  for (let i = 0; i < length; i++) {
    // Les rebondissements ne tirent au sort que s'ils existent au niveau : les niveaux 1 à 20 restent identiques.
    if (decoys > 0 && i > 0 && kinds[i - 1] !== 'decoy' && rng.chance(decoys)) {
      const magnitude = rng.int(1, maxStep);
      steps.push(rng.chance(0.5) ? magnitude : -magnitude);
      kinds.push('decoy');
      continue;
    }
    if (times > 0 && kinds[i - 1] === 'add' && total >= 2 && total * 2 <= maxValue && rng.chance(times)) {
      const factor = maxFactor === 3 && total * 3 <= maxValue && rng.chance(0.4) ? 3 : 2;
      steps.push(factor);
      kinds.push('times');
      total *= factor;
      continue;
    }
    const magnitude = rng.int(1, maxStep);
    const canAdd = total + magnitude <= maxValue;
    const canSubtract = total - magnitude >= 0;
    const subtract = canSubtract && (!canAdd || rng.chance(0.45));
    const step = subtract ? -magnitude : magnitude;
    steps.push(step);
    kinds.push('add');
    total += step;
  }
  return decoys > 0 || times > 0 ? { steps, kinds, total } : { steps, total };
}

/** Ce qui s'affiche pour le nombre `i` d'une manche : « +7 », « −3 » ou « ×2 ». */
export function formatTotalStep(round: TotalRound, i: number): string {
  return round.kinds?.[i] === 'times' ? `×${round.steps[i]}` : formatStep(round.steps[i]);
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
