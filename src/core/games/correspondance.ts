import { localized, tr, type Translations } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';
import { sameCard, type ShapeCard, type ShapeKind } from './shapes';

/**
 * Correspondance express : chaque nouvelle carte est-elle pareille à celle d'avant
 * (ou d'il y a deux, trois cartes) ? Le plus de bonnes réponses possible en 45 secondes.
 * Aux niveaux avancés, « pareille » veut dire « même valeur » : A = a, ⚂ = 3 ; et des pièges
 * reprennent une carte voisine de la bonne (celle d'il y a une ou trois cartes au lieu de deux).
 */

export const CORRESPONDANCE_DURATION_MS = 45_000;

export type CardSet =
  | 'shapes'
  | 'shapesFill'
  | 'similar'
  | 'letters'
  | 'similarLetters'
  | 'digits'
  | 'rotated'
  | 'mixed'
  /** Flèches orientées ET pleines ou creuses : les deux doivent concorder. */
  | 'rotatedFill'
  /** Lettres en majuscule ou en minuscule : A et a sont la même lettre. */
  | 'caseLetters'
  /** Valeurs de 1 à 6, en chiffre ou en face de dé : 3 et ⚂ sont pareils. */
  | 'dice'
  /** Mélange des jeux les plus durs : flèches pleines ou creuses, A = a, ⚂ = 3, formes proches. */
  | 'mixedHard';

export interface CorrespondanceLevel {
  set: CardSet;
  back: 1 | 2 | 3;
  /** Bonnes réponses (moins les erreurs) pour 100 pts. */
  target: number;
  /**
   * Part des cartes différentes qui sont des pièges : la copie d'une carte voisine de la bonne
   * (une carte de plus ou de moins en arrière). Absent = jamais.
   */
  lures?: number;
}

const L = (set: CardSet, back: 1 | 2 | 3, target: number, lures = 0): CorrespondanceLevel => ({
  set,
  back,
  target,
  ...(lures ? { lures } : {}),
});

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
  // Expert : nouvelles cartes (flèches pleines ou creuses, A = a, dés), premiers pièges, trois cartes en arrière.
  L('rotatedFill', 1, 27),
  L('caseLetters', 1, 26),
  L('similarLetters', 2, 19, 0.3),
  L('dice', 1, 26),
  L('shapes', 3, 17),
  L('mixed', 2, 19, 0.3),
  L('caseLetters', 2, 18),
  L('rotatedFill', 2, 18),
  L('letters', 3, 16),
  L('dice', 2, 18, 0.3),
  // Maître : trois cartes en arrière sur des cartes difficiles, plus de pièges.
  L('similar', 3, 16),
  L('caseLetters', 2, 17, 0.4),
  L('digits', 3, 15),
  L('rotatedFill', 2, 17, 0.4),
  L('dice', 3, 15),
  L('mixedHard', 2, 16),
  L('similarLetters', 3, 15, 0.3),
  L('caseLetters', 3, 14),
  L('rotated', 3, 14, 0.4),
  L('mixedHard', 2, 15, 0.4),
  // Légende : trois cartes en arrière, pièges fréquents, le mélange expert au niveau 50.
  L('similar', 3, 14, 0.4),
  L('dice', 3, 14, 0.4),
  L('rotatedFill', 3, 13),
  L('caseLetters', 3, 13, 0.4),
  L('mixed', 3, 13, 0.5),
  L('rotatedFill', 3, 12, 0.5),
  L('similarLetters', 3, 12, 0.5),
  L('caseLetters', 3, 12, 0.5),
  L('dice', 3, 12, 0.5),
  L('mixedHard', 3, 12, 0.5),
];

/** Libellés des jeux de cartes : [français, anglais], choisis à l'affichage. */
const SET_LABELS: Record<CardSet, Translations> = {
  shapes: { fr: 'formes', en: 'shapes' },
  shapesFill: { fr: 'formes pleines ou creuses', en: 'filled or hollow shapes' },
  similar: { fr: 'formes qui se ressemblent', en: 'look-alike shapes' },
  letters: { fr: 'lettres', en: 'letters' },
  similarLetters: { fr: 'lettres jumelles (b, d, p, q…)', en: 'twin letters (b, d, p, q…)' },
  digits: { fr: 'nombres', en: 'numbers' },
  rotated: { fr: 'flèches orientées', en: 'arrows facing different ways' },
  mixed: { fr: 'tout mélangé', en: 'all mixed up' },
  rotatedFill: { fr: 'flèches orientées, pleines ou creuses', en: 'filled or hollow arrows, facing different ways' },
  caseLetters: { fr: 'lettres, A = a', en: 'letters, A = a' },
  dice: { fr: 'dés et chiffres, ⚂ = 3', en: 'dice and digits, ⚂ = 3' },
  mixedHard: { fr: 'mélange expert', en: 'expert mix' },
};

/** « il y a deux cartes » (« two cards back »). */
function backLabel(back: number): string {
  if (back === 1) return tr('carte précédente', 'previous card');
  return back === 2 ? tr('il y a deux cartes', 'two cards back') : tr('il y a trois cartes', 'three cards back');
}

export function correspondanceLevel(level: number): CorrespondanceLevel {
  return pickLevel(CORRESPONDANCE_LEVELS, level);
}

export function correspondanceLevelLabel(level: number): string {
  const c = correspondanceLevel(level);
  const parts = [localized(SET_LABELS[c.set]), backLabel(c.back)];
  if (c.lures) parts.push(tr('pièges', 'traps'));
  return parts.join(' · ');
}

/** La règle affichée à l'intro. */
export function correspondanceRule(level: number): string {
  const c = correspondanceLevel(level);
  const parts = [
    c.back === 1
      ? tr(
          'Chaque nouvelle carte est-elle pareille à la précédente ? Réponds vite : 45 secondes.',
          'Is each new card the same as the one before? Answer fast: 45 seconds.',
        )
      : c.back === 2
        ? tr(
            'Chaque nouvelle carte est-elle pareille à celle d’il y a deux cartes ? 45 secondes.',
            'Is each new card the same as the one two cards back? 45 seconds.',
          )
        : tr(
            'Chaque nouvelle carte est-elle pareille à celle d’il y a trois cartes ? 45 secondes.',
            'Is each new card the same as the one three cards back? 45 seconds.',
          ),
  ];
  const byValue = correspondanceByValue(c.set);
  if (byValue === 'letters') parts.push(tr('Seule la lettre compte : A = a.', 'Only the letter counts: A = a.'));
  if (byValue === 'dice') parts.push(tr('Seule la valeur compte : 3 = ⚂.', 'Only the value counts: 3 = ⚂.'));
  if (byValue === 'both') parts.push(tr('Seule la valeur compte : A = a, 3 = ⚂.', 'Only the value counts: A = a, 3 = ⚂.'));
  if (c.lures) parts.push(tr('Méfie-toi : des cartes reviennent un cran trop tôt ou trop tard.', 'Watch out: some cards come back one step too early or too late.'));
  return parts.join(' ');
}

/** Le jeu compare des valeurs (A = a, ⚂ = 3) et non des dessins : lesquelles ? */
export function correspondanceByValue(set: CardSet): 'letters' | 'dice' | 'both' | null {
  if (set === 'caseLetters') return 'letters';
  if (set === 'dice') return 'dice';
  return set === 'mixedHard' ? 'both' : null;
}

/**
 * Une carte : une forme dessinée, ou un texte (lettre, nombre). `look` change le dessin, pas la
 * valeur : une lettre en minuscule, un nombre en face de dé. Deux cartes de même texte sont
 * pareilles, quel que soit leur dessin.
 */
export type MatchCard = { kind: 'shape'; shape: ShapeCard } | { kind: 'text'; text: string; look?: 'lower' | 'pips' };

export function sameMatch(a: MatchCard, b: MatchCard): boolean {
  if (a.kind === 'shape' && b.kind === 'shape') return sameCard(a.shape, b.shape);
  if (a.kind === 'text' && b.kind === 'text') return a.text === b.text;
  return false;
}

const BASIC: ShapeKind[] = ['circle', 'square', 'triangle', 'star', 'diamond', 'cross'];
const SIMILAR: ShapeKind[] = ['circle', 'octagon', 'hexagon', 'pentagon'];
const LETTERS = [...'BCDFGHJKLMNPRSTVXZ'];
const TWIN_LETTERS = ['b', 'd', 'p', 'q', 'n', 'u'];
/** Lettres dont la minuscule ne ressemble pas à la majuscule (A/a, G/g…) et qui se confondent entre elles. */
const CASE_LETTERS = [...'ABDEGHNQRT'];
const ROTATIONS = [0, 90, 180, 270];

/** Le même texte, dessiné au hasard d'une façon ou de l'autre : A ou a, 3 ou ⚂. */
function relook(rng: Rng, card: MatchCard): MatchCard {
  if (card.kind !== 'text' || !/^([A-Z]|[1-6])$/.test(card.text)) return card;
  const look = /^[A-Z]$/.test(card.text) ? 'lower' : 'pips';
  return rng.chance(0.5) ? { kind: 'text', text: card.text, look } : { kind: 'text', text: card.text };
}

/** Le jeu d'où vient une carte du mélange expert. */
function hardFamily(card: MatchCard): CardSet {
  if (card.kind === 'text') return /^[1-6]$/.test(card.text) ? 'dice' : 'caseLetters';
  return card.shape.shape === 'flag' ? 'rotatedFill' : 'similar';
}

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
    case 'rotatedFill':
      return { kind: 'shape', shape: { shape: 'flag', filled: rng.chance(0.5), rotation: rng.pick(ROTATIONS) } };
    case 'caseLetters':
      return relook(rng, { kind: 'text', text: rng.pick(CASE_LETTERS) });
    case 'dice':
      return relook(rng, { kind: 'text', text: String(rng.int(1, 6)) });
    case 'mixedHard':
      return randomCard(rng, rng.pick<CardSet>(['rotatedFill', 'caseLetters', 'dice', 'similar']));
  }
}

/** Une valeur voisine de la référence (un point de plus ou de moins), dessinée au hasard. */
function nearDice(rng: Rng, reference: string): MatchCard {
  const value = Number(reference);
  return relook(rng, { kind: 'text', text: String(rng.pick([value - 1, value + 1].filter((v) => v >= 1 && v <= 6))) });
}

/** Une carte différente mais proche de la référence : c'est là que l'œil se trompe. */
function nearMiss(rng: Rng, set: CardSet, reference: MatchCard): MatchCard {
  if (set === 'mixedHard') {
    // Parfois une carte d'une autre famille (sinon le mélange se figerait), le plus souvent une voisine trompeuse.
    if (rng.chance(0.3)) {
      const other = randomCard(rng, 'mixedHard');
      if (!sameMatch(other, reference)) return other;
    }
    return nearMiss(rng, hardFamily(reference), reference);
  }
  if (set === 'dice' && reference.kind === 'text' && rng.chance(0.6)) return nearDice(rng, reference.text);
  if (set === 'rotatedFill' && reference.kind === 'shape' && rng.chance(0.5)) {
    // Un seul détail change : le sens, ou le remplissage.
    const { shape } = reference;
    return rng.chance(0.5)
      ? { kind: 'shape', shape: { ...shape, filled: !shape.filled } }
      : { kind: 'shape', shape: { ...shape, rotation: rng.pick(ROTATIONS.filter((r) => r !== shape.rotation)) } };
  }
  // Nombres à deux chiffres : les inverser (27 / 72). Jamais pour un seul chiffre (dés).
  if (reference.kind === 'text' && /^\d{2,}$/.test(reference.text) && rng.chance(0.6)) {
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

/** Un piège : la copie d'une carte voisine de la bonne (une carte de plus ou de moins en arrière). */
function lure(rng: Rng, cards: readonly MatchCard[], i: number, back: number): MatchCard | null {
  const reference = cards[i - back];
  const options = [back - 1, back + 1]
    .filter((k) => k >= 1 && k <= i)
    .map((k) => cards[i - k])
    .filter((card) => !sameMatch(card, reference));
  return options.length ? relook(rng, rng.pick(options)) : null;
}

export function generateCorrespondance(rng: Rng, level: number, length = 160): CorrespondanceDeck {
  const { set, back, lures = 0 } = correspondanceLevel(level);
  // Quand seule la valeur compte, la carte pareille change souvent de dessin (A puis a).
  const byValue = correspondanceByValue(set) !== null;
  const cards: MatchCard[] = [];
  for (let i = 0; i < length; i++) {
    if (i < back) cards.push(randomCard(rng, set));
    else if (rng.chance(0.5)) cards.push(byValue ? relook(rng, cards[i - back]) : cards[i - back]);
    else cards.push((lures > 0 && rng.chance(lures) && lure(rng, cards, i, back)) || nearMiss(rng, set, cards[i - back]));
  }
  return { cards, same: cards.map((card, i) => i >= back && sameMatch(card, cards[i - back])) };
}

/** Bonnes réponses moins erreurs : répondre au hasard ne rapporte rien. */
export function scoreCorrespondance(correct: number, errors: number, level: number): number {
  return countScore(correct - errors, 0, correspondanceLevel(level).target);
}
