import { tr } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * Labyrinthe éclair : tracer du doigt le chemin de l'entrée (en haut à gauche) à la sortie (en bas à
 * droite) ; revenir sur ses pas efface le chemin. Chaque labyrinthe est tiré au hasard (un seul
 * chemin entre deux cases). Autant de labyrinthes que possible en une minute.
 * Les paliers changent la façon de jouer : 7 × 7 (Confirmé), le brouillard, on ne voit qu'autour de
 * soi (Expert), une clé à ramasser avant la sortie (Maître), des murs qui s'effacent au bout de
 * quelques secondes, à retenir (Légende).
 */

export const LABY_DURATION_MS = 60_000;
/** Ce qu'on voit autour de soi dans le brouillard (en cases). */
export const FOG_RADIUS = 2;

export interface LabyLevel {
  size: number;
  fog: boolean;
  key: boolean;
  /** Les murs s'effacent au bout de ce temps (0 : jamais). */
  wallsMs: number;
  /** Labyrinthes finis en une partie pour 100 pts. */
  target: number;
}

/** Interpolation d'un palier : de `a` (1er niveau) à `b` (10e). */
const step = (i: number, a: number, b: number) => Math.round(a + ((b - a) * i) / 9);

const lvl = (size: number, fog: boolean, key: boolean, wallsMs: number, target: number): LabyLevel => ({ size, fog, key, wallsMs, target });

export const LABY_LEVELS: readonly LabyLevel[] = [
  // Débutant : 5 × 5, puis 6 × 6.
  ...Array.from({ length: 10 }, (_, i) => lvl(i < 5 ? 5 : 6, false, false, 0, step(i, 7, 6))),
  // Confirmé : 7 × 7.
  ...Array.from({ length: 10 }, (_, i) => lvl(7, false, false, 0, step(i, 6, 5))),
  // Expert : le brouillard.
  ...Array.from({ length: 10 }, (_, i) => lvl(i < 5 ? 6 : 7, true, false, 0, step(i, 5, 4))),
  // Maître : une clé à ramasser avant la sortie.
  ...Array.from({ length: 10 }, (_, i) => lvl(i < 5 ? 6 : 7, false, true, 0, step(i, 5, 4))),
  // Légende : les murs s'effacent ; on retient le chemin.
  ...Array.from({ length: 10 }, (_, i) => lvl(i < 5 ? 5 : 6, false, false, Math.round(step(i, 4000, 2500) / 500) * 500, step(i, 4, 3))),
];

export function labyLevel(level: number): LabyLevel {
  return pickLevel(LABY_LEVELS, level);
}

export function labyLevelLabel(level: number): string {
  const c = labyLevel(level);
  return [
    `${c.size} × ${c.size}`,
    c.fog && tr('brouillard', 'fog'),
    c.key && tr('clé à ramasser', 'key to collect'),
    c.wallsMs > 0 && tr(`murs visibles ${secondsLabel(c.wallsMs)}`, `walls shown ${secondsLabel(c.wallsMs)}`),
    tr(`objectif ${c.target}`, `target ${c.target}`),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** La règle affichée à l'intro. */
export function labyRule(level: number): string {
  const c = labyLevel(level);
  const parts = [
    tr(
      'Trace du doigt le chemin jusqu’à la sortie ; revenir en arrière efface le chemin. Un labyrinthe fini, le suivant arrive. Une minute.',
      'Trace the way to the exit with your finger; going back erases the path. Finish a maze and the next one appears. One minute.',
    ),
    c.fog && tr('Dans le brouillard, tu ne vois que les cases autour de toi.', 'In the fog, you only see the squares around you.'),
    c.key && tr('Ramasse d’abord la clé : la sortie ne s’ouvre qu’avec elle.', 'Pick up the key first: the exit only opens with it.'),
    c.wallsMs > 0 && tr(`Les murs s’effacent au bout de ${secondsLabel(c.wallsMs)} : retiens le chemin.`, `The walls fade after ${secondsLabel(c.wallsMs)}: remember the way.`),
  ];
  return parts.filter(Boolean).join(' ');
}

export interface Maze {
  size: number;
  /** `right[cell]` : passage vers la case de droite ; `down[cell]` : vers celle du dessous. */
  right: boolean[];
  down: boolean[];
  start: number;
  exit: number;
  /** La case de la clé (palier Maître), sinon `null`. */
  key: number | null;
}

/** Deux cases voisines se rejoignent-elles (sans mur entre elles) ? */
export function open(m: Maze, a: number, b: number): boolean {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  if (hi - lo === 1 && Math.floor(lo / m.size) === Math.floor(hi / m.size)) return m.right[lo];
  if (hi - lo === m.size) return m.down[lo];
  return false;
}

/** Les cases où l'on peut aller depuis `cell`. */
export function exits(m: Maze, cell: number): number[] {
  const r = Math.floor(cell / m.size);
  const c = cell % m.size;
  const around = [r > 0 && cell - m.size, r < m.size - 1 && cell + m.size, c > 0 && cell - 1, c < m.size - 1 && cell + 1].filter((n): n is number => n !== false);
  return around.filter((n) => open(m, cell, n));
}

/** Le chemin le plus court entre deux cases. */
export function shortest(m: Maze, from: number, to: number): number[] {
  const prev = new Map<number, number>([[from, -1]]);
  const queue = [from];
  while (queue.length) {
    const cell = queue.shift()!;
    if (cell === to) break;
    for (const n of exits(m, cell)) {
      if (!prev.has(n)) {
        prev.set(n, cell);
        queue.push(n);
      }
    }
  }
  const path: number[] = [];
  for (let cell = to; cell !== -1; cell = prev.get(cell)!) path.unshift(cell);
  return path;
}

/** Un labyrinthe parfait (un seul chemin entre deux cases), creusé en profondeur au hasard. */
export function generateMaze(rng: Rng, level: number): Maze {
  const c = labyLevel(level);
  const n = c.size;
  const right = Array.from({ length: n * n }, () => false);
  const down = Array.from({ length: n * n }, () => false);
  const seen = new Set([0]);
  const stack = [0];
  while (stack.length) {
    const cell = stack[stack.length - 1];
    const r = Math.floor(cell / n);
    const col = cell % n;
    const next = [r > 0 && cell - n, r < n - 1 && cell + n, col > 0 && cell - 1, col < n - 1 && cell + 1].filter((v): v is number => v !== false && !seen.has(v));
    if (!next.length) {
      stack.pop();
      continue;
    }
    const to = rng.pick(next);
    const lo = Math.min(cell, to);
    if (Math.abs(to - cell) === 1) right[lo] = true;
    else down[lo] = true;
    seen.add(to);
    stack.push(to);
  }
  const maze: Maze = { size: n, right, down, start: 0, exit: n * n - 1, key: null };
  if (c.key) {
    // La clé, hors du chemin direct : il faut faire un détour.
    const direct = new Set(shortest(maze, maze.start, maze.exit));
    const off = Array.from({ length: n * n }, (_, i) => i).filter((i) => !direct.has(i));
    maze.key = rng.pick(off.length ? off : [Math.floor((n * n) / 2)]);
  }
  return maze;
}

/** Labyrinthes finis rapportés à l'objectif du niveau. */
export function scoreLaby(solved: number, level: number): number {
  return countScore(solved, 0, labyLevel(level).target);
}
