import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * Coup d'œil : deux nuées de points mêlées, bleue et orange, apparaissent un instant. Laquelle en
 * comptait le plus ? On n'a pas le temps de compter : on estime. Les niveaux resserrent l'écart
 * et raccourcissent l'affichage. La taille des points varie, et la nuée la plus nombreuse a
 * souvent les plus petits : juger la quantité d'encre ne suffit pas.
 */

export const COUP_DURATION_MS = 60_000;

export interface CoupLevel {
  /** Nombre de points de la plus petite nuée. */
  min: number;
  max: number;
  /** Rapport entre la grande et la petite nuée (2 = deux fois plus). */
  ratio: number;
  showMs: number;
  /** Bonnes réponses moins erreurs en 60 s pour 100 pts (répondre au hasard rapporte 0). */
  target: number;
}

const C = (min: number, max: number, ratio: number, showMs: number, target: number): CoupLevel => ({ min, max, ratio, showMs, target });

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
];

export function coupLevel(level: number): CoupLevel {
  return pickLevel(COUP_LEVELS, level);
}

/** Un exemple typique du niveau, en entiers : « ≈ 12 contre 6 · vu 1,5 s ». */
export function coupLevelLabel(level: number): string {
  const c = coupLevel(level);
  const small = Math.round((c.min + c.max) / 2);
  return `≈ ${Math.max(small + 1, Math.round(small * c.ratio))} contre ${small} · vu ${secondsLabel(c.showMs)}`;
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
}

/** Points éparpillés sans se toucher ; des rayons fixés à l'avance pour chaque point. */
function scatter(rng: Rng, radii: number[]): Dot[] {
  for (;;) {
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

export function generateCoupTrial(rng: Rng, level: number): CoupTrial {
  const c = coupLevel(level);
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
