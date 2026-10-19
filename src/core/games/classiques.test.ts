import { describe, expect, it } from 'vitest';
import { NBSP } from '../format';
import { MAX_LEVEL } from '../levels';
import { createRng } from '../rng';
import { evaluate } from './calcul';
import { boutiqueLevel, generateBoutiqueRound, scoreBoutique } from './boutique';
import { diableLevel, generateDiable, scoreDiable } from './diable';
import { formatEuros, generateMonnaie, monnaieLevel, scoreMonnaie } from './monnaie';
import { generateOrdreRound, ordreLevel, ordreMaxSpan, scoreOrdre } from './ordre';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const SEEDS = Array.from({ length: 40 }, (_, i) => i * 7717 + 5);

const bounded = (score: number) => {
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(100);
};

describe('Boutique', () => {
  it('ne fait jamais sortir plus de clients qu’il n’y en a, et compte juste', () => {
    for (const level of LEVELS) {
      const config = boutiqueLevel(level);
      for (const seed of SEEDS) {
        const round = generateBoutiqueRound(createRng(seed), level);
        expect(round.events).toHaveLength(config.events);
        let inside = round.start;
        for (const event of round.events) {
          expect(event.leave).toBeLessThanOrEqual(inside);
          expect(event.enter + event.leave).toBeGreaterThan(0);
          expect(Math.max(event.enter, event.leave)).toBeLessThanOrEqual(config.maxMoves);
          if (!config.cats) expect(event.cats).toBe(0);
          if (!config.both) expect(event.enter > 0 && event.leave > 0).toBe(false);
          inside += event.enter - event.leave;
          expect(inside).toBeGreaterThanOrEqual(0);
        }
        expect(round.answer).toBe(inside);
      }
    }
  });

  it('donne 20 pts par manche réussie', () => {
    expect(scoreBoutique(0)).toBe(0);
    expect(scoreBoutique(3)).toBe(60);
    expect(scoreBoutique(5)).toBe(100);
  });
});

describe('Calcul du diable', () => {
  it('pose le bon nombre de calculs, tous justes', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS.slice(0, 10)) {
        const questions = generateDiable(createRng(seed), level);
        expect(questions).toHaveLength(diableLevel(level).count);
        for (const q of questions) expect(q.answer).toBe(evaluate(q.operands, q.ops, q.paren));
      }
    }
  });

  it('récompense d’abord la justesse, puis la vitesse, entre 0 et 100', () => {
    const { count, best, worst } = diableLevel(1);
    expect(scoreDiable(count, best * 1000, 1)).toBe(100);
    expect(scoreDiable(count, worst * 1000, 1)).toBe(60);
    expect(scoreDiable(0, best * 1000, 1)).toBe(0);
    const rng = createRng(4);
    for (let i = 0; i < 300; i++) bounded(scoreDiable(rng.int(0, 16), rng.int(0, 400_000), rng.int(1, MAX_LEVEL)));
  });
});

describe('Du plus petit au plus grand', () => {
  it('place des nombres distincts dans des cases distinctes et fixe le bon ordre', () => {
    for (const level of LEVELS) {
      const config = ordreLevel(level);
      for (const seed of SEEDS.slice(0, 15)) {
        for (const length of [3, 6, 10]) {
          const count = Math.min(length, ordreMaxSpan(level));
          const round = generateOrdreRound(createRng(seed + length), length, level);
          expect(new Set(round.cells).size).toBe(count);
          expect(new Set(round.values).size).toBe(count);
          for (const cell of round.cells) expect(cell).toBeLessThan(config.size * config.size);
          for (const v of round.values) {
            expect(v).toBeGreaterThanOrEqual(config.min);
            expect(v).toBeLessThanOrEqual(config.max);
          }
          const ordered = round.order.map((cell) => round.values[round.cells.indexOf(cell)]);
          const sorted = [...ordered].sort((a, b) => (config.descending ? b - a : a - b));
          expect(ordered).toEqual(sorted);
        }
      }
    }
  });

  it('suit le barème de la Matrice', () => {
    expect(scoreOrdre(3)).toBe(0);
    expect(scoreOrdre(9)).toBe(100);
  });
});

describe('Monnaie', () => {
  it('additionne juste et rend juste', () => {
    for (const level of LEVELS) {
      const config = monnaieLevel(level);
      for (const seed of SEEDS) {
        const q = generateMonnaie(createRng(seed), level);
        if (config.mode === 'total') {
          expect(q.items.length).toBeGreaterThanOrEqual(config.minItems);
          expect(q.items.length).toBeLessThanOrEqual(config.maxItems);
          for (const item of q.items) expect(config.values).toContain(item);
          expect(q.answer).toBe(q.items.reduce((sum, v) => sum + v, 0));
        } else {
          expect(config.paidWith).toContain(q.paid);
          expect(q.price).toBeGreaterThan(0);
          expect(q.price).toBeLessThanOrEqual(config.maxPrice);
          expect(q.answer).toBe(q.paid - q.price);
          expect(q.answer).toBeGreaterThan(0);
        }
      }
    }
  });

  it('écrit les montants à la française', () => {
    expect(formatEuros(1245)).toBe(`12,45${NBSP}€`);
    expect(formatEuros(5)).toBe(`0,05${NBSP}€`);
  });

  it('reste entre 0 et 100', () => {
    for (const level of LEVELS) for (let correct = 0; correct < 20; correct += 3) bounded(scoreMonnaie(correct, level));
  });
});
