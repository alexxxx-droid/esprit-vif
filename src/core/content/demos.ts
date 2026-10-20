import { byLang, type DemoContent } from './index';

/** Démos des jeux de langage en français (voir `DemoContent`). */
const DEMOS_FR: DemoContent = {
  anagram: { tiles: ['H', 'C', 'I', 'N', 'E'], order: [1, 0, 2, 4, 3] }, // C H I E N
  mots: { words: ['vélo', 'pomme', 'violon'], seen: 'pomme', unseen: 'lion' },
  lettre: { hint: 'Animal de la ferme', word: 'CHEVAL', position: 3, letter: 'V', guess: 'B, V ou R…', answer: 'V : CHEVAL' },
  categories: ['pomme', 'poire', 'violon', 'cerise'],
  qui: ['Léa', 'Hugo', 'Nina'],
  lecture: ['Un chat a quatre pattes.', 'La mer est sucrée.'],
};

/** Les mêmes en anglais. */
const DEMOS_EN: DemoContent = {
  anagram: { tiles: ['G', 'T', 'I', 'R', 'E'], order: [1, 2, 0, 4, 3] }, // T I G E R
  mots: { words: ['bike', 'apple', 'violin'], seen: 'apple', unseen: 'lion' },
  lettre: { hint: 'Farm animal', word: 'HORSE', position: 2, letter: 'R', guess: 'R, N or T…', answer: 'R: HORSE' },
  categories: ['apple', 'pear', 'violin', 'cherry'],
  qui: ['Lucy', 'Jack', 'Nina'],
  lecture: ['A cat has four legs.', 'The sea is sweet.'],
};

/** Les démos dans la langue en cours. */
export function demoContent(): DemoContent {
  return byLang(DEMOS_FR, DEMOS_EN, (c) => c.demos);
}
