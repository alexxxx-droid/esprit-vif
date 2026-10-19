import { describe, expect, it } from 'vitest';
import { PARTY_ROUNDS, partyQuestion, partyRanking, QUESTIONS_PER_ROUND } from './party';

describe('Mode fête', () => {
  it('pose des questions justes, en entiers, avec une seule bonne réponse', () => {
    for (let seed = 1; seed < 30; seed++) {
      for (let round = 0; round < PARTY_ROUNDS.length; round++) {
        for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
          const q = partyQuestion(seed, round, i);
          expect(new Set(q.options.map((o) => o.label)).size).toBe(q.options.length);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThan(q.options.length);
          const right = q.options[q.answer];
          if (q.kind === 'calcul') {
            const [a, op, b] = q.text.split(' ');
            const value = op === '+' ? +a + +b : op === '−' ? +a - +b : +a * +b;
            expect(Number(right.label)).toBe(value);
            expect(value).toBeGreaterThanOrEqual(0);
          }
          if (q.kind === 'couleur') {
            expect(right.color).toBe(q.ink);
            expect(q.text).not.toBe(q.ink);
          }
          if (q.kind === 'grand') expect(Number(right.label)).toBe(Math.max(...q.options.map((o) => Number(o.label))));
          if (q.kind === 'combien') expect(Number(right.label)).toBe(q.dots?.length);
          for (const o of q.options) if (q.kind !== 'couleur') expect(Number.isInteger(Number(o.label)) && Number(o.label) >= 0).toBe(true);
        }
      }
    }
    expect(partyQuestion(5, 1, 2)).toEqual(partyQuestion(5, 1, 2));
  });

  it('classe les joueurs, ex æquo compris', () => {
    const ranking = partyRanking([
      { name: 'A', color: 0, score: 4 },
      { name: 'B', color: 1, score: 9 },
      { name: 'C', color: 2, score: 4 },
    ]);
    expect(ranking.map((r) => [r.player.name, r.rank])).toEqual([
      ['B', 1],
      ['A', 2],
      ['C', 2],
    ]);
  });
});
