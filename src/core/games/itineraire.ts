import { tr } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { clampScore } from '../scoring';

/**
 * Itinéraire : sur une grille, un point de départ et une suite de déplacements (« → 2 » : deux
 * cases vers la droite). Les flèches disparaissent : où arrive-t-on ? D'abord toutes les flèches
 * à la fois, puis, à partir du niveau 10, une par une : il faut suivre le trajet de tête.
 * Expert (21-30) : des rochers arrêtent la course (on s'arrête juste devant), grilles plus hautes.
 * Maître (31-40) : flèches en diagonale. Légende (41-50) : les deux à la fois, jusqu'à 4 cases.
 */

export const ITI_TRIALS = 5;

export type Dir = 'up' | 'down' | 'left' | 'right';

/** Directions ; `label` (accesseur) se lit dans la langue de l'interface. */
export const DIRS: Record<Dir, { dc: number; dr: number; label: string }> = {
  up: {
    dc: 0,
    dr: -1,
    get label() {
      return tr('en haut', 'up');
    },
  },
  down: {
    dc: 0,
    dr: 1,
    get label() {
      return tr('en bas', 'down');
    },
  },
  left: {
    dc: -1,
    dr: 0,
    get label() {
      return tr('à gauche', 'left');
    },
  },
  right: {
    dc: 1,
    dr: 0,
    get label() {
      return tr('à droite', 'right');
    },
  },
};

const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

/** Diagonales (niveaux 31 et plus) : « ↗ 2 » fait deux cases vers la droite ET deux vers le haut. */
export type Diagonal = 'upRight' | 'downRight' | 'downLeft' | 'upLeft';
export type Heading = Dir | Diagonal;

export const DIAGONALS: Record<Diagonal, { dc: number; dr: number; label: string }> = {
  upRight: {
    dc: 1,
    dr: -1,
    get label() {
      return tr('en haut à droite', 'up-right');
    },
  },
  downRight: {
    dc: 1,
    dr: 1,
    get label() {
      return tr('en bas à droite', 'down-right');
    },
  },
  downLeft: {
    dc: -1,
    dr: 1,
    get label() {
      return tr('en bas à gauche', 'down-left');
    },
  },
  upLeft: {
    dc: -1,
    dr: -1,
    get label() {
      return tr('en haut à gauche', 'up-left');
    },
  },
};

/** Le pas d'une direction, droite ou diagonale. */
export function heading(dir: Heading): { dc: number; dr: number; label: string } {
  return dir in DIRS ? DIRS[dir as Dir] : DIAGONALS[dir as Diagonal];
}

const STRAIGHT: readonly Dir[] = ['up', 'down', 'left', 'right'];
const EIGHT: readonly Heading[] = ['up', 'upRight', 'right', 'downRight', 'down', 'downLeft', 'left', 'upLeft'];
const isOpposite = (a: Heading, b: Heading) => heading(a).dc + heading(b).dc === 0 && heading(a).dr + heading(b).dr === 0;

export interface Move {
  dir: Heading;
  /** Cases annoncées par la flèche (un rocher peut arrêter la course avant). */
  steps: number;
}

export interface Cell {
  col: number;
  row: number;
}

export interface ItiLevel {
  /** Colonnes (et lignes, si `rows` n'est pas précisé). */
  size: number;
  moves: number;
  /** Cases au plus par déplacement. */
  maxSteps: 1 | 2 | 3 | 4;
  /** Flèches montrées une par une (sinon toutes ensemble). */
  oneByOne: boolean;
  /** Une par une : durée de chaque flèche. Toutes ensemble : durée totale d'affichage. */
  showMs: number;
  /** Grille plus haute que large (7 colonnes au plus : des cases d'au moins 40 px sur un écran de 360 px). */
  rows?: number;
  /** Rochers sur la grille : ils arrêtent la course, on s'arrête juste devant. */
  rocks?: number;
  /** Flèches en diagonale. */
  diagonal?: true;
}

const I = (size: number, moves: number, maxSteps: 1 | 2 | 3, oneByOne: boolean, showMs: number): ItiLevel => ({ size, moves, maxSteps, oneByOne, showMs });
/** Niveaux 21 et plus : grille de 7 colonnes sur `rows` lignes, flèches une par une. */
const T = (rows: number, moves: number, maxSteps: 2 | 3 | 4, showMs: number, twist: { rocks?: number; diagonal?: true }): ItiLevel => ({
  size: 7,
  moves,
  maxSteps,
  oneByOne: true,
  showMs,
  ...(rows !== 7 ? { rows } : {}),
  ...twist,
});
const D = { diagonal: true } as const;

export const ITI_LEVELS: readonly ItiLevel[] = [
  I(4, 2, 1, false, 4000),
  I(4, 3, 1, false, 4200),
  I(5, 3, 1, false, 4000),
  I(5, 4, 1, false, 4400),
  I(5, 3, 2, false, 4200),
  I(5, 4, 2, false, 4600),
  I(6, 4, 2, false, 4400),
  I(6, 5, 2, false, 4800),
  I(6, 6, 2, false, 5200),
  I(5, 4, 1, true, 1000),
  I(5, 5, 1, true, 950),
  I(6, 5, 2, true, 950),
  I(6, 6, 2, true, 900),
  I(6, 6, 2, true, 850),
  I(6, 7, 2, true, 850),
  I(7, 7, 2, true, 800),
  I(7, 7, 3, true, 800),
  I(7, 8, 3, true, 750),
  I(7, 8, 3, true, 700),
  I(7, 9, 3, true, 650),
  // Expert : des rochers qui arrêtent la course, puis des grilles plus hautes.
  T(7, 8, 3, 750, { rocks: 3 }),
  T(7, 8, 3, 700, { rocks: 4 }),
  T(7, 9, 3, 700, { rocks: 4 }),
  T(7, 9, 3, 650, { rocks: 5 }),
  T(8, 10, 3, 650, { rocks: 5 }),
  T(8, 10, 3, 625, { rocks: 6 }),
  T(8, 10, 3, 600, { rocks: 6 }),
  T(9, 11, 3, 600, { rocks: 6 }),
  T(9, 11, 3, 575, { rocks: 7 }),
  T(9, 12, 3, 550, { rocks: 7 }),
  // Maître : les diagonales.
  T(7, 7, 2, 850, D),
  T(7, 8, 2, 800, D),
  T(7, 8, 3, 800, D),
  T(7, 9, 3, 750, D),
  T(8, 9, 3, 700, D),
  T(8, 10, 3, 700, D),
  T(8, 10, 3, 650, D),
  T(9, 10, 3, 650, D),
  T(9, 11, 3, 625, D),
  T(9, 11, 3, 600, D),
  // Légende : diagonales et rochers ensemble, jusqu'à 4 cases d'un coup.
  T(7, 8, 3, 750, { ...D, rocks: 3 }),
  T(7, 9, 3, 700, { ...D, rocks: 4 }),
  T(8, 9, 3, 700, { ...D, rocks: 4 }),
  T(8, 10, 3, 675, { ...D, rocks: 5 }),
  T(9, 10, 3, 675, { ...D, rocks: 5 }),
  T(9, 10, 3, 650, { ...D, rocks: 6 }),
  T(9, 11, 3, 650, { ...D, rocks: 6 }),
  T(9, 11, 4, 625, { ...D, rocks: 6 }),
  T(9, 12, 4, 625, { ...D, rocks: 7 }),
  T(9, 12, 4, 600, { ...D, rocks: 7 }),
];

export function itiLevel(level: number): ItiLevel {
  return pickLevel(ITI_LEVELS, level);
}

export function itiLevelLabel(level: number): string {
  const c = itiLevel(level);
  const every = secondsLabel(c.showMs);
  const rows = c.rows ?? c.size;
  return [
    tr(`grille ${c.size} × ${rows}`, `${c.size} × ${rows} grid`),
    tr(`${c.moves} déplacements`, `${c.moves} moves`),
    c.maxSteps > 1 ? tr(`jusqu’à ${c.maxSteps} cases`, `up to ${c.maxSteps} squares`) : null,
    c.oneByOne ? tr(`une flèche toutes les ${every}`, `one arrow every ${every}`) : null,
    c.diagonal ? tr('diagonales', 'diagonals') : null,
    c.rocks ? tr(`${c.rocks} rochers`, `${c.rocks} rocks`) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export interface ItiTrial {
  /** Colonnes (et lignes, si `rows` n'est pas précisé). */
  size: number;
  start: Cell;
  moves: Move[];
  /** Toutes les cases traversées, départ et arrivée compris. */
  path: Cell[];
  end: Cell;
  rows?: number;
  /** Rochers : la course s'arrête juste devant. */
  rocks?: Cell[];
}

const inside = (cell: Cell, size: number) => cell.col >= 0 && cell.row >= 0 && cell.col < size && cell.row < size;
const sameCell = (a: Cell, b: Cell) => a.col === b.col && a.row === b.row;

/** Où mène une flèche : on avance case par case et un rocher arrête la course juste devant lui. */
export function follow(at: Cell, move: Move, rocks: readonly Cell[] = []): Cell[] {
  const { dc, dr } = heading(move.dir);
  const cells: Cell[] = [];
  let here = at;
  for (let s = 1; s <= move.steps; s++) {
    const next = { col: here.col + dc, row: here.row + dr };
    if (rocks.some((r) => sameCell(r, next))) break;
    cells.push(next);
    here = next;
  }
  return cells;
}

/** Au plus trois flèches arrêtées par un rocher dans un même trajet (au moins une s'il y a des rochers). */
const MAX_BLOCKED = 3;

/** Niveaux 21 et plus : grille plus haute, rochers, diagonales. */
function generateTwistTrial(rng: Rng, c: ItiLevel): ItiTrial {
  const cols = c.size;
  const rows = c.rows ?? c.size;
  const within = (cell: Cell) => cell.col >= 0 && cell.row >= 0 && cell.col < cols && cell.row < rows;
  const headings = c.diagonal ? EIGHT : STRAIGHT;
  for (;;) {
    const all = Array.from({ length: cols * rows }, (_, i) => ({ col: i % cols, row: Math.floor(i / cols) }));
    const shuffled = rng.shuffle(all);
    const rocks = shuffled.slice(0, c.rocks ?? 0);
    const start = shuffled[rocks.length];
    const moves: Move[] = [];
    const path: Cell[] = [start];
    let at = start;
    let previous: Heading | null = null;
    let blocked = 0;
    for (let m = 0; m < c.moves; m++) {
      // Jamais de demi-tour immédiat ; la flèche reste dans la grille ; au moins une case de franchie.
      const options: { move: Move; cells: Cell[] }[] = [];
      for (const dir of headings) {
        if (previous && isOpposite(dir, previous)) continue;
        const { dc, dr } = heading(dir);
        for (let steps = 1; steps <= c.maxSteps; steps++) {
          if (!within({ col: at.col + dc * steps, row: at.row + dr * steps })) continue;
          const cells = follow(at, { dir, steps }, rocks);
          if (cells.length === 0) continue;
          if (cells.length < steps && blocked >= MAX_BLOCKED) continue;
          options.push({ move: { dir, steps }, cells });
        }
      }
      if (!options.length) break;
      const { move, cells } = rng.pick(options);
      if (cells.length < move.steps) blocked++;
      path.push(...cells);
      at = cells[cells.length - 1];
      moves.push(move);
      previous = move.dir;
    }
    if (moves.length !== c.moves || sameCell(at, start) || (rocks.length > 0 && blocked === 0)) continue;
    return { size: cols, start, moves, path, end: at, ...(rows !== cols ? { rows } : {}), ...(rocks.length ? { rocks } : {}) };
  }
}

export function generateItiTrial(rng: Rng, level: number): ItiTrial {
  const c = itiLevel(level);
  if (c.rows || c.rocks || c.diagonal) return generateTwistTrial(rng, c);
  for (;;) {
    const start = { col: rng.int(0, c.size - 1), row: rng.int(0, c.size - 1) };
    const moves: Move[] = [];
    const path: Cell[] = [start];
    let at = start;
    let previous: Dir | null = null;
    for (let m = 0; m < c.moves; m++) {
      // Jamais de demi-tour immédiat : il annulerait le déplacement précédent.
      const options: { dir: Dir; steps: number }[] = [];
      for (const dir of Object.keys(DIRS) as Dir[]) {
        if (previous && dir === OPPOSITE[previous]) continue;
        for (let steps = 1; steps <= c.maxSteps; steps++) {
          if (inside({ col: at.col + DIRS[dir].dc * steps, row: at.row + DIRS[dir].dr * steps }, c.size)) options.push({ dir, steps });
        }
      }
      if (!options.length) break;
      const move = rng.pick(options);
      for (let s = 1; s <= move.steps; s++) {
        at = { col: at.col + DIRS[move.dir].dc, row: at.row + DIRS[move.dir].dr };
        path.push(at);
      }
      moves.push(move);
      previous = move.dir;
    }
    if (moves.length === c.moves && (at.col !== start.col || at.row !== start.row)) return { size: c.size, start, moves, path, end: at };
  }
}

export function generateIti(rng: Rng, level: number): ItiTrial[] {
  return Array.from({ length: ITI_TRIALS }, () => generateItiTrial(rng, level));
}

/** Part des trajets retrouvés. */
export function scoreIti(correct: number): number {
  return clampScore((correct / ITI_TRIALS) * 100);
}
