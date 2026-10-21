import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng } from '../rng';
import { CLASHING_COLORS, generateQui, QUI_LEVELS, QUI_NAMES, QUI_QUESTIONS, QUI_ROUNDS, quiLevel, scoreQui } from './quiestqui';

describe('Qui est qui ?', () => {
  it('a 50 niveaux et des prénoms tous différents', () => {
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
        const targets = questions.map((q) => q.target);
        expect(targets).toHaveLength(Math.min(c.people, QUI_QUESTIONS));
        expect(new Set(targets).size).toBe(targets.length);
        for (const t of targets) expect(t).toBeLessThan(people.length);
        for (const q of questions) {
          expect(q.options).toContain(q.target);
          expect(new Set(q.options).size).toBe(q.options.length);
          expect(q.options).toHaveLength(q.kind === 'face' ? c.people : Math.min(c.nameOptions, c.people));
        }
        expect(questions.filter((q) => q.kind === 'name')).toHaveLength(Math.round(Math.min(c.people, QUI_QUESTIONS) * c.nameQuestions));
      }
    }
    expect(generateQui(createRng(3), 9)).toEqual(generateQui(createRng(3), 9));
  });

  it('note la part de bonnes réponses', () => {
    expect(scoreQui(9, 12)).toBe(75);
    expect(scoreQui(0, 0)).toBe(0);
    // Aux niveaux avancés, 100 pts avant le sans-faute : 70 % de bonnes réponses au niveau 50.
    expect(scoreQui(7, 10, 50)).toBe(100);
    expect(scoreQui(9, 12, 20)).toBe(75);
  });
});
