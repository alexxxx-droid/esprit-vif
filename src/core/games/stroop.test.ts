import { describe, expect, it } from 'vitest';
import { MAX_LEVEL, pickLevel } from '../levels';
import { createRng } from '../rng';
import {
  generateStroop,
  matchSpokenColor,
  scoreStroop,
  STROOP_COLORS,
  STROOP_COUNT,
  STROOP_LEVELS,
  stroopAnswer,
} from './stroop';

const SEEDS = Array.from({ length: 80 }, (_, i) => i * 104729 + 3);
const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);

describe('générateur de Couleurs piégées', () => {
  it('respecte la spec au niveau 1 : 20 mots, 4 couleurs, exactement 25 % concordants', () => {
    for (const seed of SEEDS) {
      const items = generateStroop(createRng(seed), 1);
      expect(items).toHaveLength(STROOP_COUNT);
      expect(items.filter((it) => it.word === it.ink)).toHaveLength(5);
      expect(items.every((it) => it.ask === 'ink')).toBe(true);
      expect(new Set(items.flatMap((it) => [it.word, it.ink])).size).toBeLessThanOrEqual(4);
      for (const item of items) expect(item.buttons).toEqual(['rouge', 'bleu', 'vert', 'jaune']);
    }
  });

  it('ne répète jamais la même encre deux fois de suite', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        const items = generateStroop(createRng(seed), level);
        for (let i = 1; i < items.length; i++) expect(items[i].ink).not.toBe(items[i - 1].ink);
      }
    }
  });

  it('propose toujours toutes les couleurs du niveau et piège les boutons quand il le faut', () => {
    for (const level of LEVELS) {
      const config = pickLevel(STROOP_LEVELS, level);
      const palette = STROOP_COLORS.slice(0, config.colors);
      for (const seed of SEEDS.slice(0, 20)) {
        for (const item of generateStroop(createRng(seed), level)) {
          expect([...item.buttons].sort()).toEqual([...palette].sort());
          expect(palette).toContain(item.word);
          expect(palette).toContain(item.ink);
          if (config.trap) item.buttons.forEach((color, i) => expect(item.buttonInks![i]).not.toBe(color));
          else expect(item.buttonInks).toBeNull();
        }
      }
    }
  });

  it('demande parfois de lire le mot, jamais quand il est identique à l’encre', () => {
    for (const level of LEVELS) {
      const config = pickLevel(STROOP_LEVELS, level);
      for (const seed of SEEDS.slice(0, 20)) {
        const items = generateStroop(createRng(seed), level);
        const wordItems = items.filter((it) => it.ask === 'word');
        expect(wordItems).toHaveLength(Math.round(STROOP_COUNT * config.switchRatio));
        for (const item of wordItems) {
          expect(item.word).not.toBe(item.ink);
          expect(stroopAnswer(item)).toBe(item.word);
        }
      }
    }
  });
});

describe('score de Couleurs piégées', () => {
  it('suit le barème : 100 à 18 s, 0 à 60 s, +2 s par erreur', () => {
    expect(scoreStroop(18_000, 0, 1)).toBe(100);
    expect(scoreStroop(60_000, 0, 1)).toBe(0);
    expect(scoreStroop(35_000, 2, 1)).toBe(50);
  });

  it('reste entre 0 et 100', () => {
    const rng = createRng(11);
    for (let i = 0; i < 500; i++) {
      const score = scoreStroop(rng.int(0, 200_000), rng.int(0, 20), rng.int(1, MAX_LEVEL));
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe('réponse à la voix', () => {
  it('reconnaît la dernière couleur prononcée', () => {
    expect(matchSpokenColor('Rouge')).toBe('rouge');
    expect(matchSpokenColor('euh bleue')).toBe('bleu');
    expect(matchSpokenColor('vert jaune')).toBe('jaune');
    expect(matchSpokenColor('verre')).toBe('vert');
    expect(matchSpokenColor('violette')).toBe('violet');
    expect(matchSpokenColor('bonjour')).toBeNull();
  });
});
