import { NBSP } from '../format';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * Monnaie : compter vite des pièces et des billets, ou calculer la monnaie à rendre.
 * Rien que des euros entiers (pas de centimes à taper) ; les montants restent stockés
 * en centimes, l'unité des pièces et billets dessinés.
 */

export const COINS = [100, 200] as const;
export const NOTES = [500, 1000, 2000, 5000, 10000] as const;
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

const SMALL = [100, 200, 500];
const MID = [100, 200, 500, 1000];
const ALL = [100, 200, 500, 1000, 2000, 5000];
const BIG = [...ALL, 10000];

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
  T(SMALL, 3, 5, 12),
  T(MID, 3, 6, 11),
  C(900, [1000], 11),
  T(MID, 5, 7, 10),
  T([...MID, 2000], 4, 7, 10),
  C(1900, [2000], 10),
  T(ALL, 5, 8, 9),
  T(MID, 4, 6, 9, 3000),
  C(4900, [5000], 9),
  T(ALL, 6, 9, 9),
  C(9900, [10000], 8),
  T(ALL, 5, 7, 8, 2500),
  T(BIG, 7, 10, 8),
  C(4900, [5000, 10000], 8),
  T(ALL, 6, 8, 7, 2000),
  T(BIG, 8, 11, 7),
  C(9900, [10000], 7),
  T(BIG, 8, 11, 6, 2000),
  T(BIG, 9, 12, 6, 1800),
];

export function monnaieLevel(level: number): MonnaieLevel {
  return pickLevel(MONNAIE_LEVELS, level);
}

/** 1200 → « 12 € » (des centimes ne s'affichent que s'il y en a). */
export function formatEuros(cents: number): string {
  const euros = Math.floor(cents / 100);
  return cents % 100 ? `${euros},${String(cents % 100).padStart(2, '0')}${NBSP}€` : `${euros}${NBSP}€`;
}

/** Libellé court d'une pièce ou d'un billet : « 2 € », « 50 € ». */
export function denominationLabel(cents: number): string {
  return cents >= 100 ? `${cents / 100}${NBSP}€` : `${cents}${NBSP}c`;
}

export function monnaieLevelLabel(level: number): string {
  const c = monnaieLevel(level);
  if (c.mode === 'change') return `Monnaie à rendre · prix jusqu’à ${formatEuros(c.maxPrice)}`;
  const kinds = c.values.some((v) => v >= 500) ? 'pièces et billets' : 'pièces';
  return [`${c.minItems} à ${c.maxItems} ${kinds}`, `jusqu’à ${formatEuros(Math.max(...c.values))}`, c.hideMs && `cachés après ${secondsLabel(c.hideMs)}`]
    .filter(Boolean)
    .join(' · ');
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
    // Un prix en euros entiers, ni dérisoire ni égal au billet.
    const euros = rng.int(Math.max(1, Math.ceil((paid / 100) * 0.2)), Math.min(c.maxPrice, paid - 100) / 100);
    const price = euros * 100;
    return { mode: 'change', items: [], price, paid, answer: paid - price };
  }
  const count = rng.int(c.minItems, c.maxItems);
  const items = Array.from({ length: count }, () => rng.pick(c.values)).sort((a, b) => b - a);
  return { mode: 'total', items, price: 0, paid: 0, answer: items.reduce((sum, v) => sum + v, 0) };
}

export function scoreMonnaie(correct: number, level: number): number {
  return countScore(correct, 0, monnaieLevel(level).target);
}
