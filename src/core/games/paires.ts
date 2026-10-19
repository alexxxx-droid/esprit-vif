import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { clampScore } from '../scoring';
import { SHAPES, type ShapeKind } from './shapes';

/**
 * Paires : retourner les cartes deux par deux et retrouver toutes les paires.
 * Score : 70 % pour les paires trouvées, 30 % pour l'économie de coups.
 */

export interface PairesLevel {
  pairs: number;
  cols: number;
  /** Toutes les cartes se montrent au départ pendant ce temps (0 : aucun aperçu). */
  previewMs: number;
  /** Faces très proches : mêmes formes rondes ou anguleuses, pleines ou creuses, une seule couleur. */
  similar: boolean;
  durationMs: number;
}

const L = (pairs: number, previewMs: number, similar = false): PairesLevel => ({
  pairs,
  cols: pairs <= 6 ? 3 : 4,
  previewMs,
  similar,
  // Plus il y a de paires, plus on a de temps : 50 s + 6 s par paire, arrondi à 5 s.
  durationMs: Math.round((50 + pairs * 6) / 5) * 5000,
});

export const PAIRES_LEVELS: readonly PairesLevel[] = [
  L(6, 3000),
  L(6, 1500),
  L(8, 3000),
  L(8, 1500),
  L(8, 0),
  L(10, 3000),
  L(10, 1500),
  L(10, 0),
  L(6, 0, true),
  L(12, 3000),
  L(12, 1500),
  L(8, 0, true),
  L(12, 0),
  L(10, 1500, true),
  L(14, 3000),
  L(14, 1500),
  L(12, 0, true),
  L(14, 0),
  L(14, 1500, true),
  L(14, 0, true),
];

export function pairesLevel(level: number): PairesLevel {
  return pickLevel(PAIRES_LEVELS, level);
}

export function pairesLevelLabel(level: number): string {
  const c = pairesLevel(level);
  return [`${c.pairs} paires`, c.previewMs ? `aperçu de ${secondsLabel(c.previewMs)}` : 'sans aperçu', c.similar && 'formes proches'].filter(Boolean).join(' · ');
}

export interface PairFace {
  shape: ShapeKind;
  filled: boolean;
  /** Indice de couleur (0 à 5) ; en mode « formes proches », toujours 0. */
  color: number;
}

export interface PairesDeck {
  faces: PairFace[];
  /** Pour chaque carte, l'indice de sa face (chaque face apparaît deux fois). */
  cards: number[];
}

const NEAR_SHAPES: readonly ShapeKind[] = ['circle', 'octagon', 'hexagon', 'pentagon', 'square', 'diamond', 'star', 'cross'];

export function generatePaires(rng: Rng, level: number): PairesDeck {
  const c = pairesLevel(level);
  let faces: PairFace[];
  if (c.similar) {
    const combos = NEAR_SHAPES.flatMap((shape) => [true, false].map((filled) => ({ shape, filled, color: 0 })));
    faces = rng.shuffle(combos).slice(0, c.pairs);
  } else {
    // Chaque face se distingue par sa forme (et son remplissage au-delà de 12) : la couleur n'est qu'un plus.
    const shapes = rng.shuffle(SHAPES);
    faces = Array.from({ length: c.pairs }, (_, i) => ({ shape: shapes[i % shapes.length], filled: i < shapes.length, color: i % 6 }));
  }
  const cards = rng.shuffle(faces.flatMap((_, i) => [i, i]));
  return { faces, cards };
}

/** Efficacité : 100 % jusqu'à 1,5 coup par paire trouvée, 0 % à partir de 3,5. */
export function scorePaires(found: number, attempts: number, level: number): number {
  const { pairs } = pairesLevel(level);
  if (found === 0) return 0;
  const efficiency = Math.min(1, Math.max(0, (3.5 * found - attempts) / (2 * found)));
  return clampScore(70 * (found / pairs) + 30 * efficiency * (found / pairs));
}
