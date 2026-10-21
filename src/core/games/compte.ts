import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * Le compte est bon : des plaques et un nombre cible ; on combine deux plaques avec + − × ÷, le
 * résultat devient une nouvelle plaque, jusqu'à tomber pile sur la cible. Autant de comptes que
 * possible en 45 s ; on peut passer un tirage. Que des entiers positifs : une soustraction qui
 * donnerait zéro ou moins, une division qui ne tombe pas juste, sont refusées.
 * Chaque tirage est construit à partir d'une vraie solution, et la cible ne s'atteint pas en moins
 * d'opérations que prévu. Les paliers changent la façon de jouer : la multiplication et deux
 * opérations (Confirmé), trois opérations et la division (Expert), une grande plaque de 25 à 100
 * (Maître), chaque signe une seule fois par tirage (Légende).
 */

export const COMPTE_DURATION_MS = 45_000;
/** Plus grand résultat intermédiaire accepté pendant la construction d'un tirage. */
const MAX_STEP = 999;
const BIG_PLATES = [25, 50, 75, 100] as const;

export type Sign = '+' | '−' | '×' | '÷';
export const SIGNS: readonly Sign[] = ['+', '−', '×', '÷'];

export interface CompteLevel {
  /** Nombre de plaques. */
  plates: number;
  /** Plus grande petite plaque (elles vont de 1 à ce nombre). */
  maxSmall: number;
  /** Une grande plaque (25, 50, 75 ou 100) parmi les plaques. */
  big: boolean;
  /** Opérations qu'il faut au moins pour atteindre la cible. */
  ops: number;
  /** Signes proposés. */
  signs: readonly Sign[];
  /** Chaque signe ne sert qu'une fois par tirage. */
  once: boolean;
  minTarget: number;
  maxTarget: number;
  /** Comptes trouvés en une partie pour 100 pts. */
  target: number;
}

/** Interpolation d'un palier : de `a` (1er niveau) à `b` (10e). */
const step = (i: number, a: number, b: number) => Math.round(a + ((b - a) * i) / 9);

const lvl = (plates: number, maxSmall: number, big: boolean, ops: number, signs: readonly Sign[], once: boolean, minTarget: number, maxTarget: number, target: number): CompteLevel => ({
  plates,
  maxSmall,
  big,
  ops,
  signs,
  once,
  minTarget,
  maxTarget,
  target,
});

const ADD_SUB: readonly Sign[] = ['+', '−'];
const NO_DIV: readonly Sign[] = ['+', '−', '×'];

export const COMPTE_LEVELS: readonly CompteLevel[] = [
  // Débutant : trois plaques, une addition ou une soustraction suffit.
  ...Array.from({ length: 10 }, (_, i) => lvl(3, step(i, 6, 9), false, 1, ADD_SUB, false, 3, step(i, 12, 18), step(i, 8, 7))),
  // Confirmé : quatre plaques, deux opérations, la multiplication.
  ...Array.from({ length: 10 }, (_, i) => lvl(4, 9, false, 2, NO_DIV, false, 10, step(i, 30, 60), step(i, 6, 5))),
  // Expert : trois opérations, et la division (quand elle tombe juste).
  ...Array.from({ length: 10 }, (_, i) => lvl(4, 10, false, 3, SIGNS, false, 15, step(i, 50, 100), step(i, 5, 4))),
  // Maître : une grande plaque (25, 50, 75 ou 100) parmi cinq.
  ...Array.from({ length: 10 }, (_, i) => lvl(5, 10, true, 3, SIGNS, false, 30, step(i, 120, 300), 4)),
  // Légende : chaque signe ne sert qu'une fois par tirage.
  ...Array.from({ length: 10 }, (_, i) => lvl(5, 10, true, 3, SIGNS, true, 30, step(i, 150, 400), step(i, 4, 3))),
];

export function compteLevel(level: number): CompteLevel {
  return pickLevel(COMPTE_LEVELS, level);
}

export function compteLevelLabel(level: number): string {
  const c = compteLevel(level);
  return [
    tr(`${c.plates} plaques`, `${c.plates} tiles`),
    c.signs.join(' '),
    c.big && !c.once && tr('une grande plaque', 'one big tile'),
    c.once && tr('chaque signe une fois', 'each sign once'),
    tr(`cible jusqu’à ${c.maxTarget}`, `target up to ${c.maxTarget}`),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** La règle affichée à l'intro. */
export function compteRule(level: number): string {
  const c = compteLevel(level);
  const parts = [
    tr(
      'Atteins le nombre cible : touche une plaque, un signe, puis une autre plaque ; le résultat devient une plaque. 45 secondes.',
      'Hit the target number: tap a tile, a sign, then another tile; the result becomes a new tile. 45 seconds.',
    ),
    c.ops >= 2 && tr('Il faut plusieurs opérations. Pas de nombre négatif ni de division qui ne tombe pas juste.', 'It takes several steps. No negative numbers, and divisions must come out even.'),
    c.big && !c.once && tr('Une grande plaque (25, 50, 75 ou 100) aide à viser haut.', 'A big tile (25, 50, 75 or 100) helps you aim high.'),
    c.once && tr('Chaque signe ne sert qu’une fois par tirage.', 'Each sign can be used only once per round.'),
  ];
  return parts.filter(Boolean).join(' ');
}

/** Le résultat de `a` signe `b`, ou `null` s'il n'est pas un entier positif. */
export function apply(a: number, sign: Sign, b: number): number | null {
  switch (sign) {
    case '+':
      return a + b;
    case '−':
      return a > b ? a - b : null;
    case '×':
      return a * b;
    case '÷':
      return b > 0 && a % b === 0 ? a / b : null;
  }
}

/** Peut-on obtenir `target` à partir de `values` en `depth` opérations au plus (signes `signs`) ? */
export function canReach(values: readonly number[], target: number, depth: number, signs: readonly Sign[] = SIGNS): boolean {
  if (values.includes(target)) return true;
  if (depth === 0) return false;
  for (let i = 0; i < values.length; i++) {
    for (let j = 0; j < values.length; j++) {
      if (i === j) continue;
      const rest = values.filter((_, k) => k !== i && k !== j);
      for (const sign of signs) {
        // + et × ne dépendent pas de l'ordre : une seule fois par paire.
        if ((sign === '+' || sign === '×') && j < i) continue;
        const r = apply(values[i], sign, values[j]);
        if (r !== null && canReach([...rest, r], target, depth - 1, signs)) return true;
      }
    }
  }
  return false;
}

export interface CompteStep {
  a: number;
  sign: Sign;
  b: number;
  result: number;
}

export interface ComptePuzzle {
  plates: number[];
  target: number;
  /** Une façon d'y arriver (montrée quand on passe le tirage). */
  solution: CompteStep[];
}

function drawPlates(rng: Rng, c: CompteLevel): number[] {
  const small = Array.from({ length: c.plates - (c.big ? 1 : 0) }, () => rng.int(1, c.maxSmall));
  return c.big ? rng.shuffle([...small, rng.pick(BIG_PLATES)]) : small;
}

/** Un tirage : des plaques, une cible construite à partir d'une vraie solution de `ops` opérations. */
export function generateCompte(rng: Rng, level: number): ComptePuzzle {
  const c = compteLevel(level);
  for (;;) {
    const plates = drawPlates(rng, c);
    // Trois plaques identiques ou plus : un tirage sans intérêt.
    if (new Set(plates).size < plates.length - 1) continue;
    let pool = rng.shuffle([...plates]).slice(0, c.ops + 1);
    const signs = c.once ? rng.shuffle([...c.signs]) : [...c.signs];
    const solution: CompteStep[] = [];
    for (let k = 0; k < c.ops; k++) {
      const [i, j] = rng.shuffle(pool.map((_, n) => n)).slice(0, 2);
      const sign = c.once ? signs[k] : rng.pick(signs);
      const [a, b] = sign === '−' || sign === '÷' ? [Math.max(pool[i], pool[j]), Math.min(pool[i], pool[j])] : [pool[i], pool[j]];
      const result = apply(a, sign, b);
      // Pas de pas inutile (× 1, ÷ 1, un résultat égal à l'une des plaques combinées).
      if (result === null || result > MAX_STEP || result === a || result === b) break;
      solution.push({ a, sign, b, result });
      pool = [...pool.filter((_, n) => n !== i && n !== j), result];
    }
    if (solution.length < c.ops) continue;
    const target = pool[pool.length - 1];
    if (target < c.minTarget || target > c.maxTarget || plates.includes(target)) continue;
    // La cible doit demander toutes les opérations prévues : pas de raccourci.
    if (canReach(plates, target, c.ops - 1)) continue;
    return { plates, target, solution };
  }
}

/** Comptes trouvés rapportés à l'objectif du niveau. */
export function scoreCompte(solved: number, level: number): number {
  return countScore(solved, 0, compteLevel(level).target);
}
