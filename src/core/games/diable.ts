import { byCount } from '../format';
import { localized, tr, type Translations } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { clampScore, type TimeThresholds } from '../scoring';
import { generateFromKinds, type CalcKind, type CalcQuestion } from './calcul';

/**
 * Calcul du diable : les calculs défilent, mais il faut donner le résultat de celui d'il y a N calculs.
 * Mémoire de travail et calcul mental à la fois.
 */

export interface DiableLevel extends TimeThresholds {
  /** Combien de calculs en arrière (au plus, si `varying`). */
  n: number;
  kinds: CalcKind[];
  /** Nombre de réponses à donner. */
  count: number;
  /** Le calcul affiché s'efface après ce délai (niveaux Expert et plus) : il faut le calculer tout de suite. */
  hideMs?: number;
  /** L'écart change à chaque réponse, de 1 à `n` (niveaux Maître et Légende) : il faut garder les `n` derniers résultats en tête. */
  varying?: boolean;
}

const L = (n: number, kinds: CalcKind[], count: number, best: number, worst: number): DiableLevel => ({ n, kinds, count, best, worst });

interface DiableTwists {
  hideMs?: number;
  varying?: boolean;
}

/** Niveaux 21 et plus : calculs plus durs, puis calculs qui s'effacent, puis écart variable. */
const X = (n: number, kinds: CalcKind[], count: number, best: number, worst: number, twists: DiableTwists = {}): DiableLevel => ({
  n,
  kinds,
  count,
  best,
  worst,
  ...twists,
});

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
  // Expert : centaines et produits à deux chiffres, puis le calcul s'efface (2,5 s → 2 s).
  X(2, ['add3', 'sub3'], 15, 65, 162),
  X(3, ['mul2x1', 'div3'], 15, 78, 195),
  X(4, ['add100', 'sub100'], 16, 70, 176),
  X(2, ['mul12', 'div12'], 15, 54, 135, { hideMs: 2500 }),
  X(3, ['chainAddSub', 'mul12'], 16, 66, 166),
  X(4, ['mulTeen', 'divTwo'], 16, 77, 192),
  X(3, ['add2', 'sub2', 'mul12'], 16, 67, 168, { hideMs: 2200 }),
  X(4, ['add3', 'sub3'], 16, 82, 204),
  X(3, ['mul2x1', 'div3', 'add100'], 16, 82, 204, { hideMs: 2000 }),
  X(4, ['mul12', 'div12', 'add2', 'sub2'], 18, 82, 205, { hideMs: 2000 }),
  // Maître : l'écart change à chaque réponse, jusqu'à 5 calculs en arrière.
  X(3, ['add1', 'sub1', 'mul1'], 16, 59, 148, { varying: true }),
  X(5, ['add1', 'sub1'], 16, 67, 168),
  X(3, ['add2', 'sub2'], 16, 69, 172, { varying: true }),
  X(4, ['add2', 'sub2', 'mul12'], 18, 83, 207, { hideMs: 1800 }),
  X(4, ['mul12', 'div12'], 18, 79, 198, { varying: true }),
  X(5, ['add1', 'sub1', 'mul1'], 18, 76, 189),
  X(3, ['mul2x1', 'div3'], 18, 104, 261, { varying: true, hideMs: 2000 }),
  X(4, ['add100', 'sub100', 'mulTeen'], 18, 87, 217, { varying: true }),
  X(5, ['add2', 'sub2'], 18, 92, 230, { hideMs: 2000 }),
  X(4, ['add3', 'sub3', 'mul12'], 20, 107, 269, { varying: true, hideMs: 1800 }),
  // Légende : cinq en arrière, écart variable et calculs effacés ensemble (jusqu'à 1,2 s).
  X(5, ['mul12', 'div12'], 18, 86, 216, { varying: true }),
  X(4, ['chainAddSub', 'chainMulAdd'], 18, 94, 234, { hideMs: 1600 }),
  X(5, ['add100', 'sub100'], 20, 102, 255, { varying: true }),
  X(4, ['mul2x1', 'div3', 'add3'], 20, 121, 302, { varying: true, hideMs: 1600 }),
  X(5, ['add2', 'sub2', 'mul12'], 20, 100, 250, { hideMs: 1500 }),
  X(5, ['mulTeen', 'divTwo', 'add100'], 20, 107, 268, { varying: true }),
  X(5, ['add3', 'sub3'], 20, 122, 305, { varying: true, hideMs: 1500 }),
  X(5, ['mul12', 'div12', 'add100', 'sub100'], 20, 105, 262, { varying: true, hideMs: 1400 }),
  X(5, ['mul2x1', 'div3', 'square'], 20, 129, 321, { varying: true, hideMs: 1300 }),
  X(5, ['add3', 'sub3', 'mul2x1', 'div3', 'square', 'chainMulAdd'], 20, 130, 325, { varying: true, hideMs: 1200 }),
];

/** Familles nommées dans le libellé : [français, anglais], choisis à l'affichage. */
const KIND_LABELS: Partial<Record<CalcKind, Translations>> = {
  add1: { fr: 'additions', en: 'addition' },
  sub1: { fr: 'soustractions', en: 'subtraction' },
  mul1: { fr: 'tables', en: 'times tables' },
  add2: { fr: 'deux chiffres', en: 'two digits' },
  mul12: { fr: 'tables de 12', en: 'tables to 12' },
  add100: { fr: 'jusqu’à 100', en: 'up to 100' },
  mulTeen: { fr: 'grands produits', en: 'big products' },
  // Familles des niveaux 21 et plus (absentes des niveaux 1 à 20, dont les libellés ne bougent pas).
  add3: { fr: 'centaines', en: 'hundreds' },
  sub3: { fr: 'centaines', en: 'hundreds' },
  mul2x1: { fr: 'produits à deux chiffres', en: 'two-digit products' },
  div3: { fr: 'divisions de centaines', en: 'dividing hundreds' },
  chainAddSub: { fr: 'chaînes', en: 'chains' },
  chainMulAdd: { fr: 'chaînes', en: 'chains' },
  square: { fr: 'carrés', en: 'squares' },
};

export function diableLevel(level: number): DiableLevel {
  return pickLevel(DIABLE_LEVELS, level);
}

export function diableLevelLabel(level: number): string {
  const c = diableLevel(level);
  const kinds = [...new Set(c.kinds.map((k) => KIND_LABELS[k]).filter((label) => label !== undefined).map((label) => localized(label)))].join(', ');
  const back = c.varying
    ? tr(`1 à ${c.n} calculs en arrière`, `1 to ${c.n} sums back`)
    : tr(byCount(c.n, `${c.n} calcul en arrière`, `${c.n} calculs en arrière`), byCount(c.n, `${c.n} sum back`, `${c.n} sums back`));
  return [
    back,
    kinds,
    c.hideMs && tr(`effacés après ${secondsLabel(c.hideMs)}`, `hidden after ${secondsLabel(c.hideMs)}`),
    tr(`${c.count} réponses`, `${c.count} answers`),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** La règle affichée à l'intro. */
export function diableRule(level: number): string {
  const { n, varying, hideMs } = diableLevel(level);
  const base = varying
    ? tr(
        `Les calculs défilent : donne le résultat de celui qu’on te demande, de 1 à ${n} coups en arrière.`,
        `The sums keep coming: give the answer to the one you’re asked for, 1 to ${n} turns back.`,
      )
    : tr(
        byCount(
          n,
          'Les calculs défilent : donne le résultat de celui d’il y a un coup, pas du calcul affiché.',
          `Les calculs défilent : donne le résultat de celui d’il y a ${n} coups, pas du calcul affiché.`,
        ),
        byCount(
          n,
          'The sums keep coming: give the answer to the one from 1 turn ago, not the one on screen.',
          `The sums keep coming: give the answer to the one from ${n} turns ago, not the one on screen.`,
        ),
      );
  return hideMs ? `${base} ${tr('Chaque calcul s’efface vite : calcule-le tout de suite.', 'Each sum vanishes quickly: work it out right away.')}` : base;
}

export function generateDiable(rng: Rng, level: number): CalcQuestion[] {
  const c = diableLevel(level);
  return generateFromKinds(rng, c.kinds, c.count);
}

/**
 * L'écart demandé à chaque réponse (la k-ième réponse vient au coup k + n) : toujours `n`, sauf aux
 * niveaux à écart variable, où il est tiré entre 1 et `n` — en fin de partie, assez grand pour viser
 * un calcul déjà montré.
 */
export function generateDiableBacks(rng: Rng, level: number): number[] {
  const { n, count, varying } = diableLevel(level);
  return Array.from({ length: count }, (_, k) => {
    if (!varying) return n;
    const lowest = Math.max(1, k + n - count + 1);
    return rng.int(lowest, n);
  });
}

/** Bonnes réponses d'abord (60 %), puis la vitesse vient bonifier (40 %). */
export function scoreDiable(correct: number, elapsedMs: number, level: number): number {
  const c = diableLevel(level);
  const accuracy = correct / c.count;
  const seconds = elapsedMs / 1000;
  const speed = Math.min(1, Math.max(0, (c.worst - seconds) / (c.worst - c.best)));
  return clampScore(accuracy * (0.6 + 0.4 * speed) * 100);
}
