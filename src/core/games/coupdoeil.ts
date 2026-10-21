import { tr } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * Coup d'œil : deux nuées de points mêlées, bleue et orange, apparaissent un instant. Laquelle en
 * comptait le plus ? On n'a pas le temps de compter : on estime. Les niveaux resserrent l'écart
 * et raccourcissent l'affichage. La taille des points varie, et la nuée la plus nombreuse a
 * souvent les plus petits : juger la quantité d'encre ne suffit pas.
 * À partir du niveau 21, la taille ne dit plus rien du tout (la nuée la plus nombreuse a des points
 * plus petits une fois sur deux, plus gros l'autre fois) ; puis viennent des points gris qui ne
 * comptent pas, et une question qui s'inverse : « laquelle en avait le MOINS ? ».
 */

export const COUP_DURATION_MS = 45_000;

/** Les difficultés des niveaux 21 à 50. */
export interface CoupTwist {
  /** Écart de taille des points entre les deux nuées (0,2 = 20 % plus petits d'un côté, plus gros de l'autre). */
  contrast: number;
  /** Points gris, qui ne comptent pas. */
  decoys: number;
  /** Part des essais où l'on demande la nuée la MOINS nombreuse. */
  fewer: number;
}

export interface CoupLevel {
  /** Nombre de points de la plus petite nuée. */
  min: number;
  max: number;
  /**
   * Rapport entre la grande et la petite nuée (2 = deux fois plus). Avec `twist`, c'est un minimum :
   * la grande nuée a au moins `ratio` fois plus de points, à chaque essai.
   */
  ratio: number;
  showMs: number;
  /** Bonnes réponses moins erreurs en une partie pour 100 pts (répondre au hasard rapporte 0). */
  target: number;
  twist?: CoupTwist;
}

/** Les objectifs du tableau sont écrits pour une partie de 60 s : l'accesseur du niveau les ramène à la durée réelle. */
const forDuration = (target: number) => Math.round((target * COUP_DURATION_MS) / 60_000);
const C = (min: number, max: number, ratio: number, showMs: number, target: number): CoupLevel => ({ min, max, ratio, showMs, target });
const T = (min: number, max: number, ratio: number, showMs: number, target: number, contrast: number, decoys = 0, fewer = 0): CoupLevel => ({
  ...C(min, max, ratio, showMs, target),
  twist: { contrast, decoys, fewer },
});

export const COUP_LEVELS: readonly CoupLevel[] = [
  C(5, 8, 2, 1500, 20),
  C(6, 10, 1.75, 1400, 20),
  C(6, 10, 1.6, 1300, 19),
  C(8, 12, 1.5, 1200, 19),
  C(8, 14, 1.43, 1100, 18),
  C(10, 15, 1.38, 1000, 18),
  C(10, 16, 1.33, 950, 17),
  C(12, 18, 1.3, 900, 17),
  C(12, 18, 1.27, 850, 16),
  C(14, 20, 1.25, 800, 16),
  C(14, 20, 1.22, 750, 15),
  C(15, 22, 1.2, 700, 15),
  C(16, 24, 1.18, 650, 14),
  C(16, 24, 1.17, 620, 14),
  C(18, 26, 1.15, 600, 13),
  C(18, 26, 1.14, 560, 13),
  C(20, 28, 1.13, 530, 12),
  C(20, 30, 1.12, 500, 12),
  C(22, 30, 1.11, 470, 11),
  C(22, 32, 1.1, 450, 11),
  // Expert : plus de points, et leur taille ne dit plus rien (plus petits, plus gros ou même encre).
  T(22, 34, 1.083, 440, 11, 0.18),
  T(24, 34, 1.082, 435, 11, 0.18),
  T(24, 36, 1.08, 430, 11, 0.18),
  T(25, 36, 1.079, 425, 11, 0.19),
  T(26, 38, 1.078, 420, 11, 0.19),
  T(26, 38, 1.077, 415, 11, 0.19),
  T(28, 40, 1.076, 410, 10, 0.2),
  T(28, 40, 1.075, 405, 10, 0.2),
  T(30, 42, 1.074, 400, 10, 0.2),
  T(30, 42, 1.073, 395, 10, 0.2),
  // Maître : des points gris qui ne comptent pas, et parfois la question inverse.
  T(30, 44, 1.072, 390, 10, 0.2, 6),
  T(30, 44, 1.071, 385, 9, 0.2, 0, 0.3),
  T(32, 44, 1.07, 380, 9, 0.2, 8),
  T(32, 46, 1.069, 375, 9, 0.2, 0, 0.3),
  T(32, 46, 1.068, 370, 9, 0.2, 8, 0.3),
  T(32, 46, 1.067, 365, 9, 0.2, 10),
  T(34, 48, 1.066, 360, 9, 0.21, 0, 0.4),
  T(34, 48, 1.065, 355, 8, 0.21, 10, 0.3),
  T(34, 48, 1.064, 350, 8, 0.21, 10, 0.4),
  T(34, 48, 1.063, 345, 8, 0.21, 12, 0.4),
  // Légende : tout à la fois, jusqu'à 100 points en 0,3 s, à 6 % d'écart.
  T(34, 48, 1.062, 340, 8, 0.22, 12, 0.4),
  T(34, 48, 1.062, 335, 8, 0.22, 12, 0.5),
  T(35, 48, 1.061, 330, 8, 0.22, 12, 0.5),
  T(35, 50, 1.061, 325, 8, 0.22, 12, 0.5),
  T(35, 50, 1.06, 320, 8, 0.22, 14, 0.5),
  T(36, 50, 1.06, 315, 8, 0.22, 14, 0.5),
  T(36, 50, 1.06, 310, 8, 0.22, 14, 0.5),
  T(36, 50, 1.06, 305, 8, 0.22, 14, 0.5),
  T(36, 50, 1.06, 300, 8, 0.22, 14, 0.5),
  T(36, 50, 1.06, 300, 8, 0.22, 14, 0.5),
];

/** Les niveaux tels qu'on les joue : objectifs ramenés à la durée réelle de la partie. */
const PLAYED = COUP_LEVELS.map((c) => ({ ...c, target: forDuration(c.target) }));

export function coupLevel(level: number): CoupLevel {
  return pickLevel(PLAYED, level);
}

/** Taille de la grande nuée : arrondie aux niveaux 1 à 20, jamais sous le rapport ensuite. */
function bigCount(c: CoupLevel, small: number): number {
  return Math.max(small + 1, c.twist ? Math.ceil(small * c.ratio - 1e-9) : Math.round(small * c.ratio));
}

/** Un exemple typique du niveau, en entiers : « ≈ 12 contre 6 · vu 1,5 s ». */
export function coupLevelLabel(level: number): string {
  const c = coupLevel(level);
  const small = Math.round((c.min + c.max) / 2);
  const big = bigCount(c, small);
  const shown = secondsLabel(c.showMs);
  const base = tr(`≈ ${big} contre ${small} · vu ${shown}`, `≈ ${big} vs. ${small} · shown ${shown}`);
  const flags = [c.twist?.decoys && tr('points gris', 'gray dots'), c.twist?.fewer && tr('plus ou moins', 'more or fewer')].filter(Boolean);
  return [base, ...flags].join(' · ');
}

/** La règle affichée à l'intro. */
export function coupRule(level: number): string {
  const { twist } = coupLevel(level);
  const base = tr(
    'Des points bleus et orange apparaissent un instant. Sans compter, dis quelle couleur était la plus nombreuse. 45 secondes.',
    'Blue and orange dots flash up for a moment. Without counting, say which color had more dots. 45 seconds.',
  );
  if (!twist) return base;
  const parts = [base, tr('La taille des points ne veut rien dire.', 'Dot size means nothing.')];
  if (twist.decoys) parts.push(tr('Les points gris ne comptent pas.', 'Gray dots don’t count.'));
  if (twist.fewer) parts.push(tr('Attention : parfois, on demande la MOINS nombreuse !', 'Careful: sometimes you’re asked which had FEWER!'));
  return parts.join(' ');
}

export interface Dot {
  /** Position et rayon dans un carré de 100 × 100. */
  x: number;
  y: number;
  r: number;
}

export interface CoupTrial {
  /** Les deux nuées : 0 = bleue, 1 = orange. */
  groups: [Dot[], Dot[]];
  /** La nuée la plus nombreuse. */
  answer: 0 | 1;
  /** Points gris, qui ne comptent pas. */
  noise?: Dot[];
  /** La question porte sur la nuée la MOINS nombreuse. */
  ask?: 'fewer';
}

/** La bonne réponse : la nuée la plus nombreuse, ou la moins nombreuse si la question s'inverse. */
export function coupExpected(trial: CoupTrial): 0 | 1 {
  return trial.ask === 'fewer' ? (trial.answer === 0 ? 1 : 0) : trial.answer;
}

/** Points éparpillés sans se toucher ; des rayons fixés à l'avance pour chaque point. */
function scatter(rng: Rng, initialRadii: number[]): Dot[] {
  let radii = initialRadii;
  for (let round = 1; ; round++) {
    // Filet de sécurité : après 20 échecs, les points rapetissent un peu à chaque nouvel essai.
    if (round > 20) radii = radii.map((r) => r * 0.95);
    const dots: Dot[] = [];
    let failed = false;
    for (const r of radii) {
      let placed = false;
      for (let tries = 0; tries < 300 && !placed; tries++) {
        const x = r + rng.next() * (100 - 2 * r);
        const y = r + rng.next() * (100 - 2 * r);
        if (dots.every((d) => Math.hypot(d.x - x, d.y - y) >= d.r + r + 1.5)) {
          dots.push({ x, y, r });
          placed = true;
        }
      }
      if (!placed) {
        failed = true;
        break;
      }
    }
    if (!failed) return dots;
  }
}

/** Rayon minimal (niveaux 21 à 50) : un point reste visible sur un petit écran. */
const MIN_RADIUS = 1.1;

/**
 * Niveaux 21 à 50 : la nuée la plus nombreuse a des points plus petits une fois sur deux, plus gros
 * l'autre fois. Ni la taille des points ni la quantité d'encre ne trahit donc la réponse (une fois
 * sur deux chacune, autant qu'au hasard). Des points gris s'y mêlent parfois, et la question peut
 * s'inverser.
 */
function twistedTrial(rng: Rng, c: CoupLevel, twist: CoupTwist): CoupTrial {
  const small = rng.int(c.min, c.max);
  const big = bigCount(c, small);
  const base = Math.max(1.6, 4.2 - (small + big) / 30);
  const k = rng.chance(0.5) ? -twist.contrast : twist.contrast;
  const jitter = () => 0.75 + rng.next() * 0.5;
  const bigRadii = Array.from({ length: big }, () => base * (1 + k) * jitter());
  const smallRadii = Array.from({ length: small }, () => base * (1 - k) * jitter());
  const noiseRadii = Array.from({ length: twist.decoys }, () => base * jitter());
  const answer: 0 | 1 = rng.chance(0.5) ? 0 : 1;
  const fewer = twist.fewer > 0 && rng.chance(twist.fewer);
  const points = rng.shuffle([
    ...bigRadii.map((r) => ({ r, group: 'big' })),
    ...smallRadii.map((r) => ({ r, group: 'small' })),
    ...noiseRadii.map((r) => ({ r, group: 'noise' })),
  ]);
  const dots = scatter(
    rng,
    points.map((p) => Math.max(MIN_RADIUS, p.r)),
  );
  const of = (group: string) => dots.filter((_, i) => points[i].group === group);
  const [bigDots, smallDots] = [of('big'), of('small')];
  return {
    groups: answer === 0 ? [bigDots, smallDots] : [smallDots, bigDots],
    answer,
    ...(twist.decoys ? { noise: of('noise') } : {}),
    ...(fewer ? { ask: 'fewer' as const } : {}),
  };
}

export function generateCoupTrial(rng: Rng, level: number): CoupTrial {
  const c = coupLevel(level);
  if (c.twist) return twistedTrial(rng, c, c.twist);
  const small = rng.int(c.min, c.max);
  const big = Math.max(small + 1, Math.round(small * c.ratio));
  // Plus il y a de points, plus ils sont petits ; et souvent, la grande nuée a les plus petits.
  const base = Math.max(1.6, 4.2 - (small + big) / 30);
  const trap = rng.chance(0.5);
  const size = (many: boolean) => base * (trap ? (many ? 0.85 : 1.15) : 1);
  const radius = (many: boolean) => size(many) * (0.75 + rng.next() * 0.5);
  const bigRadii = Array.from({ length: big }, () => radius(true));
  const smallRadii = Array.from({ length: small }, () => radius(false));
  const answer: 0 | 1 = rng.chance(0.5) ? 0 : 1;
  // Les deux nuées sont mêlées : on place les points dans un ordre tiré au sort, chacun gardant sa nuée.
  const points = rng.shuffle([...bigRadii.map((r) => ({ r, big: true })), ...smallRadii.map((r) => ({ r, big: false }))]);
  const dots = scatter(
    rng,
    points.map((p) => p.r),
  );
  const bigDots = dots.filter((_, i) => points[i].big);
  const smallDots = dots.filter((_, i) => !points[i].big);
  return { groups: answer === 0 ? [bigDots, smallDots] : [smallDots, bigDots], answer };
}

export function scoreCoup(correct: number, errors: number, level: number): number {
  return countScore(correct - errors, 0, coupLevel(level).target);
}
