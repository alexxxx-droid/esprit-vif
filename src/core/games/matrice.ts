import { tr } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

export const MATRICE_START = 3;
export const MATRICE_MAX_SPAN = 12;
export const MATRICE_MAX_FAILURES = 2;

export interface MatriceLevel {
  size: 4 | 5 | 6;
  /** Durée d'allumage de chaque case. */
  flashMs: number;
  /** Reproduire la séquence à l'envers. */
  reverse: boolean;
  /** Le sens n'est annoncé qu'après la séquence : tantôt dans l'ordre, tantôt à l'envers. */
  mixed: boolean;
  /** Une case piège (barrée, à ignorer) glissée dans la séquence pour `lureEvery` cases à retenir ; 0 : aucune. */
  lureEvery: number;
  /** Barème : `zero` cases retenues = 0 pt, `full` cases = 100 pts. */
  zero: number;
  full: number;
}

const L = (size: 4 | 5, flashMs: number, reverse = false): MatriceLevel => ({ size, flashMs, reverse, mixed: false, lureEvery: 0, zero: 3, full: 9 });

/**
 * Niveaux 21 à 50. `star` : la séquence qui donne la première étoile (7 : barème 3 → 9 ; 6 : 3 → 8 ; 5 : 2 → 7),
 * plus courte quand les pièges et le sens annoncé après s'ajoutent.
 */
const X = (size: 4 | 5 | 6, flashMs: number, direction: 'fwd' | 'rev' | 'mix', lureEvery: number, star: 5 | 6 | 7): MatriceLevel => ({
  size,
  flashMs,
  reverse: direction === 'rev',
  mixed: direction === 'mix',
  lureEvery,
  zero: star === 5 ? 2 : 3,
  full: star === 7 ? 9 : star === 6 ? 8 : 7,
});

/**
 * Niveau 1 : la spec (4 × 4, 3 cases au départ). Ensuite : rythme plus vif, grille 5 × 5, ordre inversé.
 * Expert (21-30) : grille 6 × 6 et cases pièges. Maître (31-40) : le sens n'est donné qu'après la séquence.
 * Légende (41-50) : un piège toutes les deux cases, jusqu'à 0,3 s par case.
 */
export const MATRICE_LEVELS: readonly MatriceLevel[] = [
  L(4, 800),
  L(4, 700),
  L(4, 600),
  L(5, 750),
  L(4, 800, true),
  L(5, 650),
  L(4, 500),
  L(5, 750, true),
  L(4, 600, true),
  L(5, 550),
  L(4, 420),
  L(5, 650, true),
  L(5, 480),
  L(4, 480, true),
  L(5, 420),
  L(5, 550, true),
  L(4, 350),
  L(5, 360),
  L(5, 450, true),
  L(5, 380, true),
  // Expert
  X(6, 430, 'rev', 0, 7),
  X(5, 380, 'fwd', 3, 6),
  X(6, 420, 'fwd', 3, 6),
  X(5, 520, 'rev', 3, 6),
  X(6, 350, 'fwd', 3, 6),
  X(6, 550, 'rev', 3, 6),
  X(5, 450, 'rev', 3, 6),
  X(6, 500, 'rev', 3, 6),
  X(6, 470, 'rev', 3, 6),
  X(6, 450, 'rev', 3, 6),
  // Maître
  X(6, 550, 'mix', 3, 6),
  X(5, 450, 'mix', 3, 6),
  X(6, 400, 'rev', 3, 6),
  X(6, 480, 'mix', 3, 6),
  X(5, 380, 'mix', 3, 6),
  X(6, 440, 'mix', 3, 6),
  X(6, 340, 'rev', 3, 6),
  X(6, 400, 'mix', 3, 5),
  X(6, 360, 'mix', 3, 5),
  X(6, 330, 'mix', 3, 5),
  // Légende
  X(6, 480, 'mix', 2, 5),
  X(6, 360, 'rev', 2, 5),
  X(6, 440, 'mix', 2, 5),
  X(6, 320, 'rev', 2, 5),
  X(6, 400, 'mix', 2, 5),
  X(6, 380, 'mix', 2, 5),
  X(6, 360, 'mix', 2, 5),
  X(6, 340, 'mix', 2, 5),
  X(6, 320, 'mix', 2, 5),
  X(6, 300, 'mix', 2, 5),
];

export function matriceLevel(level: number): MatriceLevel {
  return pickLevel(MATRICE_LEVELS, level);
}

export function matriceLevelLabel(level: number): string {
  const c = matriceLevel(level);
  const flash = secondsLabel(c.flashMs);
  return [
    `${c.size} × ${c.size}`,
    tr(`${flash} par case`, `${flash} per square`),
    c.reverse && tr('à l’envers', 'backward'),
    c.mixed && tr('sens donné après', 'direction told after'),
    c.lureEvery && tr('cases pièges', 'decoy squares'),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Séquence de cases toutes différentes. */
export function generateSequence(rng: Rng, length: number, cells: number): number[] {
  return rng.shuffle(Array.from({ length: cells }, (_, i) => i)).slice(0, Math.min(length, cells));
}

export interface MatriceFlash {
  cell: number;
  /** Case piège : elle s'allume barrée, il ne faut pas la retoucher. */
  lure: boolean;
}

export interface MatriceRound {
  /** Les cases à retenir, dans l'ordre où elles s'allument. */
  sequence: number[];
  /** Tout ce qui s'allume, dans l'ordre : les cases à retenir et les pièges. */
  flashes: MatriceFlash[];
  /** À retoucher à l'envers (au niveau « sens donné après », tiré au sort à chaque séquence). */
  reverse: boolean;
}

/** Nombre de pièges pour une séquence de `span` cases. */
export function matriceLureCount(span: number, level: number): number {
  const c = matriceLevel(level);
  return c.lureEvery ? Math.min(Math.floor(span / c.lureEvery), c.size * c.size - span) : 0;
}

/**
 * Une séquence (la même que `generateSequence` avec le même tirage) et, aux niveaux qui en ont, ses pièges :
 * jamais en premier, jamais deux de suite, toujours sur des cases hors de la séquence.
 */
export function generateMatriceRound(rng: Rng, span: number, level: number): MatriceRound {
  const c = matriceLevel(level);
  const cells = c.size * c.size;
  const sequence = generateSequence(rng, span, cells);
  const lureCount = matriceLureCount(sequence.length, level);
  let flashes: MatriceFlash[] = sequence.map((cell) => ({ cell, lure: false }));
  if (lureCount > 0) {
    const free = rng.shuffle(Array.from({ length: cells }, (_, i) => i).filter((cell) => !sequence.includes(cell))).slice(0, lureCount);
    // Un piège se glisse juste après une case à retenir (au plus un par case).
    const after = new Set(rng.shuffle(sequence.map((_, i) => i)).slice(0, lureCount));
    let next = 0;
    flashes = sequence.flatMap((cell, i) => {
      const target = { cell, lure: false };
      return after.has(i) ? [target, { cell: free[next++], lure: true }] : [target];
    });
  }
  const reverse = c.mixed ? rng.chance(0.5) : c.reverse;
  return { sequence, flashes, reverse };
}

export interface MatriceState {
  /** Longueur de la prochaine séquence. */
  span: number;
  /** Plus longue séquence reproduite sans faute. */
  best: number;
  failures: number;
  rounds: number;
  done: boolean;
}

export function initialMatrice(): MatriceState {
  return { span: MATRICE_START, best: 0, failures: 0, rounds: 0, done: false };
}

/** +1 case à chaque réussite ; la partie s'arrête au 2e échec (ou au plafond). */
export function nextMatrice(state: MatriceState, success: boolean): MatriceState {
  if (success) {
    return {
      span: Math.min(MATRICE_MAX_SPAN, state.span + 1),
      best: Math.max(state.best, state.span),
      failures: state.failures,
      rounds: state.rounds + 1,
      done: state.span >= MATRICE_MAX_SPAN,
    };
  }
  const failures = state.failures + 1;
  return { ...state, failures, rounds: state.rounds + 1, done: failures >= MATRICE_MAX_FAILURES };
}

/** Niveaux 1 à 20 : 3 cases retenues = 0 pt, 9 cases = 100 pts (la spec) ; au-delà, le barème du niveau. */
export function scoreMatrice(best: number, level = 1): number {
  const { zero, full } = matriceLevel(level);
  return countScore(best, zero, full);
}
