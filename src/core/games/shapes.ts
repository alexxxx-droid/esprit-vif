/** Formes utilisées par plusieurs jeux (Réflexe, Correspondance express…). */
export const SHAPES = ['circle', 'square', 'triangle', 'star', 'diamond', 'cross', 'hexagon', 'octagon', 'pentagon', 'heart', 'moon', 'flag'] as const;
export type ShapeKind = (typeof SHAPES)[number];

export const SHAPE_NAMES: Record<ShapeKind, string> = {
  circle: 'rond',
  square: 'carré',
  triangle: 'triangle',
  star: 'étoile',
  diamond: 'losange',
  cross: 'croix',
  hexagon: 'hexagone',
  octagon: 'octogone',
  pentagon: 'pentagone',
  heart: 'cœur',
  moon: 'lune',
  flag: 'drapeau',
};

const FEMININE: ReadonlySet<ShapeKind> = new Set(['star', 'cross', 'moon']);

/** « plein » ou « creux », accordé au nom de la forme (une étoile pleine, un rond creux). */
export function fillWord(shape: ShapeKind, filled: boolean, plural = false): string {
  const word = FEMININE.has(shape) ? (filled ? 'pleine' : 'creuse') : filled ? 'plein' : 'creux';
  return plural && !word.endsWith('x') ? `${word}s` : word;
}

/** Le nom avec son article : « le rond », « l’étoile », « la croix ». */
export function theShape(shape: ShapeKind): string {
  const name = SHAPE_NAMES[shape];
  if (/^[aeiouyéh]/.test(name)) return `l’${name}`;
  return `${FEMININE.has(shape) ? 'la' : 'le'} ${name}`;
}

export interface ShapeCard {
  shape: ShapeKind;
  filled: boolean;
  /** Rotation en degrés (multiple de 90). */
  rotation: number;
}

export function sameCard(a: ShapeCard, b: ShapeCard): boolean {
  return a.shape === b.shape && a.filled === b.filled && a.rotation === b.rotation;
}

export function describeShape(card: ShapeCard): string {
  const base = `${SHAPE_NAMES[card.shape]} ${fillWord(card.shape, card.filled)}`;
  return card.rotation ? `${base}, tourné de ${card.rotation}°` : base;
}
