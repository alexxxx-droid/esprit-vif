import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';
import { categories, type Category } from './lexique';

/**
 * Catégories : des mots d'une même catégorie et un intrus. Au début l'intrus vient de loin
 * (un violon parmi des fruits) ; ensuite il vient de la même famille (un radis parmi des fruits).
 */

export const CATEGORIES_DURATION_MS = 60_000;

export interface CategoriesLevel {
  words: number;
  /** Probabilité que l'intrus vienne d'une catégorie voisine (même famille). */
  near: number;
  /** Bonnes réponses en 60 s pour 100 pts (une erreur en retire une). */
  target: number;
}

const L = (words: number, near: number, target: number): CategoriesLevel => ({ words, near, target });

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
];

export function categoriesLevel(level: number): CategoriesLevel {
  return pickLevel(CATEGORIES_LEVELS, level);
}

export function categoriesLevelLabel(level: number): string {
  const c = categoriesLevel(level);
  const near =
    c.near === 0
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

export function generateCategoriesQuestion(rng: Rng, level: number): CategoriesQuestion {
  const c = categoriesLevel(level);
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
