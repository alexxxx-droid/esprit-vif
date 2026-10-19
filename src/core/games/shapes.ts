import { lang, tr } from '../lang';

/** Formes utilisées par plusieurs jeux (Réflexe, Correspondance express…). */
export const SHAPES = ['circle', 'square', 'triangle', 'star', 'diamond', 'cross', 'hexagon', 'octagon', 'pentagon', 'heart', 'moon', 'flag'] as const;
export type ShapeKind = (typeof SHAPES)[number];

/** Nom de chaque forme, dans la langue en cours. */
export const SHAPE_NAMES: Record<ShapeKind, string> = {
  get circle() {
    return tr('rond', 'circle');
  },
  get square() {
    return tr('carré', 'square');
  },
  get triangle() {
    return tr('triangle', 'triangle');
  },
  get star() {
    return tr('étoile', 'star');
  },
  get diamond() {
    return tr('losange', 'diamond');
  },
  get cross() {
    return tr('croix', 'cross');
  },
  get hexagon() {
    return tr('hexagone', 'hexagon');
  },
  get octagon() {
    return tr('octogone', 'octagon');
  },
  get pentagon() {
    return tr('pentagone', 'pentagon');
  },
  get heart() {
    return tr('cœur', 'heart');
  },
  get moon() {
    return tr('lune', 'moon');
  },
  get flag() {
    return tr('drapeau', 'flag');
  },
};

const FEMININE: ReadonlySet<ShapeKind> = new Set(['star', 'cross', 'moon']);

/**
 * « plein » ou « creux », accordé au nom de la forme (une étoile pleine, un rond creux).
 * En anglais, l'adjectif ne s'accorde pas : « filled » ou « hollow ».
 */
export function fillWord(shape: ShapeKind, filled: boolean, plural = false): string {
  if (lang() === 'en') return filled ? 'filled' : 'hollow';
  const word = FEMININE.has(shape) ? (filled ? 'pleine' : 'creuse') : filled ? 'plein' : 'creux';
  return plural && !word.endsWith('x') ? `${word}s` : word;
}

/** Le nom avec son article : « le rond », « l’étoile », « la croix » (« the circle »). */
export function theShape(shape: ShapeKind): string {
  const name = SHAPE_NAMES[shape];
  if (lang() === 'en') return `the ${name}`;
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

/** « étoile creuse, tourné de 90° » ; en anglais, l'adjectif d'abord : « hollow star, rotated 90° ». */
export function describeShape(card: ShapeCard): string {
  const name = SHAPE_NAMES[card.shape];
  const fill = fillWord(card.shape, card.filled);
  if (lang() === 'en') return card.rotation ? `${fill} ${name}, rotated ${card.rotation}°` : `${fill} ${name}`;
  const base = `${name} ${fill}`;
  return card.rotation ? `${base}, tourné de ${card.rotation}°` : base;
}
