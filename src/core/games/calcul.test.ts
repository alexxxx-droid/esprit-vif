import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng } from '../rng';
import { answerLength, CALCUL_COUNT, evaluate, formatCalc, generateCalcul, scoreCalcul } from './calcul';

const SEEDS = Array.from({ length: 60 }, (_, i) => i * 7919 + 1);
const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);

describe('générateur de Calcul éclair', () => {
  it('produit 20 questions aux réponses justes, entières et positives, à tous les niveaux', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        const questions = generateCalcul(createRng(seed), level);
        expect(questions).toHaveLength(CALCUL_COUNT);
        for (const q of questions) {
          expect(q.answer).toBe(evaluate(q.operands, q.ops, q.paren));
          expect(Number.isInteger(q.answer)).toBe(true);
          expect(q.answer).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('ne pose que des divisions exactes', () => {
    let divisions = 0;
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        for (const q of generateCalcul(createRng(seed), level)) {
          q.ops.forEach((op, i) => {
            // Les calculs à trou (« ? ÷ 7 = 12 ») sont vérifiés à part, dans levels-calcul.test.ts.
            if (op !== '÷' || q.paren === 'holeLeft' || q.paren === 'holeRight') return;
            divisions++;
            expect(q.operands[i + 1]).toBeGreaterThan(0);
            expect(q.operands[i] % q.operands[i + 1]).toBe(0);
          });
        }
      }
    }
    expect(divisions).toBeGreaterThan(500);
  });

  it('respecte la spec au niveau 1 : +, −, × à un chiffre', () => {
    for (const seed of SEEDS) {
      for (const q of generateCalcul(createRng(seed), 1)) {
        expect(q.ops).toHaveLength(1);
        expect(['+', '−', '×']).toContain(q.ops[0]);
        for (const n of q.operands) {
          expect(n).toBeGreaterThanOrEqual(1);
          expect(n).toBeLessThanOrEqual(9);
        }
      }
    }
  });

  it('respecte la spec au niveau 2 (deux chiffres, divisions) et au niveau 3 (jusqu’à 100, tables de 12)', () => {
    for (const seed of SEEDS) {
      const level2 = generateCalcul(createRng(seed), 2);
      expect(level2.every((q) => Math.max(...q.operands) <= 99)).toBe(true);
      for (const q of generateCalcul(createRng(seed), 3)) {
        const [a, b] = q.operands;
        if (q.ops[0] === '+') expect(q.answer).toBeLessThanOrEqual(100);
        if (q.ops[0] === '−') expect(a).toBeLessThanOrEqual(100);
        if (q.ops[0] === '×') expect(Math.max(a, b)).toBeLessThanOrEqual(12);
        if (q.ops[0] === '÷') expect(Math.max(b, q.answer)).toBeLessThanOrEqual(12);
      }
    }
  });

  it('applique la priorité des opérations et les parenthèses', () => {
    expect(evaluate([3, 4, 5], ['×', '+'])).toBe(17);
    expect(evaluate([20, 3, 4], ['−', '×'])).toBe(8);
    expect(evaluate([2, 3, 4], ['+', '×'], true)).toBe(20);
    expect(evaluate([2, 3, 4, 5], ['×', '+', '×'])).toBe(26);
    expect(formatCalc({ operands: [2, 3, 4], ops: ['+', '×'], paren: true, answer: 20 })).toBe('(2 + 3) × 4');
  });

  it('n’enchaîne jamais deux calculs identiques', () => {
    for (const seed of SEEDS) {
      const qs = generateCalcul(createRng(seed), 1);
      for (let i = 1; i < qs.length; i++) expect(formatCalc(qs[i])).not.toBe(formatCalc(qs[i - 1]));
    }
  });

  it('rejoue la même partie avec la même graine', () => {
    expect(generateCalcul(createRng(99), 12)).toEqual(generateCalcul(createRng(99), 12));
  });

  it('compte les chiffres attendus pour la validation automatique', () => {
    expect(answerLength(0)).toBe(1);
    expect(answerLength(42)).toBe(2);
    expect(answerLength(1444)).toBe(4);
  });
});

describe('score de Calcul éclair', () => {
  it('suit le barème du niveau 1 : 100 à 20 s, 0 à 80 s, +3 s par erreur', () => {
    expect(scoreCalcul(20_000, 0, 1)).toBe(100);
    expect(scoreCalcul(80_000, 0, 1)).toBe(0);
    expect(scoreCalcul(50_000, 0, 1)).toBe(50);
    expect(scoreCalcul(44_000, 2, 1)).toBe(50);
  });

  it('reste entre 0 et 100 à tous les niveaux', () => {
    const rng = createRng(5);
    for (let i = 0; i < 500; i++) {
      const score = scoreCalcul(rng.int(0, 400_000), rng.int(0, 20), rng.int(1, MAX_LEVEL));
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});
