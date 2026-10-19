import { tr } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { clampScore } from '../scoring';

/**
 * Flèches : une rangée de flèches, il faut donner le sens de celle du milieu
 * (ou, selon la consigne, celui des voisines) sans se laisser distraire.
 */

export type Dir = 'left' | 'right' | 'up' | 'down';
export const FLECHES_TRIALS = 30;

export interface FlechesLevel {
  dirs: 2 | 4;
  /** Flèches de chaque côté de celle du milieu. */
  flankers: 2 | 3;
  /** Part des essais où les voisines pointent ailleurs. */
  incongruent: number;
  rule: 'center' | 'flank' | 'switch';
  /** Rangée décalée au hasard. */
  jitter: boolean;
  /** Temps pour répondre. */
  windowMs: number;
}

const L = (
  dirs: 2 | 4,
  flankers: 2 | 3,
  incongruent: number,
  rule: FlechesLevel['rule'],
  windowMs: number,
  jitter = false,
): FlechesLevel => ({ dirs, flankers, incongruent, rule, jitter, windowMs });

export const FLECHES_LEVELS: readonly FlechesLevel[] = [
  L(2, 2, 0.5, 'center', 2000),
  L(2, 2, 0.5, 'center', 1600),
  L(2, 3, 0.6, 'center', 1600),
  L(4, 2, 0.5, 'center', 2000),
  L(2, 2, 0.5, 'flank', 1800),
  L(2, 2, 0.5, 'center', 1500, true),
  L(4, 2, 0.6, 'center', 1600),
  L(2, 2, 0.5, 'switch', 2000),
  L(4, 3, 0.6, 'center', 1700),
  L(2, 3, 0.6, 'switch', 1700),
  L(4, 2, 0.5, 'flank', 1800),
  L(4, 2, 0.6, 'center', 1400, true),
  L(2, 2, 0.7, 'switch', 1500),
  L(4, 3, 0.6, 'switch', 2000),
  L(4, 3, 0.7, 'center', 1300, true),
  L(2, 3, 0.7, 'switch', 1400, true),
  L(4, 2, 0.7, 'switch', 1600),
  L(4, 3, 0.7, 'flank', 1500, true),
  L(4, 3, 0.7, 'switch', 1500, true),
  L(4, 3, 0.8, 'switch', 1200, true),
];

export function flechesLevel(level: number): FlechesLevel {
  return pickLevel(FLECHES_LEVELS, level);
}

export function flechesLevelLabel(level: number): string {
  const c = flechesLevel(level);
  const rule = {
    center: tr('flèche du milieu', 'middle arrow'),
    flank: tr('flèches voisines', 'outer arrows'),
    switch: tr('consigne changeante', 'changing rule'),
  }[c.rule];
  const arrows = c.flankers * 2 + 1;
  const delay = secondsLabel(c.windowMs);
  return [rule, c.dirs === 4 ? '4 directions' : '2 directions', tr(`${arrows} flèches`, `${arrows} arrows`), tr(`${delay} pour répondre`, `${delay} to answer`)]
    .filter(Boolean)
    .join(' · ');
}

export interface FlechesTrial {
  center: Dir;
  flank: Dir;
  /** Ce qu'il faut regarder : la flèche du milieu ou ses voisines. */
  ask: 'center' | 'flank';
  /** Décalage horizontal de la rangée, en %. */
  offset: number;
}

export function flechesAnswer(trial: FlechesTrial): Dir {
  return trial.ask === 'center' ? trial.center : trial.flank;
}

export function generateFleches(rng: Rng, level: number): FlechesTrial[] {
  const c = flechesLevel(level);
  const dirs: Dir[] = c.dirs === 2 ? ['left', 'right'] : ['left', 'right', 'up', 'down'];
  const incongruentCount = Math.round(FLECHES_TRIALS * c.incongruent);
  const flags = rng.shuffle(Array.from({ length: FLECHES_TRIALS }, (_, i) => i < incongruentCount));
  return flags.map((incongruent) => {
    const center = rng.pick(dirs);
    const flank = incongruent ? rng.pick(dirs.filter((d) => d !== center)) : center;
    const ask = c.rule === 'switch' ? (rng.chance(0.5) ? 'center' : 'flank') : c.rule;
    return { center, flank, ask, offset: c.jitter ? rng.int(-18, 18) : 0 };
  });
}

/** Justesse (au-delà du hasard) pour 65 %, rapidité des bonnes réponses pour 35 %. */
export function scoreFleches(correct: number, meanRtMs: number | null, level: number): number {
  const c = flechesLevel(level);
  const chance = 1 / c.dirs;
  const useful = Math.max(0, (correct / FLECHES_TRIALS - chance) / (1 - chance));
  const speed = meanRtMs === null ? 0 : Math.min(1, Math.max(0, (c.windowMs - meanRtMs) / (c.windowMs - 350)));
  return clampScore(100 * (0.65 * useful + 0.35 * speed * useful));
}
