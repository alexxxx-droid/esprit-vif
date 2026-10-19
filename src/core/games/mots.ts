import { tr } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { clampScore } from '../scoring';
import { categories } from './lexique';

/**
 * Mots à retenir : une liste à mémoriser, puis des mots un par un — « vu » ou « pas vu » ?
 * Aux niveaux avancés, les mots nouveaux viennent des mêmes catégories que la liste : le piège du « déjà-vu ».
 */

export type Lures = 'random' | 'category';

export interface MotsLevel {
  count: number;
  studyMs: number;
  lures: Lures;
}

const L = (count: number, studyMs: number, lures: Lures = 'random'): MotsLevel => ({ count, studyMs, lures });

export const MOTS_LEVELS: readonly MotsLevel[] = [
  L(6, 15_000),
  L(8, 18_000),
  L(8, 14_000),
  L(10, 20_000),
  L(10, 16_000),
  L(8, 14_000, 'category'),
  L(12, 22_000),
  L(10, 16_000, 'category'),
  L(12, 18_000),
  L(12, 18_000, 'category'),
  L(14, 22_000),
  L(14, 20_000, 'category'),
  L(16, 24_000),
  L(14, 16_000, 'category'),
  L(16, 22_000, 'category'),
  L(18, 26_000),
  L(16, 18_000, 'category'),
  L(18, 22_000, 'category'),
  L(20, 26_000, 'category'),
  L(20, 22_000, 'category'),
];

export function motsLevel(level: number): MotsLevel {
  return pickLevel(MOTS_LEVELS, level);
}

export function motsLevelLabel(level: number): string {
  const c = motsLevel(level);
  const study = secondsLabel(c.studyMs);
  return [
    tr(`${c.count} mots`, `${c.count} words`),
    tr(`${study} pour les lire`, `${study} to read them`),
    c.lures === 'category' && tr('pièges de même famille', 'same-category traps'),
  ]
    .filter(Boolean)
    .join(' · ');
}

export interface MotsProbe {
  word: string;
  seen: boolean;
}

export interface MotsRound {
  study: string[];
  probes: MotsProbe[];
}

export function generateMots(rng: Rng, level: number): MotsRound {
  const { count, lures } = motsLevel(level);
  let study: string[];
  let fresh: string[];
  if (lures === 'category') {
    // Quelques catégories, des mots à apprendre et autant de pièges dans chacune.
    const cats = rng.shuffle(categories()).slice(0, Math.ceil(count / 3));
    const pools = cats.map((c) => rng.shuffle(c.words));
    study = [];
    fresh = [];
    for (let i = 0; study.length < count; i++) {
      const pool = pools[i % pools.length];
      study.push(pool[2 * Math.floor(i / pools.length)]);
      fresh.push(pool[2 * Math.floor(i / pools.length) + 1]);
    }
  } else {
    const all = rng.shuffle(categories().flatMap((c) => c.words));
    study = all.slice(0, count);
    fresh = all.slice(count, count * 2);
  }
  const probes = rng.shuffle([...study.map((word) => ({ word, seen: true })), ...fresh.map((word) => ({ word, seen: false }))]);
  return { study: rng.shuffle(study), probes };
}

/** Bons « vu » moins fausses alarmes, rapportés au nombre de mots : répondre au hasard donne 0. */
export function scoreMots(hits: number, falseAlarms: number, level: number): number {
  return clampScore(((hits - falseAlarms) / motsLevel(level).count) * 100);
}
