import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';
import { CATEGORIES } from './lexique';
import { WORDS } from './words';

/**
 * Lettre manquante : « Fruit : CER_SE ». La catégorie sert d'indice et lève toute ambiguïté ;
 * les leurres sont des lettres de la même sorte (voyelle pour voyelle) qui ne forment aucun mot connu.
 */

export const LETTRE_DURATION_MS = 60_000;

export interface LettreLevel {
  minLength: number;
  maxLength: number;
  missing: 1 | 2;
  options: number;
  /** Bonnes réponses en 60 s pour 100 pts (une erreur en retire une). */
  target: number;
}

const L = (minLength: number, maxLength: number, missing: 1 | 2, options: number, target: number): LettreLevel => ({ minLength, maxLength, missing, options, target });

export const LETTRE_LEVELS: readonly LettreLevel[] = [
  L(4, 5, 1, 3, 13),
  L(4, 6, 1, 4, 13),
  L(5, 7, 1, 4, 12),
  L(6, 8, 1, 4, 12),
  L(4, 6, 1, 5, 12),
  L(7, 9, 1, 4, 11),
  L(5, 8, 1, 5, 11),
  L(8, 11, 1, 5, 10),
  L(5, 6, 2, 3, 10),
  L(6, 8, 2, 4, 10),
  L(7, 9, 1, 6, 10),
  L(6, 9, 2, 4, 9),
  L(8, 11, 2, 4, 9),
  L(5, 8, 2, 5, 9),
  L(7, 10, 2, 5, 8),
  L(9, 12, 1, 6, 9),
  L(8, 11, 2, 5, 8),
  L(9, 12, 2, 5, 8),
  L(7, 12, 2, 6, 7),
  L(9, 13, 2, 6, 7),
];

export function lettreLevel(level: number): LettreLevel {
  return pickLevel(LETTRE_LEVELS, level);
}

export function lettreLevelLabel(level: number): string {
  const c = lettreLevel(level);
  return [`Mots de ${c.minLength} à ${c.maxLength} lettres`, c.missing === 1 ? '1 lettre manquante' : '2 lettres manquantes', `${c.options} choix`].join(' · ');
}

const VOWELS = 'AEIOUY';
const CONSONANTS = 'BCDFGLMNPRSTV';

/** Mots sans accent (en majuscules) avec leur catégorie : la seule réserve où l'on pioche. */
export const LETTRE_WORDS: readonly { word: string; hint: string }[] = CATEGORIES.flatMap((c) =>
  c.words.filter((w) => /^[a-z]+$/i.test(w)).map((w) => ({ word: w.toUpperCase(), hint: c.label })),
);

/** Tout ce qu'on sait être un mot : un leurre ne doit jamais en former un. */
const KNOWN = new Set([...WORDS, ...CATEGORIES.flatMap((c) => c.words.map((w) => w.toUpperCase()))]);

export interface LettreQuestion {
  word: string;
  hint: string;
  positions: number[];
  options: string[];
  answer: number;
}

const fill = (word: string, positions: number[], letters: string) => {
  const chars = [...word];
  positions.forEach((p, i) => {
    chars[p] = letters[i];
  });
  return chars.join('');
};

export function generateLettreQuestion(rng: Rng, level: number): LettreQuestion {
  const c = lettreLevel(level);
  const pool = LETTRE_WORDS.filter(({ word }) => word.length >= c.minLength && word.length <= c.maxLength);
  for (;;) {
    const { word, hint } = rng.pick(pool);
    const positions = rng.shuffle([...word].map((_, i) => i)).slice(0, c.missing).sort((a, b) => a - b);
    const answer = positions.map((p) => word[p]).join('');
    const options = [answer];
    for (let tries = 0; options.length < c.options && tries < 200; tries++) {
      const letters = positions.map((p, i) => {
        // Une des deux lettres peut rester juste : le leurre n'en est que plus crédible.
        if (c.missing === 2 && i === 0 && rng.chance(0.35)) return word[p];
        return rng.pick([...(VOWELS.includes(word[p]) ? VOWELS : CONSONANTS)]);
      });
      const candidate = letters.join('');
      if (options.includes(candidate) || KNOWN.has(fill(word, positions, candidate))) continue;
      options.push(candidate);
    }
    if (options.length < c.options) continue;
    const shuffled = rng.shuffle(options);
    return { word, hint, positions, options: shuffled, answer: shuffled.indexOf(answer) };
  }
}

export function generateLettre(rng: Rng, level: number, count = 40): LettreQuestion[] {
  return Array.from({ length: count }, () => generateLettreQuestion(rng, level));
}

export function scoreLettre(correct: number, errors: number, level: number): number {
  return countScore(correct - errors, 0, lettreLevel(level).target);
}
