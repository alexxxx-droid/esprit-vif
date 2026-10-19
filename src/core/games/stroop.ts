import { lang, tr, type Lang } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { timeScore, type TimeThresholds } from '../scoring';

export const STROOP_COLORS = ['rouge', 'bleu', 'vert', 'jaune', 'orange', 'violet'] as const;
export type StroopColor = (typeof STROOP_COLORS)[number];

/** Nom affiché de chaque couleur, dans la langue en cours (les identifiants restent en français). */
export const STROOP_LABELS: Record<StroopColor, string> = {
  get rouge() {
    return tr('Rouge', 'Red');
  },
  get bleu() {
    return tr('Bleu', 'Blue');
  },
  get vert() {
    return tr('Vert', 'Green');
  },
  get jaune() {
    return tr('Jaune', 'Yellow');
  },
  get orange() {
    return tr('Orange', 'Orange');
  },
  get violet() {
    return tr('Violet', 'Purple');
  },
};

/** Touche clavier de chaque couleur (en plus des chiffres 1 à 6 selon la position). */
export const STROOP_KEYS: Record<string, StroopColor> = { r: 'rouge', b: 'bleu', v: 'vert', j: 'jaune', o: 'orange', i: 'violet' };

/** Les mêmes touches en anglais : l'initiale du nom anglais. */
export const STROOP_KEYS_EN: Record<string, StroopColor> = { r: 'rouge', b: 'bleu', g: 'vert', y: 'jaune', o: 'orange', p: 'violet' };

/** Les touches de la langue en cours. */
export function stroopKeys(): Record<string, StroopColor> {
  return lang() === 'en' ? STROOP_KEYS_EN : STROOP_KEYS;
}

export interface StroopItem {
  /** Le mot écrit. */
  word: StroopColor;
  /** La couleur de l'encre. */
  ink: StroopColor;
  /** Ce qu'il faut répondre : l'encre (la règle de base) ou, aux niveaux avancés, le mot. */
  ask: 'ink' | 'word';
  /** Ordre des boutons de réponse. */
  buttons: StroopColor[];
  /** Encre (piégée) du libellé de chaque bouton, dans l'ordre de `buttons`. */
  buttonInks: StroopColor[] | null;
}

export const STROOP_COUNT = 20;
export const STROOP_CONGRUENT_RATIO = 0.25;
export const STROOP_PENALTY_MS = 2000;

export interface StroopLevel extends TimeThresholds {
  colors: 4 | 5 | 6;
  shuffle: boolean;
  trap: boolean;
  /** Part des mots où l'on demande de lire le MOT au lieu de l'encre. */
  switchRatio: number;
}

const lvl = (colors: 4 | 5 | 6, shuffle: boolean, trap: boolean, switchRatio: number, best: number, worst: number): StroopLevel => ({
  colors,
  shuffle,
  trap,
  switchRatio,
  best,
  worst,
});

/** Niveau 1 : la spec (4 couleurs, 25 % de mots concordants). Ensuite : plus de couleurs, boutons qui bougent, consignes qui changent. */
export const STROOP_LEVELS: readonly StroopLevel[] = [
  lvl(4, false, false, 0, 18, 60),
  lvl(4, true, false, 0, 21, 66),
  lvl(4, true, true, 0, 24, 72),
  lvl(5, false, false, 0, 22, 68),
  lvl(5, true, false, 0, 25, 74),
  lvl(4, false, false, 0.25, 26, 76),
  lvl(5, true, true, 0, 28, 80),
  lvl(6, false, false, 0, 26, 78),
  lvl(4, true, false, 0.3, 29, 84),
  lvl(6, true, false, 0, 30, 86),
  lvl(5, true, false, 0.3, 32, 90),
  lvl(6, true, true, 0, 33, 92),
  lvl(4, true, true, 0.4, 34, 94),
  lvl(6, true, false, 0.3, 35, 96),
  lvl(5, true, true, 0.4, 36, 98),
  lvl(6, true, true, 0.3, 37, 100),
  lvl(6, true, false, 0.5, 38, 102),
  lvl(5, true, true, 0.5, 39, 104),
  lvl(6, true, true, 0.45, 40, 106),
  lvl(6, true, true, 0.5, 42, 110),
];

export function stroopLevelLabel(level: number): string {
  const c = pickLevel(STROOP_LEVELS, level);
  const buttons = c.trap ? tr('boutons piégés', 'tricky buttons') : c.shuffle ? tr('boutons mélangés', 'shuffled buttons') : tr('boutons fixes', 'fixed buttons');
  const both = c.switchRatio ? tr(' · mot ou encre', ' · word or ink') : '';
  return tr(`${c.colors} couleurs · ${buttons}${both}`, `${c.colors} colors · ${buttons}${both}`);
}

/** La couleur à répondre pour un mot donné. */
export function stroopAnswer(item: StroopItem): StroopColor {
  return item.ask === 'ink' ? item.ink : item.word;
}

export function generateStroop(rng: Rng, level: number, count = STROOP_COUNT): StroopItem[] {
  const config = pickLevel(STROOP_LEVELS, level);
  const palette = STROOP_COLORS.slice(0, config.colors);
  const others = (color: StroopColor) => palette.filter((c) => c !== color);

  const wordCount = Math.round(count * config.switchRatio);
  const inkCount = count - wordCount;
  const congruentCount = Math.round(inkCount * STROOP_CONGRUENT_RATIO);
  const asks = rng.shuffle([...Array<'word'>(wordCount).fill('word'), ...Array<'ink'>(inkCount).fill('ink')]);
  const congruent = rng.shuffle(Array.from({ length: inkCount }, (_, i) => i < congruentCount));

  const items: StroopItem[] = [];
  let previousInk: StroopColor | null = null;
  let inkIndex = 0;
  for (const ask of asks) {
    // Jamais deux fois la même encre de suite : le joueur ne peut pas répondre par réflexe.
    const ink: StroopColor = rng.pick(previousInk ? others(previousInk) : palette);
    const isCongruent = ask === 'ink' && congruent[inkIndex++];
    const word = isCongruent ? ink : rng.pick(others(ink));
    const buttons = config.shuffle ? rng.shuffle(palette) : [...palette];
    const buttonInks = config.trap ? buttons.map((c) => rng.pick(others(c))) : null;
    items.push({ word, ink, ask, buttons, buttonInks });
    previousInk = ink;
  }
  return items;
}

/** Temps total + 2 s par erreur, converti en score selon le niveau. */
export function scoreStroop(elapsedMs: number, errors: number, level: number): number {
  const seconds = (elapsedMs + errors * STROOP_PENALTY_MS) / 1000;
  return timeScore(seconds, pickLevel(STROOP_LEVELS, level));
}

const SPOKEN_FR: Record<string, StroopColor> = {
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
  orange: 'orange',
  oranges: 'orange',
  violet: 'violet',
  violette: 'violet',
  violets: 'violet',
};

/** En anglais, avec les homophones que la reconnaissance vocale renvoie parfois (« read », « blew »). */
const SPOKEN_EN: Record<string, StroopColor> = {
  red: 'rouge',
  reds: 'rouge',
  read: 'rouge',
  blue: 'bleu',
  blues: 'bleu',
  blew: 'bleu',
  green: 'vert',
  greens: 'vert',
  yellow: 'jaune',
  yellows: 'jaune',
  orange: 'orange',
  oranges: 'orange',
  purple: 'violet',
  purples: 'violet',
  violet: 'violet',
};

const SPOKEN: Record<Lang, Record<string, StroopColor>> = { fr: SPOKEN_FR, en: SPOKEN_EN };

/** Reconnaissance vocale : retrouve la dernière couleur prononcée dans une transcription. */
export function matchSpokenColor(transcript: string): StroopColor | null {
  const words = transcript
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z]+/)
    .filter(Boolean);
  const spoken = SPOKEN[lang()];
  for (let i = words.length - 1; i >= 0; i--) {
    const color = spoken[words[i]];
    if (color) return color;
  }
  return null;
}
