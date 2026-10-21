import { tr } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { clampScore } from '../scoring';

/**
 * Qui manque ? Des formes colorées à retenir, puis les mêmes avec une (ou deux) en moins : laquelle
 * a disparu ? On répond parmi quatre (ou cinq) propositions, dont des formes jamais montrées. Huit
 * manches, moins d'une minute.
 * Les paliers changent la façon de jouer : les formes changent de place (Confirmé), des pièges qui
 * ressemblent à la disparue, même forme ou même couleur (Expert), deux formes disparaissent
 * (Maître), les formes défilent une par une (Légende).
 */

export const MANQUE_ROUNDS = 8;

/** Une forme colorée : forme et couleur, de 0 à 7 (les huit d'Écho et d'Aiguillages). */
export interface Item {
  shape: number;
  color: number;
}

export interface ManqueLevel {
  items: number;
  /** Temps d'étude de la série entière (ou de chaque forme, quand elles défilent). */
  studyMs: number;
  /** Les formes défilent une par une, chacune `studyMs`. */
  sequential: boolean;
  /** Les formes restent à leur place (une case vide montre où était la disparue). */
  samePlace: boolean;
  /** Des pièges ressemblants : même forme ou même couleur que la disparue. */
  lookalike: boolean;
  missing: 1 | 2;
  /** Manches réussies pour 100 pts. */
  target: number;
}

/** Interpolation d'un palier : de `a` (1er niveau) à `b` (10e). */
const step = (i: number, a: number, b: number) => Math.round(a + ((b - a) * i) / 9);
/** Une durée de palier, arrondie à la dizaine de millisecondes. */
const ms = (i: number, a: number, b: number) => Math.round(step(i, a, b) / 100) * 100;

const lvl = (items: number, studyMs: number, sequential: boolean, samePlace: boolean, lookalike: boolean, missing: 1 | 2, target: number): ManqueLevel => ({
  items,
  studyMs,
  sequential,
  samePlace,
  lookalike,
  missing,
  target,
});

export const MANQUE_LEVELS: readonly ManqueLevel[] = [
  // Débutant : les formes gardent leur place ; une case vide montre où était la disparue.
  ...Array.from({ length: 10 }, (_, i) => lvl(step(i, 4, 6), ms(i, 3000, 2200), false, true, false, 1, 7)),
  // Confirmé : elles changent de place.
  ...Array.from({ length: 10 }, (_, i) => lvl(step(i, 5, 7), ms(i, 3000, 2400), false, false, false, 1, 7)),
  // Expert : des pièges qui ressemblent à la disparue.
  ...Array.from({ length: 10 }, (_, i) => lvl(step(i, 6, 7), ms(i, 2800, 2200), false, false, true, 1, 7)),
  // Maître : deux formes disparaissent.
  ...Array.from({ length: 10 }, (_, i) => lvl(step(i, 7, 8), ms(i, 3200, 2600), false, false, true, 2, 6)),
  // Légende : les formes défilent une par une.
  ...Array.from({ length: 10 }, (_, i) => lvl(step(i, 6, 8), ms(i, 650, 450), true, false, true, 1, 6)),
];

export function manqueLevel(level: number): ManqueLevel {
  return pickLevel(MANQUE_LEVELS, level);
}

export function manqueLevelLabel(level: number): string {
  const c = manqueLevel(level);
  return [
    tr(`${c.items} formes`, `${c.items} shapes`),
    c.sequential ? tr(`une par une, ${secondsLabel(c.studyMs)} chacune`, `one by one, ${secondsLabel(c.studyMs)} each`) : tr(`${secondsLabel(c.studyMs)} pour les voir`, `${secondsLabel(c.studyMs)} to look`),
    !c.samePlace && !c.sequential && tr('elles changent de place', 'they move'),
    c.lookalike && tr('pièges ressemblants', 'look-alike traps'),
    c.missing === 2 && tr('deux disparaissent', 'two go missing'),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** La règle affichée à l'intro. */
export function manqueRule(level: number): string {
  const c = manqueLevel(level);
  const parts = [
    c.missing === 2
      ? tr('Retiens les formes. Puis deux ont disparu : touche-les toutes les deux parmi les propositions.', 'Remember the shapes. Then two are gone: tap both among the choices.')
      : tr('Retiens les formes. Puis l’une a disparu : touche-la parmi les propositions.', 'Remember the shapes. Then one is gone: tap it among the choices.'),
    c.sequential && tr('Les formes défilent une par une.', 'The shapes appear one by one.'),
    !c.samePlace && !c.sequential && tr('Attention : elles changent de place.', 'Careful: they move around.'),
    c.lookalike && tr('Certaines propositions ressemblent beaucoup à la disparue : même forme ou même couleur.', 'Some choices look a lot like the missing one: same shape or same color.'),
    tr(`${MANQUE_ROUNDS} manches.`, `${MANQUE_ROUNDS} rounds.`),
  ];
  return parts.filter(Boolean).join(' ');
}

export interface ManqueRound {
  /** La série à retenir, dans l'ordre des cases. */
  shown: Item[];
  /** Les index (dans `shown`) des formes qui disparaissent. */
  gone: number[];
  /** La série qui reste, dans l'ordre où on la montre (`null` : la case vide de la disparue). */
  rest: (Item | null)[];
  /** Les propositions : les disparues et des formes jamais montrées. */
  options: Item[];
}

const same = (a: Item, b: Item) => a.shape === b.shape && a.color === b.color;
const key = (i: Item) => `${i.shape}-${i.color}`;

export function generateManque(rng: Rng, level: number): ManqueRound[] {
  const c = manqueLevel(level);
  return Array.from({ length: MANQUE_ROUNDS }, () => {
    // Sans pièges : chaque forme et chaque couleur une seule fois. Avec : elles peuvent se répéter.
    let shown: Item[];
    if (!c.lookalike) {
      const shapes = rng.shuffle(Array.from({ length: 8 }, (_, i) => i));
      const colors = rng.shuffle(Array.from({ length: 8 }, (_, i) => i));
      shown = Array.from({ length: c.items }, (_, k) => ({ shape: shapes[k], color: colors[k] }));
    } else {
      const seen = new Set<string>();
      shown = [];
      while (shown.length < c.items) {
        const item = { shape: rng.int(0, 7), color: rng.int(0, 7) };
        if (!seen.has(key(item))) {
          seen.add(key(item));
          shown.push(item);
        }
      }
    }
    const gone = rng.shuffle(shown.map((_, k) => k)).slice(0, c.missing);
    const rest = c.samePlace ? shown.map((item, k) => (gone.includes(k) ? null : item)) : rng.shuffle(shown.filter((_, k) => !gone.includes(k)));
    // Des propositions jamais montrées (trois, quatre quand deux disparaissent) ; ressemblantes aux paliers avancés.
    const decoys: Item[] = [];
    const taken = (item: Item) => shown.some((s) => same(s, item)) || decoys.some((d) => same(d, item));
    const missing = gone.map((k) => shown[k]);
    while (decoys.length < 3 + (c.missing - 1)) {
      const base = rng.pick(missing);
      const item =
        c.lookalike && rng.chance(0.75)
          ? rng.chance(0.5)
            ? { shape: base.shape, color: rng.int(0, 7) }
            : { shape: rng.int(0, 7), color: base.color }
          : { shape: rng.int(0, 7), color: rng.int(0, 7) };
      if (!taken(item)) decoys.push(item);
    }
    return { shown, gone, rest, options: rng.shuffle([...missing, ...decoys]) };
  });
}

/** Manches réussies rapportées à l'objectif du niveau. */
export function scoreManque(won: number, level: number): number {
  return clampScore((100 * won) / manqueLevel(level).target);
}
