import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { clampScore } from '../scoring';
import { fillWord, SHAPE_NAMES, type ShapeCard, type ShapeKind } from './shapes';

/**
 * Réflexe : des formes apparaissent une à une ; on touche vite les bonnes, on se retient sur les autres.
 * La règle peut s'inverser (« tout sauf… ») ou changer en cours de partie.
 */

export const REFLEXE_TRIALS = 30;

export interface ReflexeRule {
  /** Formes à toucher. */
  go: ShapeKind[];
  /** Le remplissage compte : seules les formes pleines sont à toucher. */
  filledOnly: boolean;
  /** Règle inversée : toucher tout SAUF les formes listées. */
  inverted: boolean;
}

export interface ReflexeLevel {
  rules: ReflexeRule[];
  /** Formes qui peuvent apparaître. */
  pool: ShapeKind[];
  /** Part des formes à ne pas toucher. */
  noGo: number;
  windowMs: number;
}

const R = (go: ShapeKind[], filledOnly = false, inverted = false): ReflexeRule => ({ go, filledOnly, inverted });
const L = (rules: ReflexeRule[], pool: ShapeKind[], noGo: number, windowMs: number): ReflexeLevel => ({ rules, pool, noGo, windowMs });

const BASIC: ShapeKind[] = ['circle', 'square', 'triangle'];
const MORE: ShapeKind[] = ['circle', 'square', 'triangle', 'star', 'diamond'];
const CLOSE: ShapeKind[] = ['circle', 'octagon', 'hexagon'];

export const REFLEXE_LEVELS: readonly ReflexeLevel[] = [
  L([R(['circle'])], ['circle', 'square'], 0.25, 1100),
  L([R(['circle'])], BASIC, 0.3, 1000),
  L([R(['circle'])], BASIC, 0.3, 900),
  L([R(['circle'], true)], BASIC, 0.3, 1000),
  L([R(['star'])], ['star', 'cross', 'hexagon', 'diamond'], 0.3, 950),
  L([R(['circle'], false, true)], BASIC, 0.35, 1000),
  L([R(['circle'])], MORE, 0.4, 800),
  L([R(['circle']), R(['square'])], BASIC, 0.35, 1000),
  L([R(['circle', 'star'])], MORE, 0.35, 850),
  L([R(['circle'], true)], MORE, 0.35, 800),
  L([R(['star'], false, true)], MORE, 0.4, 800),
  L([R(['circle']), R(['triangle']), R(['square'])], BASIC, 0.35, 900),
  L([R(['circle'])], CLOSE, 0.35, 900),
  L([R(['square', 'diamond'])], MORE, 0.35, 750),
  L([R(['circle'], true), R(['square'], true)], MORE, 0.35, 850),
  L([R(['triangle'])], MORE, 0.4, 700),
  L([R(['circle'], true)], CLOSE, 0.4, 700),
  L([R(['circle'], false, true), R(['square'])], MORE, 0.4, 800),
  L([R(['star'])], ['star', 'cross', 'hexagon', 'diamond', 'pentagon'], 0.45, 650),
  L([R(['circle'], true), R(['octagon'], true, false)], [...CLOSE, 'square'], 0.45, 600),
];

export function reflexeLevel(level: number): ReflexeLevel {
  return pickLevel(REFLEXE_LEVELS, level);
}

/** Règle en mots : « Touche les ronds pleins », « Touche tout sauf les étoiles ». */
export function describeRule(rule: ReflexeRule): string {
  const names = rule.go.map((s) => `${SHAPE_NAMES[s]}s${rule.filledOnly ? ` ${fillWord(s, true, true)}` : ''}`.replace('croixs', 'croix'));
  const list = names.length > 1 ? `${names.slice(0, -1).join(', les ')} et les ${names.at(-1)}` : names[0];
  return rule.inverted ? `Touche tout, sauf les ${list}` : `Touche les ${list}`;
}

export function reflexeLevelLabel(level: number): string {
  const c = reflexeLevel(level);
  return [c.rules.length > 1 ? `${c.rules.length} règles successives` : describeRule(c.rules[0]), `${secondsLabel(c.windowMs)} pour réagir`].join(' · ');
}

export function isGo(card: ShapeCard, rule: ReflexeRule): boolean {
  const matches = rule.go.includes(card.shape) && (!rule.filledOnly || card.filled);
  return rule.inverted ? !matches : matches;
}

export interface ReflexeTrial {
  card: ShapeCard;
  ruleIndex: number;
  go: boolean;
  /** Pause avant la forme. */
  gapMs: number;
}

export function generateReflexe(rng: Rng, level: number): ReflexeTrial[] {
  const c = reflexeLevel(level);
  const usesFill = c.rules.some((r) => r.filledOnly);
  const noGoCount = Math.round(REFLEXE_TRIALS * c.noGo);
  const goFlags = rng.shuffle(Array.from({ length: REFLEXE_TRIALS }, (_, i) => i >= noGoCount));
  return goFlags.map((wantGo, i) => {
    const ruleIndex = Math.min(c.rules.length - 1, Math.floor((i * c.rules.length) / REFLEXE_TRIALS));
    const rule = c.rules[ruleIndex];
    const candidates: ShapeCard[] = [];
    for (const shape of c.pool) {
      for (const filled of usesFill ? [true, false] : [true]) candidates.push({ shape, filled, rotation: 0 });
    }
    const matching = candidates.filter((card) => isGo(card, rule) === wantGo);
    const card = rng.pick(matching.length ? matching : candidates);
    return { card, ruleIndex, go: isGo(card, rule), gapMs: rng.int(450, 900) };
  });
}

/** Justesse (bonnes réponses et bonnes abstentions) pour 60 %, rapidité pour 40 %. */
export function scoreReflexe(hits: number, misses: number, falseAlarms: number, rejections: number, meanRtMs: number | null, level: number): number {
  const c = reflexeLevel(level);
  const goRate = hits + misses ? hits / (hits + misses) : 1;
  const noGoRate = falseAlarms + rejections ? rejections / (falseAlarms + rejections) : 1;
  const useful = Math.max(0, ((goRate + noGoRate) / 2 - 0.5) / 0.5);
  const speed = meanRtMs === null ? 0 : Math.min(1, Math.max(0, (c.windowMs - meanRtMs) / (c.windowMs - 250)));
  return clampScore(100 * useful * (0.6 + 0.4 * speed));
}
