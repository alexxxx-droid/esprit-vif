import { describe, expect, it } from 'vitest';
import { NBSP } from '../format';
import { MAX_LEVEL } from '../levels';
import { createRng } from '../rng';
import { balanceLevel, deducedAnswer, generateBalance, scoreBalance, type BalanceClue } from './balance';
import { formatClock, formatDuration, generateHorloges, handAngles, HALF_DAY, horlogesLevel, scoreHorloges } from './horloges';
import { congruent, generateRotation, mirror, normalize, rotate, rotationLevel, sameUpToRotation, scoreRotation, type Piece } from './rotation';
import { countSolutions, generateSudoku, peers, solveBySingles, sudokuLevel, scoreSudoku } from './sudoku';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const SEEDS = Array.from({ length: 12 }, (_, i) => i * 7919 + 5);
const key = (piece: Piece) => JSON.stringify(normalize(piece));

describe('Rotation mentale', () => {
  it('tourne et retourne les pièces sans les déformer', () => {
    const l: Piece = [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
    ];
    expect(key(rotate(l, 4))).toBe(key(l));
    expect(key(rotate(rotate(l, 1), 3))).toBe(key(l));
    expect(sameUpToRotation(l, mirror(l))).toBe(false);
    expect(congruent(l, mirror(l))).toBe(true);
  });

  it('propose une seule bonne pièce, des reflets qui ne tournent jamais en elle, et des choix tous différents', () => {
    for (const level of LEVELS) {
      const c = rotationLevel(level);
      for (const seed of SEEDS.slice(0, 4)) {
        for (const p of generateRotation(createRng(seed + level), level, 6)) {
          // Les pièces en relief (niveaux 31 et plus) sont vérifiées dans levels-logique.test.ts.
          if (p.solid) continue;
          expect(p.options).toHaveLength(c.options);
          expect(p.model).toHaveLength(c.size);
          expect(p.kinds.filter((k) => k === 'mirror')).toHaveLength(c.mirrors);
          expect(p.kinds[p.answer]).toBe('same');
          expect(key(p.options[p.answer])).not.toBe(key(p.model));
          expect(new Set(p.options.map(key)).size).toBe(c.options);
          p.options.forEach((option, i) => {
            expect(sameUpToRotation(p.model, option)).toBe(i === p.answer);
            if (p.kinds[i] === 'mirror') expect(congruent(p.model, option)).toBe(true);
            if (p.kinds[i] === 'other') expect(congruent(p.model, option)).toBe(false);
          });
        }
      }
    }
  });

  it('compte une erreur contre une bonne réponse', () => {
    const { target } = rotationLevel(1);
    expect(scoreRotation(target, 0, 1)).toBe(100);
    expect(scoreRotation(target, target, 1)).toBe(0);
  });
});

describe('Mini-sudoku', () => {
  it('produit des grilles justes à solution unique, avec le bon nombre de chiffres donnés', () => {
    for (const level of LEVELS) {
      const c = sudokuLevel(level);
      for (const seed of SEEDS.slice(0, 3)) {
        const puzzles = generateSudoku(createRng(seed + level), level);
        expect(puzzles).toHaveLength(c.puzzles);
        for (const p of puzzles) {
          expect(p.solution).toHaveLength(c.size * c.size);
          p.solution.forEach((v, i) => {
            expect(v).toBeGreaterThanOrEqual(1);
            expect(v).toBeLessThanOrEqual(c.size);
            for (const peer of peers(c.size, i)) expect(p.solution[peer]).not.toBe(v);
          });
          const shown = p.given.filter(Boolean).length;
          expect(shown).toBeGreaterThanOrEqual(c.givens);
          expect(shown).toBeLessThanOrEqual(c.givens + 2);
          const grid = p.solution.map((v, i) => (p.given[i] ? v : 0));
          // Grilles « pas à pas » (niveaux 21 et plus) : la résolution par simples déductions prouve l'unicité.
          if (c.logic) expect(solveBySingles(grid, c.size)).toEqual(p.solution);
          else expect(countSolutions(grid, c.size)).toBe(1);
        }
      }
    }
  });

  it('voit 7 cases en 4 × 4 et 12 en 6 × 6', () => {
    expect(peers(4, 0).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 8, 12]);
    expect(peers(6, 0)).toHaveLength(12);
    expect(countSolutions(Array(16).fill(0), 4)).toBe(2);
  });

  it('note au temps, pénalités comprises', () => {
    const { best, worst } = sudokuLevel(1);
    expect(scoreSudoku(best * 1000, 0, 1)).toBe(100);
    expect(scoreSudoku(worst * 1000, 0, 1)).toBe(0);
    expect(scoreSudoku(best * 1000, 2, 1)).toBeLessThan(100);
  });
});

describe('Balance', () => {
  const holds = (clue: BalanceClue, weights: number[]) => {
    const s = (items: number[]) => items.reduce((sum, i) => sum + weights[i], 0);
    return clue.heavier === 'left' ? s(clue.left) > s(clue.right) : s(clue.right) > s(clue.left);
  };

  it('ne montre que des balances vraies, et la réponse se déduit sans calcul', () => {
    for (const level of LEVELS) {
      const c = balanceLevel(level);
      for (const seed of SEEDS) {
        for (const p of generateBalance(createRng(seed + level), level)) {
          expect(p.weights).toHaveLength(c.items);
          expect(new Set(p.weights).size).toBe(c.items);
          for (const clue of p.clues) expect(holds(clue, p.weights)).toBe(true);
          const target = p.ask === 'heaviest' ? Math.max(...p.weights) : Math.min(...p.weights);
          expect(p.weights[p.answer]).toBe(target);
          expect(deducedAnswer(c.items, p.clues, p.ask)).toBe(p.answer);
          expect(p.clues.length).toBeLessThanOrEqual(c.items + c.noise);
          // Sans « deux contre un », aucun objet seul ne bat deux objets différents (« 1 ■ contre 2 ▲ » reste permis).
          if (!c.pairs) {
            const oneBeatsTwo = (clue: BalanceClue) => {
              const heavy = clue.heavier === 'left' ? clue.left : clue.right;
              const light = clue.heavier === 'left' ? clue.right : clue.left;
              return heavy.length === 1 && light.length === 2 && light[0] !== light[1];
            };
            expect(p.clues.filter(oneBeatsTwo)).toHaveLength(0);
          }
        }
      }
    }
  });

  it('récompense la justesse avant la vitesse', () => {
    const { puzzles } = balanceLevel(1);
    expect(scoreBalance(puzzles, 1000, 1)).toBe(100);
    expect(scoreBalance(puzzles, 3_600_000, 1)).toBe(60);
    expect(scoreBalance(0, 1000, 1)).toBe(0);
  });
});

describe('Horloges', () => {
  it('écrit les heures et les durées à la française', () => {
    expect(formatClock(0)).toBe(`12${NBSP}h${NBSP}00`);
    expect(formatClock(135)).toBe(`2${NBSP}h${NBSP}15`);
    expect(formatClock(HALF_DAY + 5)).toBe(`12${NBSP}h${NBSP}05`);
    expect(formatDuration(45)).toBe(`45${NBSP}min`);
    expect(formatDuration(60)).toBe(`1${NBSP}h`);
    expect(formatDuration(85)).toBe(`1${NBSP}h${NBSP}25`);
    expect(handAngles(180)).toEqual({ hour: 90, minute: 0 });
    expect(handAngles(45)).toEqual({ hour: 22.5, minute: 270 });
  });

  it('propose 4 réponses différentes dont la bonne', () => {
    for (const level of LEVELS) {
      const c = horlogesLevel(level);
      for (const seed of SEEDS.slice(0, 4)) {
        for (const q of generateHorloges(createRng(seed + level), level, 15)) {
          expect(c.modes).toContain(q.mode);
          expect(q.options).toHaveLength(4);
          expect(new Set(q.options).size).toBe(4);
          expect(q.clock % c.step).toBe(0);
          if (q.mode === 'read') expect(q.options[q.answer]).toBe(formatClock(q.clock));
          if (q.mode === 'later') {
            expect(q.delta).toBeGreaterThan(0);
            expect(q.delta).toBeLessThanOrEqual(c.maxDelta);
            expect(q.options[q.answer]).toBe(formatClock(q.clock + q.delta));
          }
          if (q.mode === 'elapsed') {
            const d = ((q.clock2 ?? 0) - q.clock + HALF_DAY) % HALF_DAY;
            expect(d).toBeLessThanOrEqual(c.maxDelta);
            expect(q.options[q.answer]).toBe(formatDuration(d));
          }
        }
      }
    }
  });

  it('compte une erreur contre une bonne réponse', () => {
    const { target } = horlogesLevel(3);
    expect(scoreHorloges(target + 2, 2, 3)).toBe(100);
    expect(scoreHorloges(3, 5, 3)).toBe(0);
  });
});
