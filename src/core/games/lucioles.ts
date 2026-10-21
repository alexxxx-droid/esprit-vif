import { tr } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { clampScore } from '../scoring';

/**
 * Lucioles : une grille de cases dans la nuit ; des lucioles s'allument un court instant, on les
 * touche avant qu'elles s'éteignent. La partie dure 40 s et se joue par vagues : une ou deux lucioles,
 * puis une courte pause. Une vague se termine dès que ses lucioles à attraper sont prises (ou
 * éteintes) : on ne fait jamais attendre un joueur rapide.
 * Les paliers changent la façon de jouer : deux lucioles à la fois (Confirmé), des lucioles rouges
 * à ne pas toucher (Expert), des lucioles voyageuses qui changent de case à mi-chemin (Maître), des
 * lucioles dorées qui demandent deux appuis sur une grille de 5 × 5 (Légende).
 */

export const LUCIOLES_DURATION_MS = 40_000;

/** Temps de réaction d'un joueur très rapide : il sert à fixer l'objectif des 100 points. */
const FAST_RT_MS = 380;
/** Temps de plus pour une seconde luciole dans la même vague, ou pour le second appui d'une dorée. */
const EXTRA_TAP_MS = 220;
/** Une voyageuse se suit des yeux : un peu plus long. */
const HOP_COST_MS = 80;

export interface LuciolesLevel {
  /** Côté de la grille (3, 4 ou 5). */
  size: number;
  /** Durée d'allumage d'une luciole. */
  windowMs: number;
  /** Pause entre deux vagues : [min, max]. */
  gapMs: readonly [number, number];
  /** Part des vagues à deux lucioles. */
  pairs: number;
  /** Part des lucioles rouges, à ne pas toucher. */
  reds: number;
  /** Part des lucioles voyageuses (elles sautent dans une case voisine à mi-fenêtre). */
  hops: number;
  /** Part des lucioles dorées, à toucher deux fois. */
  golds: number;
  /** Lucioles attrapées (moins ratées ÷ 2 et mauvais appuis) en une partie pour 100 pts. */
  target: number;
}

type Twists = Omit<LuciolesLevel, 'target'>;

/** Probabilité de chaque nombre de lucioles « à attraper » dans une vague, et temps de vague attendu (joueur rapide). */
function expectedPace(c: Twists): { hits: number; waveMs: number } {
  const gap = (c.gapMs[0] + c.gapMs[1]) / 2;
  let hits = 0;
  let waveMs = 0;
  for (const [count, p] of [
    [1, 1 - c.pairs],
    [2, c.pairs],
  ] as const) {
    if (!p) continue;
    // Chaque luciole est rouge avec la probabilité `reds` ; les autres sont à attraper.
    for (let go = 0; go <= count; go++) {
      const ways = count === 2 && go === 1 ? 2 : 1;
      const q = p * ways * c.reds ** (count - go) * (1 - c.reds) ** go;
      if (!q) continue;
      // Une vague sans luciole à attraper dure toute la fenêtre : il faut la laisser s'éteindre.
      const resolve = go === 0 ? c.windowMs : FAST_RT_MS + (go - 1) * EXTRA_TAP_MS + go * (c.golds * EXTRA_TAP_MS + c.hops * HOP_COST_MS);
      hits += q * go;
      waveMs += q * (gap + resolve);
    }
  }
  return { hits, waveMs };
}

function lvl(size: number, windowMs: number, gapMs: readonly [number, number], pairs = 0, reds = 0, hops = 0, golds = 0): LuciolesLevel {
  const twists: Twists = { size, windowMs, gapMs, pairs, reds, hops, golds };
  const { hits, waveMs } = expectedPace(twists);
  // 100 points pour 95 % de ce qu'attrape un joueur très rapide qui ne rate rien.
  return { ...twists, target: Math.round(0.95 * (LUCIOLES_DURATION_MS / waveMs) * hits) };
}

/** Interpolation d'un palier : de `a` (1er niveau) à `b` (10e). */
const step = (i: number, a: number, b: number) => Math.round(a + ((b - a) * i) / 9);

export const LUCIOLES_LEVELS: readonly LuciolesLevel[] = [
  // Débutant : une luciole à la fois ; la grille grandit au niveau 6, la fenêtre raccourcit.
  ...Array.from({ length: 10 }, (_, i) => lvl(i < 5 ? 3 : 4, step(i, 1300, 850), [step(i, 650, 500), step(i, 850, 700)])),
  // Confirmé : parfois deux lucioles à la fois.
  ...Array.from({ length: 10 }, (_, i) => lvl(4, step(i, 850, 650), [450, 650], step(i, 15, 40) / 100)),
  // Expert : une luciole sur quatre est rouge, il ne faut pas la toucher.
  ...Array.from({ length: 10 }, (_, i) => lvl(4, step(i, 720, 600), [420, 620], 0.3, 0.25)),
  // Maître : des voyageuses, qui sautent dans une case voisine à mi-fenêtre.
  ...Array.from({ length: 10 }, (_, i) => lvl(4, step(i, 680, 560), [400, 600], 0.3, 0.25, step(i, 30, 45) / 100)),
  // Légende : grille de 5 × 5, des dorées à toucher deux fois, avec les rouges et les voyageuses.
  ...Array.from({ length: 10 }, (_, i) => lvl(5, step(i, 640, 500), [380, 580], 0.35, 0.25, 0.35, step(i, 20, 30) / 100)),
];

export function luciolesLevel(level: number): LuciolesLevel {
  return pickLevel(LUCIOLES_LEVELS, level);
}

export function luciolesLevelLabel(level: number): string {
  const c = luciolesLevel(level);
  return [
    `${c.size} × ${c.size}`,
    c.pairs && !c.reds && tr('parfois deux à la fois', 'sometimes two at once'),
    c.reds && tr('rouges à éviter', 'avoid the red ones'),
    c.hops && tr('voyageuses', 'travelers'),
    c.golds && tr('dorées : deux appuis', 'gold: tap twice'),
    tr(`${secondsLabel(c.windowMs)} d’allumage`, `lit for ${secondsLabel(c.windowMs)}`),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** La règle affichée à l'intro. */
export function luciolesRule(level: number): string {
  const c = luciolesLevel(level);
  const parts = [
    tr('Touche chaque luciole avant qu’elle s’éteigne. Toucher une case vide compte comme une erreur.', 'Tap each firefly before it goes out. Tapping an empty square counts as a mistake.'),
    c.pairs && !c.reds && tr('Parfois, deux s’allument en même temps.', 'Sometimes two light up at once.'),
    c.reds && tr('Les rouges (marquées d’une croix) ne se touchent pas : laisse-les s’éteindre.', 'Red ones (marked with a cross) must not be tapped: let them go out.'),
    c.hops && tr('Certaines voyagent : elles sautent dans une case voisine en cours de route.', 'Some travel: they hop to a nearby square along the way.'),
    c.golds && tr('Les dorées (marquées « 2 ») demandent deux appuis.', 'Gold ones (marked “2”) need two taps.'),
  ];
  return parts.filter(Boolean).join(' ');
}

export type LucioleKind = 'normal' | 'red' | 'gold';

export interface Luciole {
  kind: LucioleKind;
  /** Case de départ (index ligne par ligne). */
  cell: number;
  /** Case d'arrivée d'une voyageuse (elle y saute à mi-fenêtre). */
  hopTo?: number;
}

export interface LuciolesWave {
  lucioles: Luciole[];
  /** Pause avant la vague. */
  gapMs: number;
}

/** Les cases voisines d'une case (diagonales comprises). */
export function neighbours(cell: number, size: number): number[] {
  const row = Math.floor(cell / size);
  const col = cell % size;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = row + dr;
      const c = col + dc;
      if ((dr || dc) && r >= 0 && r < size && c >= 0 && c < size) out.push(r * size + c);
    }
  }
  return out;
}

/** Assez de vagues pour une partie entière, même très rapide (une vague prend au moins la pause). */
export const LUCIOLES_WAVES = 200;

/**
 * Les vagues d'une partie. Dans une vague, deux lucioles n'occupent jamais la même case, ni au départ
 * ni à l'arrivée d'un saut ; une vague à deux lucioles en garde toujours au moins une à attraper.
 */
export function generateLucioles(rng: Rng, level: number, count = LUCIOLES_WAVES): LuciolesWave[] {
  const c = luciolesLevel(level);
  const cells = c.size * c.size;
  const waves: LuciolesWave[] = [];
  let previous: number[] = [];
  for (let w = 0; w < count; w++) {
    const n = rng.chance(c.pairs) ? 2 : 1;
    const used = new Set<number>();
    const lucioles: Luciole[] = [];
    for (let k = 0; k < n; k++) {
      // Pas deux fois de suite la même case : un appui en retard ne doit pas tomber sur la suivante par hasard.
      const free = Array.from({ length: cells }, (_, i) => i).filter((i) => !used.has(i) && !previous.includes(i));
      const cell = rng.pick(free.length ? free : Array.from({ length: cells }, (_, i) => i).filter((i) => !used.has(i)));
      used.add(cell);
      let kind: LucioleKind = rng.chance(c.reds) ? 'red' : rng.chance(c.golds) ? 'gold' : 'normal';
      // Deux rouges dans la même vague : on garde une luciole à attraper.
      if (k === 1 && kind === 'red' && lucioles[0].kind === 'red') kind = 'normal';
      const luciole: Luciole = { kind, cell };
      if (c.hops && rng.chance(c.hops)) {
        const targets = neighbours(cell, c.size).filter((i) => !used.has(i));
        if (targets.length) {
          luciole.hopTo = rng.pick(targets);
          used.add(luciole.hopTo);
        }
      }
      lucioles.push(luciole);
    }
    previous = lucioles.flatMap((l) => (l.hopTo === undefined ? [l.cell] : [l.cell, l.hopTo]));
    waves.push({ lucioles, gapMs: rng.int(c.gapMs[0], c.gapMs[1]) });
  }
  return waves;
}

/** Une luciole à attraper (les rouges se laissent s'éteindre). */
export const isCatchable = (l: Luciole) => l.kind !== 'red';

/**
 * Attrapées, moins la moitié des ratées et les mauvais appuis (case vide, luciole rouge), rapporté à
 * l'objectif du niveau. Toucher au hasard ou ne rien faire rapporte 0.
 */
export function scoreLucioles(caught: number, missed: number, wrongTaps: number, level: number): number {
  const net = caught - 0.5 * missed - wrongTaps;
  return clampScore((100 * net) / luciolesLevel(level).target);
}
