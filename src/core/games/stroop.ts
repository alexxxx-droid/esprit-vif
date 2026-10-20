import { byLang } from '../content';
import { tr } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { timeScore, type TimeThresholds } from '../scoring';

/** Les six couleurs de base (niveaux 1 à 30, et le mode fête). */
export const STROOP_COLORS = ['rouge', 'bleu', 'vert', 'jaune', 'orange', 'violet'] as const;
/** Deux couleurs de plus aux niveaux Maître et Légende. */
export const STROOP_EXTRA_COLORS = ['rose', 'blanc'] as const;
export const STROOP_ALL_COLORS = [...STROOP_COLORS, ...STROOP_EXTRA_COLORS] as const;
export type StroopColor = (typeof STROOP_ALL_COLORS)[number];

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
  get rose() {
    return tr('Rose', 'Pink');
  },
  get blanc() {
    return tr('Blanc', 'White');
  },
};

/** Touche clavier de chaque couleur de base (en plus des chiffres 1 à 8 selon la position). */
export const STROOP_KEYS: Record<string, StroopColor> = { r: 'rouge', b: 'bleu', v: 'vert', j: 'jaune', o: 'orange', i: 'violet' };

/** Les mêmes touches en anglais : l'initiale du nom anglais. */
export const STROOP_KEYS_EN: Record<string, StroopColor> = { r: 'rouge', b: 'bleu', g: 'vert', y: 'jaune', o: 'orange', p: 'violet' };

/** Les touches de la langue en cours. */
export function stroopKeys(): Readonly<Record<string, StroopColor>> {
  return byLang(STROOP_KEYS, STROOP_KEYS_EN, (c) => c.stroop.keys);
}

export interface StroopItem {
  /** Le mot écrit. */
  word: StroopColor;
  /** La couleur de l'encre. */
  ink: StroopColor;
  /** Ce qu'il faut répondre : l'encre (la règle de base) ou, aux niveaux avancés, le mot ou la couleur du cadre. */
  ask: 'ink' | 'word' | 'frame';
  /** Couleur du cadre autour du mot (niveaux Expert et plus), jamais celle de l'encre. */
  frame: StroopColor | null;
  /** Ordre des boutons de réponse. */
  buttons: StroopColor[];
  /** Encre (piégée) du libellé de chaque bouton, dans l'ordre de `buttons`. */
  buttonInks: StroopColor[] | null;
}

export const STROOP_COUNT = 20;
export const STROOP_CONGRUENT_RATIO = 0.25;
export const STROOP_PENALTY_MS = 2000;

export interface StroopLevel extends TimeThresholds {
  colors: 4 | 5 | 6 | 7 | 8;
  shuffle: boolean;
  trap: boolean;
  /** Part des mots où l'on demande de lire le MOT au lieu de l'encre. */
  switchRatio: number;
  /** Part des mots où l'on demande la couleur du CADRE (0 : pas de cadre). */
  frame: number;
  /** Le mot (et son cadre) s'efface après ce délai. */
  flashMs: number | null;
  /** Temps pour répondre à chaque mot : au-delà, c'est une erreur. */
  deadlineMs: number | null;
}

const lvl = (colors: 4 | 5 | 6, shuffle: boolean, trap: boolean, switchRatio: number, best: number, worst: number): StroopLevel => ({
  colors,
  shuffle,
  trap,
  switchRatio,
  frame: 0,
  flashMs: null,
  deadlineMs: null,
  best,
  worst,
});

/** Niveaux 21 et plus : mot, encre ou cadre ; puis le mot éclair ; puis un temps limité par mot. */
const adv = (
  colors: 6 | 7 | 8,
  trap: boolean,
  switchRatio: number,
  frame: number,
  best: number,
  worst: number,
  flashMs: number | null = null,
  deadlineMs: number | null = null,
): StroopLevel => ({ colors, shuffle: true, trap, switchRatio, frame, flashMs, deadlineMs, best, worst });

/**
 * Niveau 1 : la spec (4 couleurs, 25 % de mots concordants). Ensuite : plus de couleurs, boutons qui bougent, consignes qui changent.
 * 21-30 (Expert) : un cadre coloré entoure le mot ; la consigne demande l'encre, le mot ou le cadre.
 * 31-40 (Maître) : 7 puis 8 couleurs (rose, blanc) et le mot éclair, qui s'efface de plus en plus vite.
 * 41-50 (Légende) : en plus, un temps limité par mot.
 */
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
  // Expert : le cadre.
  adv(6, false, 0.2, 0.2, 40, 106),
  adv(6, false, 0.25, 0.2, 41, 108),
  adv(6, true, 0.2, 0.2, 42, 110),
  adv(6, false, 0.25, 0.25, 43, 112),
  adv(6, true, 0.25, 0.25, 44, 114),
  adv(6, true, 0.3, 0.25, 45, 115),
  adv(6, false, 0.3, 0.3, 45, 114),
  adv(6, true, 0.3, 0.3, 46, 116),
  adv(6, true, 0.35, 0.3, 46, 115),
  adv(6, true, 0.35, 0.35, 47, 116),
  // Maître : huit couleurs, le mot éclair.
  adv(7, false, 0.3, 0.3, 46, 114, 1500),
  adv(7, true, 0.3, 0.3, 47, 116, 1400),
  adv(8, false, 0.3, 0.3, 48, 118, 1400),
  adv(8, true, 0.3, 0.3, 49, 120, 1300),
  adv(8, true, 0.35, 0.3, 50, 120, 1200),
  adv(8, false, 0.35, 0.35, 49, 118, 1100),
  adv(8, true, 0.35, 0.35, 50, 120, 1050),
  adv(8, true, 0.35, 0.35, 50, 118, 1000),
  adv(8, true, 0.35, 0.35, 50, 116, 950),
  adv(8, true, 0.35, 0.35, 50, 114, 900),
  // Légende : un temps limité par mot.
  adv(8, true, 0.35, 0.35, 48, 104, 900, 3600),
  adv(8, true, 0.35, 0.35, 48, 102, 850, 3400),
  adv(8, true, 0.35, 0.35, 47, 100, 850, 3300),
  adv(8, true, 0.35, 0.35, 47, 98, 800, 3200),
  adv(8, true, 0.35, 0.35, 46, 96, 800, 3100),
  adv(8, true, 0.35, 0.35, 46, 94, 750, 3000),
  adv(8, true, 0.35, 0.35, 45, 92, 700, 3000),
  adv(8, true, 0.35, 0.35, 45, 90, 700, 2900),
  adv(8, true, 0.35, 0.35, 44, 89, 650, 2800),
  adv(8, true, 0.35, 0.35, 44, 88, 600, 2800),
];

/** Les couleurs en jeu à un niveau. */
export function stroopPalette(level: number): StroopColor[] {
  return STROOP_ALL_COLORS.slice(0, pickLevel(STROOP_LEVELS, level).colors);
}

export function stroopLevelLabel(level: number): string {
  const c = pickLevel(STROOP_LEVELS, level);
  const buttons = c.trap ? tr('boutons piégés', 'tricky buttons') : c.shuffle ? tr('boutons mélangés', 'shuffled buttons') : tr('boutons fixes', 'fixed buttons');
  const both = c.frame ? tr(' · mot, encre ou cadre', ' · word, ink or frame') : c.switchRatio ? tr(' · mot ou encre', ' · word or ink') : '';
  const flash = c.flashMs ? tr(` · mot éclair ${secondsLabel(c.flashMs)}`, ` · flash words ${secondsLabel(c.flashMs)}`) : '';
  const deadline = c.deadlineMs ? tr(` · ${secondsLabel(c.deadlineMs)} par mot`, ` · ${secondsLabel(c.deadlineMs)} per word`) : '';
  return tr(`${c.colors} couleurs · ${buttons}${both}${flash}${deadline}`, `${c.colors} colors · ${buttons}${both}${flash}${deadline}`);
}

/** La règle du niveau, affichée à l'intro. */
export function stroopRule(level: number): string {
  const c = pickLevel(STROOP_LEVELS, level);
  const base = c.frame
    ? tr(
        'Suis la consigne : la couleur de l’encre, le mot écrit, ou la couleur du cadre.',
        'Follow the prompt: the ink color, the written word, or the frame color.',
      )
    : c.switchRatio
      ? tr(
          'Touche la couleur de l’encre… sauf quand la consigne dit « le mot » : là, lis le mot.',
          'Tap the color of the ink… except when the prompt says “the word”: then read the word.',
        )
      : tr('Touche la couleur de l’encre, pas celle du mot écrit.', 'Tap the color of the ink, not the color the word spells.');
  return [
    base,
    c.flashMs && tr('Le mot s’efface vite : regarde bien !', 'The word vanishes fast: look sharp!'),
    c.deadlineMs &&
      tr(`${secondsLabel(c.deadlineMs)} par mot, sinon c’est une erreur.`, `${secondsLabel(c.deadlineMs)} per word, or it counts as a mistake.`),
  ]
    .filter(Boolean)
    .join(' ');
}

/** La couleur à répondre pour un mot donné. */
export function stroopAnswer(item: StroopItem): StroopColor {
  if (item.ask === 'frame') return item.frame ?? item.ink;
  return item.ask === 'ink' ? item.ink : item.word;
}

export function generateStroop(rng: Rng, level: number, count = STROOP_COUNT): StroopItem[] {
  const config = pickLevel(STROOP_LEVELS, level);
  const palette: StroopColor[] = STROOP_ALL_COLORS.slice(0, config.colors);
  if (config.frame > 0) return generateFramed(rng, config, palette, count);
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
    items.push({ word, ink, ask, buttons, buttonInks, frame: null });
    previousInk = ink;
  }
  return items;
}

/** Niveaux à cadre : chaque mot a un cadre coloré ; on demande l'encre, le mot ou le cadre. */
function generateFramed(rng: Rng, config: StroopLevel, palette: StroopColor[], count: number): StroopItem[] {
  const others = (...colors: StroopColor[]) => palette.filter((c) => !colors.includes(c));
  const frameCount = Math.round(count * config.frame);
  const wordCount = Math.round(count * config.switchRatio);
  const inkCount = count - wordCount - frameCount;
  const congruentCount = Math.round(inkCount * STROOP_CONGRUENT_RATIO);
  const asks = rng.shuffle<StroopItem['ask']>([
    ...Array<'word'>(wordCount).fill('word'),
    ...Array<'frame'>(frameCount).fill('frame'),
    ...Array<'ink'>(inkCount).fill('ink'),
  ]);
  const congruent = rng.shuffle(Array.from({ length: inkCount }, (_, i) => i < congruentCount));

  const items: StroopItem[] = [];
  let previousInk: StroopColor | null = null;
  let inkIndex = 0;
  for (const ask of asks) {
    // Jamais deux fois la même encre de suite.
    const ink: StroopColor = rng.pick(previousInk ? others(previousInk) : palette);
    const isCongruent = ask === 'ink' && congruent[inkIndex++];
    const word = isCongruent ? ink : rng.pick(others(ink));
    // Le cadre n'a jamais la couleur de l'encre ; quand on le demande, il diffère aussi du mot : aucun raccourci.
    const frame = rng.pick(ask === 'frame' ? others(ink, word) : others(ink));
    const buttons = config.shuffle ? rng.shuffle(palette) : [...palette];
    const buttonInks = config.trap ? buttons.map((c) => rng.pick(others(c))) : null;
    items.push({ word, ink, ask, buttons, buttonInks, frame });
    previousInk = ink;
  }
  return items;
}

/**
 * Temps total + 2 s par erreur, converti en score selon le niveau.
 * Le score baisse aussi quand la justesse s'effondre (moins de ~80 % de réponses justes) :
 * toucher n'importe quoi très vite ne rapporte rien.
 */
export function scoreStroop(elapsedMs: number, errors: number, level: number, count = STROOP_COUNT): number {
  const config = pickLevel(STROOP_LEVELS, level);
  const seconds = (elapsedMs + errors * STROOP_PENALTY_MS) / 1000;
  const score = timeScore(seconds, config);
  const chance = 1 / config.colors;
  const accuracy = Math.max(0, (count - errors) / count);
  const useful = Math.max(0, (accuracy - chance) / (1 - chance));
  return Math.round(score * Math.min(1, useful / 0.75));
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
  rose: 'rose',
  roses: 'rose',
  blanc: 'blanc',
  blancs: 'blanc',
  blanche: 'blanc',
  blanches: 'blanc',
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
  pink: 'rose',
  pinks: 'rose',
  white: 'blanc',
  whites: 'blanc',
};

/** Les mots reconnus à la voix dans la langue en cours. */
export function spokenColors(): Readonly<Record<string, StroopColor>> {
  return byLang(SPOKEN_FR, SPOKEN_EN, (c) => c.stroop.spoken);
}

/** Reconnaissance vocale : retrouve la dernière couleur prononcée dans une transcription. */
export function matchSpokenColor(transcript: string): StroopColor | null {
  const words = transcript
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .split(/[^a-z]+/)
    .filter(Boolean);
  const spoken = spokenColors();
  for (let i = words.length - 1; i >= 0; i--) {
    const color = spoken[words[i]];
    if (color) return color;
  }
  return null;
}
