import { NBSP } from '../format';
import { localized, tr, type Translations } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { timeScore, type TimeThresholds } from '../scoring';

/** `%` : « a % de b » (a × b ÷ 100), toujours seul dans son calcul. */
export type CalcOp = '+' | '−' | '×' | '÷' | '%';

/**
 * Forme d'un calcul (champ `paren`, gardé pour la compatibilité) :
 * - `false` : à plat, × et ÷ avant + et − ;
 * - `true` : (a op b) op c ;
 * - `'right'` : a op (b op c) ;
 * - `'both'` : (a op b) op (c op d) ;
 * - `'holeLeft'` : ? op b = c (opérandes [b, c]) ; `'holeRight'` : a op ? = c (opérandes [a, c]).
 *   La réponse est alors le nombre caché.
 */
export type CalcForm = boolean | 'right' | 'both' | 'holeLeft' | 'holeRight';

export interface CalcQuestion {
  operands: number[];
  ops: CalcOp[];
  /** La forme du calcul (voir `CalcForm`) : `true` = (a op b) op c. */
  paren: CalcForm;
  answer: number;
}

export const CALCUL_COUNT = 20;
export const CALCUL_PENALTY_MS = 3000;

function apply(a: number, op: CalcOp, b: number): number {
  switch (op) {
    case '+':
      return a + b;
    case '−':
      return a - b;
    case '×':
      return a * b;
    case '÷':
      return a / b;
    case '%':
      return (a * b) / 100;
  }
}

/** Le nombre caché de « ? op b = c ». */
function solveLeft(op: CalcOp, b: number, c: number): number {
  switch (op) {
    case '+':
      return c - b;
    case '−':
      return c + b;
    case '×':
      return c / b;
    case '÷':
      return c * b;
    case '%':
      return (c * 100) / b;
  }
}

/** Le nombre caché de « a op ? = c ». */
function solveRight(a: number, op: CalcOp, c: number): number {
  switch (op) {
    case '+':
      return c - a;
    case '−':
      return a - c;
    case '×':
      return c / a;
    case '÷':
      return a / c;
    case '%':
      return (c * 100) / a;
  }
}

/** Valeur d'un calcul : × et ÷ avant + et −, parenthèses selon la forme ; pour un trou, le nombre caché. */
export function evaluate(operands: readonly number[], ops: readonly CalcOp[], paren: CalcForm = false): number {
  const [a, b, c, d] = operands;
  if (paren === true) return apply(apply(a, ops[0], b), ops[1], c);
  if (paren === 'right') return apply(a, ops[0], apply(b, ops[1], c));
  if (paren === 'both') return apply(apply(a, ops[0], b), ops[1], apply(c, ops[2], d));
  if (paren === 'holeLeft') return solveLeft(ops[0], a, b);
  if (paren === 'holeRight') return solveRight(a, ops[0], b);
  const terms = [operands[0]];
  const additive: CalcOp[] = [];
  ops.forEach((op, i) => {
    if (op === '×' || op === '÷' || op === '%') terms[terms.length - 1] = apply(terms[terms.length - 1], op, operands[i + 1]);
    else {
      additive.push(op);
      terms.push(operands[i + 1]);
    }
  });
  return additive.reduce((total, op, i) => apply(total, op, terms[i + 1]), terms[0]);
}

const make = (operands: number[], ops: CalcOp[], paren: CalcForm = false): CalcQuestion => ({
  operands,
  ops,
  paren,
  answer: evaluate(operands, ops, paren),
});

const pair = (rng: Rng, x: number, y: number): [number, number] => (rng.chance(0.5) ? [x, y] : [y, x]);

const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));

/** « p % de n » qui tombe juste : n est un multiple de 100 ÷ pgcd(p, 100). */
function percentOf(rng: Rng, percents: readonly number[], minN: number, maxN: number): CalcQuestion {
  const p = rng.pick(percents);
  const step = 100 / gcd(p, 100);
  return make([p, step * rng.int(Math.ceil(minN / step), Math.floor(maxN / step))], ['%']);
}

/** Bornes d'un calcul à trou, par opération. */
interface HoleRanges {
  ops: readonly ('+' | '−' | '×' | '÷')[];
  /** + : les deux termes. */
  add?: [number, number];
  /** − : le nombre de départ. */
  sub?: [number, number];
  /** × et ÷ : le facteur visible et le nombre caché (ou le quotient). */
  factor: [number, number];
  hidden: [number, number];
}

/** Un nombre manquant : « ? × 7 = 84 », « 48 + ? = 113 », « 96 ÷ ? = 8 »… toujours entier et positif. */
function holeOf(rng: Rng, r: HoleRanges): CalcQuestion {
  const op = rng.pick(r.ops);
  const left = rng.chance(0.5);
  const int = (range: [number, number]) => rng.int(range[0], range[1]);
  switch (op) {
    case '+': {
      const range = r.add ?? [10, 99];
      const shown = int(range);
      const total = shown + int(range);
      return make([shown, total], ['+'], left ? 'holeLeft' : 'holeRight');
    }
    case '−': {
      const start = int(r.sub ?? [30, 99]);
      const taken = rng.int(Math.max(1, Math.round(start / 8)), start - Math.max(2, Math.round(start / 10)));
      // ? − taken = rest, ou start − ? = rest.
      return left ? make([taken, start - taken], ['−'], 'holeLeft') : make([start, start - taken], ['−'], 'holeRight');
    }
    case '×': {
      const factor = int(r.factor);
      return make([factor, factor * int(r.hidden)], ['×'], left ? 'holeLeft' : 'holeRight');
    }
    case '÷': {
      const factor = int(r.factor);
      const quotient = int(r.hidden);
      // ? ÷ factor = quotient, ou (factor × quotient) ÷ ? = quotient.
      return left ? make([factor, quotient], ['÷'], 'holeLeft') : make([factor * quotient, quotient], ['÷'], 'holeRight');
    }
  }
}

/** Familles de calculs : chaque niveau en mélange quelques-unes. Aucune ne donne de résultat négatif. */
const KINDS = {
  add1: (rng: Rng) => make([rng.int(1, 9), rng.int(1, 9)], ['+']),
  sub1: (rng: Rng) => {
    const a = rng.int(2, 9);
    return make([a, rng.int(1, a)], ['−']);
  },
  mul1: (rng: Rng) => make(pair(rng, rng.int(2, 9), rng.int(2, 9)), ['×']),
  add2: (rng: Rng) => make([rng.int(10, 49), rng.int(10, 49)], ['+']),
  sub2: (rng: Rng) => {
    const a = rng.int(30, 99);
    return make([a, rng.int(10, a - 10)], ['−']);
  },
  mulTeen: (rng: Rng) => make(pair(rng, rng.int(11, 19), rng.int(2, 5)), ['×']),
  divTwo: (rng: Rng) => {
    const d = rng.int(2, 9);
    const q = rng.int(Math.max(2, Math.ceil(10 / d)), Math.floor(99 / d));
    return make([d * q, d], ['÷']);
  },
  add100: (rng: Rng) => {
    const a = rng.int(10, 90);
    return make([a, rng.int(10, 100 - a)], ['+']);
  },
  sub100: (rng: Rng) => {
    const a = rng.int(20, 100);
    return make([a, rng.int(5, a - 1)], ['−']);
  },
  mul12: (rng: Rng) => make(pair(rng, rng.int(2, 12), rng.int(2, 12)), ['×']),
  div12: (rng: Rng) => {
    const d = rng.int(2, 12);
    return make([d * rng.int(2, 12), d], ['÷']);
  },
  add3: (rng: Rng) => make([rng.int(100, 499), rng.int(10, 99)], ['+']),
  sub3: (rng: Rng) => make([rng.int(200, 999), rng.int(10, 199)], ['−']),
  chainAddSub: (rng: Rng) => {
    const a = rng.int(5, 20);
    const b = rng.int(2, 15);
    return make([a, b, rng.int(1, a + b)], ['+', '−']);
  },
  chainMulAdd: (rng: Rng) => {
    const a = rng.int(2, 9);
    const b = rng.int(2, 9);
    const c = rng.int(2, 20);
    return make([a, b, c], ['×', a * b >= c && rng.chance(0.5) ? '−' : '+']);
  },
  mul2x1: (rng: Rng) => make(pair(rng, rng.int(12, 25), rng.int(3, 9)), ['×']),
  div3: (rng: Rng) => {
    const d = rng.int(2, 9);
    return make([d * rng.int(12, 60), d], ['÷']);
  },
  chainParen: (rng: Rng) => {
    const a = rng.int(1, 9);
    return make([a, rng.int(1, Math.max(1, 12 - a)), rng.int(2, 9)], ['+', '×'], true);
  },
  square: (rng: Rng) => {
    const n = rng.int(11, 20);
    return make([n, n], ['×']);
  },
  add33: (rng: Rng) => make([rng.int(100, 999), rng.int(100, 999)], ['+']),
  sub33: (rng: Rng) => {
    const a = rng.int(300, 999);
    return make([a, rng.int(100, a - 1)], ['−']);
  },
  chainMulMul: (rng: Rng) => make([rng.int(2, 9), rng.int(2, 9), rng.int(2, 9), rng.int(2, 9)], ['×', '+', '×']),
  mul2x2: (rng: Rng) => make([rng.int(11, 19), rng.int(11, 19)], ['×']),
  div4: (rng: Rng) => {
    const d = rng.int(11, 25);
    return make([d * rng.int(5, 30), d], ['÷']);
  },
  chainBig: (rng: Rng) => {
    const a = rng.int(11, 19);
    const b = rng.int(3, 9);
    const c = rng.int(10, 99);
    return make([a, b, c], ['×', a * b >= c && rng.chance(0.6) ? '−' : '+']);
  },

  // ----- Expert (niveaux 21 à 30) : grands facteurs, milliers, parenthèses à droite, %, trous -----
  mulBig1: (rng: Rng) => make(pair(rng, rng.int(26, 99), rng.int(3, 9)), ['×']),
  add4: (rng: Rng) => make([rng.int(1000, 4999), rng.int(100, 999)], ['+']),
  sub4: (rng: Rng) => make([rng.int(1000, 9999), rng.int(100, 999)], ['−']),
  parenRight: (rng: Rng) => {
    const a = rng.int(3, 9);
    const b = rng.int(11, 29);
    return make([a, b, rng.int(2, 9)], ['×', rng.chance(0.5) ? '+' : '−'], 'right');
  },
  chain4: (rng: Rng) => {
    if (rng.chance(0.5)) {
      const a = rng.int(10, 60);
      const b = rng.int(3, 9);
      const c = rng.int(3, 9);
      return make([a, b, c, rng.int(5, Math.min(60, a + b * c - 1))], ['+', '×', '−']);
    }
    const a = rng.int(3, 9);
    const b = rng.int(6, 15);
    return make([a, b, rng.int(5, Math.min(60, a * b - 1)), rng.int(5, 60)], ['×', '−', '+']);
  },
  divMul: (rng: Rng) => {
    const b = rng.int(3, 9);
    return make([b * rng.int(3, 12), b, rng.int(3, 9)], ['÷', '×']);
  },
  percent: (rng: Rng) => percentOf(rng, [10, 20, 25, 50, 75], 20, 400),
  squareMid: (rng: Rng) => {
    const n = rng.int(21, 35);
    return make([n, n], ['×']);
  },
  hole: (rng: Rng) => holeOf(rng, { ops: ['+', '−', '×', '÷'], add: [12, 89], sub: [30, 150], factor: [3, 9], hidden: [3, 15] }),

  // ----- Maître (31 à 40) : centaines × chiffre, deux parenthèses, produits moyens, % fins -----
  mul3x1: (rng: Rng) => make(pair(rng, rng.int(101, 499), rng.int(3, 9)), ['×']),
  div5: (rng: Rng) => {
    const d = rng.int(3, 9);
    return make([d * rng.int(21, 150), d], ['÷']);
  },
  parenBoth: (rng: Rng) => {
    if (rng.chance(0.5)) {
      const c = rng.int(9, 25);
      return make([rng.int(2, 15), rng.int(2, 15), c, rng.int(2, c - 3)], ['+', '×', '−'], 'both');
    }
    const a = rng.int(9, 25);
    return make([a, rng.int(2, a - 3), rng.int(2, 15), rng.int(2, 15)], ['−', '×', '+'], 'both');
  },
  mul2x2b: (rng: Rng) => make(pair(rng, rng.int(21, 49), rng.int(11, 19)), ['×']),
  percent2: (rng: Rng) => percentOf(rng, [5, 15, 30, 35, 40, 45, 60], 40, 600),
  holeHard: (rng: Rng) => holeOf(rng, { ops: ['+', '−', '×', '÷'], add: [120, 480], sub: [200, 900], factor: [11, 19], hidden: [6, 19] }),
  squareBig: (rng: Rng) => {
    const n = rng.int(31, 60);
    return make([n, n], ['×']);
  },
  chainMulMul2: (rng: Rng) => {
    const a = rng.int(11, 19);
    const b = rng.int(3, 9);
    const c = rng.int(3, 9);
    const d = rng.int(11, 19);
    return make([a, b, c, d], ['×', a * b >= c * d && rng.chance(0.6) ? '−' : '+', '×']);
  },
  div2d: (rng: Rng) => {
    const d = rng.int(12, 29);
    return make([d * rng.int(12, 45), d], ['÷']);
  },

  // ----- Légende (41 à 50) : deux chiffres × deux chiffres, carrés jusqu'à 99, milliers divisés -----
  mul2x2c: (rng: Rng) => make(pair(rng, rng.int(23, 99), rng.int(21, 99)), ['×']),
  mul3x1b: (rng: Rng) => make(pair(rng, rng.int(501, 999), rng.int(6, 9)), ['×']),
  squareHuge: (rng: Rng) => {
    const n = rng.int(61, 99);
    return make([n, n], ['×']);
  },
  div6: (rng: Rng) => {
    if (rng.chance(0.5)) {
      const d = rng.int(3, 9);
      return make([d * rng.int(120, 999), d], ['÷']);
    }
    const d = rng.int(12, 39);
    return make([d * rng.int(21, 99), d], ['÷']);
  },
  holeMul: (rng: Rng) => holeOf(rng, { ops: ['×', '÷'], factor: [12, 29], hidden: [12, 39] }),
  percentHard: (rng: Rng) => percentOf(rng, [12, 16, 35, 45, 65, 85, 125, 150], 40, 800),
  parenBoth2: (rng: Rng) => {
    if (rng.chance(0.5)) {
      const c = rng.int(10, 30);
      return make([rng.int(11, 49), rng.int(11, 49), c, rng.int(2, c - 3)], ['+', '×', '−'], 'both');
    }
    const a = rng.int(30, 99);
    return make([a, rng.int(11, a - 12), rng.int(3, 15), rng.int(2, 15)], ['−', '×', '+'], 'both');
  },
} satisfies Record<string, (rng: Rng) => CalcQuestion>;

export type CalcKind = keyof typeof KINDS;

export interface CalcLevel extends TimeThresholds {
  /** Libellé dans la langue de l'interface (accesseur : lu à l'affichage). */
  label: string;
  kinds: CalcKind[];
}

/** Un niveau et son libellé dans chaque langue, choisi à la lecture. */
const C = (label: Translations, kinds: CalcKind[], best: number, worst: number): CalcLevel => ({
  get label() {
    return localized(label);
  },
  kinds,
  best,
  worst,
});

/** Niveaux 1 à 3 : ceux de la spec. Au-delà, chaînes, centaines, carrés, produits à deux chiffres. */
export const CALCUL_LEVELS: readonly CalcLevel[] = [
  C({ fr: 'Tables à un chiffre', en: 'Single-digit facts' }, ['add1', 'sub1', 'mul1'], 20, 80),
  C({ fr: 'Deux chiffres et divisions', en: 'Two digits and division' }, ['add2', 'sub2', 'mulTeen', 'divTwo'], 35, 110),
  C({ fr: 'Jusqu’à 100, tables de 12', en: 'Up to 100, times tables to 12' }, ['add100', 'sub100', 'mul12', 'div12'], 45, 130),
  C({ fr: 'Centaines', en: 'Hundreds' }, ['add3', 'sub3', 'mul12', 'div12'], 48, 135),
  C({ fr: 'Calculs en chaîne', en: 'Chained problems' }, ['chainAddSub', 'mul12', 'div12'], 50, 140),
  C({ fr: 'Grandes multiplications', en: 'Bigger multiplication' }, ['mul2x1', 'divTwo', 'add100', 'sub100'], 50, 140),
  C({ fr: 'Chaînes et centaines', en: 'Chains and hundreds' }, ['chainMulAdd', 'add3', 'div12'], 52, 145),
  C({ fr: 'Divisions de centaines', en: 'Dividing hundreds' }, ['div3', 'mul2x1', 'sub3'], 55, 150),
  C({ fr: 'Parenthèses', en: 'Parentheses' }, ['chainParen', 'chainAddSub', 'mul12'], 55, 150),
  C({ fr: 'Carrés', en: 'Squares' }, ['square', 'mul2x1', 'div3'], 58, 155),
  C({ fr: 'Centaines doubles', en: 'Three digits and three digits' }, ['add33', 'sub33', 'mul12'], 58, 155),
  C({ fr: 'Double produit', en: 'Double products' }, ['chainMulMul', 'chainMulAdd'], 60, 160),
  C({ fr: 'Deux chiffres × deux chiffres', en: 'Two digits × two digits' }, ['mul2x2', 'div3'], 62, 165),
  C({ fr: 'Carrés et parenthèses', en: 'Squares and parentheses' }, ['square', 'chainParen', 'sub33'], 62, 165),
  C({ fr: 'Grand mélange', en: 'Big mix' }, ['mul2x2', 'chainMulMul', 'add33'], 64, 170),
  C({ fr: 'Mélange expert', en: 'Expert mix' }, ['square', 'mul2x1', 'div3', 'add33', 'sub33', 'chainMulMul', 'mul2x2'], 66, 175),
  C({ fr: 'Produits géants', en: 'Giant products' }, ['mul2x2', 'square', 'div3', 'chainMulMul'], 68, 180),
  C({ fr: 'Divisions à deux chiffres', en: 'Two-digit division' }, ['div4', 'mul2x2'], 70, 185),
  C({ fr: 'Presque génie', en: 'Almost a genius' }, ['chainBig', 'div4', 'square'], 72, 190),
  C({ fr: 'Génie du calcul', en: 'Math genius' }, ['chainBig', 'div4', 'mul2x2', 'square', 'chainMulMul', 'sub33'], 75, 200),
  // Expert : nouvelles familles mêlées aux plus dures des niveaux précédents.
  C({ fr: 'Grands facteurs', en: 'Big factors' }, ['mulBig1', 'div4', 'chainBig', 'mul2x2'], 77, 210),
  C({ fr: 'Milliers', en: 'Thousands' }, ['add4', 'sub4', 'mulBig1', 'mul2x2'], 78, 214),
  C({ fr: 'Parenthèses à droite', en: 'Brackets on the right' }, ['parenRight', 'chainBig', 'square', 'div4'], 79, 217),
  C({ fr: 'Pourcentages', en: 'Percentages' }, ['percent', 'mulBig1', 'mul2x2', 'div4'], 81, 220),
  C({ fr: 'Nombre manquant', en: 'Missing number' }, ['hole', 'sub4', 'mul2x2', 'chainBig'], 82, 224),
  C({ fr: 'Quatre termes', en: 'Four terms' }, ['chain4', 'divMul', 'chainMulMul', 'mul2x2'], 83, 227),
  C({ fr: 'Carrés jusqu’à 35', en: 'Squares up to 35' }, ['squareMid', 'mulBig1', 'percent', 'div4'], 84, 231),
  C({ fr: 'Diviser puis multiplier', en: 'Divide, then multiply' }, ['divMul', 'parenRight', 'sub4', 'squareMid'], 86, 234),
  C({ fr: 'Trous et pourcentages', en: 'Gaps and percentages' }, ['hole', 'percent', 'chain4', 'add4', 'squareMid'], 87, 237),
  C({ fr: 'Expert accompli', en: 'Seasoned expert' }, ['mulBig1', 'add4', 'sub4', 'parenRight', 'percent', 'hole', 'chain4', 'divMul', 'squareMid'], 88, 241),
  // Maître : produits à trois chiffres, deux paires de parenthèses, trous à deux chiffres.
  C({ fr: 'Centaines × un chiffre', en: 'Hundreds × one digit' }, ['mul3x1', 'div5', 'sub4', 'squareMid'], 91, 247),
  C({ fr: 'Deux parenthèses', en: 'Two sets of brackets' }, ['parenBoth', 'parenRight', 'chain4', 'mul3x1'], 93, 254),
  C({ fr: 'Produits moyens', en: 'Medium products' }, ['mul2x2b', 'squareMid', 'div5'], 95, 261),
  C({ fr: 'Pourcentages fins', en: 'Trickier percentages' }, ['percent2', 'mul3x1', 'mul2x2b'], 98, 268),
  C({ fr: 'Trous difficiles', en: 'Harder gaps' }, ['holeHard', 'parenBoth', 'div5'], 100, 275),
  C({ fr: 'Carrés jusqu’à 60', en: 'Squares up to 60' }, ['squareBig', 'mul2x2b', 'holeHard'], 103, 281),
  C({ fr: 'Doubles produits géants', en: 'Giant double products' }, ['chainMulMul2', 'parenBoth', 'div2d'], 105, 288),
  C({ fr: 'Divisions longues', en: 'Long division' }, ['div2d', 'div5', 'mul3x1', 'squareBig'], 108, 295),
  C({ fr: 'Presque légende', en: 'Almost a legend' }, ['holeHard', 'percent2', 'squareBig', 'mul2x2b', 'chainMulMul2', 'div2d'], 110, 302),
  C({ fr: 'Maître du calcul', en: 'Math master' }, ['mul3x1', 'div5', 'parenBoth', 'mul2x2b', 'percent2', 'holeHard', 'squareBig', 'chainMulMul2', 'div2d'], 113, 308),
  // Légende : deux chiffres × deux chiffres jusqu'à 99, carrés jusqu'à 99, milliers divisés.
  C({ fr: 'Grands produits', en: 'Big products' }, ['mul2x2c', 'mul3x1b', 'squareBig'], 118, 322),
  C({ fr: 'Carrés jusqu’à 99', en: 'Squares up to 99' }, ['squareHuge', 'mul2x2b', 'div6'], 123, 336),
  C({ fr: 'Milliers divisés', en: 'Dividing thousands' }, ['div6', 'div2d', 'percentHard', 'mul3x1b'], 128, 349),
  C({ fr: 'Trous géants', en: 'Giant gaps' }, ['holeMul', 'holeHard', 'mul2x2c'], 133, 363),
  C({ fr: 'Pourcentages experts', en: 'Expert percentages' }, ['percentHard', 'parenBoth2', 'mul3x1b', 'squareHuge'], 138, 376),
  C({ fr: 'Parenthèses géantes', en: 'Giant brackets' }, ['parenBoth2', 'chainMulMul2', 'squareHuge', 'holeMul'], 143, 390),
  C({ fr: 'Tout en grand', en: 'Everything big' }, ['mul2x2c', 'div6', 'holeMul', 'percentHard'], 148, 403),
  C({ fr: 'Le grand chelem', en: 'Grand slam' }, ['squareHuge', 'mul2x2c', 'parenBoth2', 'holeMul', 'div6'], 153, 417),
  C({ fr: 'Aux portes de la légende', en: 'At the gates of legend' }, ['mul2x2c', 'squareHuge', 'div6', 'holeMul', 'percentHard', 'mul3x1b'], 157, 431),
  C({ fr: 'Légende du calcul', en: 'Math legend' }, ['mul2x2c', 'squareHuge', 'div6', 'holeMul', 'percentHard', 'parenBoth2', 'mul3x1b', 'chainMulMul2'], 162, 444),
];

/** Familles où la priorité de × et ÷ sur + et − compte (rappelée à l'intro). */
const PRIORITY_KINDS: readonly CalcKind[] = ['chainAddSub', 'chainMulAdd', 'chainMulMul', 'chainBig', 'chain4', 'chainMulMul2'];
const HOLE_KINDS: readonly CalcKind[] = ['hole', 'holeHard', 'holeMul'];
const PERCENT_KINDS: readonly CalcKind[] = ['percent', 'percent2', 'percentHard'];

/** La règle affichée à l'intro, avec les rappels utiles aux familles du niveau. */
export function calculRule(level: number): string {
  const { kinds } = pickLevel(CALCUL_LEVELS, level);
  const has = (group: readonly CalcKind[]) => kinds.some((k) => group.includes(k));
  const hints = [
    has(HOLE_KINDS) && tr('Un « ? » cache le nombre à trouver.', 'A “?” hides the number to find.'),
    has(PERCENT_KINDS) && tr('« 10 % de 50 », c’est 5.', '“10% of 50” is 5.'),
    has(PRIORITY_KINDS) && tr('Rappel : × et ÷ passent avant + et −.', 'Remember: × and ÷ come before + and −.'),
  ].filter(Boolean);
  if (hints.length === 0) {
    return tr('Résous 20 calculs le plus vite possible : ta réponse se valide toute seule.', 'Solve 20 problems as fast as you can: your answer goes in by itself.');
  }
  return [tr('Résous 20 calculs le plus vite possible.', 'Solve 20 problems as fast as you can.'), ...hints].join(' ');
}

export function makeCalcQuestion(rng: Rng, kind: CalcKind): CalcQuestion {
  return KINDS[kind](rng);
}

const same = (p: CalcQuestion, q: CalcQuestion) =>
  p.operands.join() === q.operands.join() && p.ops.join() === q.ops.join() && p.paren === q.paren;

/** Questions tirées parmi des familles, sans deux calculs identiques à la suite. */
export function generateFromKinds(rng: Rng, kinds: readonly CalcKind[], count: number): CalcQuestion[] {
  const questions: CalcQuestion[] = [];
  while (questions.length < count) {
    const q = makeCalcQuestion(rng, rng.pick(kinds));
    const previous = questions[questions.length - 1];
    if (!previous || !same(previous, q)) questions.push(q);
  }
  return questions;
}

export function generateCalcul(rng: Rng, level: number, count = CALCUL_COUNT): CalcQuestion[] {
  return generateFromKinds(rng, pickLevel(CALCUL_LEVELS, level).kinds, count);
}

export function formatCalc(q: CalcQuestion): string {
  const [first, ...rest] = q.operands;
  const [op0, op1, op2] = q.ops;
  switch (q.paren) {
    case true:
      return `(${first} ${op0} ${rest[0]}) ${op1} ${rest[1]}`;
    case 'right':
      return `${first} ${op0} (${rest[0]} ${op1} ${rest[1]})`;
    case 'both':
      return `(${first} ${op0} ${rest[0]}) ${op1} (${rest[1]} ${op2} ${rest[2]})`;
    case 'holeLeft':
      return `? ${op0} ${first} = ${rest[0]}`;
    case 'holeRight':
      return `${first} ${op0} ? = ${rest[0]}`;
  }
  // « 25 % de 80 » : le pourcentage s'écrit en toutes lettres, dans la langue de l'interface.
  if (op0 === '%') return tr(`${first}${NBSP}% de ${rest[0]}`, `${first}% of ${rest[0]}`);
  return rest.reduce((text, n, i) => `${text} ${q.ops[i]} ${n}`, String(first));
}

/** Le calcul et sa solution, pour corriger une erreur : « 7 × 8 = 56 », ou « 12 × 7 = 84 » pour un trou. */
export function formatSolved(q: CalcQuestion): string {
  const text = formatCalc(q);
  return q.paren === 'holeLeft' || q.paren === 'holeRight' ? text.replace('?', String(q.answer)) : `${text} = ${q.answer}`;
}

/** Nombre de chiffres de la réponse : la saisie se valide dès qu'il est atteint. */
export function answerLength(answer: number): number {
  return String(answer).length;
}

/** Temps total + 3 s par erreur, converti en score selon le niveau. */
export function scoreCalcul(elapsedMs: number, errors: number, level: number): number {
  const seconds = (elapsedMs + errors * CALCUL_PENALTY_MS) / 1000;
  return timeScore(seconds, pickLevel(CALCUL_LEVELS, level));
}
