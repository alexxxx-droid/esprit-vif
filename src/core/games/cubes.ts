import type { Rng } from '../rng';

/**
 * Pièces en relief de la Rotation mentale (niveaux 31 et plus) : des cubes collés face contre face,
 * comme les figures classiques des tests de rotation mentale, dessinés en perspective isométrique.
 *
 * Vue : on regarde depuis (+x, +y, +z). À l'écran, x part vers la droite et le bas, y vers la gauche
 * et le bas, z vers le haut. Chaque face visible d'un cube est un losange fait de deux triangles du
 * réseau isométrique : le dessin entier est donc une carte « triangle → face (dessus, gauche, droite) »,
 * ce qui permet de comparer exactement deux dessins.
 */

/** Un cube : [x, y, z] (coin le plus proche de l'origine). */
export type Cube = readonly [number, number, number];
export type Solid = readonly Cube[];

export type FaceKind = 'top' | 'left' | 'right';

const key = (cube: Cube) => `${cube[0]},${cube[1]},${cube[2]}`;

/** Ramène la pièce contre les trois axes, cubes triés : deux pièces identiques ont la même forme normalisée. */
export function normalizeSolid(solid: Solid): Solid {
  const min = [0, 1, 2].map((a) => Math.min(...solid.map((c) => c[a])));
  return solid.map((c) => [c[0] - min[0], c[1] - min[1], c[2] - min[2]] as const).sort((a, b) => a[2] - b[2] || a[1] - b[1] || a[0] - b[0]);
}

export const solidKey = (solid: Solid) => normalizeSolid(solid).map(key).join(' ');

/** Une rotation de l'espace : chaque nouvel axe est un ancien axe, éventuellement retourné. */
export interface Turn {
  axes: readonly [number, number, number];
  signs: readonly [number, number, number];
}

function compose(a: Turn, b: Turn): Turn {
  // Applique b puis a.
  const axes = [0, 1, 2].map((i) => b.axes[a.axes[i]]) as [number, number, number];
  const signs = [0, 1, 2].map((i) => a.signs[i] * b.signs[a.axes[i]]) as [number, number, number];
  return { axes, signs };
}

const apply = (t: Turn, c: Cube): Cube => [t.signs[0] * c[t.axes[0]], t.signs[1] * c[t.axes[1]], t.signs[2] * c[t.axes[2]]];

/** Les 24 rotations du cube, à partir des quarts de tour autour de x et de z. */
export const TURNS: readonly Turn[] = (() => {
  const rx: Turn = { axes: [0, 2, 1], signs: [1, -1, 1] };
  const rz: Turn = { axes: [1, 0, 2], signs: [-1, 1, 1] };
  const id: Turn = { axes: [0, 1, 2], signs: [1, 1, 1] };
  const seen = new Map<string, Turn>([[JSON.stringify(id), id]]);
  const queue = [id];
  while (queue.length) {
    const t = queue.shift()!;
    for (const g of [rx, rz]) {
      const n = compose(g, t);
      const k = JSON.stringify(n);
      if (!seen.has(k)) {
        seen.set(k, n);
        queue.push(n);
      }
    }
  }
  return [...seen.values()];
})();

/** La pièce tournée (cubes ramenés à leur coin, puis normalisés). */
export function turnSolid(solid: Solid, turn: Turn): Solid {
  // Un cube [x, x+1] tourné devient [x', x'+1] avec x' = min des deux bornes tournées.
  return normalizeSolid(
    solid.map((c) => {
      const lo = apply(turn, c);
      const hi = apply(turn, [c[0] + 1, c[1] + 1, c[2] + 1]);
      return [Math.min(lo[0], hi[0]), Math.min(lo[1], hi[1]), Math.min(lo[2], hi[2])] as const;
    }),
  );
}

export function mirrorSolid(solid: Solid): Solid {
  return normalizeSolid(solid.map((c) => [-c[0] - 1, c[1], c[2]] as const));
}

/** Toutes les allures d'une pièce qu'on fait tourner (sans doublons). */
export function orientations(solid: Solid): Solid[] {
  const out = new Map<string, Solid>();
  for (const t of TURNS) {
    const s = turnSolid(solid, t);
    out.set(solidKey(s), s);
  }
  return [...out.values()];
}

export function sameSolidUpToRotation(a: Solid, b: Solid): boolean {
  const k = solidKey(b);
  return TURNS.some((t) => solidKey(turnSolid(a, t)) === k);
}

/** Pièce chirale : son reflet ne s'obtient pas en la tournant (sinon le piège du miroir n'en serait pas un). */
export const isChiral = (solid: Solid) => !sameSolidUpToRotation(solid, mirrorSolid(solid));

export function congruentSolids(a: Solid, b: Solid): boolean {
  return sameSolidUpToRotation(a, b) || sameSolidUpToRotation(mirrorSolid(a), b);
}

/** Largeur à l'écran d'un pas du réseau isométrique (la hauteur d'un pas vaut 1/2). */
export const ISO_X = Math.sqrt(3) / 2;

/** Boîte du dessin d'une pièce, en unités de l'écran (x vers la droite, y vers le bas). */
export function solidBounds(solid: Solid): { minX: number; maxX: number; minY: number; maxY: number } {
  const us = solid.map(([x, y]) => x - y);
  const vs = solid.map(([x, y, z]) => x + y - 2 * z);
  return { minX: (Math.min(...us) - 1) * ISO_X, maxX: (Math.max(...us) + 1) * ISO_X, minY: (Math.min(...vs) - 2) / 2, maxY: (Math.max(...vs) + 2) / 2 };
}

/** Côté du cadre carré commun à plusieurs pièces : toutes se dessinent à la même échelle. */
export function solidFrame(solids: readonly Solid[]): number {
  const sides = solids.map((s) => {
    const b = solidBounds(s);
    return Math.max(b.maxX - b.minX, b.maxY - b.minY);
  });
  return Math.max(...sides) + 0.3;
}

/** Ordre de dessin : du plus loin au plus près du regard. */
export const paintOrder = (solid: Solid): Cube[] => [...solid].sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));

export interface Picture {
  /** Le dessin, à une translation près : deux pièces qui se dessinent pareil ont la même clé. */
  key: string;
  /** Triangles visibles de chaque cube (dans l'ordre de la pièce). */
  visible: number[];
}

/**
 * Triangle du réseau isométrique, codé en nombre : son côté vertical (colonne u, de w à w + 2) et le
 * côté de sa pointe (d = 0 à gauche, 1 à droite), dans le repère u = x − y, v = x + y − 2z.
 */
const OFFSET = 64;
const tri = (u: number, w: number, d: number) => ((u + OFFSET) * 256 + (w + OFFSET)) * 2 + d;
const FACE_CODE: Record<FaceKind, number> = { top: 0, left: 1, right: 2 };

/** Les deux triangles de chaque face visible d'un cube. */
function cubeTriangles(c: Cube): [number, number][] {
  const u = c[0] - c[1];
  const v = c[0] + c[1] - 2 * c[2];
  return [
    [tri(u, v - 2, 1), FACE_CODE.top],
    [tri(u, v - 2, 0), FACE_CODE.top],
    [tri(u, v, 1), FACE_CODE.right],
    [tri(u + 1, v - 1, 0), FACE_CODE.right],
    [tri(u, v, 0), FACE_CODE.left],
    [tri(u - 1, v - 1, 1), FACE_CODE.left],
  ];
}

export function picture(solid: Solid): Picture {
  // Du plus loin au plus près : chaque cube recouvre ce qu'il cache.
  const order = solid.map((_, i) => i).sort((a, b) => solid[a][0] + solid[a][1] + solid[a][2] - (solid[b][0] + solid[b][1] + solid[b][2]));
  const owner = new Map<number, number>();
  for (const i of order) for (const [t, face] of cubeTriangles(solid[i])) owner.set(t, face * 16 + i);
  let minU = Infinity;
  let minW = Infinity;
  for (const t of owner.keys()) {
    minU = Math.min(minU, Math.floor(t / 512));
    minW = Math.min(minW, Math.floor(t / 2) % 256);
  }
  const visible = solid.map(() => 0);
  const codes: number[] = [];
  for (const [t, v] of owner) {
    visible[v % 16]++;
    const u = Math.floor(t / 512) - minU;
    const w = (Math.floor(t / 2) % 256) - minW;
    codes.push(((u * 256 + w) * 2 + (t % 2)) * 4 + Math.floor(v / 16));
  }
  return { key: codes.sort((a, b) => a - b).join(','), visible };
}

/** Assez lisible : chaque cube montre au moins une face entière (deux triangles). */
export const readable = (solid: Solid) => picture(solid).visible.every((n) => n >= 2);

/**
 * Trois dessins sans ambiguïté d'une pièce chirale (pour la démonstration) : le modèle, la même pièce
 * tournée, et son reflet. Aucun ne peut se lire comme l'autre pièce.
 */
export function demoViews(solid: Solid): { model: Solid; same: Solid; mirror: Solid } | null {
  const views = orientations(solid);
  const mirrors = orientations(mirrorSolid(solid));
  const looks = (s: Solid) => picture(s).key;
  const modelLooks = new Set(views.map(looks));
  const mirrorLooks = new Set(mirrors.map(looks));
  const clear = views.filter((v) => readable(v) && !mirrorLooks.has(looks(v)));
  const model = clear[0];
  const same = clear.find((v) => looks(v) !== looks(model));
  const mirror = mirrors.find((v) => readable(v) && !modelLooks.has(looks(v)));
  return model && same && mirror ? { model, same, mirror } : null;
}

const DIRECTIONS: readonly Cube[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

/** Plus grande longueur de la boîte qui contient la pièce. */
export const solidSpan = (solid: Solid) => Math.max(...[0, 1, 2].map((a) => Math.max(...solid.map((c) => c[a])) - Math.min(...solid.map((c) => c[a])) + 1));

/**
 * Pièce en « bras » coudés, comme les figures de Shepard et Metzler : des segments de 1 à 3 cubes,
 * chaque coude à angle droit, dans les trois directions de l'espace ; sans symétrie de miroir si
 * `chiral` (le modèle doit l'être, sinon son reflet ne serait pas un piège). Dès 6 cubes, il y a
 * plus de vingt formes chirales différentes.
 */
export function randomSolid(rng: Rng, size: number, chiral = true): Solid {
  const maxSpan = size <= 8 ? 4 : 5;
  for (;;) {
    const cells: Cube[] = [[0, 0, 0]];
    const taken = new Set([key(cells[0])]);
    let dir = rng.pick(DIRECTIONS);
    let ok = true;
    while (ok && cells.length < size) {
      const length = rng.int(1, 3);
      for (let s = 0; s < length && cells.length < size; s++) {
        const [x, y, z] = cells[cells.length - 1];
        const next: Cube = [x + dir[0], y + dir[1], z + dir[2]];
        if (taken.has(key(next))) {
          ok = false;
          break;
        }
        cells.push(next);
        taken.add(key(next));
      }
      // Coude à angle droit.
      dir = rng.pick(DIRECTIONS.filter((d) => d[0] * dir[0] + d[1] * dir[1] + d[2] * dir[2] === 0));
    }
    if (!ok) continue;
    const solid = normalizeSolid(cells);
    const dims = [0, 1, 2].map((a) => Math.max(...solid.map((c) => c[a])) + 1);
    if (dims.some((d) => d < 2) || solidSpan(solid) > maxSpan) continue;
    if (!chiral || isChiral(solid)) return solid;
  }
}
