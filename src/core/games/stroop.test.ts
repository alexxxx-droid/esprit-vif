import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { generateStroop, matchSpokenColor, scoreStroop, STROOP_COLORS, STROOP_COUNT } from './stroop';

const SEEDS = Array.from({ length: 150 }, (_, i) => i * 104729 + 3);

describe('générateur de Couleurs piégées', () => {
  it('donne 20 mots dont exactement 25 % où le mot et l’encre concordent', () => {
    for (const level of [1, 2, 3]) {
      for (const seed of SEEDS) {
        const items = generateStroop(createRng(seed), level);
        expect(items).toHaveLength(STROOP_COUNT);
        expect(items.filter((it) => it.word === it.ink)).toHaveLength(5);
      }
    }
  });

  it('ne répète jamais la même encre deux fois de suite', () => {
    for (const seed of SEEDS) {
      const items = generateStroop(createRng(seed), 1);
      for (let i = 1; i < items.length; i++) expect(items[i].ink).not.toBe(items[i - 1].ink);
    }
  });

  it('propose toujours les quatre couleurs, fixes au niveau 1', () => {
    for (const level of [1, 2, 3]) {
      for (const seed of SEEDS) {
        for (const item of generateStroop(createRng(seed), level)) {
          expect([...item.buttons].sort()).toEqual([...STROOP_COLORS].sort());
          if (level === 1) expect(item.buttons).toEqual([...STROOP_COLORS]);
        }
      }
    }
  });

  it('piège les libellés des boutons au niveau 3 uniquement', () => {
    for (const seed of SEEDS) {
      for (const item of generateStroop(createRng(seed), 3)) {
        expect(item.buttonInks).not.toBeNull();
        item.buttons.forEach((color, i) => expect(item.buttonInks![i]).not.toBe(color));
      }
      for (const item of generateStroop(createRng(seed), 2)) expect(item.buttonInks).toBeNull();
    }
  });
});

describe('score de Couleurs piégées', () => {
  it('suit le barème : 100 à 18 s, 0 à 60 s, +2 s par erreur', () => {
    expect(scoreStroop(18_000, 0, 1)).toBe(100);
    expect(scoreStroop(60_000, 0, 1)).toBe(0);
    expect(scoreStroop(35_000, 2, 1)).toBe(50); // 35 + 4 = 39 s
  });

  it('reste entre 0 et 100', () => {
    const rng = createRng(11);
    for (let i = 0; i < 500; i++) {
      const score = scoreStroop(rng.int(0, 200_000), rng.int(0, 20), rng.int(1, 3));
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
    expect(matchSpokenColor('bonjour')).toBeNull();
  });
});
