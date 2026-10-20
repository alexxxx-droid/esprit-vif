import { tr } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { clampScore } from '../scoring';
import { SHAPES, type ShapeKind } from './shapes';

/**
 * Paires : retourner les cartes deux par deux et retrouver toutes les paires.
 * Score : 70 % pour les paires trouvées, 30 % pour l'économie de coups.
 * Expert : jusqu'à 20 paires, cartes vite recachées. Maître : les cartes ratées échangent leur place.
 * Légende : tout cela, avec moins de temps.
 */

export interface PairesLevel {
  pairs: number;
  cols: number;
  /** Toutes les cartes se montrent au départ pendant ce temps (0 : aucun aperçu). */
  previewMs: number;
  /** Faces très proches : mêmes formes rondes ou anguleuses, pleines ou creuses, une seule couleur. */
  similar: boolean;
  durationMs: number;
  /** Cartes baladeuses : après chaque erreur, les deux cartes ratées échangent leur place. */
  swap: boolean;
  /** Combien de temps deux cartes différentes restent visibles avant de se recacher. */
  peekMs: number;
  /** Coups par paire tolérés en plus pour l'économie de coups (0 jusqu'au niveau 20). */
  slack: number;
}

/** Les deux cartes ratées restent visibles 0,9 s jusqu'au niveau 20. */
export const PAIRES_PEEK_MS = 900;

const L = (pairs: number, previewMs: number, similar = false): PairesLevel => ({
  pairs,
  cols: pairs <= 6 ? 3 : 4,
  previewMs,
  similar,
  // Plus il y a de paires, plus on a de temps : 50 s + 6 s par paire, arrondi à 5 s.
  durationMs: Math.round((50 + pairs * 6) / 5) * 5000,
  swap: false,
  peekMs: PAIRES_PEEK_MS,
  slack: 0,
});

interface Options {
  similar?: boolean;
  swap?: boolean;
  peekMs?: number;
  /** Secondes par paire en plus des 50 s de base (6 jusqu'au niveau 20, moins quand le temps presse). */
  perPair?: number;
  slack?: number;
}

/** Niveaux 21 à 50 : 4 colonnes jusqu'à 18 paires, 5 à 20 paires (au moins 44 px par carte sur un petit téléphone). */
const P = (pairs: number, previewMs: number, { similar = false, swap = false, peekMs = PAIRES_PEEK_MS, perPair = 6, slack = 0.25 }: Options): PairesLevel => ({
  pairs,
  cols: pairs <= 6 ? 3 : pairs <= 18 ? 4 : 5,
  previewMs,
  similar,
  durationMs: Math.round(50 + pairs * perPair) * 1000,
  swap,
  peekMs,
  slack,
});

const SIM = { similar: true };
const SWAP = { swap: true, slack: 0.5 };

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
  // Expert : grands jeux (16 paires de formes proches, 18 et 20 paires), cartes vite recachées.
  P(16, 1500, SIM),
  P(18, 0, { peekMs: 600 }),
  P(16, 0, SIM),
  P(16, 1500, { ...SIM, peekMs: 750 }),
  P(20, 0, { peekMs: 600 }),
  P(16, 0, { ...SIM, peekMs: 750 }),
  P(16, 1500, { ...SIM, peekMs: 600 }),
  P(20, 0, { peekMs: 450 }),
  P(16, 0, { ...SIM, peekMs: 600 }),
  P(18, 0, { peekMs: 450, perPair: 5 }),
  // Maître : cartes baladeuses.
  P(14, 0, { ...SIM, ...SWAP, peekMs: 750 }),
  P(16, 1500, { ...SIM, ...SWAP, peekMs: 750 }),
  P(18, 0, { ...SWAP, peekMs: 600 }),
  P(16, 0, { ...SIM, ...SWAP }),
  P(16, 0, { ...SIM, ...SWAP, peekMs: 750 }),
  P(20, 0, { ...SWAP, peekMs: 600 }),
  P(16, 1500, { ...SIM, ...SWAP, peekMs: 600 }),
  P(16, 0, { ...SIM, ...SWAP, peekMs: 600 }),
  P(20, 0, { ...SWAP, peekMs: 450 }),
  P(16, 0, { ...SIM, ...SWAP, peekMs: 500 }),
  // Légende : le temps presse (jusqu'à 3,5 s par paire), cartes recachées en 0,4 s.
  P(16, 0, { ...SIM, ...SWAP, peekMs: 600, perPair: 5 }),
  P(20, 0, { ...SWAP, peekMs: 450, perPair: 4.5 }),
  P(16, 0, { ...SIM, ...SWAP, peekMs: 450, perPair: 5 }),
  P(16, 0, { ...SIM, ...SWAP, peekMs: 450, perPair: 4.5 }),
  P(20, 0, { ...SWAP, peekMs: 400, perPair: 4 }),
  P(16, 0, { ...SIM, ...SWAP, peekMs: 400, perPair: 4.5 }),
  P(16, 0, { ...SIM, ...SWAP, peekMs: 450, perPair: 4 }),
  P(16, 0, { ...SIM, ...SWAP, peekMs: 400, perPair: 4 }),
  P(16, 0, { ...SIM, ...SWAP, peekMs: 400, perPair: 3.75 }),
  P(16, 0, { ...SIM, ...SWAP, peekMs: 400, perPair: 3.5 }),
];

export function pairesLevel(level: number): PairesLevel {
  return pickLevel(PAIRES_LEVELS, level);
}

export function pairesLevelLabel(level: number): string {
  const c = pairesLevel(level);
  const preview = secondsLabel(c.previewMs);
  return [
    tr(`${c.pairs} paires`, `${c.pairs} pairs`),
    c.previewMs ? tr(`aperçu de ${preview}`, `${preview} preview`) : tr('sans aperçu', 'no preview'),
    c.similar && tr('formes proches', 'similar shapes'),
    c.swap && tr('cartes baladeuses', 'wandering cards'),
    c.peekMs < PAIRES_PEEK_MS && tr(`recachées en ${secondsLabel(c.peekMs)}`, `hidden again after ${secondsLabel(c.peekMs)}`),
  ]
    .filter(Boolean)
    .join(' · ');
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

/** Cartes baladeuses : la carte de la place `a` passe en `b` et inversement (`slots` : la carte de chaque place). */
export function swapSlots(slots: readonly number[], a: number, b: number): number[] {
  const next = [...slots];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

/** Efficacité : 100 % jusqu'à 1,5 coup par paire trouvée, 0 % à partir de 3,5 (plus la tolérance du niveau). */
export function scorePaires(found: number, attempts: number, level: number): number {
  const { pairs, slack } = pairesLevel(level);
  if (found === 0) return 0;
  const efficiency = Math.min(1, Math.max(0, ((3.5 + slack) * found - attempts) / (2 * found)));
  return clampScore(70 * (found / pairs) + 30 * efficiency * (found / pairs));
}
