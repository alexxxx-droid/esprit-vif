import { tr } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * Écho : de grosses touches de couleur, chacune avec sa note. L'écho joue une suite, on la rejoue ;
 * à chaque tour la même suite s'allonge (façon Simon, à la différence de Matrice où chaque manche
 * tire une nouvelle séquence de cases). Deux erreurs, ou une minute, et la partie s'arrête ; après
 * une erreur, le même tour se rejoue en entier.
 * Les paliers changent la façon de jouer : six touches (Confirmé), des touches qui changent de place
 * à chaque tour, il faut retenir les couleurs (Expert), l'écho ne joue plus que la nouvelle note, on
 * rejoue toute la suite de mémoire (Maître), deux notes de plus à chaque tour (Légende).
 * Barème : 100 pts pour une suite de 8 notes (9 quand l'écho ne rejoue plus toute la suite), que
 * l'on atteint avant la fin de la minute en rejouant vite.
 */

/** La partie s'arrête au plus tard au bout d'une minute. */
export const ECHO_MAX_MS = 60_000;
export const ECHO_MAX_FAILURES = 2;
/** Suite tirée d'avance : assez longue pour n'importe quelle partie. */
export const ECHO_MAX_LENGTH = 20;
/** Pause avant que l'écho joue (le temps de voir le nouveau tour). */
export const ECHO_LEAD_MS = 700;

export interface EchoLevel {
  pads: 4 | 6;
  /** Longueur de la suite au premier tour. */
  start: number;
  /** Notes ajoutées à chaque tour. */
  add: 1 | 2;
  /** Durée d'allumage d'une note, puis pause avant la suivante. */
  lightMs: number;
  gapMs: number;
  /** Les touches changent de place à chaque tour (chaque couleur garde sa note). */
  shuffle: boolean;
  /** L'écho ne joue que les notes nouvelles (sauf au premier tour et après une erreur). */
  onlyNew: boolean;
  /** Barème : suite de `zero` notes = 0 pt, de `full` notes = 100 pts. */
  zero: number;
  full: number;
}

/** Interpolation d'un palier : de `a` (1er niveau) à `b` (10e). */
const step = (i: number, a: number, b: number) => Math.round(a + ((b - a) * i) / 9);

const lvl = (pads: 4 | 6, start: number, add: 1 | 2, lightMs: number, gapMs: number, shuffle: boolean, onlyNew: boolean, zero: number, full: number): EchoLevel => ({
  pads,
  start,
  add,
  lightMs,
  gapMs,
  shuffle,
  onlyNew,
  zero,
  full,
});

export const ECHO_LEVELS: readonly EchoLevel[] = [
  // Débutant : quatre touches, une note de plus à chaque tour.
  ...Array.from({ length: 10 }, (_, i) => lvl(4, 2, 1, step(i, 650, 480), 180, false, false, 2, 8)),
  // Confirmé : six touches.
  ...Array.from({ length: 10 }, (_, i) => lvl(6, 3, 1, step(i, 520, 420), 160, false, false, 2, 8)),
  // Expert : les touches changent de place à chaque tour.
  ...Array.from({ length: 10 }, (_, i) => lvl(i < 5 ? 4 : 6, 3, 1, step(i, 520, 420), 160, true, false, 2, 8)),
  // Maître : l'écho ne joue que la nouvelle note ; on rejoue toute la suite de mémoire.
  ...Array.from({ length: 10 }, (_, i) => lvl(i < 5 ? 4 : 6, 3, 1, step(i, 560, 440), 160, false, true, 3, 9)),
  // Légende : deux notes de plus à chaque tour, et seulement elles.
  ...Array.from({ length: 10 }, (_, i) => lvl(6, 3, 2, step(i, 520, 400), 150, i >= 5, true, 3, 9)),
];

export function echoLevel(level: number): EchoLevel {
  return pickLevel(ECHO_LEVELS, level);
}

export function echoLevelLabel(level: number): string {
  const c = echoLevel(level);
  return [
    tr(`${c.pads} touches`, `${c.pads} pads`),
    c.shuffle && tr('touches qui changent de place', 'pads change places'),
    c.onlyNew && (c.add === 2 ? tr('deux nouvelles notes seulement', 'only two new notes') : tr('seule la nouvelle note', 'only the new note')),
    tr(`${secondsLabel(c.lightMs)} par note`, `${secondsLabel(c.lightMs)} per note`),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** La règle affichée à l'intro. */
export function echoRule(level: number): string {
  const c = echoLevel(level);
  const parts = [
    tr(
      'Écoute et regarde la suite, puis rejoue-la. À chaque tour, la même suite s’allonge. Deux erreurs ou une minute, et c’est fini.',
      'Watch and listen to the sequence, then play it back. Each turn, the same sequence grows longer. Two mistakes or one minute, and it’s over.',
    ),
    c.shuffle && tr('Les touches changent de place à chaque tour : retiens les couleurs.', 'The pads change places every turn: remember the colors.'),
    c.onlyNew &&
      (c.add === 2
        ? tr('L’écho ne joue que les deux nouvelles notes : rejoue toute la suite de mémoire.', 'The echo only plays the two new notes: play the whole sequence from memory.')
        : tr('L’écho ne joue que la nouvelle note : rejoue toute la suite de mémoire.', 'The echo only plays the new note: play the whole sequence from memory.')),
  ];
  return parts.filter(Boolean).join(' ');
}

export interface EchoGame {
  /** La suite de touches (index de couleur), dont on joue le début. */
  sequence: number[];
  /** Pour chaque essai (tour ou nouvelle tentative) : la place de chaque couleur. */
  layouts: number[][];
}

/** Assez d'essais pour une partie entière (tours et nouvelles tentatives). */
const MAX_ATTEMPTS = 24;

export function generateEcho(rng: Rng, level: number): EchoGame {
  const c = echoLevel(level);
  const sequence: number[] = [];
  while (sequence.length < ECHO_MAX_LENGTH) {
    const pad = rng.int(0, c.pads - 1);
    // Jamais trois fois la même touche de suite.
    if (sequence.length >= 2 && sequence[sequence.length - 1] === pad && sequence[sequence.length - 2] === pad) continue;
    sequence.push(pad);
  }
  const identity = Array.from({ length: c.pads }, (_, i) => i);
  const layouts = Array.from({ length: MAX_ATTEMPTS }, (_, k) => {
    if (!c.shuffle || k === 0) return identity;
    // Une vraie nouvelle disposition : au moins la moitié des couleurs bougent.
    for (;;) {
      const next = rng.shuffle([...identity]);
      if (next.filter((p, i) => p !== i).length >= c.pads / 2) return next;
    }
  });
  return { sequence, layouts };
}

/** Longueur de la suite au tour `turn` (0 pour le premier). */
export function echoLength(c: EchoLevel, turn: number): number {
  return Math.min(ECHO_MAX_LENGTH, c.start + turn * c.add);
}

/**
 * Les notes que l'écho joue à un tour : toute la suite, ou seulement les nouvelles (palier Maître et
 * plus), sauf au premier tour et pour une nouvelle tentative après une erreur.
 */
export function echoShown(c: EchoLevel, turn: number, retry: boolean): { from: number; to: number } {
  const to = echoLength(c, turn);
  return { from: c.onlyNew && turn > 0 && !retry ? echoLength(c, turn - 1) : 0, to };
}

/** Plus longue suite rejouée sans faute, rapportée au barème du niveau. */
export function scoreEcho(best: number, level: number): number {
  const { zero, full } = echoLevel(level);
  return countScore(best, zero, full);
}
