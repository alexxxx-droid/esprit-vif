import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * Suites logiques : une suite de nombres où il en manque un ; on le tape au pavé. Autant de suites
 * que possible en 45 s. Uniquement des entiers de 1 à 999 : rien à saisir à virgule.
 * Les paliers changent la façon de jouer : le nombre manquant peut être au milieu et les suites
 * se multiplient (Confirmé), deux suites mêlées un nombre sur deux (Expert), des écarts qui
 * grandissent ou qui montent et descendent tour à tour (Maître), des carrés et des sommes des deux
 * nombres d'avant (Légende).
 */

export const SUITES_DURATION_MS = 45_000;
/** Plus grand nombre d'une suite : trois chiffres au plus à taper. */
export const SUITES_MAX = 999;

export type SuiteRule = 'add' | 'sub' | 'mul' | 'alt' | 'grow' | 'zigzag' | 'square' | 'fibo';

export interface SuitesLevel {
  /** Les règles tirées au sort (une règle répétée tombe plus souvent). */
  rules: readonly SuiteRule[];
  /** Le nombre manquant : toujours le dernier, ou n'importe où sauf le premier. */
  missing: 'last' | 'any';
  /** Écart des suites qui montent ou descendent. */
  minStep: number;
  maxStep: number;
  /** Plus grand premier nombre (ou dernier, pour une suite qui descend). */
  maxStart: number;
  /** Bonnes réponses en une partie pour 100 pts. */
  target: number;
}

/** Interpolation d'un palier : de `a` (1er niveau) à `b` (10e). */
const step = (i: number, a: number, b: number) => Math.round(a + ((b - a) * i) / 9);

const lvl = (rules: readonly SuiteRule[], missing: 'last' | 'any', minStep: number, maxStep: number, maxStart: number, target: number): SuitesLevel => ({
  rules,
  missing,
  minStep,
  maxStep,
  maxStart,
  target,
});

export const SUITES_LEVELS: readonly SuitesLevel[] = [
  // Débutant : des suites qui montent, puis qui descendent (niveau 6) ; on trouve le nombre suivant.
  ...Array.from({ length: 10 }, (_, i) => lvl(i < 5 ? ['add'] : ['add', 'sub'], 'last', i < 3 ? 1 : 2, step(i, 3, 9), step(i, 9, 30), step(i, 10, 8))),
  // Confirmé : le nombre manquant peut être au milieu ; des suites qui se multiplient (× 2, × 3).
  ...Array.from({ length: 10 }, (_, i) => lvl(['add', 'sub', 'mul'], 'any', 3, step(i, 9, 15), step(i, 30, 60), step(i, 8, 7))),
  // Expert : deux suites mêlées, un nombre sur deux.
  ...Array.from({ length: 10 }, (_, i) => lvl(['alt', 'alt', 'add', 'sub', 'mul'], 'any', 3, step(i, 9, 15), step(i, 40, 80), step(i, 7, 6))),
  // Maître : des écarts qui grandissent, ou qui montent et descendent tour à tour.
  ...Array.from({ length: 10 }, (_, i) => lvl(['grow', 'zigzag', 'grow', 'zigzag', 'alt', 'mul'], 'any', 3, step(i, 9, 15), step(i, 40, 80), step(i, 6, 5))),
  // Légende : des carrés, et des suites où chaque nombre est la somme des deux d'avant.
  ...Array.from({ length: 10 }, (_, i) => lvl(['square', 'fibo', 'square', 'fibo', 'grow', 'zigzag', 'alt'], 'any', 4, step(i, 12, 19), step(i, 60, 99), 5)),
];

export function suitesLevel(level: number): SuitesLevel {
  return pickLevel(SUITES_LEVELS, level);
}

export function suitesLevelLabel(level: number): string {
  const c = suitesLevel(level);
  const has = (r: SuiteRule) => c.rules.includes(r);
  return [
    has('square')
      ? tr('carrés et sommes', 'squares and sums')
      : has('grow')
        ? tr('écarts qui changent', 'changing gaps')
        : has('alt')
          ? tr('deux suites mêlées', 'two mixed series')
          : has('mul')
            ? tr('× 2 et × 3', '× 2 and × 3')
            : has('sub')
              ? tr('monte ou descend', 'up or down')
              : tr('suites qui montent', 'going up'),
    c.missing === 'any' && !has('alt') && tr('nombre manquant n’importe où', 'missing number anywhere'),
    tr(`écarts jusqu’à ${c.maxStep}`, `gaps up to ${c.maxStep}`),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** La règle affichée à l'intro. */
export function suitesRule(level: number): string {
  const c = suitesLevel(level);
  const has = (r: SuiteRule) => c.rules.includes(r);
  const parts = [
    tr('Trouve le nombre qui manque dans la suite et tape-le. 45 secondes.', 'Find the missing number in the series and type it. 45 seconds.'),
    c.missing === 'any' && tr('Il peut manquer au milieu comme à la fin.', 'It can be missing in the middle or at the end.'),
    has('mul') && !has('alt') && tr('Certaines suites se multiplient : × 2 ou × 3 à chaque fois.', 'Some series multiply: × 2 or × 3 each time.'),
    has('alt') && !has('grow') && tr('Parfois deux suites sont mêlées : regarde un nombre sur deux.', 'Sometimes two series are mixed: look at every other number.'),
    has('grow') && !has('square') && tr('Les écarts peuvent grandir, ou monter et descendre tour à tour.', 'Gaps can grow, or go up and down in turn.'),
    has('square') && tr('Des carrés (4, 9, 16…), ou chaque nombre est la somme des deux d’avant.', 'Squares (4, 9, 16…), or each number is the sum of the two before it.'),
  ];
  return parts.filter(Boolean).join(' ');
}

export interface Suite {
  rule: SuiteRule;
  terms: number[];
  /** Index du nombre caché. */
  missing: number;
}

const seq = (n: number, f: (i: number) => number) => Array.from({ length: n }, (_, i) => f(i));

/** Les nombres d'une suite, selon sa règle (tous entre 1 et `SUITES_MAX`). */
function makeTerms(rng: Rng, rule: SuiteRule, c: SuitesLevel): number[] {
  const d = () => rng.int(c.minStep, c.maxStep);
  switch (rule) {
    case 'add': {
      const [a, s] = [rng.int(1, c.maxStart), d()];
      return seq(5, (i) => a + i * s);
    }
    case 'sub': {
      const [end, s] = [rng.int(1, c.maxStart), d()];
      return seq(5, (i) => end + (4 - i) * s);
    }
    case 'mul': {
      const f = rng.chance(0.6) ? 2 : 3;
      const a = rng.int(1, f === 2 ? 12 : 4);
      return seq(5, (i) => a * f ** i);
    }
    case 'alt': {
      // Les rangs pairs suivent une suite, les impairs une autre ; l'une des deux peut descendre.
      const [a, da, b, db] = [rng.int(1, c.maxStart), d(), rng.int(1, c.maxStart), d()];
      const down = rng.chance(0.4);
      const second = (k: number) => (down ? b + (2 - k) * db : b + k * db);
      return seq(7, (i) => (i % 2 === 0 ? a + (i / 2) * da : second((i - 1) / 2)));
    }
    case 'grow': {
      // L'écart grandit d'autant à chaque pas : 3, 5, 8, 12, 17…
      const [a, s, e] = [rng.int(1, c.maxStart), rng.int(1, 6), rng.int(1, 4)];
      return seq(6, (i) => a + i * s + (e * i * (i - 1)) / 2);
    }
    case 'zigzag': {
      // On monte de `up`, on descend de `down`, tour à tour : 5, 12, 9, 16, 13…
      const up = rng.int(4, Math.max(5, c.maxStep));
      const down = rng.int(1, up - 1);
      const a = rng.int(1, c.maxStart);
      return seq(6, (i) => a + Math.ceil(i / 2) * up - Math.floor(i / 2) * down);
    }
    case 'square': {
      // Des carrés qui se suivent, parfois décalés d'un même nombre : 10, 17, 26, 37…
      const n = rng.int(2, 12);
      const shift = rng.chance(0.5) ? 0 : rng.int(1, 9);
      return seq(5, (i) => (n + i) ** 2 + shift);
    }
    case 'fibo': {
      const terms = [rng.int(1, 9), rng.int(1, 9)];
      while (terms.length < 6) terms.push(terms[terms.length - 1] + terms[terms.length - 2]);
      return terms;
    }
  }
}

export function generateSuite(rng: Rng, level: number): Suite {
  const c = suitesLevel(level);
  const rule = rng.pick(c.rules);
  const terms = makeTerms(rng, rule, c);
  // Le premier nombre reste visible : la suite se lit toujours depuis son début.
  const missing = c.missing === 'last' ? terms.length - 1 : rng.int(1, terms.length - 1);
  return { rule, terms, missing };
}

/** Bonnes réponses rapportées à l'objectif du niveau. */
export function scoreSuites(correct: number, level: number): number {
  return countScore(correct, 0, suitesLevel(level).target);
}
