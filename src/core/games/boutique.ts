import { tr } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * La boutique : des clients entrent et sortent, parfois en même temps. Combien sont à l'intérieur à la fin ?
 * Les chats qui passent dans la rue ne comptent pas.
 *
 * Aux niveaux avancés : la question peut changer (combien sont entrés ? sortis ?), une boulangerie
 * ouvre à côté (ses clients ne comptent pas), puis il faut suivre les deux magasins à la fois.
 */

export const BOUTIQUE_ROUNDS = 5;

export interface BoutiqueEvent {
  enter: number;
  leave: number;
  /** Chats qui passent devant la vitrine (à ne pas compter). */
  cats: number;
  /** Clients qui entrent dans la boulangerie voisine, ou en sortent. */
  bakeryIn: number;
  bakeryOut: number;
}

/** La question de fin : le compte dans la boutique (la règle de base), les entrées, les sorties, ou la boulangerie. */
export type BoutiqueQuestion = 'inside' | 'entered' | 'left' | 'bakery';

export interface BoutiqueRound {
  start: number;
  events: BoutiqueEvent[];
  /** Clients dans la boutique à la fin. */
  answer: number;
  /** Clients dans la boulangerie au début (null : pas de boulangerie). */
  bakeryStart: number | null;
  question: BoutiqueQuestion;
  /** Le nombre à taper, selon la question. */
  expected: number;
}

export interface BoutiqueLevel {
  events: number;
  /** Clients au plus par mouvement. */
  maxMoves: number;
  /** Durée de chaque mouvement. */
  stepMs: number;
  startMin: number;
  startMax: number;
  /** Entrées et sorties en même temps. */
  both: boolean;
  cats: boolean;
  /** Part des manches où la question porte sur les entrées ou les sorties (et non sur le compte final). */
  surprise: number;
  /** Une boulangerie à côté : ses clients ne comptent pas… sauf si la question porte sur elle. */
  bakery: boolean;
  /** Part des manches où la question porte sur la boulangerie. */
  askBakery: number;
}

type Twists = Partial<Pick<BoutiqueLevel, 'surprise' | 'bakery' | 'askBakery'>>;

const L = (
  events: number,
  maxMoves: number,
  stepMs: number,
  startMin: number,
  startMax: number,
  both: boolean,
  cats = false,
  twists: Twists = {},
): BoutiqueLevel => ({
  events,
  maxMoves,
  stepMs,
  startMin,
  startMax,
  both,
  cats,
  surprise: twists.surprise ?? 0,
  bakery: twists.bakery ?? false,
  askBakery: twists.askBakery ?? 0,
});

const surprise = (share: number): Twists => ({ surprise: share });
const bakery = (twists: Twists = {}): Twists => ({ bakery: true, ...twists });

export const BOUTIQUE_LEVELS: readonly BoutiqueLevel[] = [
  L(3, 1, 1700, 0, 2, false),
  L(4, 1, 1600, 0, 3, false),
  L(4, 2, 1600, 1, 3, false),
  L(5, 2, 1500, 1, 4, true),
  L(5, 2, 1400, 2, 5, true),
  L(6, 2, 1400, 2, 5, true),
  L(6, 3, 1400, 2, 6, true),
  L(6, 2, 1300, 2, 6, true, true),
  L(7, 3, 1300, 3, 6, true),
  L(7, 3, 1200, 3, 7, true, true),
  L(8, 3, 1200, 3, 7, true),
  L(8, 3, 1100, 3, 7, true, true),
  L(8, 4, 1150, 3, 8, true),
  L(9, 3, 1050, 3, 8, true, true),
  L(9, 4, 1050, 4, 8, true),
  L(9, 4, 950, 4, 8, true, true),
  L(10, 4, 950, 4, 9, true),
  L(10, 4, 850, 4, 9, true, true),
  L(11, 4, 800, 5, 9, true, true),
  L(12, 5, 750, 5, 9, true, true),
  // Expert : la question surprise (entrés ? sortis ?) oblige à tenir deux comptes.
  L(8, 3, 1100, 3, 7, true, true, surprise(0.4)),
  L(9, 3, 1050, 3, 8, true, false, surprise(0.4)),
  L(9, 4, 1000, 3, 8, true, true, surprise(0.5)),
  L(10, 4, 950, 4, 8, true, false, surprise(0.5)),
  L(10, 4, 900, 4, 9, true, true, surprise(0.5)),
  L(11, 4, 900, 4, 9, true, true, surprise(0.6)),
  L(11, 4, 850, 4, 9, true, false, surprise(0.6)),
  L(12, 4, 850, 5, 9, true, true, surprise(0.6)),
  L(12, 5, 800, 5, 9, true, true, surprise(0.6)),
  L(12, 5, 750, 5, 10, true, true, surprise(0.7)),
  // Maître : la boulangerie d'à côté, dont les clients ne comptent pas.
  L(8, 3, 1100, 3, 7, true, false, bakery()),
  L(9, 3, 1050, 3, 8, true, true, bakery()),
  L(9, 4, 1000, 3, 8, true, false, bakery(surprise(0.3))),
  L(10, 4, 950, 4, 8, true, true, bakery(surprise(0.3))),
  L(10, 4, 900, 4, 9, true, true, bakery(surprise(0.4))),
  L(11, 4, 900, 4, 9, true, false, bakery(surprise(0.5))),
  L(11, 4, 850, 4, 9, true, true, bakery(surprise(0.5))),
  L(12, 4, 850, 5, 9, true, true, bakery(surprise(0.5))),
  L(12, 5, 800, 5, 9, true, true, bakery(surprise(0.6))),
  L(12, 5, 750, 5, 10, true, true, bakery(surprise(0.6))),
  // Légende : la question peut porter sur l'un ou l'autre magasin.
  L(7, 3, 1200, 2, 5, true, false, bakery({ askBakery: 0.5 })),
  L(8, 3, 1100, 2, 6, true, true, bakery({ askBakery: 0.5 })),
  L(8, 3, 1050, 3, 6, true, false, bakery({ askBakery: 0.5 })),
  L(9, 3, 1000, 3, 7, true, true, bakery({ askBakery: 0.5 })),
  L(9, 4, 950, 3, 7, true, true, bakery({ askBakery: 0.5 })),
  L(9, 3, 1000, 3, 7, true, false, bakery({ askBakery: 0.4, surprise: 0.3 })),
  L(10, 4, 950, 3, 8, true, true, bakery({ askBakery: 0.4, surprise: 0.3 })),
  L(10, 4, 900, 4, 8, true, true, bakery({ askBakery: 0.5, surprise: 0.3 })),
  L(11, 4, 850, 4, 8, true, true, bakery({ askBakery: 0.5, surprise: 0.3 })),
  L(12, 4, 800, 4, 9, true, true, bakery({ askBakery: 0.5, surprise: 0.3 })),
];

export function boutiqueLevel(level: number): BoutiqueLevel {
  return pickLevel(BOUTIQUE_LEVELS, level);
}

export function boutiqueLevelLabel(level: number): string {
  const c = boutiqueLevel(level);
  const step = secondsLabel(c.stepMs);
  return [
    tr(`${c.events} mouvements`, `${c.events} moves`),
    tr(`${step} chacun`, `${step} each`),
    c.both && tr('entrées et sorties mêlées', 'ins and outs at once'),
    c.cats && tr('chats farceurs', 'sneaky cats'),
    c.surprise > 0 && tr('question surprise', 'surprise question'),
    c.bakery && (c.askBakery > 0 ? tr('deux magasins à suivre', 'two stores to track') : tr('boulangerie voisine', 'bakery next door')),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** La règle du niveau, affichée à l'intro. */
export function boutiqueRule(level: number): string {
  const c = boutiqueLevel(level);
  const base = c.cats
    ? tr(
        'Des clients entrent et sortent : combien sont dans la boutique à la fin ? Les chats ne comptent pas !',
        'Customers come in and go out: how many are in the shop at the end? Cats don’t count!',
      )
    : tr('Des clients entrent et sortent : combien sont dans la boutique à la fin ?', 'Customers come in and go out: how many are in the shop at the end?');
  return [
    base,
    c.bakery &&
      (c.askBakery > 0
        ? tr(
            'Compte aussi la boulangerie, à gauche : la question peut porter sur l’une ou l’autre.',
            'Keep count of the bakery too, on the left: the question may be about either one.',
          )
        : tr('Les clients de la boulangerie, à gauche, ne comptent pas.', 'Bakery customers, on the left, don’t count.')),
    c.surprise > 0 &&
      tr(
        'Parfois, on te demande plutôt combien sont entrés dans la boutique, ou combien en sont sortis.',
        'Sometimes you’re asked instead how many went into the shop, or how many came out.',
      ),
  ]
    .filter(Boolean)
    .join(' ');
}

export function generateBoutiqueRound(rng: Rng, level: number): BoutiqueRound {
  const c = boutiqueLevel(level);
  const start = rng.int(c.startMin, c.startMax);
  let inside = start;
  const events: BoutiqueEvent[] = [];
  for (let i = 0; i < c.events; i++) {
    let enter = 0;
    let leave = 0;
    const mixed = c.both && inside > 0 && rng.chance(0.4);
    if (mixed) {
      enter = rng.int(1, c.maxMoves);
      leave = rng.int(1, Math.min(c.maxMoves, inside));
    } else if (inside > 0 && rng.chance(0.45)) {
      leave = rng.int(1, Math.min(c.maxMoves, inside));
    } else {
      enter = rng.int(1, c.maxMoves);
    }
    // Ceux qui sortent étaient déjà dedans : le compte ne devient jamais négatif.
    inside = inside - leave + enter;
    events.push({ enter, leave, cats: c.cats && rng.chance(0.35) ? rng.int(1, 2) : 0, bakeryIn: 0, bakeryOut: 0 });
  }
  // Tirages des niveaux avancés, après ceux de base : les manches des niveaux 1 à 20 ne changent pas.
  const bakeryStart = c.bakery ? rng.int(c.startMin, c.startMax) : null;
  let bakeryInside = bakeryStart ?? 0;
  if (c.bakery) {
    for (const event of events) {
      if (!rng.chance(0.65)) continue;
      if (bakeryInside > 0 && rng.chance(0.45)) event.bakeryOut = rng.int(1, Math.min(c.maxMoves - 1, bakeryInside));
      else event.bakeryIn = rng.int(1, c.maxMoves - 1);
      bakeryInside += event.bakeryIn - event.bakeryOut;
    }
  }
  let question: BoutiqueQuestion = 'inside';
  if (c.askBakery > 0 && rng.chance(c.askBakery)) question = 'bakery';
  else if (c.surprise > 0 && rng.chance(c.surprise)) question = rng.chance(0.5) ? 'entered' : 'left';
  const total = (key: 'enter' | 'leave') => events.reduce((sum, e) => sum + e[key], 0);
  const expected = { inside, entered: total('enter'), left: total('leave'), bakery: bakeryInside }[question];
  return { start, events, answer: inside, bakeryStart, question, expected };
}

/** 20 pts par manche réussie. */
export function scoreBoutique(correct: number): number {
  return countScore(correct, 0, BOUTIQUE_ROUNDS);
}
