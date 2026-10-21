import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * Changement de règle : un nombre dans un cadre de couleur ; la couleur dit la règle (bleu : pair
 * ou impair ? orange : plus petit ou plus grand que 5 ? vert : en haut ou en bas ?). Deux boutons,
 * autant de réponses que possible en 45 s ; une erreur retire un point. Changer de règle sans se
 * tromper : c'est la flexibilité mentale, qu'aucun autre jeu ne travaille ainsi.
 * Les paliers changent la façon de jouer : la règle change à n'importe quelle carte (Confirmé), une
 * troisième règle, la place de la carte (Expert), des boutons qui ne disent plus la règle (Maître),
 * des cartes en contre-ordre, cadre rouge en pointillés : on répond l'inverse (Légende).
 */

export const REGLE_DURATION_MS = 45_000;

export type RegleRule = 'parite' | 'taille' | 'place';

export interface RegleLevel {
  rules: readonly RegleRule[];
  /** La règle change toutes les `block` cartes (Débutant), sinon au hasard avec la chance `switchChance`. */
  block: number;
  switchChance: number;
  /** Les boutons disent la règle en cours (« Impair », « Pair »…) ou seulement ◀ ▶. */
  labels: boolean;
  /** Part des cartes en contre-ordre. */
  inverse: number;
  /** Bonnes réponses moins erreurs pour 100 pts. */
  target: number;
}

/** Interpolation d'un palier : de `a` (1er niveau) à `b` (10e). */
const step = (i: number, a: number, b: number) => Math.round(a + ((b - a) * i) / 9);

const TWO: readonly RegleRule[] = ['parite', 'taille'];
const THREE: readonly RegleRule[] = ['parite', 'taille', 'place'];

const lvl = (rules: readonly RegleRule[], block: number, switchChance: number, labels: boolean, inverse: number, target: number): RegleLevel => ({
  rules,
  block,
  switchChance,
  labels,
  inverse,
  target,
});

export const REGLE_LEVELS: readonly RegleLevel[] = [
  // Débutant : deux règles, qui changent par blocs.
  ...Array.from({ length: 10 }, (_, i) => lvl(TWO, step(i, 8, 4), 0, true, 0, step(i, 26, 31))),
  // Confirmé : la règle change à n'importe quelle carte.
  ...Array.from({ length: 10 }, (_, i) => lvl(TWO, 0, step(i, 30, 50) / 100, true, 0, step(i, 24, 28))),
  // Expert : une troisième règle, la place de la carte.
  ...Array.from({ length: 10 }, (_, i) => lvl(THREE, 0, step(i, 35, 50) / 100, true, 0, step(i, 22, 26))),
  // Maître : les boutons ne disent plus la règle.
  ...Array.from({ length: 10 }, (_, i) => lvl(i < 5 ? TWO : THREE, 0, step(i, 35, 50) / 100, false, 0, step(i, 21, 25))),
  // Légende : des cartes en contre-ordre, on répond l'inverse.
  ...Array.from({ length: 10 }, (_, i) => lvl(THREE, 0, 0.5, i < 5, step(i, 15, 25) / 100, step(i, 19, 22))),
];

export function regleLevel(level: number): RegleLevel {
  return pickLevel(REGLE_LEVELS, level);
}

export function regleLevelLabel(level: number): string {
  const c = regleLevel(level);
  return [
    tr(`${c.rules.length} règles`, `${c.rules.length} rules`),
    c.block ? tr(`elle change toutes les ${c.block} cartes`, `changes every ${c.block} cards`) : tr(`change au hasard (${Math.round(c.switchChance * 100)} %)`, `random switches (${Math.round(c.switchChance * 100)}%)`),
    !c.labels && tr('boutons muets', 'silent buttons'),
    c.inverse > 0 && tr(`contre-ordres (${Math.round(c.inverse * 100)} %)`, `reversals (${Math.round(c.inverse * 100)}%)`),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Ce que demande chaque règle : le côté gauche, puis le côté droit. */
export function ruleSides(rule: RegleRule): [string, string] {
  switch (rule) {
    case 'parite':
      return [tr('Impair', 'Odd'), tr('Pair', 'Even')];
    case 'taille':
      return [tr('Moins de 5', 'Under 5'), tr('Plus de 5', 'Over 5')];
    case 'place':
      return [tr('En haut', 'Top'), tr('En bas', 'Bottom')];
  }
}

/** La règle affichée à l'intro. */
export function regleRule(level: number): string {
  const c = regleLevel(level);
  const parts = [
    tr(
      'La couleur du cadre dit la règle : bleu, pair ou impair ? orange, moins ou plus de 5 ? Réponds à gauche ou à droite ; une erreur retire un point. 45 secondes.',
      'The frame color tells the rule: blue, odd or even? orange, under or over 5? Answer left or right; a mistake costs a point. 45 seconds.',
    ),
    c.rules.includes('place') && tr('Vert : la carte est-elle en haut ou en bas ?', 'Green: is the card at the top or the bottom?'),
    !c.labels && tr('Les boutons ne disent plus la règle : à gauche impair, moins de 5, en haut ; à droite pair, plus de 5, en bas.', 'The buttons no longer say the rule: left is odd, under 5, top; right is even, over 5, bottom.'),
    c.inverse > 0 && tr('Cadre rouge en pointillés : contre-ordre, réponds l’inverse !', 'Dotted red frame: reversal, give the opposite answer!'),
  ];
  return parts.filter(Boolean).join(' ');
}

export interface RegleCard {
  rule: RegleRule;
  number: number;
  /** La carte s'affiche en haut (sinon en bas). */
  top: boolean;
  inverse: boolean;
}

/** Le bon côté : 0 à gauche, 1 à droite. */
export function regleAnswer(card: RegleCard): 0 | 1 {
  const side = card.rule === 'parite' ? card.number % 2 === 0 : card.rule === 'taille' ? card.number > 5 : !card.top;
  return (Number(side) ^ Number(card.inverse)) as 0 | 1;
}

/** Assez de cartes pour une partie, même très rapide. */
const LENGTH = 200;

export function generateRegle(rng: Rng, level: number): RegleCard[] {
  const c = regleLevel(level);
  const cards: RegleCard[] = [];
  let rule = rng.pick(c.rules);
  for (let k = 0; k < LENGTH; k++) {
    if (k > 0 && (c.block ? k % c.block === 0 : rng.chance(c.switchChance))) rule = rng.pick(c.rules.filter((r) => r !== rule));
    const previous = cards[k - 1];
    let number = rng.pick([1, 2, 3, 4, 6, 7, 8, 9]);
    // Jamais deux fois le même nombre de suite : on verrait mal qu'une carte a changé.
    if (previous && number === previous.number) number = number === 9 ? 1 : number + 1 === 5 ? 6 : number + 1;
    cards.push({ rule, number, top: rng.chance(0.5), inverse: rng.chance(c.inverse) });
  }
  return cards;
}

/** Bonnes réponses moins erreurs, rapportées à l'objectif du niveau. */
export function scoreRegle(correct: number, errors: number, level: number): number {
  return countScore(correct - errors, 0, regleLevel(level).target);
}
