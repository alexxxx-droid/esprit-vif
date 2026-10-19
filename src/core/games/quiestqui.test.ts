import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng } from '../rng';
import { CLASHING_COLORS, generateQui, QUI_LEVELS, QUI_NAMES, QUI_ROUNDS, quiLevel, scoreQui } from './quiestqui';

describe('Qui est qui ?', () => {
  it('a 20 niveaux et des prénoms tous différents', () => {
    expect(QUI_LEVELS).toHaveLength(MAX_LEVEL);
    expect(new Set(QUI_NAMES).size).toBe(QUI_NAMES.length);
  });

  it('présente des visages et des prénoms distincts, et interroge sur chacun une fois', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const c = quiLevel(level);
      const rounds = generateQui(createRng(level * 7), level);
      expect(rounds).toHaveLength(QUI_ROUNDS);
      for (const round of rounds) {
        const { people, questions } = round;
        expect(people).toHaveLength(c.people);
        expect(new Set(people.map((p) => p.name)).size).toBe(c.people);
        expect(new Set(people.map((p) => `${p.character}-${p.color}`)).size).toBe(c.people);
        for (const p of people) expect(CLASHING_COLORS[p.character]).not.toContain(p.color);
        const perFruit = new Map<string, number>();
        for (const p of people) perFruit.set(p.character, (perFruit.get(p.character) ?? 0) + 1);
        expect(Math.max(...perFruit.values())).toBeLessThanOrEqual(c.sameFruit);
        if (c.lookAlikeNames) expect(new Set(people.map((p) => p.name[0])).size).toBeLessThan(c.people);
        expect(questions.map((q) => q.target).sort((a, b) => a - b)).toEqual(people.map((_, i) => i));
        for (const q of questions) {
          expect(q.options).toContain(q.target);
          expect(new Set(q.options).size).toBe(q.options.length);
          expect(q.options).toHaveLength(q.kind === 'face' ? c.people : Math.min(4, c.people));
        }
        expect(questions.filter((q) => q.kind === 'name')).toHaveLength(Math.round(c.people * c.nameQuestions));
      }
    }
    expect(generateQui(createRng(3), 9)).toEqual(generateQui(createRng(3), 9));
  });

  it('note la part de bonnes réponses', () => {
    expect(scoreQui(9, 12)).toBe(75);
    expect(scoreQui(0, 0)).toBe(0);
  });
});
