import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { answerLength, CALCUL_COUNT, formatCalc, generateCalcul, scoreCalcul, type CalcQuestion } from './calcul';

const SEEDS = Array.from({ length: 150 }, (_, i) => i * 7919 + 1);
const LEVELS = [1, 2, 3];

function expected(q: CalcQuestion): number {
  switch (q.op) {
    case '+':
      return q.a + q.b;
    case '−':
      return q.a - q.b;
    case '×':
      return q.a * q.b;
    case '÷':
      return q.a / q.b;
  }
}

describe('générateur de Calcul éclair', () => {
  it('produit 20 questions aux réponses justes, entières et positives', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        const questions = generateCalcul(createRng(seed), level);
        expect(questions).toHaveLength(CALCUL_COUNT);
        for (const q of questions) {
          expect(q.answer).toBe(expected(q));
          expect(Number.isInteger(q.answer)).toBe(true);
          expect(q.answer).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('ne pose que des divisions exactes', () => {
    let divisions = 0;
    for (const level of [2, 3]) {
      for (const seed of SEEDS) {
        for (const q of generateCalcul(createRng(seed), level).filter((x) => x.op === '÷')) {
          divisions++;
          expect(q.b).toBeGreaterThan(0);
          expect(q.a % q.b).toBe(0);
          expect(q.answer).toBe(q.a / q.b);
        }
      }
    }
    expect(divisions).toBeGreaterThan(100);
  });

  it('reste à un chiffre et sans division au niveau 1', () => {
    for (const seed of SEEDS) {
      for (const q of generateCalcul(createRng(seed), 1)) {
        expect(['+', '−', '×']).toContain(q.op);
        expect(q.a).toBeLessThanOrEqual(9);
        expect(q.b).toBeLessThanOrEqual(9);
        expect(q.a).toBeGreaterThanOrEqual(1);
        expect(q.b).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('respecte les plafonds du niveau 3 (jusqu’à 100, tables de 12)', () => {
    for (const seed of SEEDS) {
      for (const q of generateCalcul(createRng(seed), 3)) {
        if (q.op === '+') expect(q.answer).toBeLessThanOrEqual(100);
        if (q.op === '−') expect(q.a).toBeLessThanOrEqual(100);
        if (q.op === '×') expect(Math.max(q.a, q.b)).toBeLessThanOrEqual(12);
        if (q.op === '÷') expect(Math.max(q.b, q.answer)).toBeLessThanOrEqual(12);
      }
    }
  });

  it('n’enchaîne jamais deux calculs identiques', () => {
    for (const seed of SEEDS) {
      const qs = generateCalcul(createRng(seed), 1);
      for (let i = 1; i < qs.length; i++) expect(formatCalc(qs[i])).not.toBe(formatCalc(qs[i - 1]));
    }
  });

  it('rejoue la même partie avec la même graine', () => {
    expect(generateCalcul(createRng(99), 2)).toEqual(generateCalcul(createRng(99), 2));
  });

  it('compte les chiffres attendus pour la validation automatique', () => {
    expect(answerLength(0)).toBe(1);
    expect(answerLength(7)).toBe(1);
    expect(answerLength(42)).toBe(2);
    expect(answerLength(144)).toBe(3);
  });
});

describe('score de Calcul éclair', () => {
  it('suit le barème du niveau 1 : 100 à 20 s, 0 à 80 s, +3 s par erreur', () => {
    expect(scoreCalcul(20_000, 0, 1)).toBe(100);
    expect(scoreCalcul(80_000, 0, 1)).toBe(0);
    expect(scoreCalcul(50_000, 0, 1)).toBe(50);
    expect(scoreCalcul(44_000, 2, 1)).toBe(50); // 44 + 6 = 50 s
  });

  it('reste entre 0 et 100', () => {
    const rng = createRng(5);
    for (let i = 0; i < 500; i++) {
      const score = scoreCalcul(rng.int(0, 300_000), rng.int(0, 20), rng.int(1, 3));
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});
