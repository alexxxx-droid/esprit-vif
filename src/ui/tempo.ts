/**
 * « Temps généreux » (réglage d'accessibilité) : les fenêtres d'affichage et de réaction
 * s'allongent de moitié. Le reste du jeu (règles, scores) ne change pas.
 */
export const GENEROUS_FACTOR = 1.5;

let factor = 1;
/** Rythme de la maîtrise (moins de 1 : plus vite), le temps d'une partie de maîtrise. */
let mastery = 1;

export function setGenerousTime(on: boolean) {
  factor = on ? GENEROUS_FACTOR : 1;
}

export function setMasteryTempo(value: number) {
  mastery = value;
}

/** Une durée d'affichage ou de réaction, allongée si le joueur l'a demandé (raccourcie en maîtrise). */
export function slow(ms: number): number {
  return Math.round(ms * factor * mastery);
}
