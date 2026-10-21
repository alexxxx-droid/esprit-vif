import type { AiguillagesLevel } from '../../core/games/aiguillages';

export type Point = readonly [number, number];

/** Le dessin du réseau : 100 de large, une rangée par niveau d'aiguillages, les gares en bas. */
export function layout(c: Pick<AiguillagesLevel, 'depth'>) {
  const row = c.depth === 1 ? 40 : c.depth === 2 ? 31 : 25;
  const top = 6;
  const height = top + (c.depth + 1) * row + 12;
  const pos = (node: number): Point => {
    const depth = Math.floor(Math.log2(node + 1));
    const i = node - (2 ** depth - 1);
    return [((i + 0.5) * 100) / 2 ** depth, top + (depth + 1) * row];
  };
  return { height, entry: [50, top] as Point, pos };
}
