import { tr } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { clampScore } from '../scoring';
import { categories } from './lexique';

/**
 * Mots à retenir : une liste à mémoriser, puis des mots un par un — « vu » ou « pas vu » ?
 * Aux niveaux avancés, les mots nouveaux viennent des mêmes catégories que la liste : le piège du « déjà-vu ».
 * Expert : les mots défilent un par un. Maître : des mots barrés, à oublier, reviennent en pièges.
 * Légende : il faut en plus répondre vite.
 */

export type Lures = 'random' | 'category';

export interface MotsLevel {
  count: number;
  /** Temps d'étude total (la liste entière, ou tous les mots qui défilent). */
  studyMs: number;
  lures: Lures;
  /** Les mots défilent un par un, chacun ce temps-là (0 : toute la liste d'un coup). */
  wordMs: number;
  /** Mots barrés glissés dans le défilé : à ne pas retenir, ils reviennent ensuite comme pièges. */
  decoys: number;
  /** Temps pour répondre à chaque mot (0 : pas de limite) ; sans réponse, c'est « pas vu ». */
  answerMs: number;
  /** Part des mots (bons « vu » moins fausses alarmes) qui vaut 100 pts : 1 jusqu'au niveau 20. */
  net: number;
}

const L = (count: number, studyMs: number, lures: Lures = 'random', net = 1): MotsLevel => ({
  count,
  studyMs,
  lures,
  wordMs: 0,
  decoys: 0,
  answerMs: 0,
  net,
});

/** Un défilé de `count` mots (et `decoys` mots barrés), pièges de même famille. */
const S = (count: number, wordMs: number, net: number, decoys = 0, answerMs = 0): MotsLevel => ({
  count,
  studyMs: wordMs * (count + decoys),
  lures: 'category',
  wordMs,
  decoys,
  answerMs,
  net,
});

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
  // Expert : un par un
  S(18, 1500, 0.9),
  L(20, 20_000, 'category', 0.9),
  S(18, 1350, 0.9),
  S(20, 1500, 0.9),
  S(20, 1350, 0.9),
  S(22, 1500, 0.9),
  S(20, 1200, 0.9),
  S(22, 1350, 0.9),
  S(24, 1500, 0.9),
  S(22, 1200, 0.9),
  // Maître : mots barrés à oublier
  S(20, 1400, 0.8, 4),
  S(20, 1300, 0.8, 4),
  S(22, 1400, 0.8, 4),
  S(22, 1300, 0.8, 4),
  S(24, 1400, 0.8, 4),
  S(22, 1200, 0.8, 6),
  S(24, 1300, 0.8, 6),
  S(24, 1200, 0.8, 6),
  S(26, 1300, 0.8, 6),
  S(24, 1100, 0.8, 8),
  // Légende : réponse chronométrée
  S(24, 1100, 0.75, 6, 2500),
  S(24, 1100, 0.75, 8, 2500),
  S(26, 1100, 0.75, 8, 2500),
  S(26, 1000, 0.75, 8, 2500),
  S(26, 1000, 0.75, 8, 2200),
  S(28, 1000, 0.7, 8, 2200),
  S(28, 900, 0.7, 10, 2200),
  S(28, 900, 0.7, 10, 2000),
  S(30, 900, 0.7, 10, 2000),
  S(30, 800, 0.7, 10, 1800),
];

export function motsLevel(level: number): MotsLevel {
  return pickLevel(MOTS_LEVELS, level);
}

export function motsLevelLabel(level: number): string {
  const c = motsLevel(level);
  const study = secondsLabel(c.studyMs);
  const word = secondsLabel(c.wordMs);
  const answer = secondsLabel(c.answerMs);
  return [
    tr(`${c.count} mots`, `${c.count} words`),
    c.wordMs ? tr(`un par un, ${word} chacun`, `one at a time, ${word} each`) : tr(`${study} pour les lire`, `${study} to read them`),
    c.decoys > 0 && tr(`${c.decoys} mots barrés`, `${c.decoys} crossed-out words`),
    c.lures === 'category' && tr('pièges de même famille', 'same-category traps'),
    c.answerMs > 0 && tr(`${answer} pour répondre`, `${answer} to answer`),
  ]
    .filter(Boolean)
    .join(' · ');
}

export interface MotsProbe {
  word: string;
  seen: boolean;
  /** Mot barré pendant l'étude : il n'était pas dans la liste à retenir. */
  forget?: boolean;
}

export interface MotsStudyItem {
  word: string;
  /** Mot barré : à lire, mais pas à retenir. */
  forget: boolean;
}

export interface MotsRound {
  study: string[];
  probes: MotsProbe[];
  /** Ce qui défile (ou s'affiche), dans l'ordre : les mots à retenir et les mots barrés. */
  sequence: MotsStudyItem[];
}

export function generateMots(rng: Rng, level: number): MotsRound {
  const { count, lures, decoys } = motsLevel(level);
  let study: string[];
  let fresh: string[];
  let forget: string[] = [];
  if (lures === 'category' && decoys > 0) {
    // Dans chaque catégorie : un mot à retenir, un mot nouveau, un mot barré, et ainsi de suite.
    const cats = rng.shuffle(categories()).slice(0, Math.ceil(count / 3));
    const pools = cats.map((c) => rng.shuffle(c.words));
    study = [];
    fresh = [];
    for (let i = 0; study.length < count; i++) {
      const pool = pools[i % pools.length];
      const k = 3 * Math.floor(i / pools.length);
      study.push(pool[k]);
      fresh.push(pool[k + 1]);
      forget.push(pool[k + 2]);
    }
    fresh = fresh.slice(0, count - decoys);
    forget = forget.slice(0, decoys);
  } else if (lures === 'category') {
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
    fresh = all.slice(count, count + count - decoys);
    forget = all.slice(count * 2 - decoys, count * 2);
  }
  const probes = rng.shuffle([
    ...study.map((word) => ({ word, seen: true })),
    ...fresh.map((word) => ({ word, seen: false })),
    ...forget.map((word) => ({ word, seen: false, forget: true })),
  ]);
  const shown = rng.shuffle(study);
  const items = shown.map((word) => ({ word, forget: false }));
  // Les mots barrés se glissent dans le défilé, jamais en premier.
  const sequence = forget.length ? [items[0], ...rng.shuffle([...items.slice(1), ...forget.map((word) => ({ word, forget: true }))])] : items;
  return { study: shown, probes, sequence };
}

/**
 * Bons « vu » moins fausses alarmes, rapportés au nombre de mots : répondre au hasard donne 0.
 * Aux niveaux 21 et plus, 100 pts dès que ce solde atteint la part `net` des mots.
 */
export function scoreMots(hits: number, falseAlarms: number, level: number): number {
  const { count, net } = motsLevel(level);
  return clampScore(((hits - falseAlarms) / (count * net)) * 100);
}
