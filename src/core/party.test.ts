import { afterEach, describe, expect, it } from 'vitest';
import { STROOP_COLORS, STROOP_LABELS } from './games/stroop';
import { setLang } from './lang';
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

describe('Mode fête en anglais', () => {
  afterEach(() => setLang('fr'));

  it('titre et règle de chaque manche suivent la langue', () => {
    expect(PARTY_ROUNDS.map((r) => r.title)).toEqual(['Calcul express', 'Couleur piégée', 'Le plus grand', 'Combien de points ?', 'Finale : calcul']);
    setLang('en');
    expect(PARTY_ROUNDS.map((r) => r.title)).toEqual(['Quick Math', 'Color Trap', 'The Bigger One', 'How Many Dots?', 'Final: Math']);
    for (const r of PARTY_ROUNDS) expect(r.rule).toMatch(/^[A-Z][^ ]*( [^ ]+)*[.!]$/);
  });

  it('écrit les mots de couleur en anglais, toujours piégés', () => {
    setLang('en');
    const english = new Set(STROOP_COLORS.map((c) => STROOP_LABELS[c].toLowerCase()));
    for (let seed = 1; seed < 30; seed++) {
      for (let round = 0; round < PARTY_ROUNDS.length; round++) {
        for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
          const q = partyQuestion(seed, round, i);
          if (q.kind === 'couleur') {
            expect(english.has(q.text)).toBe(true);
            expect(q.text).not.toBe(STROOP_LABELS[q.ink!].toLowerCase());
            for (const o of q.options) expect(o.label).toBe(STROOP_LABELS[o.color!].toLowerCase());
            expect(q.options[q.answer].color).toBe(q.ink);
          }
          if (q.kind === 'grand') expect(q.text).toBe('Which is bigger?');
          if (q.kind === 'combien') expect(q.text).toBe('How many dots?');
        }
      }
    }
    // Même graine, même partie : seuls les mots changent de langue.
    const en = partyQuestion(5, 1, 2);
    setLang('fr');
    const fr = partyQuestion(5, 1, 2);
    expect(en.ink).toBe(fr.ink);
    expect(en.answer).toBe(fr.answer);
    expect(en.options.map((o) => o.color)).toEqual(fr.options.map((o) => o.color));
    expect(fr.options.map((o) => o.label)).toEqual(fr.options.map((o) => o.color));
  });
});
