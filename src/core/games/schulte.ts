import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { timeScore, type TimeThresholds } from '../scoring';

/** Ordre à suivre : croissant, décroissant, alphabétique, ou en alternance 1-A-2-B… */
export type SchulteOrder = 'asc' | 'desc' | 'alpha' | 'alt';

export interface SchulteLevel extends TimeThresholds {
  size: 5 | 6;
  order: SchulteOrder;
  /** Les cases trouvées restent marquées (sinon, aucun repère). */
  mark: boolean;
  /** Symboles inclinés et de tailles variées. */
  tilt: boolean;
  /** La grille se mélange à nouveau toutes les N trouvailles (0 = jamais). */
  reshuffleEvery: number;
}

export interface SchulteBoard {
  size: number;
  /** Ordre dans lequel toucher les symboles. */
  sequence: string[];
  /** Symbole de chaque case, ligne par ligne. */
  cells: string[];
  tilts: number[];
  scales: number[];
}

export const SCHULTE_PENALTY_MS = 1000;

const L = (
  size: 5 | 6,
  order: SchulteOrder,
  best: number,
  worst: number,
  { mark = true, tilt = false, reshuffleEvery = 0 } = {},
): SchulteLevel => ({ size, order, mark, tilt, reshuffleEvery, best, worst });

/** Niveau 1 : la spec (5 × 5, de 1 à 25, 100 pts en 14 s). */
export const SCHULTE_LEVELS: readonly SchulteLevel[] = [
  L(5, 'asc', 14, 60),
  L(5, 'desc', 16, 64),
  L(5, 'alpha', 18, 70),
  L(6, 'asc', 24, 90),
  L(5, 'asc', 18, 70, { mark: false }),
  L(5, 'alt', 30, 100),
  L(6, 'desc', 26, 95),
  L(5, 'asc', 18, 72, { tilt: true }),
  L(5, 'asc', 22, 80, { reshuffleEvery: 5 }),
  L(6, 'asc', 28, 100, { mark: false }),
  L(5, 'alt', 34, 110, { mark: false }),
  L(6, 'asc', 28, 100, { tilt: true }),
  L(5, 'desc', 22, 82, { mark: false, tilt: true }),
  L(6, 'desc', 30, 105, { mark: false }),
  L(5, 'asc', 26, 90, { mark: false, reshuffleEvery: 4 }),
  L(6, 'alt', 40, 130),
  L(6, 'asc', 32, 110, { mark: false, tilt: true }),
  L(6, 'desc', 34, 115, { reshuffleEvery: 6 }),
  L(6, 'alt', 46, 145, { mark: false }),
  L(6, 'desc', 40, 135, { mark: false, tilt: true, reshuffleEvery: 6 }),
];

const ORDER_LABELS: Record<SchulteOrder, string> = {
  asc: 'dans l’ordre',
  desc: 'à rebours',
  alpha: 'lettres A à Y',
  alt: '1-A-2-B…',
};

export function schulteLevelLabel(level: number): string {
  const c = pickLevel(SCHULTE_LEVELS, level);
  const flags = [!c.mark && 'sans repères', c.tilt && 'brouillée', c.reshuffleEvery && 'mouvante'].filter(Boolean);
  return [`${c.size} × ${c.size}`, ORDER_LABELS[c.order], ...flags].join(' · ');
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Suite à toucher pour une grille donnée. */
export function schulteSequence(size: number, order: SchulteOrder): string[] {
  const count = size * size;
  const numbers = (n: number) => Array.from({ length: n }, (_, i) => String(i + 1));
  switch (order) {
    case 'asc':
      return numbers(count);
    case 'desc':
      return numbers(count).reverse();
    case 'alpha':
      return [...LETTERS.slice(0, count)];
    case 'alt': {
      const sequence: string[] = [];
      for (let i = 0; sequence.length < count; i++) {
        sequence.push(String(i + 1));
        if (sequence.length < count) sequence.push(LETTERS[i]);
      }
      return sequence;
    }
  }
}

export function generateSchulte(rng: Rng, level: number): SchulteBoard {
  const config = pickLevel(SCHULTE_LEVELS, level);
  const sequence = schulteSequence(config.size, config.order);
  const cells = rng.shuffle(sequence);
  const tilts = cells.map(() => (config.tilt ? rng.int(-30, 30) : 0));
  const scales = cells.map(() => (config.tilt ? rng.int(80, 125) / 100 : 1));
  return { size: config.size, sequence, cells, tilts, scales };
}

/** Temps total + 1 s par erreur, converti en score selon le niveau. */
export function scoreSchulte(elapsedMs: number, errors: number, level: number): number {
  const seconds = (elapsedMs + errors * SCHULTE_PENALTY_MS) / 1000;
  return timeScore(seconds, pickLevel(SCHULTE_LEVELS, level));
}
