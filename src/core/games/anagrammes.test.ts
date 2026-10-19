import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setLang } from '../lang';
import { MAX_LEVEL } from '../levels';
import { createRng } from '../rng';
import {
  anagramDeck,
  anagramLevel,
  anagramLevelLabel,
  buildAnagramIndex,
  isAnagramAnswer,
  letterKey,
  scoreAnagrammes,
  scramble,
} from './anagrammes';
import { anagramWords, hasRudeWord, WORDS, WORDS_EN } from './words';

describe('liste de mots', () => {
  it('compte au moins 150 mots de 5 à 7 lettres, sans accent ni doublon', () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(150);
    expect(new Set(WORDS).size).toBe(WORDS.length);
    for (const word of WORDS) expect(word).toMatch(/^[A-Z]{5,7}$/);
  });

  it('a assez de mots pour chaque niveau', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) expect(anagramDeck(createRng(1), level).length).toBeGreaterThanOrEqual(40);
  });
});

describe('mélange des lettres', () => {
  const index = buildAnagramIndex();

  it('ne redonne jamais le mot de départ ni un autre mot valable', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rng = createRng(seed);
      for (const word of WORDS) {
        const letters = scramble(rng, word, index);
        expect(letterKey(letters)).toBe(letterKey(word));
        expect(index.get(letterKey(word))).not.toContain(letters);
      }
    }
  });

  it('propose les lettres du mot, plus les leurres du niveau', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const { decoys } = anagramLevel(level);
      for (const puzzle of anagramDeck(createRng(level), level).slice(0, 30)) {
        expect(puzzle.letters).toHaveLength(puzzle.word.length + decoys);
        expect(isAnagramAnswer(puzzle.word, puzzle)).toBe(true);
        if (decoys === 0) expect(puzzle.letters).not.toBe(puzzle.word);
      }
    }
  });
});

describe('réponses aux Anagrammes', () => {
  const chien = { word: 'CHIEN', letters: 'HCINE' };

  it('accepte tout mot de la liste formé des mêmes lettres', () => {
    expect(isAnagramAnswer('CHIEN', chien)).toBe(true);
    expect(isAnagramAnswer('NICHE', chien)).toBe(true);
    expect(isAnagramAnswer('SINGE', { word: 'SIGNE', letters: 'GNIES' })).toBe(true);
  });

  it('refuse un mot hors liste, trop court ou fait d’autres lettres', () => {
    expect(isAnagramAnswer('HCIEN', chien)).toBe(false);
    expect(isAnagramAnswer('TABLE', chien)).toBe(false);
    expect(isAnagramAnswer('CHIEN', { word: 'CHIEN', letters: 'HCINO' })).toBe(false);
  });

  it('donne 100 pour 8 mots au niveau 1, borné entre 0 et 100', () => {
    expect(scoreAnagrammes(8, 1)).toBe(100);
    expect(scoreAnagrammes(4, 1)).toBe(50);
    for (let found = 0; found < 30; found++) {
      const score = scoreAnagrammes(found, MAX_LEVEL);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe('Anagrammes en anglais', () => {
  beforeEach(() => setLang('en'));
  afterEach(() => setLang('fr'));

  it('a sa propre liste : au moins 450 mots courants de 5 à 7 lettres, sans doublon', () => {
    expect(anagramWords()).toBe(WORDS_EN);
    expect(WORDS_EN.length).toBeGreaterThanOrEqual(450);
    expect(new Set(WORDS_EN).size).toBe(WORDS_EN.length);
    for (const word of WORDS_EN) expect(word).toMatch(/^[A-Z]{5,7}$/);
    // Pas de mot dont l'orthographe change entre l'anglais britannique et américain.
    for (const variant of ['COLOR', 'COLOUR', 'FAVOR', 'HUMOR', 'HONOR', 'LABOR', 'METER', 'LITER', 'FIBER', 'CENTER', 'THEATER', 'JEWELRY', 'PAJAMAS']) {
      expect(WORDS_EN).not.toContain(variant);
    }
  });

  it('a assez de mots anglais pour chaque niveau, tirés de la liste anglaise', () => {
    const english = new Set(WORDS_EN);
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const deck = anagramDeck(createRng(level), level);
      expect(deck.length).toBeGreaterThanOrEqual(40);
      for (const puzzle of deck.slice(0, 30)) {
        expect(english.has(puzzle.word)).toBe(true);
        expect(puzzle.letters).toHaveLength(puzzle.word.length + anagramLevel(level).decoys);
        expect(isAnagramAnswer(puzzle.word, puzzle)).toBe(true);
        expect(hasRudeWord(puzzle.letters)).toBe(false);
      }
    }
  });

  it('mélange sans retomber sur un mot anglais valable ni sur une grossièreté', () => {
    const index = buildAnagramIndex();
    expect(index.get(letterKey('HEART'))).toEqual(['EARTH', 'HEART']);
    for (let seed = 1; seed <= 5; seed++) {
      const rng = createRng(seed);
      for (const word of WORDS_EN) {
        const letters = scramble(rng, word);
        expect(letterKey(letters)).toBe(letterKey(word));
        expect(index.get(letterKey(word))).not.toContain(letters);
        expect(hasRudeWord(letters)).toBe(false);
      }
    }
  });

  it('accepte les anagrammes anglaises, refuse les mots français', () => {
    expect(isAnagramAnswer('HEART', { word: 'HEART', letters: 'RATEH' })).toBe(true);
    expect(isAnagramAnswer('EARTH', { word: 'HEART', letters: 'RATEH' })).toBe(true);
    expect(isAnagramAnswer('CHIEN', { word: 'CHIEN', letters: 'HCINE' })).toBe(false);
    setLang('fr');
    expect(isAnagramAnswer('CHIEN', { word: 'CHIEN', letters: 'HCINE' })).toBe(true);
    expect(isAnagramAnswer('EARTH', { word: 'HEART', letters: 'RATEH' })).toBe(false);
  });

  it('libelle les niveaux en anglais', () => {
    expect(anagramLevelLabel(1)).toMatch(/^5 letters · 75\Ws$/);
    expect(anagramLevelLabel(2)).toMatch(/^5 or 6 letters/);
    expect(anagramLevelLabel(14)).toMatch(/^5 to 7 letters · 1 decoy/);
    expect(anagramLevelLabel(8)).toContain('2 decoys');
  });
});
