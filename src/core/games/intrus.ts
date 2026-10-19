import type { Rng } from '../rng';
import { clampLevel, countScore } from '../scoring';

export interface IntrusPair {
  base: string;
  odd: string;
  /** 1 = se repère d'un coup d'œil, 3 = demande de l'attention. */
  tier: 1 | 2 | 3;
}

export const INTRUS_PAIRS: readonly IntrusPair[] = [
  { base: 'O', odd: 'Q', tier: 1 },
  { base: 'E', odd: 'F', tier: 1 },
  { base: 'M', odd: 'N', tier: 1 },
  { base: 'C', odd: 'G', tier: 1 },
  { base: 'P', odd: 'R', tier: 1 },
  { base: 'V', odd: 'Y', tier: 1 },
  { base: 'b', odd: 'd', tier: 2 },
  { base: 'p', odd: 'q', tier: 2 },
  { base: '6', odd: '9', tier: 2 },
  { base: 'n', odd: 'u', tier: 2 },
  { base: '3', odd: '8', tier: 2 },
  { base: 'W', odd: 'M', tier: 2 },
  { base: 'c', odd: 'ç', tier: 2 },
  { base: '5', odd: 'S', tier: 3 },
  { base: '2', odd: 'Z', tier: 3 },
  { base: '8', odd: 'B', tier: 3 },
  { base: '0', odd: 'O', tier: 3 },
  { base: 'é', odd: 'è', tier: 3 },
  { base: '6', odd: 'G', tier: 3 },
];

export const INTRUS_DURATION_MS = 45_000;
export const INTRUS_PENALTY_MS = 2000;
export const INTRUS_MAX_LEVEL = 3;
export const INTRUS_MIN_SIZE = 3;
export const INTRUS_MAX_SIZE = 6;

const TIERS: Record<number, readonly number[]> = { 1: [1, 2], 2: [1, 2, 3], 3: [2, 3] };
const START_SIZE: Record<number, number> = { 1: 3, 2: 4, 3: 4 };
const GROW_EVERY: Record<number, number> = { 1: 5, 2: 5, 3: 4 };

/** Trouvés pour 100 pts : 20 au niveau 1 (spec), un peu moins aux niveaux plus durs. */
export const INTRUS_TARGET: Record<number, number> = { 1: 20, 2: 18, 3: 16 };

/** La grille grandit de 3 × 3 à 6 × 6 au fil des réussites. */
export function intrusSize(found: number, level: number): number {
  const lvl = clampLevel(level, INTRUS_MAX_LEVEL);
  return Math.min(INTRUS_MAX_SIZE, START_SIZE[lvl] + Math.floor(found / GROW_EVERY[lvl]));
}

export interface IntrusBoard {
  size: number;
  base: string;
  odd: string;
  oddIndex: number;
}

export function generateIntrus(rng: Rng, size: number, level: number, previous?: IntrusBoard): IntrusBoard {
  const tiers = TIERS[clampLevel(level, INTRUS_MAX_LEVEL)];
  const pool = INTRUS_PAIRS.filter(
    (p) => tiers.includes(p.tier) && !(previous && [p.base, p.odd].includes(previous.base) && [p.base, p.odd].includes(previous.odd)),
  );
  const pair = rng.pick(pool);
  // Tantôt beaucoup de « b » et un « d », tantôt l'inverse.
  const [base, odd] = rng.chance(0.5) ? [pair.base, pair.odd] : [pair.odd, pair.base];
  return { size, base, odd, oddIndex: rng.int(0, size * size - 1) };
}

export function scoreIntrus(found: number, level: number): number {
  return countScore(found, 0, INTRUS_TARGET[clampLevel(level, INTRUS_MAX_LEVEL)]);
}
