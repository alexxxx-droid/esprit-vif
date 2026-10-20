import { contentLang, extraGrammar } from '../content';
import { tr } from '../lang';

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

// Les autres langues ont leur grammaire (`LangGrammar`) ; une langue qui n'en a pas encore suit l'anglais.

/**
 * Le nom à glisser dans une phrase : celui de la langue en cours, ou l'anglais (l'identifiant de la
 * forme) quand la phrase suit la grammaire anglaise, pour une langue qui n'a pas encore la sienne :
 * « the star », jamais « the estrella ».
 */
function nameOf(shape: ShapeKind): string {
  return contentLang() === 'en' ? shape : SHAPE_NAMES[shape];
}

/**
 * « plein » ou « creux », accordé au nom de la forme (une étoile pleine, un rond creux).
 * En anglais, l'adjectif ne s'accorde pas : « filled » ou « hollow ».
 */
export function fillWord(shape: ShapeKind, filled: boolean, plural = false): string {
  const grammar = extraGrammar();
  if (grammar) return grammar.fillWord(shape, filled, plural);
  if (contentLang() === 'en') return filled ? 'filled' : 'hollow';
  const word = FEMININE.has(shape) ? (filled ? 'pleine' : 'creuse') : filled ? 'plein' : 'creux';
  return plural && !word.endsWith('x') ? `${word}s` : word;
}

/** Le nom avec son article : « le rond », « l’étoile », « la croix » (« the circle »). */
export function theShape(shape: ShapeKind): string {
  const name = nameOf(shape);
  const grammar = extraGrammar();
  if (grammar) return grammar.theShape(shape, name);
  if (contentLang() === 'en') return `the ${name}`;
  if (/^[aeiouyéh]/.test(name)) return `l’${name}`;
  return `${FEMININE.has(shape) ? 'la' : 'le'} ${name}`;
}

/** « 3 triangles », « 2 croix » (« 2 crosses ») : plusieurs exemplaires d'une forme (Balance). */
export function countShapes(shape: ShapeKind, count: number): string {
  const name = nameOf(shape);
  const grammar = extraGrammar();
  if (grammar) return grammar.countShapes(shape, name, count);
  if (contentLang() === 'en') return `${count} ${/(s|x)$/.test(name) ? `${name}es` : `${name}s`}`;
  return `${count} ${name.endsWith('x') ? name : name.endsWith('eau') ? `${name}x` : `${name}s`}`;
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
  const name = nameOf(card.shape);
  const grammar = extraGrammar();
  if (grammar) return grammar.describeShape(card, name);
  const fill = fillWord(card.shape, card.filled);
  if (contentLang() === 'en') return card.rotation ? `${fill} ${name}, rotated ${card.rotation}°` : `${fill} ${name}`;
  const base = `${name} ${fill}`;
  return card.rotation ? `${base}, tourné de ${card.rotation}°` : base;
}
