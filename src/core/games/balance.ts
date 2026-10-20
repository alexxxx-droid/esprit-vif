import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { clampScore } from '../scoring';

/**
 * Balance : des objets de poids inconnu, des balances qui penchent.
 * Il faut en déduire le plus lourd (ou le plus léger) — parfois malgré des balances qui n'apprennent rien.
 * Au-delà du niveau 20 : des chaînes (le plus lourd ne gagne qu'une balance, un leurre en gagne
 * beaucoup), des pièges (la réponse perd une balance inutile) et des balances à plusieurs exemplaires
 * (« 2 ■ pèsent plus que 3 ▲ » : le carré est plus lourd ; « 3 ▲ battent 2 ■ » n'apprend rien).
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
  /** Étapes de la plus longue chaîne de déductions (la réponse ne bat directement qu'un seul objet). */
  chain?: number;
  /** Balances à plusieurs exemplaires d'un même objet, utiles ou trompeuses. */
  counts?: true;
  /** Une balance inutile met la réponse du « mauvais » côté. */
  trap?: true;
}

const L = (items: number, asks: BalanceAsk[], pairs: boolean, noise: number, puzzles = 6): BalanceLevel => ({ items, asks, pairs, noise, puzzles });
const H: BalanceAsk[] = ['heaviest'];
const B: BalanceAsk[] = ['heaviest', 'lightest'];
/** Niveaux 21 et plus : le plus lourd ou le plus léger, cinq énigmes. */
const Z = (items: number, noise: number, chain: number, twist: { pairs?: true; counts?: true; trap?: true }): BalanceLevel => ({
  items,
  asks: B,
  pairs: twist.pairs ?? false,
  noise,
  puzzles: 5,
  chain,
  ...(twist.counts ? { counts: true as const } : {}),
  ...(twist.trap ? { trap: true as const } : {}),
});
const P = { pairs: true } as const;
const PT = { pairs: true, trap: true } as const;
const CT = { counts: true, trap: true } as const;
const ALL = { pairs: true, counts: true, trap: true } as const;

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
  // Expert : des chaînes (un leurre gagne beaucoup de balances) et des pièges.
  Z(7, 2, 2, P),
  Z(7, 2, 2, PT),
  Z(7, 3, 2, PT),
  Z(7, 3, 3, PT),
  Z(8, 3, 3, PT),
  Z(8, 3, 4, PT),
  Z(8, 4, 4, PT),
  Z(8, 4, 5, PT),
  Z(9, 4, 5, PT),
  Z(9, 5, 5, PT),
  // Maître : les balances à plusieurs exemplaires.
  Z(6, 2, 2, { counts: true }),
  Z(6, 2, 2, CT),
  Z(7, 2, 3, CT),
  Z(7, 3, 3, CT),
  Z(7, 3, 3, ALL),
  Z(7, 3, 4, ALL),
  Z(8, 3, 4, ALL),
  Z(8, 4, 4, ALL),
  Z(8, 4, 5, ALL),
  Z(8, 5, 5, ALL),
  // Légende : neuf objets, tout à la fois, des chaînes de plus en plus longues.
  Z(9, 3, 3, ALL),
  Z(9, 3, 4, ALL),
  Z(9, 4, 4, ALL),
  Z(9, 4, 5, ALL),
  Z(9, 5, 5, ALL),
  Z(9, 5, 6, ALL),
  Z(9, 6, 6, ALL),
  Z(9, 6, 7, ALL),
  Z(9, 7, 7, ALL),
  Z(9, 7, 8, ALL),
];

export function balanceLevel(level: number): BalanceLevel {
  return pickLevel(BALANCE_LEVELS, level);
}

/** Temps total, en secondes, pour la pleine vitesse et pour le minimum. */
export function balanceTimes(level: number): { best: number; worst: number } {
  const c = balanceLevel(level);
  // Niveaux 21 et plus : chaque chaîne, piège ou balance à exemplaires demande un temps de lecture en plus.
  const twists = (c.chain ?? 0) + (c.counts ? 4 : 0) + (c.trap ? 2 : 0);
  const best = Math.round(c.puzzles * (c.items * 1.6 + c.noise * 2 + (c.pairs ? 2 : 0) + twists));
  return { best, worst: best * 3 };
}

export function balanceLevelLabel(level: number): string {
  const c = balanceLevel(level);
  return [
    tr(`${c.items} objets`, `${c.items} items`),
    c.asks.length > 1 ? tr('le plus lourd ou le plus léger', 'heaviest or lightest') : tr('le plus lourd', 'heaviest'),
    c.pairs && tr('balances à deux contre un', 'two-against-one scales'),
    c.noise && tr(`${c.noise} balance${c.noise > 1 ? 's' : ''} inutile${c.noise > 1 ? 's' : ''}`, `${c.noise} useless scale${c.noise > 1 ? 's' : ''}`),
    c.counts && tr('plusieurs exemplaires', 'several copies'),
    c.chain && tr(`chaînes de ${c.chain} étapes`, `${c.chain}-step chains`),
    c.trap && tr('pièges', 'traps'),
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
 * Ce qu'une balance affirme à elle seule : « a est plus lourd que b ».
 * Un contre un : le côté qui descend gagne. Un seul objet qui l'emporte sur deux : il bat chacun des deux.
 * Plusieurs exemplaires d'un même objet (k) qui l'emportent sur au moins autant d'exemplaires d'un
 * autre (m ≥ k) : il est plus lourd (2 ■ > 3 ▲ donne ■ > ▲). Le reste (deux qui battent un, deux
 * contre deux, 3 ▲ qui battent 2 ■) ne permet pas de classer les objets.
 */
export function directHeavier(items: number, clues: readonly BalanceClue[]): boolean[][] {
  const known = Array.from({ length: items }, () => Array<boolean>(items).fill(false));
  for (const clue of clues) {
    const heavy = clue.heavier === 'left' ? clue.left : clue.right;
    const light = clue.heavier === 'left' ? clue.right : clue.left;
    if (heavy.length === 1) for (const l of light) known[heavy[0]][l] = true;
    else if (heavy.every((h) => h === heavy[0])) {
      for (const l of light) if (l !== heavy[0] && light.filter((x) => x === l).length >= heavy.length) known[heavy[0]][l] = true;
    }
  }
  return known;
}

/** Ce qu'on peut affirmer sans calcul, en enchaînant les balances. */
export function knownHeavier(items: number, clues: readonly BalanceClue[]): boolean[][] {
  const known = directHeavier(items, clues);
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

/**
 * Longueur de la plus longue chaîne nécessaire : pour chaque autre objet, le plus court
 * enchaînement de balances qui le classe par rapport à la réponse ; on garde le plus long.
 */
export function deductionDepth(items: number, clues: readonly BalanceClue[], ask: BalanceAsk, answer: number): number {
  const direct = directHeavier(items, clues);
  const edge = (a: number, b: number) => (ask === 'heaviest' ? direct[a][b] : direct[b][a]);
  const dist = Array<number>(items).fill(Infinity);
  dist[answer] = 0;
  const queue = [answer];
  while (queue.length) {
    const a = queue.shift()!;
    for (let b = 0; b < items; b++) {
      if (dist[b] === Infinity && edge(a, b)) {
        dist[b] = dist[a] + 1;
        queue.push(b);
      }
    }
  }
  return Math.max(...dist);
}

const place = (rng: Rng, heavy: number[], light: number[]): BalanceClue =>
  rng.chance(0.5) ? { left: heavy, right: light, heavier: 'left' } : { left: light, right: heavy, heavier: 'right' };

const pairsOf = (items: number) => {
  const out: [number, number][] = [];
  for (let a = 0; a < items; a++) for (let b = a + 1; b < items; b++) out.push([a, b]);
  return out;
};

/** `count` exemplaires d'un objet. */
const copies = (item: number, count: number) => Array<number>(count).fill(item);

/** Exemplaires (k contre m, m > k) : k·a qui l'emporte sur m·b prouve « a plus lourd que b ». */
const PROVING: readonly [number, number][] = [
  [1, 2],
  [2, 3],
  [3, 4],
  [1, 3],
];

/**
 * Niveaux 21 et plus. Les objets se rangent en `chain` étages sous la réponse : la réponse ne bat
 * directement qu'un seul objet (le leurre, qui en bat souvent beaucoup d'autres), chaque objet est
 * classé par un objet de l'étage au-dessus. Puis viennent les balances inutiles, dont le piège.
 */
function generateTwistPuzzle(rng: Rng, c: BalanceLevel, ask: BalanceAsk): BalancePuzzle {
  const chain = Math.min(c.chain ?? 1, c.items - 1);
  const heaviest = ask === 'heaviest';
  for (;;) {
    // Poids écartés de 20 à 70 % d'un objet au suivant : des écarts francs et d'autres serrés.
    const sorted: number[] = [rng.int(3, 6)];
    while (sorted.length < c.items) {
      const last = sorted[sorted.length - 1];
      sorted.push(last + rng.int(Math.ceil(last * 0.2), Math.ceil(last * 0.7)));
    }
    const weights = rng.shuffle(sorted);
    // De la réponse vers l'autre bout : du plus lourd au plus léger, ou l'inverse.
    const order = Array.from({ length: c.items }, (_, i) => i).sort((a, b) => (heaviest ? weights[b] - weights[a] : weights[a] - weights[b]));
    const answer = order[0];
    // Étages : le premier n'a qu'un objet (le leurre), les suivants se partagent le reste.
    const rest = order.slice(1);
    const cuts = rng
      .shuffle(Array.from({ length: Math.max(0, rest.length - 2) }, (_, i) => i + 2))
      .slice(0, chain - 2)
      .sort((a, b) => a - b);
    const bounds = chain === 1 ? [rest.length] : [1, ...cuts, rest.length];
    const floors: number[][] = [[answer]];
    let from = 0;
    for (const bound of bounds) {
      floors.push(rest.slice(from, bound));
      from = bound;
    }
    if (floors.length !== chain + 1 || floors.some((f) => f.length === 0)) continue;
    // Chaque objet est classé par un objet de l'étage précédent : [lourd, léger].
    const edges: [number, number][] = [];
    for (let k = 1; k < floors.length; k++) {
      for (const item of floors[k]) {
        const parent = rng.pick(floors[k - 1]);
        edges.push(heaviest ? [parent, item] : [item, parent]);
      }
    }
    const clues: BalanceClue[] = [];
    const used = new Set<number>();
    edges.forEach(([heavy, light], i) => {
      if (used.has(i)) return;
      used.add(i);
      // Deux contre un (question « le plus lourd ») : un objet seul bat deux objets de l'étage suivant.
      if (c.pairs && heaviest && rng.chance(0.5)) {
        const j = edges.findIndex(([h, l], k) => !used.has(k) && h === heavy && weights[heavy] > weights[light] + weights[l]);
        if (j >= 0) {
          used.add(j);
          clues.push(place(rng, [heavy], [light, edges[j][1]]));
          return;
        }
      }
      // Plusieurs exemplaires : 2 ■ contre 3 ▲.
      if (c.counts && rng.chance(0.55)) {
        const fits = PROVING.filter(([k, m]) => k * weights[heavy] > m * weights[light]);
        if (fits.length) {
          const [k, m] = rng.pick(fits);
          clues.push(place(rng, copies(heavy, k), copies(light, m)));
          return;
        }
      }
      clues.push(place(rng, [heavy], [light]));
    });
    // Le piège : le plus lourd du côté qui monte, ou le plus léger du côté qui descend.
    const noise: BalanceClue[] = [];
    if (c.trap && c.noise > 0) {
      const trap = trapClue(rng, c, weights, answer, heaviest);
      if (!trap) continue;
      noise.push(trap);
    }
    for (let tries = 0; noise.length < c.noise && tries < 200; tries++) {
      const clue = noiseClue(rng, c, weights);
      if (clue) noise.push(clue);
    }
    if (noise.length < c.noise) continue;
    const all = [...clues, ...noise];
    if (deducedAnswer(c.items, all, ask) !== answer || deductionDepth(c.items, all, ask, answer) !== chain) continue;
    return { weights, clues: rng.shuffle(all), ask, answer };
  }
}

/** Plus d'exemplaires du plus léger l'emportent : vrai, mais ça ne dit pas lequel est le plus lourd. */
function countTrap(rng: Rng, weights: readonly number[], heavy: number, light: number): BalanceClue | null {
  const fits = PROVING.filter(([k, m]) => m * weights[light] > k * weights[heavy]);
  if (!fits.length) return null;
  const [k, m] = rng.pick(fits);
  return place(rng, copies(light, m), copies(heavy, k));
}

/** Une balance vraie qui n'apprend rien : deux battent un, deux contre deux, ou 3 ▲ battent 2 ■. */
function noiseClue(rng: Rng, c: BalanceLevel, weights: readonly number[]): BalanceClue | null {
  const all = rng.shuffle(Array.from({ length: c.items }, (_, i) => i));
  const kind = rng.int(0, c.counts ? 2 : 1);
  if (kind === 0) {
    const [x, a, b] = all;
    return sum([a, b], weights) > weights[x] ? place(rng, [a, b], [x]) : null;
  }
  if (kind === 1) {
    const left = all.slice(0, 2);
    const right = all.slice(2, 4);
    if (sum(left, weights) === sum(right, weights)) return null;
    return sum(left, weights) > sum(right, weights) ? { left, right, heavier: 'left' } : { left, right, heavier: 'right' };
  }
  const [a, b] = all;
  return weights[a] > weights[b] ? countTrap(rng, weights, a, b) : countTrap(rng, weights, b, a);
}

function trapClue(rng: Rng, c: BalanceLevel, weights: readonly number[], answer: number, heaviest: boolean): BalanceClue | null {
  const others = rng.shuffle(Array.from({ length: c.items }, (_, i) => i).filter((i) => i !== answer));
  if (c.counts && rng.chance(0.5)) {
    // 3 exemplaires d'un autre battent 2 exemplaires du plus lourd ; le plus léger gagne par le nombre.
    for (const other of others) {
      const clue = heaviest ? countTrap(rng, weights, answer, other) : countTrap(rng, weights, other, answer);
      if (clue) return clue;
    }
  }
  for (const [i, j] of pairsOf(others.length)) {
    const [a, b] = [others[i], others[j]];
    // Deux autres objets battent le plus lourd.
    if (heaviest && weights[a] + weights[b] > weights[answer]) return place(rng, [a, b], [answer]);
    // Le plus léger, avec un autre, bat un objet seul.
    if (!heaviest && weights[answer] + weights[a] > weights[b]) return place(rng, [answer, a], [b]);
  }
  return null;
}

export function generateBalancePuzzle(rng: Rng, level: number): BalancePuzzle {
  const c = balanceLevel(level);
  const ask = rng.pick(c.asks);
  if (c.chain) return generateTwistPuzzle(rng, c, ask);
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
