import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { timeScore } from '../scoring';

/**
 * Mini-sudoku : grilles 4 × 4 (blocs 2 × 2) puis 6 × 6 (blocs 2 × 3), toujours à solution unique.
 * Un chiffre faux est refusé tout de suite mais coûte quelques secondes.
 */

export type SudokuSize = 4 | 6;

export interface SudokuLevel {
  size: SudokuSize;
  /** Cases déjà remplies au départ (moins il y en a, plus il faut raisonner). */
  givens: number;
  /** Grilles à enchaîner. */
  puzzles: number;
  /** Temps total, en secondes, pour 100 pts et pour 0 pt. */
  best: number;
  worst: number;
}

/** Pénalité d'un chiffre refusé. */
export const SUDOKU_PENALTY_S = 5;

const L = (size: SudokuSize, givens: number, puzzles: number, best: number, worst: number): SudokuLevel => ({ size, givens, puzzles, best, worst });

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
];

export function sudokuLevel(level: number): SudokuLevel {
  return pickLevel(SUDOKU_LEVELS, level);
}

export function sudokuLevelLabel(level: number): string {
  const c = sudokuLevel(level);
  return [`${c.puzzles > 1 ? `${c.puzzles} grilles` : '1 grille'} ${c.size} × ${c.size}`, `${c.givens} chiffres donnés`].join(' · ');
}

/** Dimensions d'un bloc : 2 × 2 pour le 4 × 4, 2 lignes × 3 colonnes pour le 6 × 6. */
export function boxShape(size: SudokuSize): { rows: number; cols: number } {
  return size === 4 ? { rows: 2, cols: 2 } : { rows: 2, cols: 3 };
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

export function generateSudokuPuzzle(rng: Rng, level: number): SudokuPuzzle {
  const { size, givens } = sudokuLevel(level);
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
