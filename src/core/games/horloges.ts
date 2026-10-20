import { NBSP } from '../format';
import { localized, tr, type Translations } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * Horloges : lire une horloge à aiguilles, dire l'heure qu'il sera plus tard,
 * ou le temps écoulé entre deux horloges. Quatre propositions, 60 secondes.
 * Au-delà du niveau 20 : l'heure qu'il était (« il y a… »), les chiffres romains (Expert),
 * l'horloge vue dans un miroir (Maître), puis des durées sur 24 heures, de part et d'autre
 * de minuit, avec des horloges marquées matin / après-midi / soir (Légende).
 */

export const HORLOGES_DURATION_MS = 60_000;
export const HALF_DAY = 720;
export const DAY = 1440;

export type HorlogeMode = 'read' | 'later' | 'elapsed' | 'earlier' | 'overnight';
/** Chiffres sur le cadran : tous, seulement 12-3-6-9, aucun, ou en chiffres romains (tous ou XII-III-VI-IX). */
export type Numerals = 'all' | 'quarters' | 'none' | 'roman' | 'romanQuarters';

export interface HorlogeLevel {
  modes: HorlogeMode[];
  /** Précision des heures affichées, en minutes. */
  step: number;
  numerals: Numerals;
  /**
   * Écart maximum (modes « plus tard », « il y a » et « temps écoulé »), en minutes. Sur un cadran
   * de 12 heures, il reste sous 12 h ; seules les durées sur 24 heures (« overnight ») vont au-delà.
   */
  maxDelta: number;
  /** Bonnes réponses en 60 s pour 100 pts (une erreur en retire une). */
  target: number;
  /** Probabilité qu'une horloge soit vue dans un miroir (niveaux 31 et plus). */
  mirror?: number;
}

const L = (modes: HorlogeMode[], step: number, numerals: Numerals, maxDelta: number, target: number): HorlogeLevel => ({ modes, step, numerals, maxDelta, target });
/** Niveaux 31 et plus : une part des horloges vues dans un miroir. */
const M = (modes: HorlogeMode[], step: number, numerals: Numerals, maxDelta: number, target: number, mirror: number): HorlogeLevel => ({
  ...L(modes, step, numerals, maxDelta, target),
  mirror,
});
const ALL: HorlogeMode[] = ['read', 'later', 'elapsed'];
const MOVES: HorlogeMode[] = ['later', 'elapsed'];
const ALL4: HorlogeMode[] = ['read', 'later', 'earlier', 'elapsed'];
const SHIFTS: HorlogeMode[] = ['later', 'earlier', 'elapsed'];
const ALL5: HorlogeMode[] = ['read', 'later', 'earlier', 'elapsed', 'overnight'];

export const HORLOGES_LEVELS: readonly HorlogeLevel[] = [
  L(['read'], 30, 'all', 0, 14),
  L(['read'], 15, 'all', 0, 14),
  L(['read'], 5, 'all', 0, 13),
  L(['read', 'later'], 15, 'all', 120, 12),
  L(['read'], 5, 'quarters', 0, 12),
  L(['read', 'later'], 5, 'all', 90, 12),
  L(['elapsed'], 15, 'all', 180, 11),
  L(ALL, 5, 'all', 240, 11),
  L(['read'], 1, 'all', 0, 11),
  L(MOVES, 5, 'quarters', 240, 10),
  L(['read'], 1, 'quarters', 0, 10),
  L(ALL, 5, 'quarters', 300, 10),
  L(MOVES, 5, 'quarters', 360, 10),
  L(['read'], 1, 'none', 0, 10),
  L(ALL, 5, 'none', 360, 9),
  L(MOVES, 1, 'quarters', 300, 9),
  L(ALL, 1, 'quarters', 420, 9),
  L(MOVES, 5, 'none', 480, 8),
  L(ALL, 1, 'none', 480, 8),
  L(MOVES, 1, 'none', 600, 8),
  // Expert : « il y a… » et les chiffres romains.
  L(['read', 'earlier'], 5, 'roman', 300, 10),
  L(['earlier'], 5, 'roman', 360, 9),
  L(['read', 'earlier'], 1, 'roman', 420, 9),
  L(['later', 'earlier'], 5, 'romanQuarters', 480, 9),
  L(ALL4, 1, 'roman', 540, 8),
  L(['earlier', 'elapsed'], 1, 'romanQuarters', 600, 8),
  L(SHIFTS, 1, 'roman', 660, 8),
  L(['earlier'], 1, 'none', 700, 8),
  L(ALL4, 1, 'romanQuarters', 700, 7),
  L(SHIFTS, 1, 'none', 715, 7),
  // Maître : l'horloge dans un miroir, d'abord toujours, puis une fois sur deux.
  M(['read'], 5, 'all', 0, 9, 1),
  M(['read'], 5, 'quarters', 0, 9, 1),
  M(['read'], 1, 'quarters', 0, 8, 1),
  M(['read', 'later'], 5, 'all', 360, 8, 0.5),
  M(['read', 'earlier'], 1, 'roman', 420, 8, 0.5),
  M(['read', 'later', 'earlier'], 1, 'quarters', 480, 8, 0.5),
  M(ALL4, 1, 'romanQuarters', 540, 7, 0.5),
  M(ALL4, 1, 'quarters', 600, 7, 0.5),
  M(SHIFTS, 1, 'romanQuarters', 660, 7, 0.5),
  M(ALL4, 1, 'none', 715, 7, 0.5),
  // Légende : des durées sur 24 heures (matin, après-midi, soir), puis tout à la fois.
  L(['overnight'], 5, 'all', 1080, 8),
  L(['overnight'], 5, 'quarters', 1200, 8),
  L(['overnight', 'elapsed'], 1, 'quarters', 1320, 8),
  L(['overnight', 'later', 'earlier'], 1, 'roman', 1380, 7),
  M(['overnight', 'read'], 1, 'romanQuarters', 1380, 7, 0.3),
  M(ALL5, 1, 'quarters', 1380, 7, 0.3),
  M(ALL5, 1, 'romanQuarters', 1380, 7, 0.4),
  M(ALL5, 1, 'none', 1380, 6, 0.4),
  M(['overnight', 'later', 'earlier', 'elapsed'], 1, 'none', 1435, 6, 0.5),
  M(ALL5, 1, 'none', 1435, 6, 0.5),
];

export function horlogesLevel(level: number): HorlogeLevel {
  return pickLevel(HORLOGES_LEVELS, level);
}

/** Noms des modes et des cadrans : [français, anglais], choisis à l'affichage. */
const MODE_NAMES: Record<HorlogeMode, Translations> = {
  read: { fr: 'lire l’heure', en: 'tell the time' },
  later: { fr: 'heure d’arrivée', en: 'time later' },
  elapsed: { fr: 'temps écoulé', en: 'time elapsed' },
  earlier: { fr: 'heure d’avant', en: 'time before' },
  overnight: { fr: 'durées sur 24 h', en: '24-hour durations' },
};
const NUMERAL_NAMES: Record<Numerals, Translations> = {
  all: { fr: 'cadran chiffré', en: 'all numbers' },
  quarters: { fr: '4 chiffres', en: '4 numbers' },
  none: { fr: 'sans chiffres', en: 'no numbers' },
  roman: { fr: 'chiffres romains', en: 'Roman numerals' },
  romanQuarters: { fr: '4 chiffres romains', en: '4 Roman numerals' },
};

function stepName(step: number): string {
  if (step === 1) return tr('à la minute', 'to the minute');
  if (step === 30) return tr('à la demi-heure', 'to the half hour');
  if (step === 15) return tr('au quart d’heure', 'to the quarter hour');
  return tr(`à ${step}${NBSP}min`, `to ${step}${NBSP}min`);
}

function mirrorName(mirror: number): string {
  if (mirror >= 1) return tr('vue dans un miroir', 'seen in a mirror');
  return tr(`miroir ${Math.round(mirror * 100)}${NBSP}%`, `${Math.round(mirror * 100)}% mirrored`);
}

export function horlogesLevelLabel(level: number): string {
  const c = horlogesLevel(level);
  const parts = [c.modes.map((m) => localized(MODE_NAMES[m])).join(', '), stepName(c.step), localized(NUMERAL_NAMES[c.numerals])];
  if (c.mirror) parts.push(mirrorName(c.mirror));
  const label = parts.join(' · ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const pad = (n: number) => String(n).padStart(2, '0');
const wrap = (t: number) => ((t % HALF_DAY) + HALF_DAY) % HALF_DAY;
const wrapDay = (t: number) => ((t % DAY) + DAY) % DAY;

/** 135 → « 2 h 15 » (« 2:15 » en anglais ; cadran de 12 heures : 0 se lit 12). */
export function formatClock(t: number): string {
  const m = wrap(t);
  const h = Math.floor(m / 60) || 12;
  return tr(`${h}${NBSP}h${NBSP}${pad(m % 60)}`, `${h}:${pad(m % 60)}`);
}

/** Heure sur 24 heures : 1360 → « 22 h 40 » (« 10:40 PM » en anglais). */
export function formatDayTime(t: number): string {
  const m = wrapDay(t);
  return tr(`${Math.floor(m / 60)}${NBSP}h${NBSP}${pad(m % 60)}`, `${formatClock(m)}${NBSP}${m < HALF_DAY ? 'AM' : 'PM'}`);
}

/** Moment de la journée affiché sous une horloge de 24 heures : matin, après-midi ou soir (AM / PM). */
export function dayPart(t: number): { label: string; night: boolean } {
  const m = wrapDay(t);
  const label = m < HALF_DAY ? tr('matin', 'AM') : m < 1080 ? tr('après-midi', 'PM') : tr('soir', 'PM');
  return { label, night: m < 360 || m >= 1080 };
}

/** 45 → « 45 min », 60 → « 1 h », 85 → « 1 h 25 » (« 1 hr 25 min » en anglais). */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}${NBSP}min`;
  const h = Math.floor(minutes / 60);
  if (!(minutes % 60)) return tr(`${h}${NBSP}h`, `${h}${NBSP}hr`);
  return tr(`${h}${NBSP}h${NBSP}${pad(minutes % 60)}`, `${h}${NBSP}hr${NBSP}${minutes % 60}${NBSP}min`);
}

const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

/** 4 → « IV », 12 → « XII ». */
export function romanNumeral(hour: number): string {
  return ROMAN[hour % 12];
}

export interface HorlogeQuestion {
  mode: HorlogeMode;
  /**
   * Heure de l'horloge (minutes depuis 12 h 00) ; pour les durées sur 24 heures (« overnight »),
   * minutes depuis minuit (0 à 1439).
   */
  clock: number;
  /** Seconde horloge (temps écoulé). */
  clock2: number | null;
  /** Durée à ajouter (« plus tard ») ou à retirer (« il y a »). */
  delta: number;
  options: string[];
  answer: number;
  /** Les horloges sont vues dans un miroir : l'heure vraie est celle d'en face. */
  mirror?: true;
}

function randomTime(rng: Rng, step: number): number {
  return rng.int(0, HALF_DAY / step - 1) * step;
}

/** Les pièges classiques : aiguilles inversées, heure voisine, minutes voisines, lecture en miroir. */
function clockTraps(t: number, step: number): number[] {
  const h = Math.floor(t / 60) || 12;
  const m = t % 60;
  const swapped = (Math.round(m / 5) % 12) * 60 + ((h % 12) * 5);
  return [swapped, t + 60, t - 60, t + Math.max(step, 5), t - Math.max(step, 5), HALF_DAY - t, t + 30].map(wrap);
}

function durationTraps(d: number, step: number): number[] {
  return [d + 60, d - 60, d + Math.max(step, 5), d - Math.max(step, 5), HALF_DAY - d, d + 30, d - 30].filter((x) => x > 0 && x < HALF_DAY);
}

function withTraps(rng: Rng, answer: number, traps: number[], format: (v: number) => string, fallback: () => number) {
  const values = [answer];
  for (const trap of rng.shuffle(traps)) if (values.length < 4 && !values.includes(trap)) values.push(trap);
  while (values.length < 4) {
    const v = fallback();
    if (!values.includes(v)) values.push(v);
  }
  const shuffled = rng.shuffle(values);
  return { options: shuffled.map(format), answer: shuffled.indexOf(answer) };
}

/** Comme `withTraps`, mais les pièges `forced` (le piège propre à la question) sont toujours proposés. */
function withForcedTraps(rng: Rng, answer: number, forced: number[], traps: number[], format: (v: number) => string, fallback: () => number) {
  const values = [answer];
  for (const trap of forced) if (values.length < 3 && !values.includes(trap)) values.push(trap);
  for (const trap of rng.shuffle(traps)) if (values.length < 4 && !values.includes(trap)) values.push(trap);
  while (values.length < 4) {
    const v = fallback();
    if (!values.includes(v)) values.push(v);
  }
  const shuffled = rng.shuffle(values);
  return { options: shuffled.map(format), answer: shuffled.indexOf(answer) };
}

/** Ce qu'on lit en prenant le reflet pour l'horloge : l'heure symétrique (3 h 20 ↔ 8 h 40). */
const mirrored = (t: number) => wrap(HALF_DAY - t);
/** Le même reflet, matin / après-midi / soir gardés (horloges de 24 heures). */
const mirroredDay = (t: number) => wrapDay(t) - wrap(t) + mirrored(t);

/** Durées sur 24 heures : deux horloges marquées matin / après-midi / soir. */
function overnightQuestion(rng: Rng, c: HorlogeLevel, mirror: boolean): HorlogeQuestion {
  const deltaStep = Math.max(c.step, 5);
  const delta = rng.int(Math.ceil(20 / deltaStep), Math.floor(c.maxDelta / deltaStep)) * deltaStep;
  const clock = rng.int(0, DAY / c.step - 1) * c.step;
  const clock2 = wrapDay(clock + delta);
  // Pièges : oublier qu'on a changé de demi-journée (± 12 h), et la lecture du reflet.
  const forced = [delta > HALF_DAY ? delta - HALF_DAY : delta + HALF_DAY];
  if (mirror) forced.unshift(wrapDay(mirroredDay(clock2) - mirroredDay(clock)));
  const inRange = (d: number) => d > 0 && d < DAY;
  const traps = [delta + 60, delta - 60, delta + deltaStep, delta - deltaStep, delta + 30, delta - 30, DAY - delta].filter(inRange);
  return {
    mode: 'overnight',
    clock,
    clock2,
    delta: 0,
    ...withForcedTraps(rng, delta, forced.filter(inRange), traps, formatDuration, () => rng.int(1, Math.floor(c.maxDelta / deltaStep)) * deltaStep),
    ...(mirror ? { mirror: true as const } : {}),
  };
}

export function generateHorlogeQuestion(rng: Rng, level: number): HorlogeQuestion {
  const c = horlogesLevel(level);
  const mode = rng.pick(c.modes);
  // Le miroir ne se tire qu'aux niveaux qui en ont : les niveaux 1 à 30 restent tirés comme avant.
  const mirror = c.mirror ? rng.chance(c.mirror) : false;
  if (mode === 'overnight') return overnightQuestion(rng, c, mirror);
  let clock = randomTime(rng, c.step);
  // 6 h 00 et 12 h 00 sont pareilles dans un miroir : on ne les montre pas en reflet.
  while (mirror && clock % 360 === 0) clock = randomTime(rng, c.step);
  const flag = mirror ? { mirror: true as const } : {};
  if (mode === 'read') {
    if (mirror) {
      return { mode, clock, clock2: null, delta: 0, ...withForcedTraps(rng, clock, [mirrored(clock)], clockTraps(clock, c.step), formatClock, () => randomTime(rng, c.step)), ...flag };
    }
    return { mode, clock, clock2: null, delta: 0, ...withTraps(rng, clock, clockTraps(clock, c.step), formatClock, () => randomTime(rng, c.step)) };
  }
  const deltaStep = Math.max(c.step, 5);
  // Sur un cadran de 12 heures, un écart de 12 h ou plus ne se verrait pas.
  const maxDelta = Math.min(c.maxDelta, HALF_DAY - deltaStep);
  const delta = rng.int(Math.ceil(20 / deltaStep), Math.floor(maxDelta / deltaStep)) * deltaStep;
  if (mode === 'later') {
    const answer = wrap(clock + delta);
    if (mirror) {
      const forced = [wrap(mirrored(clock) + delta)];
      return { mode, clock, clock2: null, delta, ...withForcedTraps(rng, answer, forced, [...clockTraps(answer, c.step), wrap(clock - delta)], formatClock, () => randomTime(rng, c.step)), ...flag };
    }
    return { mode, clock, clock2: null, delta, ...withTraps(rng, answer, [...clockTraps(answer, c.step), wrap(clock - delta)], formatClock, () => randomTime(rng, c.step)) };
  }
  if (mode === 'earlier') {
    // Piège : avancer au lieu de reculer.
    const answer = wrap(clock - delta);
    const forced = mirror ? [wrap(mirrored(clock) - delta), wrap(clock + delta)] : [wrap(clock + delta)];
    return { mode, clock, clock2: null, delta, ...withForcedTraps(rng, answer, forced, clockTraps(answer, c.step), formatClock, () => randomTime(rng, c.step)), ...flag };
  }
  const traps = durationTraps(delta, c.step);
  const fallback = () => rng.int(1, Math.floor(maxDelta / deltaStep)) * deltaStep;
  if (mirror) {
    // Deux reflets : on lirait le temps écoulé à l'envers (12 h moins la vraie durée).
    return { mode, clock, clock2: wrap(clock + delta), delta: 0, ...withForcedTraps(rng, delta, [HALF_DAY - delta], traps, formatDuration, fallback), ...flag };
  }
  return {
    mode,
    clock,
    clock2: wrap(clock + delta),
    delta: 0,
    ...withTraps(rng, delta, traps, formatDuration, fallback),
  };
}

export function generateHorloges(rng: Rng, level: number, count = 40): HorlogeQuestion[] {
  return Array.from({ length: count }, () => generateHorlogeQuestion(rng, level));
}

export function scoreHorloges(correct: number, errors: number, level: number): number {
  return countScore(correct - errors, 0, horlogesLevel(level).target);
}

/** Angles des aiguilles, en degrés depuis midi, sens des aiguilles d'une montre. */
export function handAngles(t: number): { hour: number; minute: number } {
  const m = wrap(t);
  return { hour: m / 2, minute: (m % 60) * 6 };
}
