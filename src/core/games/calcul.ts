import type { Rng } from '../rng';
import { clampLevel, timeScore, type TimeThresholds } from '../scoring';

export type CalcOp = '+' | '−' | '×' | '÷';

export interface CalcQuestion {
  a: number;
  b: number;
  op: CalcOp;
  answer: number;
}

export const CALCUL_COUNT = 20;
export const CALCUL_PENALTY_MS = 3000;
export const CALCUL_MAX_LEVEL = 3;

/** Niveau 1 : barème de la spec. Niveaux 2 et 3 : seuils élargis, la question étant plus longue à résoudre. */
export const CALCUL_THRESHOLDS: Record<number, TimeThresholds> = {
  1: { best: 20, worst: 80 },
  2: { best: 35, worst: 110 },
  3: { best: 45, worst: 130 },
};

const OPS: Record<number, readonly CalcOp[]> = {
  1: ['+', '−', '×'],
  2: ['+', '−', '×', '÷'],
  3: ['+', '−', '×', '÷'],
};

function ordered(rng: Rng, x: number, y: number): [number, number] {
  return rng.chance(0.5) ? [x, y] : [y, x];
}

function build(rng: Rng, level: number, op: CalcOp): CalcQuestion {
  switch (op) {
    case '+': {
      let a: number;
      let b: number;
      if (level === 1) [a, b] = [rng.int(1, 9), rng.int(1, 9)];
      else if (level === 2) [a, b] = [rng.int(10, 49), rng.int(10, 49)];
      else {
        a = rng.int(10, 90);
        b = rng.int(10, 100 - a);
      }
      return { a, b, op, answer: a + b };
    }
    case '−': {
      let a: number;
      let b: number;
      if (level === 1) {
        a = rng.int(2, 9);
        b = rng.int(1, a);
      } else if (level === 2) {
        a = rng.int(30, 99);
        b = rng.int(10, a - 10);
      } else {
        a = rng.int(20, 100);
        b = rng.int(5, a - 1);
      }
      return { a, b, op, answer: a - b };
    }
    case '×': {
      let x: number;
      let y: number;
      if (level === 1) [x, y] = [rng.int(2, 9), rng.int(2, 9)];
      else if (level === 2) [x, y] = [rng.int(11, 19), rng.int(2, 5)];
      else [x, y] = [rng.int(2, 12), rng.int(2, 12)];
      const [a, b] = ordered(rng, x, y);
      return { a, b, op, answer: a * b };
    }
    case '÷': {
      // On part du quotient : la division tombe toujours juste.
      let divisor: number;
      let quotient: number;
      if (level === 2) {
        divisor = rng.int(2, 9);
        quotient = rng.int(Math.max(2, Math.ceil(10 / divisor)), Math.floor(99 / divisor));
      } else {
        divisor = rng.int(2, 12);
        quotient = rng.int(2, 12);
      }
      return { a: divisor * quotient, b: divisor, op, answer: quotient };
    }
  }
}

export function makeCalcQuestion(rng: Rng, level: number): CalcQuestion {
  const lvl = clampLevel(level, CALCUL_MAX_LEVEL);
  return build(rng, lvl, rng.pick(OPS[lvl]));
}

const same = (p: CalcQuestion, q: CalcQuestion) => p.a === q.a && p.b === q.b && p.op === q.op;

/** Série de questions, sans deux calculs identiques à la suite. */
export function generateCalcul(rng: Rng, level: number, count = CALCUL_COUNT): CalcQuestion[] {
  const questions: CalcQuestion[] = [];
  while (questions.length < count) {
    const q = makeCalcQuestion(rng, level);
    const previous = questions[questions.length - 1];
    if (!previous || !same(previous, q)) questions.push(q);
  }
  return questions;
}

export function formatCalc(q: CalcQuestion): string {
  return `${q.a} ${q.op} ${q.b}`;
}

/** Nombre de chiffres de la réponse : la saisie se valide dès qu'il est atteint. */
export function answerLength(answer: number): number {
  return String(answer).length;
}

/** Temps total + 3 s par erreur, converti en score selon le niveau. */
export function scoreCalcul(elapsedMs: number, errors: number, level: number): number {
  const seconds = (elapsedMs + errors * CALCUL_PENALTY_MS) / 1000;
  return timeScore(seconds, CALCUL_THRESHOLDS[clampLevel(level, CALCUL_MAX_LEVEL)]);
}
