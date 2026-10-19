import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { anagramDeck, buildAnagramIndex, isAnagramAnswer, letterKey, scoreAnagrammes, scramble } from './anagrammes';
import { WORDS } from './words';

describe('liste de mots', () => {
  it('compte au moins 150 mots de 5 à 7 lettres, sans accent ni doublon', () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(150);
    expect(new Set(WORDS).size).toBe(WORDS.length);
    for (const word of WORDS) {
      expect(word).toMatch(/^[A-Z]{5,7}$/);
    }
  });

  it('a assez de mots pour chaque niveau', () => {
    for (const level of [1, 2, 3]) expect(anagramDeck(createRng(1), level).length).toBeGreaterThanOrEqual(40);
  });
});

describe('mélange des lettres', () => {
  const index = buildAnagramIndex();

  it('ne redonne jamais le mot de départ ni un autre mot valable', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rng = createRng(seed);
      for (const word of WORDS) {
        const letters = scramble(rng, word, index);
        expect(letterKey(letters)).toBe(letterKey(word));
        expect(letters).not.toBe(word);
        expect(index.get(letterKey(word))).not.toContain(letters);
      }
    }
  });

  it('garde les mêmes lettres dans chaque partie', () => {
    for (const puzzle of anagramDeck(createRng(4), 2)) {
      expect(letterKey(puzzle.letters)).toBe(letterKey(puzzle.word));
      expect(puzzle.letters).not.toBe(puzzle.word);
    }
  });
});

describe('réponses aux Anagrammes', () => {
  it('accepte tout mot de la liste formé des mêmes lettres', () => {
    expect(isAnagramAnswer('CHIEN', 'CHIEN')).toBe(true);
    expect(isAnagramAnswer('NICHE', 'CHIEN')).toBe(true);
    expect(isAnagramAnswer('SINGE', 'SIGNE')).toBe(true);
  });

  it('refuse un mot hors liste ou fait d’autres lettres', () => {
    expect(isAnagramAnswer('HCIEN', 'CHIEN')).toBe(false);
    expect(isAnagramAnswer('TABLE', 'CHIEN')).toBe(false);
  });

  it('donne 100 pour 8 mots au niveau 1, borné entre 0 et 100', () => {
    expect(scoreAnagrammes(8, 1)).toBe(100);
    expect(scoreAnagrammes(4, 1)).toBe(50);
    for (let found = 0; found < 30; found++) {
      const score = scoreAnagrammes(found, 3);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});
