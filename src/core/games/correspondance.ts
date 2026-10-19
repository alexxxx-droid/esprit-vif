import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';
import { sameCard, type ShapeCard, type ShapeKind } from './shapes';

/**
 * Correspondance express : chaque nouvelle carte est-elle pareille à celle d'avant
 * (ou d'il y a deux cartes) ? Le plus de bonnes réponses possible en 45 secondes.
 */

export const CORRESPONDANCE_DURATION_MS = 45_000;

export type CardSet = 'shapes' | 'shapesFill' | 'similar' | 'letters' | 'similarLetters' | 'digits' | 'rotated' | 'mixed';

export interface CorrespondanceLevel {
  set: CardSet;
  back: 1 | 2;
  /** Bonnes réponses (moins les erreurs) pour 100 pts. */
  target: number;
}

const L = (set: CardSet, back: 1 | 2, target: number): CorrespondanceLevel => ({ set, back, target });

export const CORRESPONDANCE_LEVELS: readonly CorrespondanceLevel[] = [
  L('shapes', 1, 30),
  L('shapesFill', 1, 30),
  L('letters', 1, 32),
  L('similar', 1, 30),
  L('digits', 1, 30),
  L('rotated', 1, 28),
  L('shapes', 2, 22),
  L('similarLetters', 1, 28),
  L('shapesFill', 2, 22),
  L('rotated', 1, 30),
  L('digits', 1, 32),
  L('letters', 2, 22),
  L('similar', 1, 32),
  L('rotated', 2, 20),
  L('digits', 2, 22),
  L('similarLetters', 2, 20),
  L('mixed', 1, 30),
  L('similar', 2, 20),
  L('rotated', 2, 22),
  L('mixed', 2, 20),
];

/** Libellés des jeux de cartes : [français, anglais], choisis à l'affichage. */
const SET_LABELS: Record<CardSet, readonly [string, string]> = {
  shapes: ['formes', 'shapes'],
  shapesFill: ['formes pleines ou creuses', 'filled or hollow shapes'],
  similar: ['formes qui se ressemblent', 'look-alike shapes'],
  letters: ['lettres', 'letters'],
  similarLetters: ['lettres jumelles (b, d, p, q…)', 'twin letters (b, d, p, q…)'],
  digits: ['nombres', 'numbers'],
  rotated: ['flèches orientées', 'arrows facing different ways'],
  mixed: ['tout mélangé', 'all mixed up'],
};

export function correspondanceLevel(level: number): CorrespondanceLevel {
  return pickLevel(CORRESPONDANCE_LEVELS, level);
}

export function correspondanceLevelLabel(level: number): string {
  const c = correspondanceLevel(level);
  return `${tr(...SET_LABELS[c.set])} · ${c.back === 1 ? tr('carte précédente', 'previous card') : tr('il y a deux cartes', 'two cards back')}`;
}

/** Une carte : une forme dessinée, ou un texte (lettre, nombre). */
export type MatchCard = { kind: 'shape'; shape: ShapeCard } | { kind: 'text'; text: string };

export function sameMatch(a: MatchCard, b: MatchCard): boolean {
  if (a.kind === 'shape' && b.kind === 'shape') return sameCard(a.shape, b.shape);
  if (a.kind === 'text' && b.kind === 'text') return a.text === b.text;
  return false;
}

const BASIC: ShapeKind[] = ['circle', 'square', 'triangle', 'star', 'diamond', 'cross'];
const SIMILAR: ShapeKind[] = ['circle', 'octagon', 'hexagon', 'pentagon'];
const LETTERS = [...'BCDFGHJKLMNPRSTVXZ'];
const TWIN_LETTERS = ['b', 'd', 'p', 'q', 'n', 'u'];

function randomCard(rng: Rng, set: CardSet): MatchCard {
  switch (set) {
    case 'shapes':
      return { kind: 'shape', shape: { shape: rng.pick(BASIC), filled: true, rotation: 0 } };
    case 'shapesFill':
      return { kind: 'shape', shape: { shape: rng.pick(BASIC), filled: rng.chance(0.5), rotation: 0 } };
    case 'similar':
      return { kind: 'shape', shape: { shape: rng.pick(SIMILAR), filled: rng.chance(0.5), rotation: 0 } };
    case 'letters':
      return { kind: 'text', text: rng.pick(LETTERS) };
    case 'similarLetters':
      return { kind: 'text', text: rng.pick(TWIN_LETTERS) };
    case 'digits':
      return { kind: 'text', text: String(rng.int(10, 99)) };
    case 'rotated':
      return { kind: 'shape', shape: { shape: 'flag', filled: true, rotation: rng.pick([0, 90, 180, 270]) } };
    case 'mixed':
      return randomCard(rng, rng.pick<CardSet>(['shapesFill', 'letters', 'digits', 'rotated']));
  }
}

/** Une carte différente mais proche de la référence : c'est là que l'œil se trompe. */
function nearMiss(rng: Rng, set: CardSet, reference: MatchCard): MatchCard {
  if (reference.kind === 'text' && /^\d+$/.test(reference.text) && rng.chance(0.6)) {
    const [a, b] = reference.text;
    const swapped = `${b}${a}`;
    if (swapped !== reference.text && !swapped.startsWith('0')) return { kind: 'text', text: swapped };
  }
  for (let attempt = 0; attempt < 30; attempt++) {
    const candidate = randomCard(rng, set === 'mixed' ? (reference.kind === 'text' ? 'letters' : 'shapesFill') : set);
    if (!sameMatch(candidate, reference)) return candidate;
  }
  return reference.kind === 'text' ? { kind: 'text', text: `${reference.text}!` } : { kind: 'shape', shape: { ...reference.shape, filled: !reference.shape.filled } };
}

export interface CorrespondanceDeck {
  cards: MatchCard[];
  /** Pour chaque carte (à partir de `back`), est-elle pareille à celle d'il y a `back` cartes ? */
  same: boolean[];
}

export function generateCorrespondance(rng: Rng, level: number, length = 160): CorrespondanceDeck {
  const { set, back } = correspondanceLevel(level);
  const cards: MatchCard[] = [];
  for (let i = 0; i < length; i++) {
    if (i < back) cards.push(randomCard(rng, set));
    else cards.push(rng.chance(0.5) ? cards[i - back] : nearMiss(rng, set, cards[i - back]));
  }
  return { cards, same: cards.map((card, i) => i >= back && sameMatch(card, cards[i - back])) };
}

/** Bonnes réponses moins erreurs : répondre au hasard ne rapporte rien. */
export function scoreCorrespondance(correct: number, errors: number, level: number): number {
  return countScore(correct - errors, 0, correspondanceLevel(level).target);
}
