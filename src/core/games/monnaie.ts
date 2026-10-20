import { NBSP } from '../format';
import { lang, tr } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * Monnaie : compter vite des pièces et des billets, ou calculer la monnaie à rendre.
 * Rien que des euros entiers (pas de centimes à taper) ; les montants restent stockés
 * en centimes, l'unité des pièces et billets dessinés.
 */

export const COINS = [100, 200] as const;
/** Le billet de 200 € n'apparaît qu'à partir du niveau 21. */
export const NOTES = [500, 1000, 2000, 5000, 10000, 20000] as const;
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
  /** Mode total, niveaux 21 et plus : les pièces et billets identiques forment des piles (« ×4 »). */
  stacks?: StackRule;
  /** Mode rendu, niveaux 21 et plus : un panier de plusieurs articles à additionner avant de rendre. */
  basket?: BasketRule;
}

export interface StackRule {
  /** Nombre de piles (valeurs différentes). */
  piles: [number, number];
  /** Taille maximale d'une pile (2 au minimum). */
  maxCount: number;
}

export interface BasketRule {
  /** Nombre d'articles. */
  lines: [number, number];
  /** Quantité maximale d'un article (« 3 × 4 € »). */
  maxQty: number;
  /** Prix unitaire maximal, en euros. */
  maxUnit: number;
  /** Un bon de réduction à retirer du total. */
  coupon: boolean;
}

const SMALL = [100, 200, 500];
const MID = [100, 200, 500, 1000];
const ALL = [100, 200, 500, 1000, 2000, 5000];
const BIG = [...ALL, 10000];
const HUGE = [...BIG, 20000];

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
/** Piles : `minPiles` à `maxPiles` valeurs différentes, chacune de 2 à `maxCount` exemplaires. */
const S = (values: number[], minPiles: number, maxPiles: number, maxCount: number, target: number, hideMs: number | null = null): MonnaieLevel => ({
  ...T(values, minPiles * 2, maxPiles * maxCount, target, hideMs),
  stacks: { piles: [minPiles, maxPiles], maxCount },
});
/** Panier : des articles (avec quantités), parfois un bon de réduction, payés avec un billet. */
const B = (minLines: number, maxLines: number, maxQty: number, maxUnit: number, paidWith: number[], target: number, coupon = false): MonnaieLevel => ({
  ...C(Math.max(...paidWith) - 100, paidWith, target),
  basket: { lines: [minLines, maxLines], maxQty, maxUnit, coupon },
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
  // Expert : le billet de 200 €, les piles (« ×4 »), le panier de deux ou trois articles.
  T(HUGE, 6, 9, 7),
  S(MID, 2, 3, 5, 7),
  B(2, 2, 1, 20, [5000], 7),
  T(HUGE, 8, 10, 6),
  S(ALL, 3, 4, 6, 6),
  B(2, 3, 1, 30, [5000, 10000], 6),
  T(ALL, 6, 9, 6, 1800),
  S(BIG, 3, 4, 9, 6),
  B(2, 3, 3, 20, [5000, 10000], 6),
  S(HUGE, 3, 5, 9, 5),
  // Maître : quantités, bons de réduction, piles cachées.
  B(3, 3, 4, 30, [10000, 20000], 5),
  S(HUGE, 4, 5, 9, 5),
  T(HUGE, 9, 11, 5, 1600),
  B(3, 4, 4, 40, [5000, 10000, 20000], 5),
  S(ALL, 3, 4, 6, 5, 3600),
  B(3, 3, 3, 30, [10000], 5, true),
  T(HUGE, 10, 12, 5, 1500),
  S(HUGE, 4, 6, 9, 4),
  B(3, 4, 5, 40, [20000], 4, true),
  S(BIG, 4, 5, 9, 4, 4500),
  // Légende : grands paniers à rendre sur 200 €, piles nombreuses à mémoriser.
  B(4, 4, 5, 50, [10000, 20000], 4, true),
  S(HUGE, 4, 5, 9, 4, 4500),
  T(HUGE, 10, 12, 4, 1500),
  B(4, 5, 6, 60, [20000], 3, true),
  S(HUGE, 5, 6, 9, 4, 5000),
  B(4, 5, 6, 60, [5000, 10000, 20000], 3, true),
  S(HUGE, 5, 6, 9, 4, 4500),
  T(HUGE, 11, 12, 4, 1300),
  B(5, 5, 6, 60, [20000], 3, true),
  S(HUGE, 6, 7, 9, 3, 5000),
];

export function monnaieLevel(level: number): MonnaieLevel {
  return pickLevel(MONNAIE_LEVELS, level);
}

/**
 * 1200 → « 12 € » (« €12 » en anglais, « € 12 » en portugais du Brésil ; des centimes ne s'affichent
 * que s'il y en a). L'espagnol, l'allemand et l'italien écrivent comme le français.
 */
export function formatEuros(cents: number): string {
  const euros = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, '0');
  if (lang() === 'en') return cents % 100 ? `€${euros}.${rest}` : `€${euros}`;
  if (lang() === 'pt') return cents % 100 ? `€${NBSP}${euros},${rest}` : `€${NBSP}${euros}`;
  return cents % 100 ? `${euros},${rest}${NBSP}€` : `${euros}${NBSP}€`;
}

/** Libellé court d'une pièce ou d'un billet : « 2 € », « 50 € » (« €2 », « €50 » en anglais). */
export function denominationLabel(cents: number): string {
  if (cents < 100) return `${cents}${NBSP}c`;
  if (lang() === 'en') return `€${cents / 100}`;
  if (lang() === 'pt') return `€${NBSP}${cents / 100}`;
  return `${cents / 100}${NBSP}€`;
}

export function monnaieLevelLabel(level: number): string {
  const c = monnaieLevel(level);
  if (c.basket) {
    const [lo, hi] = c.basket.lines;
    const note = formatEuros(Math.max(...c.paidWith));
    return [
      lo === hi ? tr(`Panier de ${lo} articles`, `Basket of ${lo} items`) : tr(`Panier de ${lo} à ${hi} articles`, `Basket of ${lo} to ${hi} items`),
      c.basket.maxQty > 1 && tr(`quantités jusqu’à ${c.basket.maxQty}`, `quantities up to ${c.basket.maxQty}`),
      c.basket.coupon && tr('bons de réduction', 'coupons'),
      tr(`payé jusqu’à ${note}`, `paid with up to ${note}`),
    ]
      .filter(Boolean)
      .join(' · ');
  }
  if (c.mode === 'change') {
    const price = formatEuros(c.maxPrice);
    return tr(`Monnaie à rendre · prix jusqu’à ${price}`, `Making change · prices up to ${price}`);
  }
  const kinds = c.values.some((v) => v >= 500) ? tr('pièces et billets', 'coins and bills') : tr('pièces', 'coins');
  const top = formatEuros(Math.max(...c.values));
  const hidden = c.hideMs && secondsLabel(c.hideMs);
  const count = c.stacks
    ? tr(`${c.stacks.piles[0]} à ${c.stacks.piles[1]} piles (jusqu’à ×${c.stacks.maxCount})`, `${c.stacks.piles[0]} to ${c.stacks.piles[1]} stacks (up to ×${c.stacks.maxCount})`)
    : tr(`${c.minItems} à ${c.maxItems} ${kinds}`, `${c.minItems} to ${c.maxItems} ${kinds}`);
  return [count, tr(`jusqu’à ${top}`, `up to ${top}`), hidden && tr(`cachés après ${hidden}`, `hidden after ${hidden}`)].filter(Boolean).join(' · ');
}

/** La règle affichée à l'intro, selon le mode du niveau. */
export function monnaieRule(level: number): string {
  const c = monnaieLevel(level);
  if (c.basket) {
    const base = tr(
      'Additionne le panier, puis calcule la monnaie à rendre, le plus de fois possible en 60 secondes.',
      'Add up the basket, then work out the change, as many times as you can in 60 seconds.',
    );
    return c.basket.coupon ? `${base} ${tr('Le bon de réduction se retire du total.', 'The coupon comes off the total.')}` : base;
  }
  if (c.mode === 'change') {
    return tr('Calcule la monnaie à rendre, le plus de fois possible en 60 secondes.', 'Work out the change to give back, as many times as you can in 60 seconds.');
  }
  if (c.stacks) {
    const base = tr(
      'Compte les piles de pièces et de billets (« ×3 » : trois fois le même), le plus de fois possible en 60 secondes.',
      'Count the stacks of coins and bills (“×3”: three of the same), as many times as you can in 60 seconds.',
    );
    return c.hideMs ? `${base} ${tr('Elles se retournent vite : compte sans traîner.', 'They flip over quickly: count fast.')}` : base;
  }
  return tr('Compte les pièces et les billets, le plus de fois possible en 60 secondes.', 'Count the coins and bills, as many times as you can in 60 seconds.');
}

/** Un article du panier : « 3 × 4 € » (prix unitaire en centimes). */
export interface MonnaieLine {
  unit: number;
  qty: number;
}

export interface MonnaieQuestion {
  mode: MonnaieMode;
  /** Pièces et billets à compter (mode total). */
  items: number[];
  /** Mode rendu : le prix à payer (pour un panier, le total des articles moins le bon de réduction). */
  price: number;
  paid: number;
  answer: number;
  /** Panier (niveaux 21 et plus) : les articles… */
  lines?: MonnaieLine[];
  /** … et le bon de réduction, en centimes. */
  coupon?: number;
}

const COUPONS = [2, 3, 5, 10, 15, 20];

/** Un panier dont le total reste sous le billet (et sous `maxPrice`) : chaque article garde au moins 1 € pour les suivants. */
function generateBasket(rng: Rng, c: MonnaieLevel, basket: BasketRule): MonnaieQuestion {
  const paid = rng.pick(c.paidWith);
  const count = rng.int(basket.lines[0], basket.lines[1]);
  // Un panier qui remplit de 40 % à presque tout le billet : la monnaie à rendre varie.
  const most = Math.min(c.maxPrice, paid - 100) / 100;
  const budget = rng.int(Math.max(count, Math.ceil(most * 0.4)), most);
  const lines: MonnaieLine[] = [];
  let left = budget;
  for (let i = 0; i < count; i++) {
    const after = count - i - 1;
    const cap = Math.max(1, Math.min(left - after, Math.floor((left / (after + 1)) * 1.5)));
    const qty = Math.min(rng.int(1, basket.maxQty), Math.max(1, Math.floor(cap / 2)));
    const maxUnit = Math.max(1, Math.min(basket.maxUnit, Math.floor(cap / qty)));
    const unit = rng.int(Math.ceil(maxUnit / 2), maxUnit);
    lines.push({ unit: unit * 100, qty });
    left -= unit * qty;
  }
  const subtotal = lines.reduce((sum, line) => sum + line.unit * line.qty, 0);
  // Un bon raisonnable : au plus la moitié du panier.
  const coupons = COUPONS.map((euros) => euros * 100).filter((cents) => cents * 2 <= subtotal);
  const coupon = basket.coupon && coupons.length ? rng.pick(coupons) : 0;
  const price = subtotal - coupon;
  return { mode: 'change', items: [], price, paid, answer: paid - price, lines, ...(coupon ? { coupon } : {}) };
}

/** Piles : quelques valeurs différentes, chacune de 2 à `maxCount` exemplaires, rangées de la plus grande à la plus petite. */
function generateStacks(rng: Rng, c: MonnaieLevel, stacks: StackRule): MonnaieQuestion {
  const piles = rng.int(stacks.piles[0], Math.min(stacks.piles[1], c.values.length));
  const values = rng.shuffle(c.values).slice(0, piles);
  const items = values.flatMap((v) => Array.from({ length: rng.int(2, stacks.maxCount) }, () => v)).sort((a, b) => b - a);
  return { mode: 'total', items, price: 0, paid: 0, answer: items.reduce((sum, v) => sum + v, 0) };
}

export function generateMonnaie(rng: Rng, level: number): MonnaieQuestion {
  const c = monnaieLevel(level);
  if (c.basket) return generateBasket(rng, c, c.basket);
  if (c.stacks) return generateStacks(rng, c, c.stacks);
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
