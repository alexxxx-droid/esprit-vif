import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { clampLevel, countScore } from '../scoring';
import { categories, type Category } from './lexique';

/**
 * Catégories : des mots d'une même catégorie et un intrus. Au début l'intrus vient de loin
 * (un violon parmi des fruits) ; ensuite il vient de la même famille (un radis parmi des fruits).
 * Expert : il vient de la catégorie jumelle (légume parmi les fruits, outil parmi les ustensiles).
 * Maître : les mots vont par paires de même initiale, l'intrus compris. Légende : paires de même
 * initiale et de même longueur, et l'objectif remonte.
 */

export const CATEGORIES_DURATION_MS = 45_000;

export interface CategoriesLevel {
  words: number;
  /** Probabilité que l'intrus vienne d'une catégorie voisine (même famille). */
  near: number;
  /** Bonnes réponses en une partie pour 100 pts (une erreur en retire une). */
  target: number;
  /** Probabilité que l'intrus vienne de la catégorie jumelle (`TWIN_CATEGORIES`), dès le niveau 21. */
  twin?: number;
  /**
   * Grille camouflée : les mots vont par paires de même initiale (1), et de même longueur à une
   * lettre près (2) ; l'intrus forme l'une de ces paires. Il ne se repère plus d'un coup d'œil.
   */
  camouflage?: 1 | 2;
}

const L = (words: number, near: number, target: number, twin?: number, camouflage?: 1 | 2): CategoriesLevel =>
  twin === undefined ? { words, near, target } : camouflage ? { words, near, target, twin, camouflage } : { words, near, target, twin };

/** Les niveaux 1 à 20 gardent leur tirage d'origine (records et test du jour en dépendent). */
const CLASSIC_LEVELS = 20;

/**
 * Catégories jumelles, toujours de la même famille : là où l'intrus se cache le mieux. Écartées
 * parce qu'elles rendraient l'énigme discutable : l'espace et la météo (le soleil), l'école et
 * les outils (l'équerre), les desserts et les boissons (le milkshake), le sport et les transports
 * (le vélo).
 */
const TWIN_CATEGORIES: Readonly<Record<string, readonly string[]>> = {
  fruits: ['legumes'],
  legumes: ['fruits', 'epices'],
  epices: ['legumes'],
  desserts: ['fromages'],
  fromages: ['desserts'],
  sauvages: ['ferme'],
  ferme: ['sauvages'],
  oiseaux: ['insectes'],
  insectes: ['oiseaux'],
  meubles: ['cuisine'],
  cuisine: ['outils', 'meubles'],
  outils: ['cuisine'],
  instruments: ['jouets'],
  jouets: ['instruments'],
  arbres: ['fleurs'],
  fleurs: ['arbres'],
  meteo: ['paysages'],
  paysages: ['meteo'],
  metiers: ['famille'],
  famille: ['metiers'],
  couleurs: ['formes'],
  formes: ['couleurs'],
};

/** La catégorie jumelle d'une autre, si elle en a une. */
export function twinCategories(main: Category, all: readonly Category[] = categories()): Category[] {
  return (TWIN_CATEGORIES[main.id] ?? []).flatMap((id) => all.filter((c) => c.id === id));
}

export const CATEGORIES_LEVELS: readonly CategoriesLevel[] = [
  L(4, 0, 14),
  L(4, 0.2, 14),
  L(5, 0, 13),
  L(4, 0.5, 13),
  L(5, 0.3, 12),
  L(4, 1, 12),
  L(5, 0.5, 12),
  L(6, 0.3, 11),
  L(5, 1, 11),
  L(6, 0.6, 11),
  L(6, 1, 10),
  L(7, 0.5, 10),
  L(6, 1, 9),
  L(7, 0.8, 9),
  L(8, 0.5, 9),
  L(7, 1, 8),
  L(8, 0.8, 8),
  L(8, 1, 8),
  L(9, 1, 7),
  L(10, 1, 7),
  // Expert : l'intrus vient de la catégorie jumelle.
  L(8, 1, 8, 0.5),
  L(9, 1, 8, 0.5),
  L(8, 1, 8, 1),
  L(10, 1, 7, 0.5),
  L(9, 1, 7, 1),
  L(10, 1, 7, 0.8),
  L(11, 1, 7, 0.5),
  L(10, 1, 7, 1),
  L(11, 1, 7, 0.8),
  L(11, 1, 7, 1),
  // Maître : les mots vont par paires de même initiale, l'intrus compris.
  L(9, 1, 7, 0.5, 1),
  L(10, 1, 7, 0.5, 1),
  L(9, 1, 7, 1, 1),
  L(11, 1, 7, 0.5, 1),
  L(10, 1, 7, 1, 1),
  L(12, 1, 7, 0.5, 1),
  L(11, 1, 7, 1, 1),
  L(12, 1, 7, 0.8, 1),
  L(11, 1, 8, 1, 1),
  L(12, 1, 7, 1, 1),
  // Légende : même initiale et même longueur, et l'objectif remonte.
  L(10, 1, 7, 1, 2),
  L(11, 1, 7, 0.8, 2),
  L(12, 1, 7, 0.8, 2),
  L(11, 1, 7, 1, 2),
  L(12, 1, 7, 1, 2),
  L(11, 1, 8, 1, 2),
  L(12, 1, 8, 1, 2),
  L(11, 1, 9, 1, 2),
  L(12, 1, 9, 1, 2),
  L(12, 1, 10, 1, 2),
];

/** Les objectifs du tableau sont écrits pour une partie de 60 s : l'accesseur du niveau les ramène à la durée réelle. */
const forDuration = (target: number) => Math.round((target * CATEGORIES_DURATION_MS) / 60_000);
/** Les niveaux tels qu'on les joue : objectifs ramenés à la durée réelle de la partie. */
const PLAYED = CATEGORIES_LEVELS.map((c) => ({ ...c, target: forDuration(c.target) }));

export function categoriesLevel(level: number): CategoriesLevel {
  return pickLevel(PLAYED, level);
}

export function categoriesLevelLabel(level: number): string {
  const c = categoriesLevel(level);
  const near =
    c.camouflage === 2
      ? tr('intrus camouflés (initiale et longueur)', 'camouflaged odd ones (first letter, length)')
      : c.camouflage === 1
        ? tr('intrus tout proches · paires d’initiales', 'very close odd ones · first-letter pairs')
        : c.twin !== undefined
          ? tr('intrus tout proches', 'very close odd ones')
          : c.near === 0
            ? tr('intrus évidents', 'easy odd ones')
            : c.near === 1
              ? tr('intrus de la même famille', 'odd ones from the same family')
              : tr('intrus parfois proches', 'odd ones sometimes close');
  return tr(`${c.words} mots · ${near}`, `${c.words} words · ${near}`);
}

export interface CategoriesQuestion {
  words: string[];
  answer: number;
  main: Category;
  intruder: Category;
}

/** Première lettre, sans accent ni majuscule : « Égypte » et « écureuil » commencent pareil. */
const initial = (word: string) => word.normalize('NFD')[0].toLowerCase();

/** Deux mots de même longueur, à une lettre près. */
const sameShape = (a: string, b: string) => Math.abs(a.length - b.length) <= 1;

/**
 * Grille camouflée : les mots vont par paires de même initiale (1), et de même longueur à une
 * lettre près (2), et l'intrus forme l'une de ces paires. Chercher le mot « qui ne ressemble à
 * aucun autre » ne mène nulle part : il faut lire. Quand la catégorie n'a pas assez de paires,
 * les derniers mots rejoignent au mieux une initiale déjà affichée.
 */
function camouflagedWords(rng: Rng, main: Category, intruder: Category, count: number, level: 1 | 2): { mains: string[]; odd: string } {
  const byInitial = new Map<string, string[]>();
  for (const w of main.words) byInitial.set(initial(w), [...(byInitial.get(initial(w)) ?? []), w]);
  // L'intrus : un mot dont l'initiale existe dans la catégorie principale. Au niveau 2, il a aussi la
  // longueur d'un voisin sept fois sur dix, à peu près aussi souvent que les autres mots de la
  // grille : sinon, chercher « le mot qui a un jumeau de même longueur » le trahirait.
  let pool = intruder.words.filter((w) => byInitial.has(initial(w)));
  const shaped = pool.filter((w) => byInitial.get(initial(w))?.some((m) => sameShape(m, w)));
  const unshaped = pool.filter((w) => !shaped.includes(w));
  if (level === 2) {
    const preferred = rng.chance(0.7) ? shaped : unshaped;
    if (preferred.length) pool = preferred;
  }
  const odd = rng.pick(pool.length ? pool : intruder.words);
  const chosen: string[] = [];
  const partners = rng.shuffle(byInitial.get(initial(odd)) ?? []);
  const partner = (level === 2 && partners.find((m) => sameShape(m, odd))) || partners[0];
  if (partner) chosen.push(partner);
  // Puis des paires de la catégorie principale, initiale par initiale ; au niveau 2, d'abord les
  // paires de même longueur, pour que l'intrus ne soit pas le seul à en avoir une.
  const pairs = rng.shuffle([...byInitial].filter(([key, group]) => key !== initial(odd) && group.length >= 2)).map(([, group]) => {
    const left = rng.shuffle(group);
    const lookalike = left.flatMap((x, i) => left.slice(i + 1).filter((y) => sameShape(x, y)).map((y) => [x, y]))[0];
    return { pair: (level === 2 && lookalike) || [left[0], left[1]], shaped: Boolean(lookalike) };
  });
  if (level === 2) pairs.sort((a, b) => Number(b.shaped) - Number(a.shaped));
  for (const { pair } of pairs) {
    if (count - chosen.length < 2) break;
    chosen.push(...pair);
  }
  // Places restantes : de préférence un mot qui ressemble à un mot déjà affiché.
  let rest = rng.shuffle(main.words.filter((w) => !chosen.includes(w)));
  while (chosen.length < count) {
    const shown = [...chosen, odd];
    const next =
      (level === 2 && rest.find((w) => shown.some((s) => initial(s) === initial(w) && sameShape(s, w)))) ||
      rest.find((w) => shown.some((s) => initial(s) === initial(w))) ||
      rest[0];
    chosen.push(next);
    rest = rest.filter((w) => w !== next);
  }
  return { mains: chosen, odd };
}

/** Niveaux 21 et plus : intrus jumeau, puis grille camouflée. */
function generateFinerQuestion(rng: Rng, c: CategoriesLevel): CategoriesQuestion {
  const all = categories();
  const main = rng.pick(all);
  const near = rng.chance(c.near);
  const twins = near ? twinCategories(main, all) : [];
  const intruder =
    twins.length && rng.chance(c.twin ?? 0) ? rng.pick(twins) : rng.pick(all.filter((other) => other !== main && (other.family === main.family) === near));
  const { mains, odd } = c.camouflage
    ? camouflagedWords(rng, main, intruder, c.words - 1, c.camouflage)
    : { mains: rng.shuffle(main.words).slice(0, c.words - 1), odd: rng.pick(intruder.words) };
  const shuffled = rng.shuffle([...mains, odd]);
  return { words: shuffled, answer: shuffled.indexOf(odd), main, intruder };
}

export function generateCategoriesQuestion(rng: Rng, level: number): CategoriesQuestion {
  const c = categoriesLevel(level);
  if (clampLevel(level, CATEGORIES_LEVELS.length) > CLASSIC_LEVELS) return generateFinerQuestion(rng, c);
  const all = categories();
  const main = rng.pick(all);
  const near = rng.chance(c.near);
  const intruder = rng.pick(all.filter((other) => other !== main && (other.family === main.family) === near));
  const words = [...rng.shuffle(main.words).slice(0, c.words - 1), rng.pick(intruder.words)];
  const shuffled = rng.shuffle(words);
  return { words: shuffled, answer: shuffled.indexOf(words[words.length - 1]), main, intruder };
}

export function generateCategories(rng: Rng, level: number, count = 40): CategoriesQuestion[] {
  return Array.from({ length: count }, () => generateCategoriesQuestion(rng, level));
}

export function scoreCategories(correct: number, errors: number, level: number): number {
  return countScore(correct - errors, 0, categoriesLevel(level).target);
}
