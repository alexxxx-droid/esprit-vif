import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * Le plus grand ? Deux calculs (puis trois) côte à côte : on touche celui qui donne le plus, en
 * estimant plutôt qu'en calculant tout. Autant de réponses que possible en 45 s ; une erreur retire
 * un point, répondre au hasard ne rapporte rien. Que des entiers.
 * Les paliers changent la façon de jouer : soustractions et multiplications (Confirmé), des écarts
 * serrés et parfois l'égalité, bouton « = » (Expert), trois calculs (Maître), et parfois « le plus
 * petit ? » (Légende).
 */

export const GRAND_DURATION_MS = 45_000;

export type GrandSign = '+' | '−' | '×' | '÷';

export interface GrandLevel {
  signs: readonly GrandSign[];
  /** Plus grand terme d'une addition ou d'une soustraction (les multiplications restent dans les tables). */
  max: number;
  /** Écart entre les résultats : au moins `minGap`, au plus `maxGap` (0 : pas de limite). */
  minGap: number;
  maxGap: number;
  /** Part des questions où les deux calculs sont égaux (bouton « = »). */
  equal: number;
  /** Calculs par question. */
  options: 2 | 3;
  /** Part des questions « le plus petit ? ». */
  smallest: number;
  /** Bonnes réponses moins erreurs pour 100 pts. */
  target: number;
}

/** Interpolation d'un palier : de `a` (1er niveau) à `b` (10e). */
const step = (i: number, a: number, b: number) => Math.round(a + ((b - a) * i) / 9);

const lvl = (signs: readonly GrandSign[], max: number, minGap: number, maxGap: number, equal: number, options: 2 | 3, smallest: number, target: number): GrandLevel => ({
  signs,
  max,
  minGap,
  maxGap,
  equal,
  options,
  smallest,
  target,
});

const ALL: readonly GrandSign[] = ['+', '−', '×', '÷'];

export const GRAND_LEVELS: readonly GrandLevel[] = [
  // Débutant : des additions, des écarts nets.
  ...Array.from({ length: 10 }, (_, i) => lvl(['+'], step(i, 12, 30), i < 5 ? 4 : 3, 0, 0, 2, 0, step(i, 22, 26))),
  // Confirmé : soustractions et multiplications.
  ...Array.from({ length: 10 }, (_, i) => lvl(['+', '−', '×'], step(i, 30, 60), 2, 0, 0, 2, 0, step(i, 20, 24))),
  // Expert : des écarts serrés, et parfois l'égalité.
  ...Array.from({ length: 10 }, (_, i) => lvl(ALL, step(i, 40, 80), 1, 3, step(i, 15, 25) / 100, 2, 0, step(i, 18, 22))),
  // Maître : trois calculs, le plus grand des trois.
  ...Array.from({ length: 10 }, (_, i) => lvl(ALL, step(i, 40, 80), 1, step(i, 6, 3), 0, 3, 0, step(i, 15, 19))),
  // Légende : et parfois « le plus petit ? ».
  ...Array.from({ length: 10 }, (_, i) => lvl(ALL, step(i, 60, 99), 1, 4, 0, 3, step(i, 30, 45) / 100, step(i, 14, 17))),
];

export function grandLevel(level: number): GrandLevel {
  return pickLevel(GRAND_LEVELS, level);
}

export function grandLevelLabel(level: number): string {
  const c = grandLevel(level);
  return [
    c.signs.join(' '),
    c.options === 3 ? tr('trois calculs', 'three sums') : null,
    c.equal > 0 && tr('parfois égaux', 'sometimes equal'),
    c.smallest > 0 && tr('parfois le plus petit', 'sometimes the smallest'),
    tr(`nombres jusqu’à ${c.max}`, `numbers up to ${c.max}`),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** La règle affichée à l'intro. */
export function grandRule(level: number): string {
  const c = grandLevel(level);
  const parts = [
    c.options === 3
      ? tr('Touche le calcul qui donne le plus des trois. Une erreur retire un point. 45 secondes.', 'Tap the sum that gives the most of the three. A mistake costs a point. 45 seconds.')
      : tr('Touche le calcul qui donne le plus. Une erreur retire un point. 45 secondes.', 'Tap the sum that gives the most. A mistake costs a point. 45 seconds.'),
    c.equal > 0 && tr('S’ils donnent autant, touche « = ».', 'If they are equal, tap “=”.'),
    c.smallest > 0 && tr('Quand la question est en rouge, c’est le plus petit qu’il faut toucher.', 'When the question is red, tap the smallest instead.'),
  ];
  return parts.filter(Boolean).join(' ');
}

export interface GrandCalc {
  a: number;
  sign: GrandSign;
  b: number;
  value: number;
}

export interface GrandQuestion {
  calcs: GrandCalc[];
  /** Chercher le plus petit plutôt que le plus grand. */
  smallest: boolean;
  /** L'index du bon calcul, ou -1 s'ils sont égaux. */
  answer: number;
}

export const formatCalc = (c: GrandCalc) => `${c.a} ${c.sign} ${c.b}`;

function calc(rng: Rng, c: GrandLevel): GrandCalc {
  const sign = rng.pick(c.signs);
  switch (sign) {
    case '+': {
      const [a, b] = [rng.int(2, c.max), rng.int(2, c.max)];
      return { a, sign, b, value: a + b };
    }
    case '−': {
      const a = rng.int(10, c.max + 10);
      const b = rng.int(2, a - 2);
      return { a, sign, b, value: a - b };
    }
    case '×': {
      const [a, b] = [rng.int(2, 9), rng.int(2, c.max > 50 ? 12 : 9)];
      return { a, sign, b, value: a * b };
    }
    case '÷': {
      const [b, q] = [rng.int(2, 9), rng.int(2, 12)];
      return { a: b * q, sign, b, value: q };
    }
  }
}

export function generateGrand(rng: Rng, level: number): GrandQuestion {
  const c = grandLevel(level);
  const wantEqual = c.options === 2 && rng.chance(c.equal);
  const smallest = rng.chance(c.smallest);
  for (;;) {
    const calcs = Array.from({ length: c.options }, () => calc(rng, c));
    // Deux fois le même calcul (ou les mêmes nombres échangés) : sans intérêt.
    if (new Set(calcs.map((k) => [k.a, k.b].sort().join(k.sign))).size < calcs.length) continue;
    const values = calcs.map((k) => k.value);
    if (wantEqual) {
      if (values[0] === values[1]) return { calcs, smallest: false, answer: -1 };
      continue;
    }
    if (new Set(values).size < values.length) continue;
    const sorted = [...values].sort((x, y) => y - x);
    // L'écart qui décide : entre le premier et le deuxième (ou l'avant-dernier et le dernier pour « le plus petit »).
    const gap = smallest ? sorted[sorted.length - 2] - sorted[sorted.length - 1] : sorted[0] - sorted[1];
    if (gap < c.minGap || (c.maxGap && gap > c.maxGap)) continue;
    const target = smallest ? Math.min(...values) : Math.max(...values);
    return { calcs, smallest, answer: values.indexOf(target) };
  }
}

/** Bonnes réponses moins erreurs, rapportées à l'objectif du niveau. */
export function scoreGrand(correct: number, errors: number, level: number): number {
  return countScore(correct - errors, 0, grandLevel(level).target);
}
