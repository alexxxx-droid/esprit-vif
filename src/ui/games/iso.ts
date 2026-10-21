import { ISO_X, type Cube } from '../../core/games/cubes';

const point = (u: number, v: number) => `${(u * ISO_X).toFixed(3)},${(v / 2).toFixed(3)}`;

/** Les trois faces visibles d'un cube en perspective isométrique (Rotation mentale, Combien de cubes ?). */
export function cubeFaces([x, y, z]: Cube) {
  const u = x - y;
  const v = x + y - 2 * z;
  return {
    top: [point(u, v - 2), point(u + 1, v - 1), point(u, v), point(u - 1, v - 1)].join(' '),
    right: [point(u, v), point(u + 1, v - 1), point(u + 1, v + 1), point(u, v + 2)].join(' '),
    left: [point(u, v), point(u, v + 2), point(u - 1, v + 1), point(u - 1, v - 1)].join(' '),
  };
}
