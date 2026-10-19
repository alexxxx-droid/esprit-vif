import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { timeScore, type TimeThresholds } from '../scoring';

export type CalcOp = '+' | '−' | '×' | '÷';

export interface CalcQuestion {
  operands: number[];
  ops: CalcOp[];
  /** (a op b) op c : les deux premiers termes sont calculés d'abord. */
  paren: boolean;
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
  }
}

/** Valeur d'un calcul : × et ÷ avant + et −, parenthèses sur les deux premiers termes. */
export function evaluate(operands: readonly number[], ops: readonly CalcOp[], paren = false): number {
  if (paren) return apply(apply(operands[0], ops[0], operands[1]), ops[1], operands[2]);
  const terms = [operands[0]];
  const additive: CalcOp[] = [];
  ops.forEach((op, i) => {
    if (op === '×' || op === '÷') terms[terms.length - 1] = apply(terms[terms.length - 1], op, operands[i + 1]);
    else {
      additive.push(op);
      terms.push(operands[i + 1]);
    }
  });
  return additive.reduce((total, op, i) => apply(total, op, terms[i + 1]), terms[0]);
}

const make = (operands: number[], ops: CalcOp[], paren = false): CalcQuestion => ({
  operands,
  ops,
  paren,
  answer: evaluate(operands, ops, paren),
});

const pair = (rng: Rng, x: number, y: number): [number, number] => (rng.chance(0.5) ? [x, y] : [y, x]);

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
} satisfies Record<string, (rng: Rng) => CalcQuestion>;

export type CalcKind = keyof typeof KINDS;

export interface CalcLevel extends TimeThresholds {
  label: string;
  kinds: CalcKind[];
}

/** Niveaux 1 à 3 : ceux de la spec. Au-delà, chaînes, centaines, carrés, produits à deux chiffres. */
export const CALCUL_LEVELS: readonly CalcLevel[] = [
  { label: 'Tables à un chiffre', kinds: ['add1', 'sub1', 'mul1'], best: 20, worst: 80 },
  { label: 'Deux chiffres et divisions', kinds: ['add2', 'sub2', 'mulTeen', 'divTwo'], best: 35, worst: 110 },
  { label: 'Jusqu’à 100, tables de 12', kinds: ['add100', 'sub100', 'mul12', 'div12'], best: 45, worst: 130 },
  { label: 'Centaines', kinds: ['add3', 'sub3', 'mul12', 'div12'], best: 48, worst: 135 },
  { label: 'Calculs en chaîne', kinds: ['chainAddSub', 'mul12', 'div12'], best: 50, worst: 140 },
  { label: 'Grandes multiplications', kinds: ['mul2x1', 'divTwo', 'add100', 'sub100'], best: 50, worst: 140 },
  { label: 'Chaînes et centaines', kinds: ['chainMulAdd', 'add3', 'div12'], best: 52, worst: 145 },
  { label: 'Divisions de centaines', kinds: ['div3', 'mul2x1', 'sub3'], best: 55, worst: 150 },
  { label: 'Parenthèses', kinds: ['chainParen', 'chainAddSub', 'mul12'], best: 55, worst: 150 },
  { label: 'Carrés', kinds: ['square', 'mul2x1', 'div3'], best: 58, worst: 155 },
  { label: 'Centaines doubles', kinds: ['add33', 'sub33', 'mul12'], best: 58, worst: 155 },
  { label: 'Double produit', kinds: ['chainMulMul', 'chainMulAdd'], best: 60, worst: 160 },
  { label: 'Deux chiffres × deux chiffres', kinds: ['mul2x2', 'div3'], best: 62, worst: 165 },
  { label: 'Carrés et parenthèses', kinds: ['square', 'chainParen', 'sub33'], best: 62, worst: 165 },
  { label: 'Grand mélange', kinds: ['mul2x2', 'chainMulMul', 'add33'], best: 64, worst: 170 },
  { label: 'Mélange expert', kinds: ['square', 'mul2x1', 'div3', 'add33', 'sub33', 'chainMulMul', 'mul2x2'], best: 66, worst: 175 },
  { label: 'Produits géants', kinds: ['mul2x2', 'square', 'div3', 'chainMulMul'], best: 68, worst: 180 },
  { label: 'Divisions à deux chiffres', kinds: ['div4', 'mul2x2'], best: 70, worst: 185 },
  { label: 'Presque génie', kinds: ['chainBig', 'div4', 'square'], best: 72, worst: 190 },
  { label: 'Génie du calcul', kinds: ['chainBig', 'div4', 'mul2x2', 'square', 'chainMulMul', 'sub33'], best: 75, worst: 200 },
];

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
  if (q.paren) return `(${first} ${q.ops[0]} ${rest[0]}) ${q.ops[1]} ${rest[1]}`;
  return rest.reduce((text, n, i) => `${text} ${q.ops[i]} ${n}`, String(first));
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
