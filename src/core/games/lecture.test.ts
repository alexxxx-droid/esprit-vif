import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng } from '../rng';
import { generateLecture, LECTURE_LEVELS, lectureLevel, scoreLecture, SENTENCES } from './lecture';

describe('Lecture éclair', () => {
  it('a 20 niveaux et trois paliers de 40 idées, chacune en version vraie et fausse', () => {
    expect(LECTURE_LEVELS).toHaveLength(MAX_LEVEL);
    const all = SENTENCES.flat(2);
    expect(new Set(all).size).toBe(all.length);
    for (const tier of SENTENCES) {
      expect(tier).toHaveLength(40);
      for (const [truth, lie] of tier) {
        expect(truth).not.toBe(lie);
        for (const s of [truth, lie]) {
          expect(s).toMatch(/^[A-ZÀ-ÖØ-Ý].*\.$/u);
          expect(s).not.toMatch(/'/);
        }
      }
    }
  });

  it('ne repose pas une idée avant d’avoir fait le tour, et autant de vrai que de faux en moyenne', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const questions = generateLecture(createRng(level), level);
      const tiers = lectureLevel(level).tiers;
      const first = questions.slice(0, tiers.length * 40);
      expect(questions).toHaveLength(tiers.length * 80);
      expect(new Set(first.map((q) => q.sentence)).size).toBe(first.length);
    }
    const many = Array.from({ length: 20 }, (_, i) => generateLecture(createRng(i), 3)).flat();
    const share = many.filter((q) => q.truth).length / many.length;
    expect(share).toBeGreaterThan(0.4);
    expect(share).toBeLessThan(0.6);
  });

  it('ne récompense pas les réponses au hasard', () => {
    expect(scoreLecture(8, 8, 1)).toBe(0);
    expect(scoreLecture(16, 0, 1)).toBe(100);
  });
});
