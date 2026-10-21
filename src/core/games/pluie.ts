import { tr } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import { createRng, type Rng } from '../rng';
import { countScore } from '../scoring';
import { formatCalc, generateFromKinds, makeCalcQuestion, type CalcKind, type CalcQuestion } from './calcul';

/**
 * Pluie de calculs : des gouttes tombent, chacune porte un calcul. On tape le résultat avant
 * qu'elles touchent l'eau. Trois gouttes perdues et c'est fini.
 */

export const PLUIE_DURATION_MS = 45_000;
export const PLUIE_LIVES = 3;

export interface PluieLevel {
  kinds: CalcKind[];
  /** Temps de chute d'une goutte, du ciel à l'eau. */
  fallMs: number;
  /** Une nouvelle goutte toutes les… */
  spawnMs: number;
  lanes: 3 | 4;
  /** Averses (niveaux 21 et plus) : les gouttes arrivent par deux, au même rythme moyen. */
  storm?: boolean;
  /** Part des gouttes piégées (à éclair) : y répondre coûte une vie, les laisser tomber ne coûte rien. */
  traps?: number;
  /** Brouillard : le calcul ne reste lisible que sur cette part de la chute (la goutte, elle, reste visible). */
  fog?: number;
}

interface PluieTwists {
  storm?: boolean;
  traps?: number;
  fog?: number;
}

const L = (kinds: CalcKind[], fallMs: number, spawnMs: number, lanes: 3 | 4 = 4): PluieLevel => ({ kinds, fallMs, spawnMs, lanes });
/** Niveaux 21 et plus : des calculs plus durs, puis les averses, les gouttes piégées et le brouillard. */
const X = (kinds: CalcKind[], fallMs: number, spawnMs: number, lanes: 3 | 4, twists: PluieTwists = {}): PluieLevel => ({
  kinds,
  fallMs,
  spawnMs,
  lanes,
  ...twists,
});

/** Écart entre les deux gouttes d'une averse. */
export const PLUIE_STORM_GAP_MS = 300;

export const PLUIE_LEVELS: readonly PluieLevel[] = [
  L(['add1', 'sub1'], 9000, 3200, 3),
  L(['add1', 'sub1', 'mul1'], 8500, 3000, 3),
  L(['add1', 'sub1', 'mul1'], 7500, 2700, 3),
  L(['add2', 'sub2'], 8500, 3200, 3),
  L(['mul1'], 7000, 2500, 3),
  L(['add2', 'sub2', 'mul1'], 7500, 2700),
  L(['mul12'], 7500, 2800),
  L(['add1', 'sub1', 'mul1'], 6000, 2100),
  L(['mul12', 'div12'], 7500, 2800),
  L(['add100', 'sub100'], 7500, 2700),
  L(['add2', 'sub2', 'mul12'], 6500, 2400),
  L(['mulTeen', 'divTwo'], 7500, 2800),
  L(['mul12', 'div12', 'add100'], 6000, 2200),
  L(['add1', 'sub1', 'mul1'], 4800, 1700),
  L(['add3', 'sub3'], 7500, 2800),
  L(['mul12', 'div12'], 5500, 2000),
  L(['chainAddSub', 'mul12'], 6500, 2500),
  L(['mulTeen', 'divTwo', 'add100'], 5500, 2100),
  L(['mul12', 'div12', 'add2', 'sub2'], 4800, 1800),
  L(['square', 'mul2x1', 'div3'], 6500, 2400),
  // Expert : centaines, grands facteurs, et les averses (deux gouttes à la fois).
  X(['mul2x1', 'div3', 'add3', 'sub3'], 6000, 2400, 3),
  X(['add1', 'sub1', 'mul1'], 4200, 1300, 4, { storm: true }),
  X(['mul12', 'div12', 'mulTeen', 'divTwo'], 4500, 1700, 4),
  X(['square', 'mul2x1', 'div3'], 6000, 2400, 3, { storm: true }),
  X(['mulBig1', 'div4'], 7000, 2900, 3),
  X(['add100', 'sub100', 'mul12', 'div12'], 4200, 1500, 4, { storm: true }),
  X(['add3', 'sub3', 'square'], 5500, 2200, 3),
  X(['mulTeen', 'divTwo', 'add100', 'sub100'], 4500, 1800, 4, { storm: true }),
  X(['mulBig1', 'div4', 'mul2x2'], 6800, 3000, 3, { storm: true }),
  X(['mul2x1', 'div3', 'square', 'mul2x2', 'add3'], 5800, 2500, 3, { storm: true }),
  // Maître : les gouttes piégées (à laisser tomber), puis le brouillard qui efface les calculs.
  X(['add2', 'sub2', 'mul12', 'div12'], 4200, 1400, 4, { traps: 0.2 }),
  X(['mul2x1', 'div3', 'add3'], 5500, 2100, 3, { traps: 0.2 }),
  X(['mul12', 'div12', 'mulTeen'], 4000, 1400, 4, { storm: true, traps: 0.2 }),
  X(['add1', 'sub1', 'mul1', 'add2', 'sub2'], 4500, 1500, 4, { fog: 0.45 }),
  X(['mulTeen', 'divTwo', 'add100', 'sub100'], 5000, 1900, 4, { fog: 0.45 }),
  X(['mulBig1', 'div4', 'square'], 6500, 2400, 3, { traps: 0.2 }),
  X(['add3', 'sub3', 'mul12', 'div12'], 5000, 1900, 3, { storm: true, fog: 0.5 }),
  X(['mul2x2', 'div3', 'square'], 6200, 2400, 3, { traps: 0.2, fog: 0.5 }),
  X(['mul12', 'div12', 'add2', 'sub2'], 3800, 1300, 4, { storm: true, traps: 0.2 }),
  X(['mulBig1', 'mul2x1', 'div4', 'square'], 6000, 2300, 3, { storm: true, traps: 0.2, fog: 0.5 }),
  // Légende : centaines × un chiffre, deux chiffres × deux chiffres, et tous les pièges ensemble.
  X(['mul3x1', 'div5'], 8000, 3600, 3),
  X(['squareMid', 'mul2x2'], 7000, 2800, 3, { traps: 0.2 }),
  X(['mul12', 'div12', 'mulBig1'], 4500, 1800, 4, { storm: true, fog: 0.4 }),
  X(['mul2x2b', 'div2d'], 9000, 4200, 3, { storm: true }),
  X(['mulBig1', 'div4', 'add3', 'sub3'], 5500, 2000, 3, { traps: 0.25, fog: 0.45 }),
  X(['squareMid', 'mul3x1', 'div5'], 7500, 3000, 3, { storm: true, traps: 0.2 }),
  X(['mul2x1', 'div3', 'mulTeen', 'square'], 5000, 2200, 4, { storm: true, fog: 0.4 }),
  X(['mul2x2b', 'squareMid', 'div2d'], 8000, 3200, 3, { traps: 0.25, fog: 0.45 }),
  X(['mul3x1', 'div5', 'mulBig1', 'div4'], 6500, 2600, 3, { storm: true, traps: 0.25, fog: 0.4 }),
  X(['mul2x2b', 'squareMid', 'mul3x1', 'div2d', 'div5'], 7000, 3000, 3, { storm: true, traps: 0.25, fog: 0.4 }),
];

export function pluieLevel(level: number): PluieLevel {
  return pickLevel(PLUIE_LEVELS, level);
}

/** Nombre de gouttes d'une partie. */
export function pluieCount(level: number): number {
  return Math.floor(PLUIE_DURATION_MS / pluieLevel(level).spawnMs);
}

/** Nombre exact de gouttes piégées d'une partie (0 sans pièges). */
export function pluieTrapCount(level: number): number {
  return Math.round(pluieCount(level) * (pluieLevel(level).traps ?? 0));
}

/** Gouttes résolues pour 100 pts : 80 % de celles qui tombent pendant la partie (sans compter les pièges). */
export function pluieTarget(level: number): number {
  const traps = pluieTrapCount(level);
  if (traps > 0) return Math.round((pluieCount(level) - traps) * 0.8);
  return Math.round((PLUIE_DURATION_MS / pluieLevel(level).spawnMs) * 0.8);
}

export function pluieLevelLabel(level: number): string {
  const c = pluieLevel(level);
  const fall = secondsLabel(c.fallMs);
  const spawn = secondsLabel(c.spawnMs);
  // Un exemple de calcul : sans lui, un niveau aux calculs plus durs mais plus lents aurait l'air plus facile.
  const example = formatCalc(makeCalcQuestion(createRng(level), c.kinds[0]));
  return [
    tr(`Chute en ${fall} · une goutte toutes les ${spawn}`, `Falls in ${fall} · a new drop every ${spawn}`),
    c.storm && tr('averses', 'downpours'),
    c.traps && tr('gouttes piégées', 'trap drops'),
    c.fog && tr('brouillard', 'fog'),
    tr(`ex. ${example}`, `e.g. ${example}`),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** La règle affichée à l'intro : chaque rebondissement du niveau y ajoute sa phrase. */
export function pluieRule(level: number): string {
  const c = pluieLevel(level);
  return [
    tr(
      'Tape le résultat de chaque goutte avant qu’elle ne tombe à l’eau. Trois gouttes perdues et c’est fini !',
      'Type the answer to each drop before it hits the water. Lose three drops and it’s over!',
    ),
    c.storm && tr('Gare aux averses : les gouttes tombent par deux.', 'Watch out for downpours: drops fall in pairs.'),
    c.traps && tr('Les gouttes à éclair sont piégées : n’y réponds pas, laisse-les tomber.', 'Lightning drops are traps: don’t answer them, let them fall.'),
    c.fog && tr('Dans le brouillard, les calculs s’effacent en tombant : lis-les vite.', 'In the fog, sums fade as they fall: read them fast.'),
  ]
    .filter(Boolean)
    .join(' ');
}

export interface PluieDrop {
  id: number;
  question: CalcQuestion;
  lane: number;
  /** Moment d'apparition, en ms depuis le début. */
  spawnAt: number;
  /** Goutte piégée (à éclair) : y répondre coûte une vie, la laisser tomber ne coûte rien. */
  trap?: true;
}

/** Toute la pluie d'une partie, prévue à l'avance : rejouable à l'identique. */
export function generatePluie(rng: Rng, level: number): PluieDrop[] {
  const c = pluieLevel(level);
  const count = pluieCount(level);
  const questions = generateFromKinds(rng, c.kinds, count);
  let previousLane = -1;
  const drops: PluieDrop[] = questions.map((question, id) => {
    const lanes = Array.from({ length: c.lanes }, (_, i) => i).filter((l) => l !== previousLane);
    const lane = rng.pick(lanes);
    previousLane = lane;
    // Averse : deux gouttes presque ensemble, puis un silence ; le rythme moyen ne change pas.
    const spawnAt = c.storm ? 600 + Math.floor(id / 2) * 2 * c.spawnMs + (id % 2) * PLUIE_STORM_GAP_MS : 600 + id * c.spawnMs;
    return { id, question, lane, spawnAt };
  });
  // Pièges : un nombre fixe de gouttes, jamais les deux premières (le temps de comprendre).
  const traps = pluieTrapCount(level);
  if (traps > 0) {
    const ids = rng.shuffle(drops.slice(2).map((d) => d.id)).slice(0, traps);
    for (const id of ids) drops[id].trap = true;
  }
  return drops;
}

export function scorePluie(solved: number, level: number): number {
  return countScore(solved, 0, pluieTarget(level));
}
