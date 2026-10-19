import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { clampScore } from '../scoring';

/**
 * Itinéraire : sur une grille, un point de départ et une suite de déplacements (« → 2 » : deux
 * cases vers la droite). Les flèches disparaissent : où arrive-t-on ? D'abord toutes les flèches
 * à la fois, puis, à partir du niveau 10, une par une : il faut suivre le trajet de tête.
 */

export const ITI_TRIALS = 8;

export type Dir = 'up' | 'down' | 'left' | 'right';

export const DIRS: Record<Dir, { dc: number; dr: number; label: string }> = {
  up: { dc: 0, dr: -1, label: 'en haut' },
  down: { dc: 0, dr: 1, label: 'en bas' },
  left: { dc: -1, dr: 0, label: 'à gauche' },
  right: { dc: 1, dr: 0, label: 'à droite' },
};

const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

export interface Move {
  dir: Dir;
  steps: number;
}

export interface Cell {
  col: number;
  row: number;
}

export interface ItiLevel {
  size: number;
  moves: number;
  /** Cases au plus par déplacement. */
  maxSteps: 1 | 2 | 3;
  /** Flèches montrées une par une (sinon toutes ensemble). */
  oneByOne: boolean;
  /** Une par une : durée de chaque flèche. Toutes ensemble : durée totale d'affichage. */
  showMs: number;
}

const I = (size: number, moves: number, maxSteps: 1 | 2 | 3, oneByOne: boolean, showMs: number): ItiLevel => ({ size, moves, maxSteps, oneByOne, showMs });

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
];

export function itiLevel(level: number): ItiLevel {
  return pickLevel(ITI_LEVELS, level);
}

export function itiLevelLabel(level: number): string {
  const c = itiLevel(level);
  return [
    `grille ${c.size} × ${c.size}`,
    `${c.moves} déplacements`,
    c.maxSteps > 1 ? `jusqu’à ${c.maxSteps} cases` : null,
    c.oneByOne ? `une flèche toutes les ${secondsLabel(c.showMs)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export interface ItiTrial {
  size: number;
  start: Cell;
  moves: Move[];
  /** Toutes les cases traversées, départ et arrivée compris. */
  path: Cell[];
  end: Cell;
}

const inside = (cell: Cell, size: number) => cell.col >= 0 && cell.row >= 0 && cell.col < size && cell.row < size;

export function generateItiTrial(rng: Rng, level: number): ItiTrial {
  const c = itiLevel(level);
  for (;;) {
    const start = { col: rng.int(0, c.size - 1), row: rng.int(0, c.size - 1) };
    const moves: Move[] = [];
    const path: Cell[] = [start];
    let at = start;
    let previous: Dir | null = null;
    for (let m = 0; m < c.moves; m++) {
      // Jamais de demi-tour immédiat : il annulerait le déplacement précédent.
      const options: Move[] = [];
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
