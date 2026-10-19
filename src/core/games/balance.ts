import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { clampScore } from '../scoring';

/**
 * Balance : des objets de poids inconnu, des balances qui penchent.
 * Il faut en déduire le plus lourd (ou le plus léger) — parfois malgré des balances qui n'apprennent rien.
 */

export type BalanceAsk = 'heaviest' | 'lightest';

export interface BalanceLevel {
  items: number;
  asks: BalanceAsk[];
  /** Balances « deux contre un » où l'objet seul l'emporte (il est donc plus lourd que chacun des deux). */
  pairs: boolean;
  /** Balances justes mais inutiles pour conclure (deux objets qui battent un seul, deux contre deux). */
  noise: number;
  puzzles: number;
}

const L = (items: number, asks: BalanceAsk[], pairs: boolean, noise: number, puzzles = 6): BalanceLevel => ({ items, asks, pairs, noise, puzzles });
const H: BalanceAsk[] = ['heaviest'];
const B: BalanceAsk[] = ['heaviest', 'lightest'];

export const BALANCE_LEVELS: readonly BalanceLevel[] = [
  L(3, H, false, 0),
  L(3, B, false, 0),
  L(4, H, false, 0),
  L(4, B, false, 0),
  L(4, B, true, 0),
  L(5, H, false, 0),
  L(5, B, false, 0),
  L(5, B, true, 0),
  L(4, B, true, 1),
  L(5, B, false, 1),
  L(6, H, false, 0),
  L(5, B, true, 1),
  L(6, B, false, 0),
  L(6, B, true, 0),
  L(5, B, true, 2),
  L(6, B, false, 1),
  L(6, B, true, 1),
  L(7, B, false, 0, 5),
  L(7, B, true, 1, 5),
  L(7, B, true, 2, 5),
];

export function balanceLevel(level: number): BalanceLevel {
  return pickLevel(BALANCE_LEVELS, level);
}

/** Temps total, en secondes, pour la pleine vitesse et pour le minimum. */
export function balanceTimes(level: number): { best: number; worst: number } {
  const c = balanceLevel(level);
  const best = Math.round(c.puzzles * (c.items * 1.6 + c.noise * 2 + (c.pairs ? 2 : 0)));
  return { best, worst: best * 3 };
}

export function balanceLevelLabel(level: number): string {
  const c = balanceLevel(level);
  return [
    tr(`${c.items} objets`, `${c.items} items`),
    c.asks.length > 1 ? tr('le plus lourd ou le plus léger', 'heaviest or lightest') : tr('le plus lourd', 'heaviest'),
    c.pairs && tr('balances à deux contre un', 'two-against-one scales'),
    c.noise && tr(`${c.noise} balance${c.noise > 1 ? 's' : ''} inutile${c.noise > 1 ? 's' : ''}`, `${c.noise} useless scale${c.noise > 1 ? 's' : ''}`),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Une balance : les objets de chaque plateau et le côté qui descend. */
export interface BalanceClue {
  left: number[];
  right: number[];
  heavier: 'left' | 'right';
}

export interface BalancePuzzle {
  weights: number[];
  clues: BalanceClue[];
  ask: BalanceAsk;
  answer: number;
}

const sum = (items: readonly number[], weights: readonly number[]) => items.reduce((s, i) => s + weights[i], 0);

/**
 * Ce qu'on peut affirmer sans calcul : « a est plus lourd que b ».
 * Un contre un : le côté qui descend gagne. Un seul objet qui l'emporte sur deux : il bat chacun des deux.
 * Le reste (deux qui battent un, deux contre deux) ne permet pas de classer les objets.
 */
export function knownHeavier(items: number, clues: readonly BalanceClue[]): boolean[][] {
  const known = Array.from({ length: items }, () => Array<boolean>(items).fill(false));
  for (const clue of clues) {
    const heavy = clue.heavier === 'left' ? clue.left : clue.right;
    const light = clue.heavier === 'left' ? clue.right : clue.left;
    if (heavy.length === 1) for (const l of light) known[heavy[0]][l] = true;
  }
  // Transitivité : a > b et b > c donnent a > c.
  for (let k = 0; k < items; k++) for (let a = 0; a < items; a++) for (let b = 0; b < items; b++) if (known[a][k] && known[k][b]) known[a][b] = true;
  return known;
}

/** L'objet que les balances désignent sans ambiguïté, ou null si on ne peut pas encore conclure. */
export function deducedAnswer(items: number, clues: readonly BalanceClue[], ask: BalanceAsk): number | null {
  const known = knownHeavier(items, clues);
  for (let x = 0; x < items; x++) {
    let all = true;
    for (let y = 0; y < items; y++) if (y !== x && !(ask === 'heaviest' ? known[x][y] : known[y][x])) all = false;
    if (all) return x;
  }
  return null;
}

const place = (rng: Rng, heavy: number[], light: number[]): BalanceClue =>
  rng.chance(0.5) ? { left: heavy, right: light, heavier: 'left' } : { left: light, right: heavy, heavier: 'right' };

const pairsOf = (items: number) => {
  const out: [number, number][] = [];
  for (let a = 0; a < items; a++) for (let b = a + 1; b < items; b++) out.push([a, b]);
  return out;
};

export function generateBalancePuzzle(rng: Rng, level: number): BalancePuzzle {
  const c = balanceLevel(level);
  const ask = rng.pick(c.asks);
  for (;;) {
    // Poids distincts, assez écartés pour qu'un objet seul puisse battre deux autres.
    const weights = rng.shuffle([1, 2, 3, 5, 8, 12, 17, 23].slice(0, c.items + 1)).slice(0, c.items);
    const clues: BalanceClue[] = [];
    while (deducedAnswer(c.items, clues, ask) === null && clues.length < c.items) {
      const known = knownHeavier(c.items, clues);
      const candidates: BalanceClue[] = [];
      for (const [a, b] of pairsOf(c.items)) {
        const [heavy, light] = weights[a] > weights[b] ? [a, b] : [b, a];
        if (!known[heavy][light]) candidates.push(place(rng, [heavy], [light]));
      }
      if (c.pairs) {
        for (let x = 0; x < c.items; x++) {
          for (const [a, b] of pairsOf(c.items)) {
            if (a === x || b === x || weights[x] <= weights[a] + weights[b]) continue;
            if (!known[x][a] || !known[x][b]) candidates.push(place(rng, [x], [a, b]));
          }
        }
      }
      clues.push(rng.pick(candidates));
    }
    const answer = deducedAnswer(c.items, clues, ask);
    if (answer === null) continue;
    // Les balances inutiles : vraies, mais elles n'ajoutent rien à ce qu'on peut affirmer.
    const wanted = clues.length + c.noise;
    while (clues.length < wanted) {
      const all = rng.shuffle(Array.from({ length: c.items }, (_, i) => i));
      if (c.items >= 4 && rng.chance(0.5)) {
        const left = all.slice(0, 2);
        const right = all.slice(2, 4);
        if (sum(left, weights) !== sum(right, weights)) clues.push(sum(left, weights) > sum(right, weights) ? { left, right, heavier: 'left' } : { left, right, heavier: 'right' });
      } else {
        // Deux objets qui battent un objet seul : on ne sait pas lequel des trois est le plus lourd.
        const [x, a, b] = all;
        if (sum([a, b], weights) > weights[x]) clues.push(place(rng, [a, b], [x]));
      }
    }
    return { weights, clues: rng.shuffle(clues), ask, answer };
  }
}

export function generateBalance(rng: Rng, level: number): BalancePuzzle[] {
  return Array.from({ length: balanceLevel(level).puzzles }, () => generateBalancePuzzle(rng, level));
}

export function scoreBalance(correct: number, elapsedMs: number, level: number): number {
  const { puzzles } = balanceLevel(level);
  const { best, worst } = balanceTimes(level);
  const speed = Math.min(1, Math.max(0, (worst - elapsedMs / 1000) / (worst - best)));
  return clampScore((correct / puzzles) * (0.6 + 0.4 * speed) * 100);
}
