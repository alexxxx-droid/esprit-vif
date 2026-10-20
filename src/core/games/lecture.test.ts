import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setLang } from '../lang';
import { MAX_LEVEL } from '../levels';
import { createRng } from '../rng';
import { generateLecture, LECTURE_LEVELS, lectureLevel, lectureLevelLabel, scoreLecture, SENTENCES, SENTENCES_EN, sentences } from './lecture';

describe('Lecture éclair', () => {
  it('a MAX_LEVEL niveaux et cinq paliers de 40 idées, chacune en version vraie et fausse', () => {
    expect(LECTURE_LEVELS).toHaveLength(MAX_LEVEL);
    expect(SENTENCES).toHaveLength(5);
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

describe('Lecture éclair en anglais', () => {
  beforeEach(() => setLang('en'));
  afterEach(() => setLang('fr'));

  it('a cinq paliers de 40 idées anglaises, chacune en version vraie et fausse', () => {
    expect(sentences()).toBe(SENTENCES_EN);
    expect(SENTENCES_EN).toHaveLength(5);
    const all = SENTENCES_EN.flat(2);
    expect(new Set(all).size).toBe(all.length);
    for (const tier of SENTENCES_EN) {
      expect(tier).toHaveLength(40);
      for (const [truth, lie] of tier) {
        expect(truth).not.toBe(lie);
        for (const s of [truth, lie]) {
          expect(s).toMatch(/^[A-Z][^«»]*\.$/);
          expect(s).not.toMatch(/'/);
          expect(s).not.toMatch(/ [:;!?]/);
        }
      }
    }
  });

  it('tire les phrases anglaises du palier demandé', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const tiers = lectureLevel(level).tiers;
      const pool = new Set(tiers.flatMap((t) => SENTENCES_EN[t - 1].flat()));
      const questions = generateLecture(createRng(level), level);
      expect(questions).toHaveLength(tiers.length * 80);
      for (const q of questions) expect(pool.has(q.sentence)).toBe(true);
    }
    expect(lectureLevelLabel(1)).toBe('short sentences · target 16');
    expect(lectureLevelLabel(10)).toBe('short sentences, long sentences and negations · target 13');
    expect(lectureLevelLabel(5)).toBe('short sentences and long sentences · target 16');
    setLang('fr');
    expect(sentences()).toBe(SENTENCES);
    expect(lectureLevelLabel(1)).toBe('phrases courtes · objectif 16');
  });
});
