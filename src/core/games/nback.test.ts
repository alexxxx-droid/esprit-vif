import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { generateNBack, NBACK_TARGETS, NBACK_TRIALS, scoreNBack, tallyNBack } from './nback';

describe('générateur du Double retour', () => {
  it('produit 20 essais notés, dont exactement 30 % de cibles', () => {
    for (const n of [1, 2, 3]) {
      for (let seed = 1; seed <= 200; seed++) {
        const seq = generateNBack(createRng(seed), n);
        expect(seq.n).toBe(n);
        expect(seq.letters).toHaveLength(n + NBACK_TRIALS);
        expect(seq.targets.filter(Boolean)).toHaveLength(NBACK_TARGETS);
        seq.letters.forEach((letter, i) => {
          expect(seq.targets[i]).toBe(i >= n && letter === seq.letters[i - n]);
        });
      }
    }
  });
});

describe('score du Double retour', () => {
  const seq = generateNBack(createRng(7), 2);
  const perfect = seq.targets.slice();
  const never = seq.targets.map(() => false);
  const always = seq.targets.map((_, i) => i >= seq.n);

  it('compte bonnes réponses et bonnes abstentions', () => {
    expect(tallyNBack(seq, perfect)).toEqual({ hits: 6, misses: 0, falseAlarms: 0, correctRejections: 14 });
    expect(tallyNBack(seq, never)).toEqual({ hits: 0, misses: 6, falseAlarms: 0, correctRejections: 14 });
  });

  it('plafonne selon N : 70 à N = 1, 100 à N = 2 et 3', () => {
    const tally = tallyNBack(seq, perfect);
    expect(scoreNBack(tally, 1)).toBe(70);
    expect(scoreNBack(tally, 2)).toBe(100);
    expect(scoreNBack(tally, 3)).toBe(100);
  });

  it('ne donne rien pour une stratégie automatique (jamais ou toujours)', () => {
    expect(scoreNBack(tallyNBack(seq, never), 2)).toBe(0);
    expect(scoreNBack(tallyNBack(seq, always), 2)).toBe(0);
  });

  it('reste entre 0 et 100', () => {
    const rng = createRng(3);
    for (let i = 0; i < 500; i++) {
      const responses = seq.targets.map(() => rng.chance(0.5));
      const score = scoreNBack(tallyNBack(seq, responses), rng.int(1, 3));
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});
