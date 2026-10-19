/**
 * Reconnaissance d'un chiffre écrit au doigt, sur l'appareil, sans modèle téléchargé.
 * Méthode « nuage de points » (Vatavu, Anthony & Wobbrock, 2012, dite $P) : le tracé est
 * rééchantillonné, mis à l'échelle et centré, puis comparé à des modèles de chiffres. Ni le sens
 * ni l'ordre des traits ne comptent : un 4 en un ou deux traits, un 0 tourné dans un sens ou dans
 * l'autre se reconnaissent pareil.
 */

export interface Pt {
  x: number;
  y: number;
}

export type Stroke = readonly Pt[];

const N = 32;

function pathLength(strokes: readonly Stroke[]): number {
  let length = 0;
  for (const stroke of strokes) for (let i = 1; i < stroke.length; i++) length += Math.hypot(stroke[i].x - stroke[i - 1].x, stroke[i].y - stroke[i - 1].y);
  return length;
}

/** N points régulièrement espacés le long des traits (les sauts entre traits ne comptent pas). */
function resample(strokes: readonly Stroke[], n = N): Pt[] {
  const total = pathLength(strokes);
  const usable = strokes.filter((s) => s.length > 0);
  if (total === 0) {
    const p = usable[0]?.[0] ?? { x: 0, y: 0 };
    return Array.from({ length: n }, () => ({ ...p }));
  }
  const interval = total / (n - 1);
  const out: Pt[] = [{ ...usable[0][0] }];
  let carried = 0;
  for (const stroke of usable) {
    for (let i = 1; i < stroke.length; i++) {
      let prev = stroke[i - 1];
      const cur = stroke[i];
      let d = Math.hypot(cur.x - prev.x, cur.y - prev.y);
      while (carried + d >= interval && d > 0) {
        const t = (interval - carried) / d;
        const q = { x: prev.x + t * (cur.x - prev.x), y: prev.y + t * (cur.y - prev.y) };
        out.push(q);
        prev = q;
        d = Math.hypot(cur.x - prev.x, cur.y - prev.y);
        carried = 0;
      }
      carried += d;
    }
  }
  const last = usable[usable.length - 1];
  while (out.length < n) out.push({ ...last[last.length - 1] });
  return out.slice(0, n);
}

/** Même taille (la plus grande dimension vaut 1, les proportions sont gardées) et centré sur 0. */
function normalize(points: Pt[]): Pt[] {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) || 1;
  const cx = xs.reduce((a, b) => a + b, 0) / points.length;
  const cy = ys.reduce((a, b) => a + b, 0) / points.length;
  return points.map((p) => ({ x: (p.x - cx) / size, y: (p.y - cy) / size }));
}

export function cloud(strokes: readonly Stroke[]): Pt[] {
  return normalize(resample(strokes));
}

function cloudDistance(a: readonly Pt[], b: readonly Pt[], start: number): number {
  const n = a.length;
  const matched = new Array<boolean>(n).fill(false);
  let sum = 0;
  let i = start;
  do {
    let best = Infinity;
    let index = -1;
    for (let j = 0; j < n; j++) {
      if (matched[j]) continue;
      const d = (a[i].x - b[j].x) ** 2 + (a[i].y - b[j].y) ** 2;
      if (d < best) {
        best = d;
        index = j;
      }
    }
    matched[index] = true;
    // Les premiers appariements, faits quand le choix est large, comptent davantage.
    sum += (1 - ((i - start + n) % n) / n) * Math.sqrt(best);
    i = (i + 1) % n;
  } while (i !== start);
  return sum;
}

function matchDistance(a: readonly Pt[], b: readonly Pt[]): number {
  const step = Math.floor(Math.sqrt(a.length));
  let min = Infinity;
  for (let i = 0; i < a.length; i += step) min = Math.min(min, cloudDistance(a, b, i), cloudDistance(b, a, i));
  return min;
}

// ---------- Les modèles : chaque chiffre dessiné de plusieurs façons courantes ----------

type Shape = Pt[][];

const line = (x1: number, y1: number, x2: number, y2: number, steps = 8): Pt[] =>
  Array.from({ length: steps + 1 }, (_, i) => ({ x: x1 + ((x2 - x1) * i) / steps, y: y1 + ((y2 - y1) * i) / steps }));

/** Arc d'ellipse, angles en degrés (0 = à droite, 90 = en bas : l'axe y descend comme à l'écran). */
const arc = (cx: number, cy: number, rx: number, ry: number, from: number, to: number, steps = 16): Pt[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = ((from + ((to - from) * i) / steps) * Math.PI) / 180;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });

const path = (...parts: Pt[][]): Pt[] => parts.flat();

/** Les modèles, dans une boîte d'environ 100 × 140 (un chiffre est plus haut que large). */
export const DIGIT_SHAPES: Record<string, Shape[]> = {
  '0': [[arc(50, 70, 40, 68, -90, 270, 32)], [arc(50, 70, 26, 68, -90, 270, 32)], [arc(50, 70, 40, 68, -80, 290, 32)]],
  '1': [
    [line(50, 0, 50, 140, 16)],
    [path(line(25, 35, 55, 0, 6), line(55, 0, 55, 140, 16))],
    [path(line(25, 35, 55, 0, 6), line(55, 0, 55, 140, 16)), line(25, 140, 85, 140, 8)],
    [line(60, 0, 40, 140, 16)],
  ],
  '2': [
    [path(arc(50, 38, 38, 36, 200, 360, 12), arc(50, 38, 38, 36, 0, 45, 4), line(77, 63, 10, 140, 10), line(10, 140, 92, 140, 10))],
    [path(line(10, 5, 85, 5, 8), line(85, 5, 10, 140, 12), line(10, 140, 92, 140, 10))],
    [path(arc(50, 40, 36, 38, 180, 360, 12), arc(50, 40, 36, 38, 0, 60, 4), line(68, 73, 12, 140, 10), line(12, 140, 92, 135, 10))],
  ],
  '3': [
    [path(arc(48, 35, 36, 33, 200, 450, 18), arc(48, 103, 40, 36, -90, 155, 18))],
    [path(line(12, 3, 85, 3, 8), line(85, 3, 40, 60, 8), arc(46, 99, 42, 40, -95, 160, 18))],
    [path(arc(50, 36, 34, 34, 180, 360, 10), arc(50, 36, 34, 34, 0, 90, 6), arc(50, 104, 38, 36, -90, 180, 18))],
  ],
  '4': [
    [path(line(65, 0, 8, 95, 10), line(8, 95, 95, 95, 10)), line(70, 40, 70, 140, 10)],
    [path(line(18, 0, 15, 85, 10), line(15, 85, 92, 85, 10)), line(75, 0, 75, 140, 14)],
    [path(line(70, 0, 8, 95, 10), line(8, 95, 92, 95, 10)), line(72, 0, 72, 140, 14)],
    [path(line(65, 0, 8, 95, 10), line(8, 95, 95, 95, 10), line(95, 95, 70, 40, 4), line(70, 40, 70, 140, 10))],
  ],
  '5': [
    [path(line(85, 2, 22, 2, 8), line(22, 2, 18, 62, 8), arc(46, 96, 40, 42, -125, 150, 18))],
    [path(line(22, 2, 18, 62, 8), arc(46, 96, 40, 42, -125, 150, 18)), line(22, 2, 88, 2, 8)],
    [path(line(25, 0, 20, 60, 8), arc(48, 98, 38, 40, -130, 140, 18)), line(25, 0, 85, 4, 8)],
  ],
  '6': [
    [path(arc(75, 70, 62, 70, 240, 180, 10), arc(50, 100, 38, 38, 180, 540, 22))],
    [path(line(72, 0, 22, 85, 10), arc(50, 102, 36, 36, 210, 570, 22))],
    [path(arc(80, 75, 65, 75, 250, 175, 10), arc(48, 102, 36, 36, 175, 520, 22))],
  ],
  '7': [
    [path(line(8, 3, 92, 3, 10), line(92, 3, 38, 140, 14))],
    [path(line(8, 3, 92, 3, 10), line(92, 3, 38, 140, 14)), line(38, 72, 85, 72, 6)],
    [path(line(10, 18, 15, 3, 3), line(15, 3, 90, 3, 10), line(90, 3, 45, 140, 14))],
  ],
  '8': [
    [path(arc(50, 36, 34, 34, 0, -270, 18), arc(50, 104, 38, 36, -90, 270, 22), arc(50, 36, 34, 34, 90, 0, 6))],
    [arc(50, 36, 32, 34, 0, 360, 18), arc(50, 104, 38, 36, 0, 360, 20)],
    [path(arc(50, 36, 34, 34, -10, -250, 16), line(26, 60, 78, 85, 6), arc(50, 104, 38, 36, -50, 230, 20), line(24, 82, 76, 58, 6))],
  ],
  '9': [
    [path(arc(48, 38, 36, 36, 0, -360, 22), line(84, 38, 80, 140, 12))],
    [path(arc(48, 40, 36, 38, 10, -350, 22), line(84, 47, 50, 140, 12))],
    [arc(46, 38, 36, 36, 0, 360, 22), line(82, 20, 82, 140, 14)],
  ],
};

const TEMPLATES: { digit: string; points: Pt[] }[] = Object.entries(DIGIT_SHAPES).flatMap(([digit, shapes]) =>
  shapes.map((strokes) => ({ digit, points: cloud(strokes) })),
);

export interface Recognition {
  digit: string;
  /** Distance au modèle le plus proche (plus c'est petit, plus c'est sûr). */
  distance: number;
  /** Écart avec le meilleur autre chiffre : petit = hésitation. */
  margin: number;
}

/** Au-delà, le tracé ne ressemble à aucun chiffre (gribouillis, trait accidentel). */
export const MAX_DISTANCE = 1.9;

/** Le chiffre le plus proche du tracé, ou null si ce n'est vraisemblablement pas un chiffre. */
export function recognizeDigit(strokes: readonly Stroke[]): Recognition | null {
  const usable = strokes.filter((s) => s.length > 1);
  if (!usable.length || pathLength(usable) === 0) return null;
  const points = cloud(usable);
  const best = new Map<string, number>();
  for (const t of TEMPLATES) best.set(t.digit, Math.min(best.get(t.digit) ?? Infinity, matchDistance(points, t.points)));
  const ranked = [...best.entries()].sort((a, b) => a[1] - b[1]);
  const [digit, distance] = ranked[0];
  if (distance > MAX_DISTANCE) return null;
  return { digit, distance, margin: ranked[1][1] - distance };
}
