import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

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

/** Symboles qui ne ressemblent pas à leur reflet : l'intrus est le même symbole, retourné. */
export const INTRUS_MIRROR_CHARS = ['F', 'R', 'L', 'J', 'K', 'N', 'S', 'Z', 'G', 'P', '4', '7', 'E'];

export const INTRUS_DURATION_MS = 45_000;
export const INTRUS_PENALTY_MS = 2000;
export const INTRUS_MAX_SIZE = 6;

export interface IntrusLevel {
  /** Familles de paires utilisées. */
  tiers: number[];
  /** Intrus en miroir. */
  mirror: boolean;
  start: number;
  /** La grille grandit toutes les N trouvailles. */
  growEvery: number;
  /** Symboles inclinés au hasard. */
  tilt: boolean;
  /** Trouvés pour 100 pts. */
  target: number;
}

const L = (tiers: number[], mirror: boolean, start: number, growEvery: number, tilt: boolean, target: number): IntrusLevel => ({
  tiers,
  mirror,
  start,
  growEvery,
  tilt,
  target,
});

/** Niveau 1 : la spec (grille de 3 × 3 à 6 × 6, 45 s, 20 trouvés = 100). */
export const INTRUS_LEVELS: readonly IntrusLevel[] = [
  L([1, 2], false, 3, 5, false, 20),
  L([1, 2, 3], false, 3, 5, false, 20),
  L([1, 2], false, 4, 4, false, 19),
  L([3], false, 3, 5, false, 18),
  L([1, 2], false, 3, 5, true, 18),
  L([], true, 3, 5, false, 18),
  L([2, 3], false, 4, 4, false, 17),
  L([1, 2, 3], false, 3, 4, true, 17),
  L([], true, 4, 4, false, 16),
  L([3], false, 4, 4, true, 16),
  L([1, 2, 3], true, 4, 4, false, 16),
  L([], true, 3, 4, true, 15),
  L([2, 3], false, 5, 3, true, 15),
  L([3], true, 4, 3, false, 15),
  L([], true, 4, 3, true, 14),
  L([1, 2, 3], true, 5, 3, true, 14),
  L([3], false, 5, 3, true, 14),
  L([], true, 5, 3, true, 13),
  L([3], true, 5, 2, true, 13),
  L([3], true, 6, 2, true, 12),
];

export function intrusLevel(level: number): IntrusLevel {
  return pickLevel(INTRUS_LEVELS, level);
}

export function intrusLevelLabel(level: number): string {
  const c = intrusLevel(level);
  const symbols = c.tiers.length === 0 ? 'miroirs' : c.tiers.includes(1) ? (c.tiers.includes(3) ? 'symboles variés' : 'symboles faciles') : 'symboles trompeurs';
  return [symbols, c.mirror && c.tiers.length > 0 && 'miroirs', c.tilt && 'en désordre', `dès ${c.start} × ${c.start}`]
    .filter(Boolean)
    .join(' · ');
}

/** La grille grandit au fil des réussites, jusqu'à 6 × 6. */
export function intrusSize(found: number, level: number): number {
  const c = intrusLevel(level);
  return Math.min(INTRUS_MAX_SIZE, c.start + Math.floor(found / c.growEvery));
}

export interface IntrusBoard {
  size: number;
  base: string;
  odd: string;
  oddIndex: number;
  /** L'intrus est le même symbole que les autres, mais retourné en miroir. */
  mirrored: boolean;
  /** Inclinaison de chaque case, en degrés. */
  tilts: number[];
}

export function generateIntrus(rng: Rng, size: number, level: number, previous?: IntrusBoard): IntrusBoard {
  const c = intrusLevel(level);
  const count = size * size;
  const tilts = Array.from({ length: count }, () => (c.tilt ? rng.int(-35, 35) : 0));
  const oddIndex = rng.int(0, count - 1);
  if (c.mirror && (c.tiers.length === 0 || rng.chance(0.5))) {
    const char = rng.pick(INTRUS_MIRROR_CHARS.filter((ch) => ch !== previous?.base));
    return { size, base: char, odd: char, oddIndex, mirrored: true, tilts };
  }
  const pool = INTRUS_PAIRS.filter(
    (p) => c.tiers.includes(p.tier) && !(previous && [p.base, p.odd].includes(previous.base) && [p.base, p.odd].includes(previous.odd)),
  );
  const pair = rng.pick(pool);
  // Tantôt beaucoup de « b » et un « d », tantôt l'inverse.
  const [base, odd] = rng.chance(0.5) ? [pair.base, pair.odd] : [pair.odd, pair.base];
  return { size, base, odd, oddIndex, mirrored: false, tilts };
}

export function scoreIntrus(found: number, level: number): number {
  return countScore(found, 0, intrusLevel(level).target);
}
