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

/** Secondes par paire en plus des 20 s de base. */
const PAIRES_PER_PAIR = 3.5;
/** Temps limite : 20 s + 3,5 s par paire, ou celui que fixe le niveau ; une minute au plus. */
const pairesLimit = (pairs: number, seconds = Math.round(20 + pairs * PAIRES_PER_PAIR)) => Math.min(60, seconds) * 1000;

const L = (pairs: number, previewMs: number, similar = false): PairesLevel => ({
  pairs,
  cols: pairs <= 6 ? 3 : 4,
  previewMs,
  similar,
  durationMs: pairesLimit(pairs),
  swap: false,
  peekMs: PAIRES_PEEK_MS,
  slack: 0,
});

interface Options {
  similar?: boolean;
  swap?: boolean;
  peekMs?: number;
  /** Temps limite en secondes (sinon 20 s + 3,5 s par paire) : le temps presse aux niveaux avancés. */
  limit?: number;
  slack?: number;
}

/** Niveaux 19 à 50 : 12 paires au plus (une partie tient en une minute), sur 4 colonnes. */
const P = (pairs: number, previewMs: number, { similar = false, swap = false, peekMs = PAIRES_PEEK_MS, limit, slack = 0.25 }: Options): PairesLevel => ({
  pairs,
  cols: pairs <= 6 ? 3 : 4,
  previewMs,
  similar,
  durationMs: pairesLimit(pairs, limit),
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
  L(10, 0, true),
  L(12, 3000, true),
  L(12, 1500, true),
  L(12, 0, true),
  P(12, 0, { ...SIM, limit: 58, slack: 0 }),
  P(12, 0, { ...SIM, limit: 55, slack: 0 }),
  // Expert : cartes vite recachées, temps compté.
  P(12, 0, { ...SIM, peekMs: 750, limit: 58 }),
  P(12, 0, { ...SIM, peekMs: 750, limit: 56 }),
  P(12, 0, { ...SIM, peekMs: 600, limit: 58 }),
  P(12, 0, { ...SIM, peekMs: 600, limit: 56 }),
  P(12, 0, { ...SIM, peekMs: 500, limit: 55 }),
  P(12, 0, { peekMs: 450, limit: 44 }),
  P(12, 0, { ...SIM, peekMs: 400, limit: 54 }),
  P(12, 0, { ...SIM, peekMs: 450, limit: 51 }),
  P(12, 0, { ...SIM, peekMs: 400, limit: 51 }),
  P(12, 0, { ...SIM, peekMs: 400, limit: 49 }),
  // Maître : cartes baladeuses.
  P(12, 0, { ...SIM, ...SWAP, peekMs: 600, limit: 55 }),
  P(12, 0, { ...SIM, ...SWAP, peekMs: 500, limit: 56 }),
  P(12, 0, { ...SIM, ...SWAP, peekMs: 450, limit: 56 }),
  P(12, 0, { ...SIM, ...SWAP, peekMs: 400, limit: 56 }),
  P(12, 0, { ...SWAP, peekMs: 450, limit: 42 }),
  P(12, 0, { ...SIM, ...SWAP, peekMs: 400, limit: 55 }),
  P(12, 0, { ...SIM, ...SWAP, peekMs: 450, limit: 52 }),
  P(12, 0, { ...SIM, ...SWAP, peekMs: 400, limit: 52 }),
  P(12, 0, { ...SIM, ...SWAP, peekMs: 400, limit: 49 }),
  P(12, 0, { ...SIM, ...SWAP, peekMs: 400, limit: 47 }),
  // Légende : le temps presse, de 46 s à 36 s pour 12 paires.
  P(12, 0, { ...SIM, ...SWAP, peekMs: 400, limit: 46 }),
  P(12, 0, { ...SIM, ...SWAP, peekMs: 400, limit: 45 }),
  P(12, 0, { ...SIM, ...SWAP, peekMs: 400, limit: 44 }),
  P(12, 0, { ...SIM, ...SWAP, peekMs: 400, limit: 43 }),
  P(12, 0, { ...SIM, ...SWAP, peekMs: 400, limit: 42 }),
  P(12, 0, { ...SIM, ...SWAP, peekMs: 400, limit: 41 }),
  P(12, 0, { ...SIM, ...SWAP, peekMs: 400, limit: 40 }),
  P(12, 0, { ...SIM, ...SWAP, peekMs: 400, limit: 39 }),
  P(12, 0, { ...SIM, ...SWAP, peekMs: 400, limit: 38 }),
  P(12, 0, { ...SIM, ...SWAP, peekMs: 400, limit: 36 }),
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
