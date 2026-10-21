import { afterEach, describe, expect, it } from 'vitest';
import { LANGS, setLang } from '../lang';
import { MAX_LEVEL } from '../levels';
import { createRng, deriveSeed } from '../rng';
import { generateMeles, gridSpelling, MELES_LEVELS, melesLevel, melesLevelLabel, melesRule, occurrences, scoreMeles, segment } from './motsmeles';
import { GAMES } from './registry';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const tier = (from: number) => LEVELS.slice(from - 1, from + 9);

describe('Mots mêlés', () => {
  afterEach(() => setLang('fr'));

  it('a 50 niveaux et joue 45 s', () => {
    expect(MELES_LEVELS).toHaveLength(MAX_LEVEL);
    expect(GAMES.motsmeles.duration).toBe('45 s');
    expect(melesRule(1)).toContain('45');
  });

  it('écrit les mots en capitales sans accents, et trace les droites de la grille', () => {
    expect(gridSpelling('tête')).toBe('TETE');
    expect(gridSpelling('Égypte')).toBe('EGYPTE');
    expect(gridSpelling('œuf')).toBe('OEUF');
    expect(gridSpelling('Straße')).toBe('STRASSE');
    expect(segment(5, 0, 4)).toEqual([0, 1, 2, 3, 4]);
    expect(segment(5, 24, 0)).toEqual([24, 18, 12, 6, 0]);
    expect(segment(5, 0, 7)).toBeNull();
  });

  it('cache chaque mot une seule fois, dans une direction du niveau, dans toutes les langues', () => {
    for (const lang of LANGS) {
      setLang(lang);
      for (const level of LEVELS.filter((l) => l % 3 === 1 || l === 50)) {
        const c = melesLevel(level);
        for (let s = 0; s < 6; s++) {
          const g = generateMeles(createRng(deriveSeed(level, s)), level);
          expect(g.letters).toHaveLength(c.size * c.size);
          for (const l of g.letters) expect(l).toMatch(/^[A-Z]$/);
          expect(g.words).toHaveLength(c.words);
          for (const w of g.words) {
            expect(w.letters.length).toBeGreaterThanOrEqual(c.minLength);
            expect(w.letters.length).toBeLessThanOrEqual(c.maxLength);
            expect(w.cells.map((cell) => g.letters[cell]).join(''), `${lang} ${level}`).toBe(w.letters);
            const [a, b] = [w.cells[0], w.cells[1]];
            const dir = [Math.floor(b / c.size) - Math.floor(a / c.size), (b % c.size) - (a % c.size)];
            expect(c.directions.some(([r, col]) => r === dir[0] && col === dir[1])).toBe(true);
            expect(occurrences(g, w.letters), `${lang} ${w.letters}`).toBe(1);
          }
        }
      }
    }
  });

  it('apporte une nouvelle façon de jouer à chaque palier', () => {
    const dirs = (l: number) => melesLevel(l).directions.map((d) => d.join());
    expect(tier(1).every((l) => dirs(l).length === 2 && !melesLevel(l).hiddenList)).toBe(true);
    expect(tier(11).every((l) => dirs(l).includes('1,1') && !dirs(l).includes('0,-1'))).toBe(true);
    expect(tier(21).every((l) => dirs(l).includes('0,-1') && !melesLevel(l).hiddenList)).toBe(true);
    expect(tier(31).every((l) => melesLevel(l).hiddenList && dirs(l).length < 8)).toBe(true);
    expect(tier(41).every((l) => dirs(l).length === 8 && melesLevel(l).size === 8)).toBe(true);
    for (const from of [1, 11, 21, 31, 41]) expect(new Set(tier(from).map(melesLevelLabel)).size).toBeGreaterThanOrEqual(2);
  });

  it('note les mots trouvés : 100 pts à l’objectif, l’étoile à 60 %', () => {
    for (const level of LEVELS) {
      const { target } = melesLevel(level);
      expect(scoreMeles(target, level)).toBe(100);
      expect(scoreMeles(Math.ceil(target * 0.6), level)).toBeGreaterThanOrEqual(60);
    }
  });
});
