import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { clampScore, type TimeThresholds } from '../scoring';
import { generateFromKinds, type CalcKind, type CalcQuestion } from './calcul';

/**
 * Calcul du diable : les calculs défilent, mais il faut donner le résultat de celui d'il y a N calculs.
 * Mémoire de travail et calcul mental à la fois.
 */

export interface DiableLevel extends TimeThresholds {
  n: number;
  kinds: CalcKind[];
  /** Nombre de réponses à donner. */
  count: number;
}

const L = (n: number, kinds: CalcKind[], count: number, best: number, worst: number): DiableLevel => ({ n, kinds, count, best, worst });

export const DIABLE_LEVELS: readonly DiableLevel[] = [
  L(1, ['add1', 'sub1'], 10, 15, 60),
  L(1, ['add1', 'sub1', 'mul1'], 10, 18, 70),
  L(1, ['add2', 'sub2'], 10, 25, 90),
  L(2, ['add1', 'sub1'], 10, 20, 80),
  L(2, ['add1', 'sub1', 'mul1'], 12, 25, 90),
  L(1, ['mul12', 'div12'], 12, 25, 90),
  L(2, ['add2', 'sub2'], 12, 35, 110),
  L(3, ['add1', 'sub1'], 12, 30, 100),
  L(2, ['mul12', 'div12'], 12, 35, 110),
  L(3, ['add1', 'sub1', 'mul1'], 12, 35, 110),
  L(2, ['add100', 'sub100'], 14, 45, 130),
  L(3, ['add2', 'sub2'], 14, 45, 130),
  L(2, ['mulTeen', 'divTwo'], 14, 45, 130),
  L(3, ['mul12', 'div12'], 14, 50, 140),
  L(4, ['add1', 'sub1'], 14, 45, 130),
  L(3, ['add100', 'sub100', 'mul12'], 15, 55, 150),
  L(4, ['add1', 'sub1', 'mul1'], 15, 55, 150),
  L(3, ['mulTeen', 'divTwo', 'add2'], 15, 60, 160),
  L(4, ['add2', 'sub2'], 15, 65, 170),
  L(4, ['mul12', 'div12', 'add100'], 16, 70, 180),
];

/** Familles nommées dans le libellé : [français, anglais], choisis à l'affichage. */
const KIND_LABELS: Partial<Record<CalcKind, readonly [string, string]>> = {
  add1: ['additions', 'addition'],
  sub1: ['soustractions', 'subtraction'],
  mul1: ['tables', 'times tables'],
  add2: ['deux chiffres', 'two digits'],
  mul12: ['tables de 12', 'tables to 12'],
  add100: ['jusqu’à 100', 'up to 100'],
  mulTeen: ['grands produits', 'big products'],
};

export function diableLevel(level: number): DiableLevel {
  return pickLevel(DIABLE_LEVELS, level);
}

export function diableLevelLabel(level: number): string {
  const c = diableLevel(level);
  const kinds = [...new Set(c.kinds.map((k) => KIND_LABELS[k]).filter((label) => label !== undefined).map((label) => tr(...label)))].join(', ');
  return tr(
    `${c.n} calcul${c.n > 1 ? 's' : ''} en arrière · ${kinds} · ${c.count} réponses`,
    `${c.n} sum${c.n > 1 ? 's' : ''} back · ${kinds} · ${c.count} answers`,
  );
}

export function generateDiable(rng: Rng, level: number): CalcQuestion[] {
  const c = diableLevel(level);
  return generateFromKinds(rng, c.kinds, c.count);
}

/** Bonnes réponses d'abord (60 %), puis la vitesse vient bonifier (40 %). */
export function scoreDiable(correct: number, elapsedMs: number, level: number): number {
  const c = diableLevel(level);
  const accuracy = correct / c.count;
  const seconds = elapsedMs / 1000;
  const speed = Math.min(1, Math.max(0, (c.worst - seconds) / (c.worst - c.best)));
  return clampScore(accuracy * (0.6 + 0.4 * speed) * 100);
}
