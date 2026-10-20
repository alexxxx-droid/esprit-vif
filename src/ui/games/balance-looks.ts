import type { ShapeKind } from '../../core/games/shapes';

/** Allure des objets de la Balance : chacun se reconnaît d'abord à sa forme, la couleur ne fait qu'aider l'œil. */
export const BALANCE_LOOKS: readonly { shape: ShapeKind; color: string }[] = [
  { shape: 'circle', color: 'var(--d-calcul)' },
  { shape: 'square', color: 'var(--d-memoire)' },
  { shape: 'triangle', color: 'var(--d-attention)' },
  { shape: 'star', color: 'var(--d-vitesse)' },
  { shape: 'heart', color: 'var(--d-langage)' },
  { shape: 'hexagon', color: 'var(--d-logique)' },
  { shape: 'diamond', color: 'var(--ink-2)' },
];

/** Au-delà de 7 objets (niveaux 25 et plus) : trois formes de plus, bien distinctes des sept premières. */
export const BALANCE_LOOKS_XL: readonly { shape: ShapeKind; color: string }[] = [
  ...BALANCE_LOOKS,
  { shape: 'cross', color: 'var(--d-memoire)' },
  { shape: 'moon', color: 'var(--d-vitesse)' },
  { shape: 'flag', color: 'var(--d-attention)' },
];
