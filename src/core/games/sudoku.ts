import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { timeScore } from '../scoring';

/**
 * Mini-sudoku : grilles 4 × 4 (blocs 2 × 2) puis 6 × 6 (blocs 2 × 3), toujours à solution unique.
 * Au-delà du niveau 20 : 6 × 6 presque vides, puis 8 × 8 (blocs 2 × 4) et enfin la vraie grille
 * 9 × 9 (blocs 3 × 3). Ces grilles-là se résolvent toujours pas à pas, sans deviner (`logic`).
 * Un chiffre faux est refusé tout de suite mais coûte quelques secondes.
 */

export type SudokuSize = 4 | 6 | 8 | 9;

export interface SudokuLevel {
  size: SudokuSize;
  /** Cases déjà remplies au départ (moins il y en a, plus il faut raisonner). */
  givens: number;
  /** Grilles à enchaîner. */
  puzzles: number;
  /** Temps total, en secondes, pour 100 pts et pour 0 pt. */
  best: number;
  worst: number;
  /**
   * Niveaux 21 et plus : grille tirée au hasard puis vidée tant qu'elle reste résoluble par
   * simples déductions (un seul chiffre possible dans une case, une seule place pour un chiffre).
   */
  logic?: true;
  /** Vagues de déductions au moins (voir `deductionWaves`) : la grille ne se remplit pas d'un seul coup d'œil. */
  waves?: number;
}

/** Pénalité d'un chiffre refusé. */
export const SUDOKU_PENALTY_S = 5;

const L = (size: SudokuSize, givens: number, puzzles: number, best: number, worst: number): SudokuLevel => ({ size, givens, puzzles, best, worst });
/** Niveaux 21 à 50 : une seule grille, résoluble pas à pas. */
const X = (size: SudokuSize, givens: number, best: number, worst: number, waves?: number): SudokuLevel => ({
  size,
  givens,
  puzzles: 1,
  best,
  worst,
  logic: true,
  ...(waves ? { waves } : {}),
});

export const SUDOKU_LEVELS: readonly SudokuLevel[] = [
  L(4, 10, 3, 30, 120),
  L(4, 9, 3, 35, 130),
  L(4, 8, 3, 40, 140),
  L(4, 7, 3, 45, 155),
  L(4, 6, 3, 50, 170),
  L(4, 5, 3, 55, 185),
  L(4, 5, 4, 70, 230),
  L(4, 4, 4, 80, 260),
  L(6, 24, 1, 45, 160),
  L(6, 22, 1, 55, 180),
  L(6, 20, 1, 65, 200),
  L(6, 19, 1, 75, 225),
  L(6, 18, 1, 85, 250),
  L(6, 17, 1, 95, 270),
  L(6, 16, 1, 105, 300),
  L(6, 15, 1, 115, 320),
  L(6, 14, 1, 125, 350),
  L(6, 13, 1, 140, 380),
  L(6, 12, 1, 150, 400),
  L(6, 11, 1, 165, 440),
  // Expert : le 6 × 6 presque vide, puis le 8 × 8.
  X(6, 10, 175, 460),
  X(6, 9, 185, 480),
  X(8, 34, 210, 540),
  X(8, 32, 225, 580),
  X(8, 30, 245, 620),
  X(8, 28, 260, 660),
  X(8, 27, 275, 700),
  X(8, 26, 285, 730),
  X(8, 25, 295, 750),
  X(8, 24, 310, 790),
  // Maître : le 8 × 8 dépouillé, puis la vraie grille 9 × 9.
  X(8, 23, 320, 820, 6),
  X(8, 22, 330, 850, 7),
  X(8, 21, 345, 880, 8),
  X(9, 34, 355, 900),
  X(9, 33, 365, 920),
  X(9, 32, 375, 950),
  X(9, 31, 390, 980, 7),
  X(9, 30, 400, 1010, 7),
  X(9, 29, 415, 1040, 7),
  X(9, 28, 430, 1070, 8),
  // Légende : le 9 × 9 de plus en plus nu, et des déductions de plus en plus enchaînées.
  X(9, 27, 440, 1100, 8),
  X(9, 27, 450, 1120, 9),
  X(9, 26, 460, 1150, 9),
  X(9, 26, 470, 1170, 10),
  X(9, 25, 480, 1200, 10),
  X(9, 25, 490, 1220, 11),
  X(9, 25, 500, 1240, 12),
  X(9, 24, 515, 1270, 12),
  X(9, 24, 530, 1300, 13),
  X(9, 24, 545, 1330, 14),
];

export function sudokuLevel(level: number): SudokuLevel {
  return pickLevel(SUDOKU_LEVELS, level);
}

/** Durée indicative à ce niveau : à mi-chemin entre le temps de 3 étoiles et le temps limite du score. */
export function sudokuDuration(level: number): string {
  const { best, worst } = sudokuLevel(level);
  return `≈ ${Math.max(1, Math.round((best + worst) / 2 / 60))} min`;
}

export function sudokuLevelLabel(level: number): string {
  const c = sudokuLevel(level);
  return tr(
    [`${c.puzzles > 1 ? `${c.puzzles} grilles` : '1 grille'} ${c.size} × ${c.size}`, `${c.givens} chiffres donnés`, c.waves && `${c.waves} étapes de déduction`]
      .filter(Boolean)
      .join(' · '),
    [`${c.puzzles > 1 ? `${c.puzzles} grids` : '1 grid'} of ${c.size} × ${c.size}`, `${c.givens} digits given`, c.waves && `${c.waves} deduction rounds`].filter(Boolean).join(' · '),
  );
}

/** Dimensions d'un bloc : 2 × 2 pour le 4 × 4, 2 lignes × 3 colonnes pour le 6 × 6, 2 × 4 pour le 8 × 8, 3 × 3 pour le 9 × 9. */
export function boxShape(size: SudokuSize): { rows: number; cols: number } {
  switch (size) {
    case 4:
      return { rows: 2, cols: 2 };
    case 6:
      return { rows: 2, cols: 3 };
    case 8:
      return { rows: 2, cols: 4 };
    case 9:
      return { rows: 3, cols: 3 };
  }
}

export interface SudokuPuzzle {
  size: SudokuSize;
  /** Grille complète, ligne par ligne, chiffres de 1 à `size`. */
  solution: number[];
  /** Cases affichées dès le départ. */
  given: boolean[];
}

/** Les cases qu'une case « voit » : même ligne, même colonne, même bloc. */
export function peers(size: SudokuSize, index: number): number[] {
  const { rows, cols } = boxShape(size);
  const r = Math.floor(index / size);
  const c = index % size;
  const out = new Set<number>();
  for (let k = 0; k < size; k++) {
    out.add(r * size + k);
    out.add(k * size + c);
  }
  const r0 = r - (r % rows);
  const c0 = c - (c % cols);
  for (let dr = 0; dr < rows; dr++) for (let dc = 0; dc < cols; dc++) out.add((r0 + dr) * size + c0 + dc);
  out.delete(index);
  return [...out];
}

/** Grille complète au hasard : un motif valide, puis des permutations qui préservent les règles. */
export function randomSolution(rng: Rng, size: SudokuSize): number[] {
  const { rows, cols } = boxShape(size);
  const pattern = (r: number, c: number) => (cols * (r % rows) + Math.floor(r / rows) + c) % size;
  const digits = rng.shuffle(Array.from({ length: size }, (_, i) => i + 1));
  // Lignes : on mélange les bandes (groupes de `rows` lignes), puis les lignes dans chaque bande.
  const rowOrder = rng.shuffle(Array.from({ length: size / rows }, (_, b) => b)).flatMap((b) => rng.shuffle(Array.from({ length: rows }, (_, i) => b * rows + i)));
  const colOrder = rng.shuffle(Array.from({ length: size / cols }, (_, s) => s)).flatMap((s) => rng.shuffle(Array.from({ length: cols }, (_, i) => s * cols + i)));
  const transpose = size === 4 && rng.chance(0.5);
  return Array.from({ length: size * size }, (_, i) => {
    let r = rowOrder[Math.floor(i / size)];
    let c = colOrder[i % size];
    if (transpose) [r, c] = [c, r];
    return digits[pattern(r, c)];
  });
}

/** Nombre de solutions d'une grille (0 = case vide), en s'arrêtant à `limit`. */
export function countSolutions(grid: readonly number[], size: SudokuSize, limit = 2): number {
  const cells = [...grid];
  const peerList = cells.map((_, i) => peers(size, i));
  let found = 0;
  const solve = (): void => {
    // Case vide la plus contrainte d'abord.
    let best = -1;
    let bestOptions: number[] = [];
    for (let i = 0; i < cells.length; i++) {
      if (cells[i] !== 0) continue;
      const used = new Set(peerList[i].map((p) => cells[p]));
      const options = Array.from({ length: size }, (_, d) => d + 1).filter((d) => !used.has(d));
      if (options.length === 0) return;
      if (best === -1 || options.length < bestOptions.length) {
        best = i;
        bestOptions = options;
      }
    }
    if (best === -1) {
      found++;
      return;
    }
    for (const d of bestOptions) {
      cells[best] = d;
      solve();
      if (found >= limit) break;
    }
    cells[best] = 0;
  };
  solve();
  return found;
}

interface Geometry {
  /** Lignes, colonnes et blocs. */
  units: number[][];
  peers: number[][];
}

const geometries = new Map<SudokuSize, Geometry>();

function geometry(size: SudokuSize): Geometry {
  let g = geometries.get(size);
  if (!g) {
    const { rows, cols } = boxShape(size);
    const units: number[][] = [];
    for (let r = 0; r < size; r++) units.push(Array.from({ length: size }, (_, c) => r * size + c));
    for (let c = 0; c < size; c++) units.push(Array.from({ length: size }, (_, r) => r * size + c));
    for (let r0 = 0; r0 < size; r0 += rows) {
      for (let c0 = 0; c0 < size; c0 += cols) {
        const box: number[] = [];
        for (let dr = 0; dr < rows; dr++) for (let dc = 0; dc < cols; dc++) box.push((r0 + dr) * size + c0 + dc);
        units.push(box);
      }
    }
    g = { units, peers: Array.from({ length: size * size }, (_, i) => peers(size, i)) };
    geometries.set(size, g);
  }
  return g;
}

const bitDigit = (mask: number) => 31 - Math.clz32(mask) + 1;

/**
 * Résout la grille comme une personne sans brouillon : on ne place un chiffre que s'il est le seul
 * possible dans sa case, ou si sa ligne, sa colonne ou son bloc n'a plus qu'une place pour lui.
 * Renvoie la grille complète, ou null s'il faudrait deviner (ou si la grille est contradictoire).
 */
export function solveBySingles(grid: readonly number[], size: SudokuSize): number[] | null {
  const { units, peers: peerList } = geometry(size);
  const cells = [...grid];
  const full = (1 << size) - 1;
  const cand = cells.map((v, i) => {
    if (v) return 0;
    let mask = full;
    for (const p of peerList[i]) if (cells[p]) mask &= ~(1 << (cells[p] - 1));
    return mask;
  });
  let empty = cells.filter((v) => v === 0).length;
  const place = (i: number, d: number) => {
    cells[i] = d;
    cand[i] = 0;
    empty--;
    const bit = 1 << (d - 1);
    for (const p of peerList[i]) cand[p] &= ~bit;
  };
  let progress = true;
  while (empty > 0 && progress) {
    progress = false;
    for (let i = 0; i < cells.length; i++) {
      if (cells[i]) continue;
      const mask = cand[i];
      if (mask === 0) return null;
      if ((mask & (mask - 1)) === 0) {
        place(i, bitDigit(mask));
        progress = true;
      }
    }
    for (const unit of units) {
      // Pour chaque chiffre : les places encore possibles dans l'unité (un seul passage).
      let seen = 0;
      let twice = 0;
      let done = 0;
      for (const i of unit) {
        if (cells[i]) {
          done |= 1 << (cells[i] - 1);
          continue;
        }
        twice |= seen & cand[i];
        seen |= cand[i];
      }
      if ((seen | done) !== full) return null;
      let once = seen & ~twice & ~done;
      while (once) {
        const bit = once & -once;
        once &= ~bit;
        const at = unit.find((i) => !cells[i] && cand[i] & bit);
        if (at === undefined) continue;
        place(at, bitDigit(bit));
        progress = true;
      }
    }
  }
  return empty === 0 ? cells : null;
}

/** Grille complète tirée au hasard (retour arrière, case la plus contrainte d'abord). */
export function fillRandom(rng: Rng, size: SudokuSize): number[] {
  const { peers: peerList } = geometry(size);
  const cells = Array<number>(size * size).fill(0);
  const digits = Array.from({ length: size }, (_, d) => d + 1);
  const solve = (): boolean => {
    let best = -1;
    let bestUsed = 0;
    let bestFree = size + 1;
    for (let i = 0; i < cells.length; i++) {
      if (cells[i]) continue;
      let used = 0;
      for (const p of peerList[i]) if (cells[p]) used |= 1 << (cells[p] - 1);
      let free = 0;
      for (let d = 0; d < size; d++) if (!(used & (1 << d))) free++;
      if (free < bestFree) {
        best = i;
        bestUsed = used;
        bestFree = free;
        if (free <= 1) break;
      }
    }
    if (best === -1) return true;
    if (bestFree === 0) return false;
    for (const d of rng.shuffle(digits)) {
      if (bestUsed & (1 << (d - 1))) continue;
      cells[best] = d;
      if (solve()) return true;
    }
    cells[best] = 0;
    return false;
  };
  solve();
  return cells;
}

/**
 * Profondeur de la grille : on remplit d'un coup tout ce qui se déduit, puis on recommence.
 * Chaque passage est une « vague » ; plus il en faut, plus les déductions s'enchaînent l'une
 * après l'autre (et moins il y a de cases faciles en même temps). Infinity si la grille bloque.
 */
export function deductionWaves(grid: readonly number[], size: SudokuSize): number {
  const { units, peers: peerList } = geometry(size);
  const cells = [...grid];
  const full = (1 << size) - 1;
  let waves = 0;
  for (;;) {
    if (cells.every((v) => v !== 0)) return waves;
    const cand = cells.map((v, i) => {
      if (v) return 0;
      let mask = full;
      for (const p of peerList[i]) if (cells[p]) mask &= ~(1 << (cells[p] - 1));
      return mask;
    });
    const found = new Map<number, number>();
    cand.forEach((mask, i) => {
      if (mask && !(mask & (mask - 1))) found.set(i, bitDigit(mask));
    });
    for (const unit of units) {
      for (let d = 1; d <= size; d++) {
        const bit = 1 << (d - 1);
        let where = -1;
        let count = 0;
        for (const i of unit) {
          if (cells[i] === d) {
            count = -1;
            break;
          }
          if (!cells[i] && cand[i] & bit) {
            count++;
            where = i;
          }
        }
        if (count === 1) found.set(where, d);
      }
    }
    if (found.size === 0) return Infinity;
    for (const [i, d] of found) cells[i] = d;
    waves++;
  }
}

/** Essais au plus pour atteindre la cible du niveau, et vidages tentés sur chaque grille pleine. */
const CARVE_ATTEMPTS = 48;
const CARVES_PER_FILL = 4;

/** Vide la grille case par case tant qu'elle reste résoluble pas à pas. */
function carve(rng: Rng, solution: readonly number[], size: SudokuSize, givens: number): number[] {
  const grid = [...solution];
  let shown = grid.length;
  for (const index of rng.shuffle(grid.map((_, i) => i))) {
    if (shown <= givens) break;
    const value = grid[index];
    grid[index] = 0;
    if (solveBySingles(grid, size)) shown--;
    else grid[index] = value;
  }
  return grid;
}

/**
 * Grille des niveaux 21 et plus : assez dépouillée (`givens`) et assez profonde (`waves`).
 * Le tirage est entièrement décidé par la graine ; faute de mieux, on garde le meilleur essai.
 */
function generateLogicPuzzle(rng: Rng, c: SudokuLevel): SudokuPuzzle {
  const { size, givens } = c;
  const minWaves = c.waves ?? 0;
  let best: { solution: number[]; grid: number[]; shown: number; waves: number } | null = null;
  let solution: number[] = [];
  for (let attempt = 0; attempt < CARVE_ATTEMPTS; attempt++) {
    // Une grille pleine sert à plusieurs vidages (dans un autre ordre) : c'est son tirage qui coûte.
    if (attempt % CARVES_PER_FILL === 0) solution = fillRandom(rng, size);
    const grid = carve(rng, solution, size, givens);
    const shown = grid.filter((v) => v !== 0).length;
    const waves = minWaves && shown <= givens ? deductionWaves(grid, size) : 0;
    const better =
      !best || (shown <= givens ? best.shown > givens || waves > best.waves : shown < best.shown);
    if (better) best = { solution, grid, shown, waves };
    if (shown <= givens && waves >= minWaves) break;
  }
  return { size, solution: best!.solution, given: best!.grid.map((v) => v !== 0) };
}

export function generateSudokuPuzzle(rng: Rng, level: number): SudokuPuzzle {
  const c = sudokuLevel(level);
  const { size, givens } = c;
  if (c.logic) return generateLogicPuzzle(rng, c);
  const solution = randomSolution(rng, size);
  const grid = [...solution];
  let shown = grid.length;
  // On retire les chiffres un à un tant que la solution reste unique.
  for (const index of rng.shuffle(grid.map((_, i) => i))) {
    if (shown <= givens) break;
    const value = grid[index];
    grid[index] = 0;
    if (countSolutions(grid, size) === 1) shown--;
    else grid[index] = value;
  }
  return { size, solution, given: grid.map((v) => v !== 0) };
}

export function generateSudoku(rng: Rng, level: number): SudokuPuzzle[] {
  return Array.from({ length: sudokuLevel(level).puzzles }, () => generateSudokuPuzzle(rng, level));
}

export function scoreSudoku(elapsedMs: number, errors: number, level: number): number {
  return timeScore(elapsedMs / 1000 + errors * SUDOKU_PENALTY_S, sudokuLevel(level));
}
