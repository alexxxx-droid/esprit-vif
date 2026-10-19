import type { Rng } from '../rng';
import { clampLevel, timeScore, type TimeThresholds } from '../scoring';

export const STROOP_COLORS = ['rouge', 'bleu', 'vert', 'jaune'] as const;
export type StroopColor = (typeof STROOP_COLORS)[number];

export const STROOP_LABELS: Record<StroopColor, string> = {
  rouge: 'Rouge',
  bleu: 'Bleu',
  vert: 'Vert',
  jaune: 'Jaune',
};

/** Touche clavier de chaque couleur : son initiale. */
export const STROOP_KEYS: Record<string, StroopColor> = { r: 'rouge', b: 'bleu', v: 'vert', j: 'jaune' };

export interface StroopItem {
  /** Le mot écrit. */
  word: StroopColor;
  /** La couleur de l'encre : c'est elle qu'il faut répondre. */
  ink: StroopColor;
  /** Ordre des boutons de réponse. */
  buttons: StroopColor[];
  /** Niveau 3 : encre (piégée) du libellé de chaque bouton, dans l'ordre de `buttons`. */
  buttonInks: StroopColor[] | null;
}

export const STROOP_COUNT = 20;
export const STROOP_CONGRUENT_RATIO = 0.25;
export const STROOP_PENALTY_MS = 2000;
export const STROOP_MAX_LEVEL = 3;

/** Niveau 1 : barème de la spec. Niveau 2 : boutons mélangés. Niveau 3 : libellés des boutons piégés aussi. */
export const STROOP_THRESHOLDS: Record<number, TimeThresholds> = {
  1: { best: 18, worst: 60 },
  2: { best: 21, worst: 66 },
  3: { best: 24, worst: 72 },
};

const others = (color: StroopColor) => STROOP_COLORS.filter((c) => c !== color);

export function generateStroop(rng: Rng, level: number, count = STROOP_COUNT): StroopItem[] {
  const lvl = clampLevel(level, STROOP_MAX_LEVEL);
  const congruentCount = Math.round(count * STROOP_CONGRUENT_RATIO);
  const congruent = rng.shuffle(Array.from({ length: count }, (_, i) => i < congruentCount));

  const items: StroopItem[] = [];
  let previousInk: StroopColor | null = null;
  for (const isCongruent of congruent) {
    // Jamais deux fois la même encre de suite : le joueur ne peut pas répondre par réflexe.
    const ink: StroopColor = rng.pick(previousInk ? others(previousInk) : STROOP_COLORS);
    const word = isCongruent ? ink : rng.pick(others(ink));
    const buttons = lvl === 1 ? [...STROOP_COLORS] : rng.shuffle(STROOP_COLORS);
    const buttonInks = lvl === 3 ? buttons.map((c) => rng.pick(others(c))) : null;
    items.push({ word, ink, buttons, buttonInks });
    previousInk = ink;
  }
  return items;
}

/** Temps total + 2 s par erreur, converti en score selon le niveau. */
export function scoreStroop(elapsedMs: number, errors: number, level: number): number {
  const seconds = (elapsedMs + errors * STROOP_PENALTY_MS) / 1000;
  return timeScore(seconds, STROOP_THRESHOLDS[clampLevel(level, STROOP_MAX_LEVEL)]);
}

const SPOKEN: Record<string, StroopColor> = {
  rouge: 'rouge',
  rouges: 'rouge',
  bleu: 'bleu',
  bleue: 'bleu',
  bleus: 'bleu',
  vert: 'vert',
  verte: 'vert',
  verre: 'vert',
  vers: 'vert',
  ver: 'vert',
  jaune: 'jaune',
  jaunes: 'jaune',
};

/** Reconnaissance vocale : retrouve la dernière couleur prononcée dans une transcription. */
export function matchSpokenColor(transcript: string): StroopColor | null {
  const words = transcript
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z]+/)
    .filter(Boolean);
  for (let i = words.length - 1; i >= 0; i--) {
    const color = SPOKEN[words[i]];
    if (color) return color;
  }
  return null;
}
