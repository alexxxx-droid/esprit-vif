import { NBSP } from '../format';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * Monnaie : compter vite des pièces et des billets, ou calculer la monnaie à rendre.
 * Toutes les valeurs sont en centimes pour éviter les arrondis.
 */

export const COINS = [1, 2, 5, 10, 20, 50, 100, 200] as const;
export const NOTES = [500, 1000, 2000, 5000] as const;
export const MONNAIE_DURATION_MS = 60_000;

export type MonnaieMode = 'total' | 'change';

export interface MonnaieLevel {
  mode: MonnaieMode;
  /** Valeurs possibles (mode total). */
  values: number[];
  minItems: number;
  maxItems: number;
  /** Mode « rendu » : prix maximum et billets avec lesquels on paie. */
  maxPrice: number;
  paidWith: number[];
  /** Les pièces se cachent après ce délai (mémoire), sinon null. */
  hideMs: number | null;
  /** Bonnes réponses en 60 s pour 100 pts. */
  target: number;
}

const ALL_COINS = [...COINS];
const COINS_NOTES = [...COINS, 500, 1000];

const T = (values: number[], minItems: number, maxItems: number, target: number, hideMs: number | null = null): MonnaieLevel => ({
  mode: 'total',
  values,
  minItems,
  maxItems,
  maxPrice: 0,
  paidWith: [],
  hideMs,
  target,
});
const C = (maxPrice: number, paidWith: number[], target: number): MonnaieLevel => ({
  mode: 'change',
  values: [],
  minItems: 0,
  maxItems: 0,
  maxPrice,
  paidWith,
  hideMs: null,
  target,
});

export const MONNAIE_LEVELS: readonly MonnaieLevel[] = [
  T([100, 200], 3, 5, 12),
  T([50, 100, 200], 3, 5, 12),
  T([10, 20, 50, 100, 200], 3, 6, 11),
  T([1, 2, 5, 10, 20, 50], 4, 6, 10),
  T(ALL_COINS, 4, 7, 10),
  T([...ALL_COINS, 500, 1000], 3, 6, 10),
  C(995, [1000], 9),
  T(ALL_COINS, 6, 8, 9),
  T(COINS_NOTES, 5, 8, 9),
  C(1990, [2000, 5000], 8),
  T(ALL_COINS, 4, 6, 8, 3000),
  T(ALL_COINS, 7, 9, 8),
  C(1999, [1000, 2000], 8),
  T(COINS_NOTES, 5, 7, 7, 2500),
  T(ALL_COINS, 8, 10, 7),
  C(4999, [5000], 7),
  T(COINS_NOTES, 6, 8, 7, 2000),
  T([...COINS, ...NOTES], 8, 11, 6),
  C(9999, [10000], 6),
  T([...COINS, ...NOTES], 8, 10, 6, 2000),
];

export function monnaieLevel(level: number): MonnaieLevel {
  return pickLevel(MONNAIE_LEVELS, level);
}

export function formatEuros(cents: number): string {
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}${NBSP}€`;
}

/** Libellé court d'une pièce ou d'un billet : « 2 € », « 50 c ». */
export function denominationLabel(cents: number): string {
  return cents >= 100 ? `${cents / 100}${NBSP}€` : `${cents}${NBSP}c`;
}

export function monnaieLevelLabel(level: number): string {
  const c = monnaieLevel(level);
  if (c.mode === 'change') return `Monnaie à rendre · prix jusqu’à ${formatEuros(c.maxPrice)}`;
  const kinds = c.values.some((v) => v >= 500) ? 'pièces et billets' : c.values.every((v) => v >= 100) ? 'euros' : c.values.every((v) => v < 100) ? 'centimes' : 'pièces';
  return [`${c.minItems} à ${c.maxItems} ${kinds}`, c.hideMs && `cachées après ${secondsLabel(c.hideMs)}`].filter(Boolean).join(' · ');
}

export interface MonnaieQuestion {
  mode: MonnaieMode;
  /** Pièces et billets à compter (mode total). */
  items: number[];
  /** Mode rendu. */
  price: number;
  paid: number;
  answer: number;
}

export function generateMonnaie(rng: Rng, level: number): MonnaieQuestion {
  const c = monnaieLevel(level);
  if (c.mode === 'change') {
    const paid = rng.pick(c.paidWith);
    // Prix « réaliste » : en multiples de 5 centimes aux premiers niveaux du mode.
    const step = c.maxPrice % 5 === 0 ? 5 : 1;
    const price = rng.int(Math.ceil(paid * 0.2 / step), Math.floor(Math.min(c.maxPrice, paid - 1) / step)) * step;
    return { mode: 'change', items: [], price, paid, answer: paid - price };
  }
  const count = rng.int(c.minItems, c.maxItems);
  const items = Array.from({ length: count }, () => rng.pick(c.values)).sort((a, b) => b - a);
  return { mode: 'total', items, price: 0, paid: 0, answer: items.reduce((sum, v) => sum + v, 0) };
}

export function scoreMonnaie(correct: number, level: number): number {
  return countScore(correct, 0, monnaieLevel(level).target);
}
