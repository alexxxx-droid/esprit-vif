import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * La boutique : des clients entrent et sortent, parfois en même temps. Combien sont à l'intérieur à la fin ?
 * Les chats qui passent dans la rue ne comptent pas.
 */

export const BOUTIQUE_ROUNDS = 5;

export interface BoutiqueEvent {
  enter: number;
  leave: number;
  /** Chats qui passent devant la vitrine (à ne pas compter). */
  cats: number;
}

export interface BoutiqueRound {
  start: number;
  events: BoutiqueEvent[];
  answer: number;
}

export interface BoutiqueLevel {
  events: number;
  /** Clients au plus par mouvement. */
  maxMoves: number;
  /** Durée de chaque mouvement. */
  stepMs: number;
  startMin: number;
  startMax: number;
  /** Entrées et sorties en même temps. */
  both: boolean;
  cats: boolean;
}

const L = (events: number, maxMoves: number, stepMs: number, startMin: number, startMax: number, both: boolean, cats = false): BoutiqueLevel => ({
  events,
  maxMoves,
  stepMs,
  startMin,
  startMax,
  both,
  cats,
});

export const BOUTIQUE_LEVELS: readonly BoutiqueLevel[] = [
  L(3, 1, 1700, 0, 2, false),
  L(4, 1, 1600, 0, 3, false),
  L(4, 2, 1600, 1, 3, false),
  L(5, 2, 1500, 1, 4, true),
  L(5, 2, 1400, 2, 5, true),
  L(6, 2, 1400, 2, 5, true),
  L(6, 3, 1400, 2, 6, true),
  L(6, 2, 1300, 2, 6, true, true),
  L(7, 3, 1300, 3, 6, true),
  L(7, 3, 1200, 3, 7, true, true),
  L(8, 3, 1200, 3, 7, true),
  L(8, 3, 1100, 3, 7, true, true),
  L(8, 4, 1150, 3, 8, true),
  L(9, 3, 1050, 3, 8, true, true),
  L(9, 4, 1050, 4, 8, true),
  L(9, 4, 950, 4, 8, true, true),
  L(10, 4, 950, 4, 9, true),
  L(10, 4, 850, 4, 9, true, true),
  L(11, 4, 800, 5, 9, true, true),
  L(12, 5, 750, 5, 9, true, true),
];

export function boutiqueLevel(level: number): BoutiqueLevel {
  return pickLevel(BOUTIQUE_LEVELS, level);
}

export function boutiqueLevelLabel(level: number): string {
  const c = boutiqueLevel(level);
  return [`${c.events} mouvements`, `${secondsLabel(c.stepMs)} chacun`, c.both && 'entrées et sorties mêlées', c.cats && 'chats farceurs']
    .filter(Boolean)
    .join(' · ');
}

export function generateBoutiqueRound(rng: Rng, level: number): BoutiqueRound {
  const c = boutiqueLevel(level);
  const start = rng.int(c.startMin, c.startMax);
  let inside = start;
  const events: BoutiqueEvent[] = [];
  for (let i = 0; i < c.events; i++) {
    let enter = 0;
    let leave = 0;
    const mixed = c.both && inside > 0 && rng.chance(0.4);
    if (mixed) {
      enter = rng.int(1, c.maxMoves);
      leave = rng.int(1, Math.min(c.maxMoves, inside));
    } else if (inside > 0 && rng.chance(0.45)) {
      leave = rng.int(1, Math.min(c.maxMoves, inside));
    } else {
      enter = rng.int(1, c.maxMoves);
    }
    // Ceux qui sortent étaient déjà dedans : le compte ne devient jamais négatif.
    inside = inside - leave + enter;
    events.push({ enter, leave, cats: c.cats && rng.chance(0.35) ? rng.int(1, 2) : 0 });
  }
  return { start, events, answer: inside };
}

/** 20 pts par manche réussie. */
export function scoreBoutique(correct: number): number {
  return countScore(correct, 0, BOUTIQUE_ROUNDS);
}
