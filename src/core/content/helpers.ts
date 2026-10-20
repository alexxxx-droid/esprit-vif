import type { Category, Family } from '../games/lexique';

/**
 * Petits outils pour écrire les tables de mots, dans les jeux comme dans les modules de langue
 * (`es.ts`…). Ce fichier n'importe que des types : un module de langue peut s'en servir sans
 * créer de cycle d'imports.
 */

/** Une catégorie en une ligne, mots séparés par une espace : `C('fruits', 'Fruit', 'fruits', 'nourriture', 'apple pear…')`. */
export const C = (id: string, label: string, plural: string, family: Family, words: string): Category => ({
  id,
  label,
  plural,
  family,
  words: words.split(' '),
});

/** Une liste de mots écrite d'un bloc, séparés par des espaces ou des retours à la ligne : `wordList('ACIER ADIEU…')`. */
export const wordList = (text: string): readonly string[] => text.split(/\s+/).filter(Boolean);
