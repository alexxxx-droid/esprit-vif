/**
 * « Temps généreux » (réglage d'accessibilité) : les fenêtres d'affichage et de réaction
 * s'allongent de moitié. Le reste du jeu (règles, scores) ne change pas.
 */
export const GENEROUS_FACTOR = 1.5;

let factor = 1;

export function setGenerousTime(on: boolean) {
  factor = on ? GENEROUS_FACTOR : 1;
}

/** Une durée d'affichage ou de réaction, allongée si le joueur l'a demandé. */
export function slow(ms: number): number {
  return Math.round(ms * factor);
}
