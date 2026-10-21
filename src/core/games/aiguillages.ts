import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * Aiguillages : des trains de couleur sortent d'un tunnel et descendent un réseau en arbre ; chaque
 * aiguillage les envoie à gauche ou à droite. On touche les aiguillages pour que chaque train arrive
 * à la gare de sa couleur. Un train prend la direction de l'aiguillage au moment où il l'atteint.
 * La partie compte un nombre fixe de trains : environ 45 secondes.
 * Les paliers changent la façon de jouer : quatre gares et trois aiguillages (Confirmé), plusieurs
 * trains à la fois sur le réseau (Expert), huit gares (Maître), des trains express deux fois plus
 * rapides (Légende).
 */

/** Filet de sécurité : la partie s'arrête au plus tard au bout d'une minute. */
export const AIGUILLAGES_MAX_MS = 60_000;
/** Un train express parcourt un tronçon en un peu plus de la moitié du temps. */
export const EXPRESS_FACTOR = 0.55;

export interface AiguillagesLevel {
  /** Profondeur de l'arbre : 1 (2 gares), 2 (4 gares) ou 3 (8 gares). */
  depth: 1 | 2 | 3;
  trains: number;
  /** Temps pour parcourir un tronçon (du tunnel au premier aiguillage, d'un aiguillage au suivant…). */
  rowMs: number;
  /** Intervalle entre deux départs. */
  spawnMs: number;
  /** Part des trains express (Légende). */
  express: number;
  /** Trains à bon port pour 100 pts. */
  target: number;
}

/** Interpolation d'un palier : de `a` (1er niveau) à `b` (10e). */
const step = (i: number, a: number, b: number) => Math.round(a + ((b - a) * i) / 9);

function lvl(depth: 1 | 2 | 3, trains: number, rowMs: number, spawnMs: number, express: number, share: number): AiguillagesLevel {
  return { depth, trains, rowMs, spawnMs, express, target: Math.round(trains * share) };
}

export const AIGUILLAGES_LEVELS: readonly AiguillagesLevel[] = [
  // Débutant : deux gares, un train après l'autre.
  ...Array.from({ length: 10 }, (_, i) => lvl(1, step(i, 9, 12), step(i, 1500, 1150), step(i, 3500, 2600), 0, 0.9)),
  // Confirmé : quatre gares, trois aiguillages.
  ...Array.from({ length: 10 }, (_, i) => lvl(2, step(i, 10, 12), step(i, 1250, 1050), step(i, 4100, 3300), 0, 0.9)),
  // Expert : plusieurs trains à la fois sur le réseau.
  ...Array.from({ length: 10 }, (_, i) => lvl(2, step(i, 14, 20), step(i, 1100, 950), step(i, 2300, 1550), 0, 0.85)),
  // Maître : huit gares, sept aiguillages.
  ...Array.from({ length: 10 }, (_, i) => lvl(3, step(i, 14, 18), step(i, 1050, 900), step(i, 2500, 1900), 0, 0.85)),
  // Légende : des trains express, deux fois plus rapides.
  ...Array.from({ length: 10 }, (_, i) => lvl(3, step(i, 16, 20), step(i, 950, 850), step(i, 2200, 1700), step(i, 20, 35) / 100, 0.8)),
];

export function aiguillagesLevel(level: number): AiguillagesLevel {
  return pickLevel(AIGUILLAGES_LEVELS, level);
}

export const stationCount = (c: Pick<AiguillagesLevel, 'depth'>) => 2 ** c.depth;
export const switchCount = (c: Pick<AiguillagesLevel, 'depth'>) => 2 ** c.depth - 1;

/** Plusieurs trains à la fois : un départ avant que le précédent soit arrivé. */
export const overlaps = (c: AiguillagesLevel) => c.spawnMs < (c.depth + 1) * c.rowMs;

/** Durée d'une partie : le dernier départ, puis son trajet. */
export const gameMs = (c: AiguillagesLevel) => (c.trains - 1) * c.spawnMs + (c.depth + 1) * c.rowMs;

export function aiguillagesLevelLabel(level: number): string {
  const c = aiguillagesLevel(level);
  return [
    tr(`${stationCount(c)} gares`, `${stationCount(c)} stations`),
    tr(`${c.trains} trains`, `${c.trains} trains`),
    c.express ? tr('trains express', 'express trains') : overlaps(c) ? tr('plusieurs à la fois', 'several at once') : tr('un à la fois', 'one at a time'),
  ].join(' · ');
}

/** La règle affichée à l'intro. */
export function aiguillagesRule(level: number): string {
  const c = aiguillagesLevel(level);
  const parts = [
    tr(
      'Touche les aiguillages pour envoyer chaque train à la gare de sa couleur. Un train suit l’aiguillage tel qu’il est quand il y arrive.',
      'Tap the switches to send each train to the station of its color. A train follows the switch as it is when the train gets there.',
    ),
    overlaps(c) && !c.express && tr('Plusieurs trains roulent en même temps.', 'Several trains run at the same time.'),
    c.express ? tr('Les trains express (cerclés de pointillés) vont deux fois plus vite.', 'Express trains (with a dotted ring) go twice as fast.') : null,
    tr(`${c.trains} trains, environ 45 secondes.`, `${c.trains} trains, about 45 seconds.`),
  ];
  return parts.filter(Boolean).join(' ');
}

export interface Train {
  /** Couleur : celle d'une des gares. */
  color: number;
  /** Départ du tunnel, depuis le début de la partie. */
  at: number;
  express: boolean;
}

export interface AiguillagesGame {
  /** Couleur de chaque gare, de gauche à droite. */
  stations: number[];
  trains: Train[];
  /** Position de départ de chaque aiguillage (0 : à gauche, 1 : à droite). */
  switches: number[];
}

export function generateAiguillages(rng: Rng, level: number): AiguillagesGame {
  const c = aiguillagesLevel(level);
  const count = stationCount(c);
  const stations = rng.shuffle(Array.from({ length: 8 }, (_, i) => i)).slice(0, count);
  const trains: Train[] = [];
  for (let k = 0; k < c.trains; k++) {
    let color = rng.pick(stations);
    // Jamais trois trains de suite vers la même gare.
    if (k >= 2 && trains[k - 1].color === color && trains[k - 2].color === color) color = rng.pick(stations.filter((s) => s !== color));
    trains.push({ color, at: k * c.spawnMs, express: k > 0 && rng.chance(c.express) });
  }
  return { stations, trains, switches: Array.from({ length: switchCount(c) }, () => rng.int(0, 1)) };
}

/**
 * Le réseau, en tas : l'aiguillage `n` mène à `2n + 1` (gauche) et `2n + 2` (droite) ; au-delà des
 * aiguillages, les nœuds sont les gares, de gauche à droite.
 */
export const childOf = (node: number, side: number) => 2 * node + 1 + side;
export const isStation = (c: Pick<AiguillagesLevel, 'depth'>, node: number) => node >= switchCount(c);
export const stationIndex = (c: Pick<AiguillagesLevel, 'depth'>, node: number) => node - switchCount(c);

/** La gare où arrive un train lancé maintenant, aiguillages inchangés. */
export function destination(c: Pick<AiguillagesLevel, 'depth'>, switches: readonly number[]): number {
  let node = 0;
  while (!isStation(c, node)) node = childOf(node, switches[node]);
  return stationIndex(c, node);
}

/** Trains à bon port rapportés à l'objectif du niveau. */
export function scoreAiguillages(arrived: number, level: number): number {
  return countScore(arrived, 0, aiguillagesLevel(level).target);
}
