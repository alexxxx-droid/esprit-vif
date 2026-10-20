import { tr } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { clampScore } from '../scoring';

/**
 * Flèches : une rangée de flèches, il faut donner le sens de celle du milieu
 * (ou, selon la consigne, celui des voisines) sans se laisser distraire.
 *
 * Aux niveaux avancés, de nouvelles règles s'ajoutent :
 * - consigne en couleur : flèches bleues = celle du milieu, orange = les voisines ;
 * - flèches encadrées : on répond le sens INVERSE ;
 * - flèches barrées : on ne touche rien ;
 * - voisines qui bougent, flèches en colonne ou en carré autour du milieu.
 */

export type Dir = 'left' | 'right' | 'up' | 'down';
export const FLECHES_TRIALS = 30;

/** Disposition des voisines : en ligne, en colonne, ou en carré autour de celle du milieu (8 voisines). */
export type FlechesLayout = 'row' | 'column' | 'square';
export const FLECHES_LAYOUTS: readonly FlechesLayout[] = ['row', 'column', 'square'];

/** Ce qu'on fait du sens lu : le donner, donner l'inverse (flèches encadrées), ou ne rien toucher (barrées). */
export type FlechesKind = 'go' | 'reverse' | 'nogo';

export const OPPOSITE: Record<Dir, Dir> = { left: 'right', right: 'left', up: 'down', down: 'up' };

export interface FlechesLevel {
  dirs: 2 | 4;
  /** Flèches de chaque côté de celle du milieu (en ligne ou en colonne). */
  flankers: 2 | 3;
  /** Part des essais où les voisines pointent ailleurs. */
  incongruent: number;
  rule: 'center' | 'flank' | 'switch';
  /** Comment se donne la consigne changeante : un mot au-dessus, ou la couleur des flèches. */
  cue: 'text' | 'color';
  /** Part des essais à l'envers (flèches encadrées). */
  reverse: number;
  /** Part des essais où il ne faut rien toucher (flèches barrées). */
  nogo: number;
  /** Les voisines bougent. */
  motion: boolean;
  /** Disposition des flèches ; « mixed » : elle change à chaque essai. */
  layout: FlechesLayout | 'mixed';
  /** Rangée décalée au hasard. */
  jitter: boolean;
  /** Temps pour répondre. */
  windowMs: number;
}

type Twists = Partial<Pick<FlechesLevel, 'cue' | 'reverse' | 'nogo' | 'motion' | 'layout'>>;

const L = (
  dirs: 2 | 4,
  flankers: 2 | 3,
  incongruent: number,
  rule: FlechesLevel['rule'],
  windowMs: number,
  jitter = false,
  twists: Twists = {},
): FlechesLevel => ({
  dirs,
  flankers,
  incongruent,
  rule,
  cue: twists.cue ?? 'text',
  reverse: twists.reverse ?? 0,
  nogo: twists.nogo ?? 0,
  motion: twists.motion ?? false,
  layout: twists.layout ?? 'row',
  jitter,
  windowMs,
});

const COLOR = { cue: 'color' } as const;

/**
 * 1-20 : la règle de base, puis les voisines et la consigne écrite.
 * 21-30 (Expert) : la consigne passe par la COULEUR, les voisines bougent, la rangée devient colonne ou carré.
 * 31-40 (Maître) : flèches encadrées = sens INVERSE, dispositions qui changent.
 * 41-50 (Légende) : flèches barrées = NE RIEN TOUCHER, tout se mélange, le temps raccourcit.
 * Une règle nouvelle arrive avec un peu plus de temps, puis le temps se resserre.
 */
export const FLECHES_LEVELS: readonly FlechesLevel[] = [
  L(2, 2, 0.5, 'center', 2000),
  L(2, 2, 0.5, 'center', 1600),
  L(2, 3, 0.6, 'center', 1600),
  L(4, 2, 0.5, 'center', 2000),
  L(2, 2, 0.5, 'flank', 1800),
  L(2, 2, 0.5, 'center', 1500, true),
  L(4, 2, 0.6, 'center', 1600),
  L(2, 2, 0.5, 'switch', 2000),
  L(4, 3, 0.6, 'center', 1700),
  L(2, 3, 0.6, 'switch', 1700),
  L(4, 2, 0.5, 'flank', 1800),
  L(4, 2, 0.6, 'center', 1400, true),
  L(2, 2, 0.7, 'switch', 1500),
  L(4, 3, 0.6, 'switch', 2000),
  L(4, 3, 0.7, 'center', 1300, true),
  L(2, 3, 0.7, 'switch', 1400, true),
  L(4, 2, 0.7, 'switch', 1600),
  L(4, 3, 0.7, 'flank', 1500, true),
  L(4, 3, 0.7, 'switch', 1500, true),
  L(4, 3, 0.8, 'switch', 1200, true),
  // Expert : la couleur donne la consigne, les voisines bougent, colonnes et carrés.
  L(2, 2, 0.6, 'switch', 1500, false, COLOR),
  L(2, 3, 0.7, 'switch', 1350, true, COLOR),
  L(4, 2, 0.6, 'switch', 1700, false, COLOR),
  L(2, 3, 0.7, 'center', 1200, true, { motion: true }),
  L(4, 3, 0.7, 'switch', 1600, true, COLOR),
  L(4, 3, 0.7, 'flank', 1400, false, { layout: 'column' }),
  L(2, 3, 0.75, 'switch', 1250, true, { ...COLOR, motion: true }),
  L(4, 3, 0.75, 'center', 1150, false, { layout: 'square', motion: true }),
  L(4, 3, 0.75, 'switch', 1450, true, { ...COLOR, layout: 'column' }),
  L(4, 3, 0.8, 'switch', 1350, true, { ...COLOR, motion: true }),
  // Maître : flèches encadrées = sens inverse.
  L(2, 2, 0.6, 'center', 1500, false, { reverse: 0.3 }),
  L(2, 3, 0.7, 'center', 1350, true, { reverse: 0.35 }),
  L(4, 2, 0.6, 'center', 1700, false, { reverse: 0.3 }),
  L(2, 3, 0.7, 'flank', 1400, false, { reverse: 0.35, motion: true }),
  L(4, 3, 0.7, 'center', 1500, true, { reverse: 0.35, layout: 'mixed' }),
  L(2, 3, 0.75, 'switch', 1450, true, { ...COLOR, reverse: 0.3 }),
  L(4, 3, 0.75, 'flank', 1450, false, { reverse: 0.4, layout: 'mixed', motion: true }),
  L(4, 3, 0.75, 'switch', 1600, true, { ...COLOR, reverse: 0.3 }),
  L(4, 3, 0.8, 'switch', 1500, true, { ...COLOR, reverse: 0.35, motion: true }),
  L(4, 3, 0.8, 'switch', 1400, true, { ...COLOR, reverse: 0.4, layout: 'mixed' }),
  // Légende : flèches barrées = ne rien toucher, et tout ensemble.
  L(2, 3, 0.7, 'center', 1300, true, { nogo: 0.2 }),
  L(4, 3, 0.7, 'center', 1450, true, { nogo: 0.2, reverse: 0.25 }),
  L(2, 3, 0.75, 'switch', 1350, true, { ...COLOR, nogo: 0.2 }),
  L(4, 3, 0.75, 'flank', 1400, true, { nogo: 0.2, reverse: 0.3, motion: true }),
  L(4, 3, 0.75, 'switch', 1500, true, { ...COLOR, nogo: 0.2, layout: 'mixed' }),
  L(2, 3, 0.8, 'switch', 1250, true, { ...COLOR, reverse: 0.3, nogo: 0.2, motion: true }),
  L(4, 3, 0.8, 'switch', 1400, true, { ...COLOR, reverse: 0.3, nogo: 0.2 }),
  L(4, 3, 0.8, 'switch', 1300, true, { reverse: 0.3, nogo: 0.2, layout: 'mixed', motion: true }),
  L(4, 3, 0.85, 'switch', 1200, true, { ...COLOR, reverse: 0.35, nogo: 0.2, layout: 'mixed', motion: true }),
  L(4, 3, 0.85, 'switch', 1100, true, { ...COLOR, reverse: 0.35, nogo: 0.25, layout: 'mixed', motion: true }),
];

export function flechesLevel(level: number): FlechesLevel {
  return pickLevel(FLECHES_LEVELS, level);
}

/** Nombre de flèches affichées dans une disposition. */
export function flechesCount(layout: FlechesLayout, flankers: number): number {
  return layout === 'square' ? 9 : flankers * 2 + 1;
}

export function flechesLevelLabel(level: number): string {
  const c = flechesLevel(level);
  const rule = {
    center: tr('flèche du milieu', 'middle arrow'),
    flank: tr('flèches voisines', 'outer arrows'),
    switch: c.cue === 'color' ? tr('consigne en couleur', 'color-coded rule') : tr('consigne changeante', 'changing rule'),
  }[c.rule];
  const layout = {
    row: '',
    column: tr('en colonne', 'in a column'),
    square: tr('en carré', 'in a square'),
    mixed: tr('dispositions variées', 'mixed layouts'),
  }[c.layout];
  const arrows = c.layout === 'row' ? c.flankers * 2 + 1 : c.layout === 'mixed' ? `${c.flankers * 2 + 1}-9` : flechesCount(c.layout, c.flankers);
  const delay = secondsLabel(c.windowMs);
  return [
    rule,
    c.reverse > 0 && tr('sens inverse', 'reverse'),
    c.nogo > 0 && tr('flèches barrées', 'crossed-out arrows'),
    c.motion && tr('voisines mobiles', 'moving arrows'),
    layout,
    c.dirs === 4 ? '4 directions' : '2 directions',
    tr(`${arrows} flèches`, `${arrows} arrows`),
    tr(`${delay} pour répondre`, `${delay} to answer`),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** La règle du niveau, affichée à l'intro. */
export function flechesRule(level: number): string {
  const c = flechesLevel(level);
  const base =
    c.rule === 'flank'
      ? tr('Donne le sens des flèches voisines, pas de celle du milieu.', 'Give the direction of the outer arrows, not the middle one.')
      : c.rule === 'switch'
        ? c.cue === 'color'
          ? tr(
              'Flèches bleues : donne le sens de celle du milieu. Flèches orange : celui des voisines.',
              'Blue arrows: give the direction of the middle one. Orange arrows: the direction of the outer ones.',
            )
          : tr(
              'Selon la consigne, donne le sens de la flèche du milieu ou de ses voisines.',
              'Follow the prompt: give the direction of the middle arrow or of its neighbors.',
            )
        : tr(
            'Donne le sens de la flèche du milieu, sans te laisser distraire par ses voisines.',
            'Give the direction of the middle arrow, without letting its neighbors distract you.',
          );
  return [
    base,
    c.reverse > 0 && tr('Flèches encadrées : réponds le sens inverse.', 'Framed arrows: answer the opposite way.'),
    c.nogo > 0 && tr('Flèches barrées : ne touche rien.', 'Crossed-out arrows: don’t tap anything.'),
  ]
    .filter(Boolean)
    .join(' ');
}

export interface FlechesTrial {
  center: Dir;
  flank: Dir;
  /** Ce qu'il faut regarder : la flèche du milieu ou ses voisines. */
  ask: 'center' | 'flank';
  /** Décalage horizontal de la rangée, en %. */
  offset: number;
  /** Donner le sens, l'inverse, ou ne rien toucher. */
  kind: FlechesKind;
  layout: FlechesLayout;
}

/** Le sens de la flèche à regarder (celle du milieu ou les voisines, selon la consigne). */
export function flechesAnswer(trial: FlechesTrial): Dir {
  return trial.ask === 'center' ? trial.center : trial.flank;
}

/** La touche attendue : le sens lu, son inverse (flèches encadrées), ou aucune (flèches barrées). */
export function flechesResponse(trial: FlechesTrial): Dir | null {
  if (trial.kind === 'nogo') return null;
  const dir = flechesAnswer(trial);
  return trial.kind === 'reverse' ? OPPOSITE[dir] : dir;
}

/** Essais à l'envers et barrés, en nombre exact ; le premier essai est toujours normal. */
function spreadKinds(rng: Rng, c: FlechesLevel): FlechesKind[] {
  const nogo = Math.round(FLECHES_TRIALS * c.nogo);
  const reverse = Math.round(FLECHES_TRIALS * c.reverse);
  const kinds = rng.shuffle(
    Array.from({ length: FLECHES_TRIALS }, (_, i): FlechesKind => (i < nogo ? 'nogo' : i < nogo + reverse ? 'reverse' : 'go')),
  );
  const firstGo = kinds.indexOf('go');
  if (firstGo > 0) [kinds[0], kinds[firstGo]] = [kinds[firstGo], kinds[0]];
  return kinds;
}

export function generateFleches(rng: Rng, level: number): FlechesTrial[] {
  const c = flechesLevel(level);
  const dirs: Dir[] = c.dirs === 2 ? ['left', 'right'] : ['left', 'right', 'up', 'down'];
  const incongruentCount = Math.round(FLECHES_TRIALS * c.incongruent);
  const flags = rng.shuffle(Array.from({ length: FLECHES_TRIALS }, (_, i) => i < incongruentCount));
  // Tirés après les essais de base, et seulement s'ils servent : les parties des niveaux 1 à 20 ne changent pas.
  const kinds = c.reverse > 0 || c.nogo > 0 ? spreadKinds(rng, c) : null;
  return flags.map((incongruent, i) => {
    const center = rng.pick(dirs);
    const flank = incongruent ? rng.pick(dirs.filter((d) => d !== center)) : center;
    const ask = c.rule === 'switch' ? (rng.chance(0.5) ? 'center' : 'flank') : c.rule;
    const offset = c.jitter ? rng.int(-18, 18) : 0;
    const layout = c.layout === 'mixed' ? rng.pick(FLECHES_LAYOUTS) : c.layout;
    return { center, flank, ask, offset, kind: kinds?.[i] ?? 'go', layout };
  });
}

/**
 * Justesse (au-delà du hasard) pour 65 %, rapidité des bonnes réponses pour 35 %.
 * Se retenir sur une flèche barrée compte juste ; ne jamais rien toucher ne rapporte rien pour autant.
 */
export function scoreFleches(correct: number, meanRtMs: number | null, level: number): number {
  const c = flechesLevel(level);
  const chance = Math.max(1 / c.dirs, Math.round(FLECHES_TRIALS * c.nogo) / FLECHES_TRIALS);
  const useful = Math.max(0, (correct / FLECHES_TRIALS - chance) / (1 - chance));
  const speed = meanRtMs === null ? 0 : Math.min(1, Math.max(0, (c.windowMs - meanRtMs) / (c.windowMs - 350)));
  return clampScore(100 * (0.65 * useful + 0.35 * speed * useful));
}
