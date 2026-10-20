import { lang, tr } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { clampScore } from '../scoring';
import { fillWord, SHAPE_NAMES, type ShapeCard, type ShapeKind } from './shapes';

/**
 * Réflexe : des formes apparaissent une à une ; on touche vite les bonnes, on se retient sur les autres.
 * La règle peut s'inverser (« tout sauf… ») ou changer en cours de partie.
 * Aux niveaux avancés : le remplissage compte forme par forme (« les ronds creux et les carrés
 * pleins »), deux règles alternent plusieurs fois, et une forme peut changer au dernier moment
 * (une bonne forme qui se transforme : il faut retenir son geste).
 */

export const REFLEXE_TRIALS = 30;

export type ReflexeFill = 'filled' | 'hollow';

export interface ReflexeRule {
  /** Formes à toucher. */
  go: ShapeKind[];
  /** Le remplissage compte : seules les formes pleines sont à toucher. */
  filledOnly: boolean;
  /** Règle inversée : toucher tout SAUF les formes listées. */
  inverted: boolean;
  /** Remplissage exigé pour chaque forme de `go` (même ordre) ; remplace `filledOnly`. */
  fill?: ReflexeFill[];
}

export interface ReflexeLevel {
  rules: ReflexeRule[];
  /** Formes qui peuvent apparaître. */
  pool: ShapeKind[];
  /** Part des formes à ne pas toucher. */
  noGo: number;
  windowMs: number;
  /** Nombre de tranches de la partie : les règles s'y succèdent en boucle (absent = une tranche par règle). */
  blocks?: number;
  /** Part des formes à ne pas toucher qui se montrent d'abord sous une forme à toucher, puis changent. */
  lures?: number;
  /** Délai du changement, en ms : [min, max]. */
  lureMs?: readonly [number, number];
  /** Temps de réaction qui donne tous les points de rapidité (250 ms par défaut). */
  fastMs?: number;
}

const R = (go: ShapeKind[], filledOnly = false, inverted = false): ReflexeRule => ({ go, filledOnly, inverted });
/** Règle forme par forme : `F(['circle', 'hollow'], ['square', 'filled'])` = « les ronds creux et les carrés pleins ». */
const F = (inverted: boolean, ...parts: [ShapeKind, ReflexeFill][]): ReflexeRule => ({
  go: parts.map(([shape]) => shape),
  filledOnly: false,
  inverted,
  fill: parts.map(([, fill]) => fill),
});
const L = (rules: ReflexeRule[], pool: ShapeKind[], noGo: number, windowMs: number): ReflexeLevel => ({ rules, pool, noGo, windowMs });
/** Niveau avancé : tranches de règles en boucle, formes qui changent au dernier moment. */
const X = (
  rules: ReflexeRule[],
  pool: ShapeKind[],
  noGo: number,
  windowMs: number,
  { blocks = 0, lures = 0, lureMs = [90, 150] as readonly [number, number], fastMs = 0 } = {},
): ReflexeLevel => ({
  rules,
  pool,
  noGo,
  windowMs,
  ...(blocks ? { blocks } : {}),
  ...(lures ? { lures, lureMs } : {}),
  ...(fastMs ? { fastMs } : {}),
});

const BASIC: ShapeKind[] = ['circle', 'square', 'triangle'];
const MORE: ShapeKind[] = ['circle', 'square', 'triangle', 'star', 'diamond'];
const CLOSE: ShapeKind[] = ['circle', 'octagon', 'hexagon'];
const CLOSE4: ShapeKind[] = ['circle', 'octagon', 'hexagon', 'pentagon'];
const WIDE: ShapeKind[] = ['circle', 'square', 'triangle', 'star', 'diamond', 'hexagon', 'pentagon'];

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
  // Expert : le remplissage forme par forme (creux !), deux règles qui alternent, l'inversion qui va et vient.
  X([F(false, ['circle', 'hollow'])], MORE, 0.4, 600),
  X([F(false, ['square', 'filled'], ['circle', 'hollow'])], MORE, 0.4, 595),
  X([R(['circle']), R(['square'])], BASIC, 0.4, 590, { blocks: 4 }),
  X([F(true, ['star', 'hollow'])], MORE, 0.4, 585),
  X([R(['hexagon'])], CLOSE4, 0.4, 580),
  X([F(false, ['circle', 'filled']), R(['star'], false, true), F(false, ['square', 'hollow'])], MORE, 0.4, 575),
  X([R(['triangle']), R(['triangle'], false, true)], MORE, 0.4, 570, { blocks: 4 }),
  X([F(false, ['octagon', 'hollow'])], CLOSE4, 0.4, 565),
  X([F(false, ['circle', 'filled']), F(false, ['circle', 'hollow'])], CLOSE4, 0.4, 560, { blocks: 6 }),
  X([F(true, ['star', 'filled'], ['diamond', 'hollow'])], MORE, 0.4, 555),
  // Maître : des formes qui changent au dernier moment, des alternances plus serrées.
  X([R(['circle'])], BASIC, 0.35, 550, { lures: 0.4, fastMs: 290 }),
  X([R(['square']), R(['diamond'])], MORE, 0.35, 545, { blocks: 6, fastMs: 270 }),
  X([F(false, ['hexagon', 'filled'])], CLOSE4, 0.35, 540, { lures: 0.4, fastMs: 290 }),
  X([R(['circle']), R(['triangle']), R(['star'])], MORE, 0.35, 535, { blocks: 6, fastMs: 270 }),
  X([F(false, ['circle', 'hollow']), F(true, ['circle', 'hollow'])], MORE, 0.35, 530, { blocks: 6, fastMs: 280 }),
  X([R(['pentagon'])], [...CLOSE4, 'star'], 0.35, 525, { lures: 0.4, fastMs: 295 }),
  X([F(false, ['square', 'filled'], ['triangle', 'hollow'])], MORE, 0.35, 520, { lures: 0.4, fastMs: 295 }),
  X([R(['star'], false, true), F(false, ['circle', 'hollow']), F(false, ['diamond', 'filled'])], MORE, 0.35, 515, { blocks: 6, fastMs: 290 }),
  X([R(['octagon']), R(['hexagon'])], CLOSE4, 0.35, 510, { blocks: 6, lures: 0.4, fastMs: 290 }),
  X([F(true, ['circle', 'filled'], ['square', 'hollow'])], MORE, 0.35, 505, { lures: 0.4, fastMs: 290 }),
  // Légende : tout à la fois, des règles qui changent toutes les trois formes, 450 ms au niveau 50.
  X([F(false, ['circle', 'filled']), F(true, ['circle', 'filled'])], CLOSE4, 0.35, 500, { blocks: 6, lures: 0.4, lureMs: [100, 160], fastMs: 300 }),
  X([F(false, ['hexagon', 'hollow'], ['octagon', 'filled'])], CLOSE4, 0.35, 495, { lures: 0.4, lureMs: [100, 160], fastMs: 300 }),
  X([R(['triangle']), R(['square'], false, true), F(false, ['star', 'hollow'])], MORE, 0.35, 490, { blocks: 6, lures: 0.4, lureMs: [100, 160], fastMs: 300 }),
  X([R(['circle']), R(['square'])], BASIC, 0.35, 485, { blocks: 10, lures: 0.4, lureMs: [100, 160], fastMs: 300 }),
  X([F(false, ['pentagon', 'filled'])], WIDE, 0.35, 480, { lures: 0.5, lureMs: [100, 160], fastMs: 315 }),
  X([F(false, ['circle', 'hollow']), R(['octagon']), R(['hexagon'], false, true), F(false, ['circle', 'filled'])], CLOSE4, 0.35, 475, {
    blocks: 8,
    lures: 0.4,
    lureMs: [110, 170],
    fastMs: 310,
  }),
  X([R(['star']), R(['star'], false, true)], MORE, 0.35, 470, { blocks: 10, lures: 0.4, lureMs: [110, 170], fastMs: 310 }),
  X([F(false, ['square', 'filled'], ['diamond', 'hollow']), F(true, ['square', 'filled'], ['diamond', 'hollow'])], MORE, 0.35, 465, {
    blocks: 6,
    lures: 0.5,
    lureMs: [110, 170],
    fastMs: 310,
  }),
  X([F(false, ['circle', 'filled']), F(false, ['hexagon', 'hollow']), R(['octagon'], false, true)], CLOSE4, 0.35, 460, {
    blocks: 10,
    lures: 0.5,
    lureMs: [110, 170],
    fastMs: 320,
  }),
  X([F(false, ['circle', 'filled'], ['octagon', 'hollow']), F(true, ['circle', 'filled'], ['octagon', 'hollow'])], CLOSE4, 0.35, 450, {
    blocks: 10,
    lures: 0.5,
    lureMs: [120, 180],
    fastMs: 320,
  }),
];

export function reflexeLevel(level: number): ReflexeLevel {
  return pickLevel(REFLEXE_LEVELS, level);
}

/** Noms anglais des formes, au pluriel (la règle les cite toujours ainsi). */
const SHAPE_PLURALS_EN: Record<ShapeKind, string> = {
  circle: 'circles',
  square: 'squares',
  triangle: 'triangles',
  star: 'stars',
  diamond: 'diamonds',
  cross: 'crosses',
  hexagon: 'hexagons',
  octagon: 'octagons',
  pentagon: 'pentagons',
  heart: 'hearts',
  moon: 'moons',
  flag: 'flags',
};

/** Remplissage exigé pour la i-ème forme de la règle (null = peu importe). */
export function fillOf(rule: ReflexeRule, i: number): ReflexeFill | null {
  if (rule.fill) return rule.fill[i];
  return rule.filledOnly ? 'filled' : null;
}

/** « Tap the filled circles », « Tap everything except the stars ». */
function describeRuleEn(rule: ReflexeRule): string {
  const names = rule.go.map((s, i) => {
    const fill = fillOf(rule, i);
    return `the ${fill ? `${fill} ` : ''}${SHAPE_PLURALS_EN[s]}`;
  });
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
  return rule.inverted ? `Tap everything except ${list}` : `Tap ${list}`;
}

/** Règle en mots : « Touche les ronds pleins », « Touche tout sauf les étoiles ». */
export function describeRule(rule: ReflexeRule): string {
  if (lang() === 'en') return describeRuleEn(rule);
  const names = rule.go.map((s, i) => {
    const fill = fillOf(rule, i);
    return `${SHAPE_NAMES[s]}s${fill ? ` ${fillWord(s, fill === 'filled', true)}` : ''}`.replace('croixs', 'croix');
  });
  const list = names.length > 1 ? `${names.slice(0, -1).join(', les ')} et les ${names.at(-1)}` : names[0];
  return rule.inverted ? `Touche tout, sauf les ${list}` : `Touche les ${list}`;
}

/** Les règles reviennent plusieurs fois (tranches plus nombreuses que les règles). */
export function reflexeAlternates(c: ReflexeLevel): boolean {
  return (c.blocks ?? c.rules.length) > c.rules.length;
}

export function reflexeLevelLabel(level: number): string {
  const c = reflexeLevel(level);
  const react = secondsLabel(c.windowMs);
  const n = c.rules.length;
  const rules =
    n === 1
      ? describeRule(c.rules[0])
      : reflexeAlternates(c)
        ? tr(`${n} règles en alternance`, `${n} rules taking turns`)
        : tr(`${n} règles successives`, `${n} rules in a row`);
  return [rules, c.lures && tr('formes changeantes', 'shape-shifters'), tr(`${react} pour réagir`, `${react} to react`)].filter(Boolean).join(' · ');
}

/** La règle affichée à l'intro. */
export function reflexeRule(level: number): string {
  const c = reflexeLevel(level);
  const first = describeRule(c.rules[0]);
  const base =
    c.rules.length === 1
      ? tr(`${first}, le plus vite possible. Pour les autres formes, ne touche rien.`, `${first}, as fast as you can. For any other shape, don’t tap anything.`)
      : reflexeAlternates(c)
        ? tr(`${first}… mais la règle va changer, et revenir, plusieurs fois !`, `${first}… but the rule will switch back and forth several times!`)
        : tr(`${first}… mais la règle va changer en cours de route !`, `${first}… but the rule will change along the way!`);
  return c.lures
    ? tr(`${base} Attention : une forme peut changer au dernier moment, retiens-toi !`, `${base} Careful: a shape can change at the last moment, so hold back!`)
    : base;
}

export function isGo(card: ShapeCard, rule: ReflexeRule): boolean {
  const index = rule.go.indexOf(card.shape);
  const fill = index >= 0 ? fillOf(rule, index) : null;
  const matches = index >= 0 && (!fill || card.filled === (fill === 'filled'));
  return rule.inverted ? !matches : matches;
}

/** Règle en vigueur pour la i-ème forme : les tranches se suivent, les règles reviennent en boucle. */
export function reflexeRuleIndex(c: ReflexeLevel, i: number): number {
  if (!c.blocks) return Math.min(c.rules.length - 1, Math.floor((i * c.rules.length) / REFLEXE_TRIALS));
  return Math.floor((i * c.blocks) / REFLEXE_TRIALS) % c.rules.length;
}

export interface ReflexeTrial {
  card: ShapeCard;
  ruleIndex: number;
  go: boolean;
  /** Pause avant la forme. */
  gapMs: number;
  /** Forme changeante : d'abord `lure` (une forme à toucher), remplacée par `card` après `lureMs`. */
  lure?: ShapeCard;
  lureMs?: number;
}

export function generateReflexe(rng: Rng, level: number): ReflexeTrial[] {
  const c = reflexeLevel(level);
  const usesFill = c.rules.some((r) => r.filledOnly || r.fill);
  const noGoCount = Math.round(REFLEXE_TRIALS * c.noGo);
  const goFlags = rng.shuffle(Array.from({ length: REFLEXE_TRIALS }, (_, i) => i >= noGoCount));
  return goFlags.map((wantGo, i) => {
    const ruleIndex = reflexeRuleIndex(c, i);
    const rule = c.rules[ruleIndex];
    const candidates: ShapeCard[] = [];
    for (const shape of c.pool) {
      for (const filled of usesFill ? [true, false] : [true]) candidates.push({ shape, filled, rotation: 0 });
    }
    const matching = candidates.filter((card) => isGo(card, rule) === wantGo);
    const card = rng.pick(matching.length ? matching : candidates);
    const trial: ReflexeTrial = { card, ruleIndex, go: isGo(card, rule), gapMs: rng.int(450, 900) };
    // Forme changeante : elle se montre d'abord sous une forme à toucher… puis devient une forme à éviter.
    if (c.lures && !trial.go && rng.chance(c.lures)) {
      const goCards = candidates.filter((other) => isGo(other, rule));
      const [min, max] = c.lureMs ?? [90, 150];
      if (goCards.length) {
        trial.lure = rng.pick(goCards);
        trial.lureMs = rng.int(min, max);
      }
    }
    return trial;
  });
}

/** Justesse (bonnes réponses et bonnes abstentions) pour 60 %, rapidité pour 40 %. */
export function scoreReflexe(hits: number, misses: number, falseAlarms: number, rejections: number, meanRtMs: number | null, level: number): number {
  const c = reflexeLevel(level);
  const goRate = hits + misses ? hits / (hits + misses) : 1;
  const noGoRate = falseAlarms + rejections ? rejections / (falseAlarms + rejections) : 1;
  const useful = Math.max(0, ((goRate + noGoRate) / 2 - 0.5) / 0.5);
  const fast = c.fastMs ?? 250;
  const speed = meanRtMs === null ? 0 : Math.min(1, Math.max(0, (c.windowMs - meanRtMs) / (c.windowMs - fast)));
  return clampScore(100 * useful * (0.6 + 0.4 * speed));
}
