import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng } from '../rng';
import { generateNBack, nbackLevel, NBACK_TARGETS, NBACK_TRIALS, scoreNBack, tallyStream, tutorialTrials } from './nback';

describe('générateur du Double retour', () => {
  it('produit 20 essais notés par flux, dont exactement 30 % de cibles', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const { n, mode } = nbackLevel(level);
      for (let seed = 1; seed <= 40; seed++) {
        const seq = generateNBack(createRng(seed), level);
        expect(seq.n).toBe(n);
        expect(seq.length).toBe(n + NBACK_TRIALS);
        expect(seq.letter === null).toBe(mode === 'position');
        expect(seq.position === null).toBe(mode === 'letter');
        for (const stream of [seq.letter, seq.position]) {
          if (!stream) continue;
          expect(stream.values).toHaveLength(seq.length);
          expect(stream.targets.filter(Boolean)).toHaveLength(NBACK_TARGETS);
          stream.values.forEach((value, i) => expect(stream.targets[i]).toBe(i >= n && value === stream.values[i - n]));
        }
      }
    }
  });

  it('utilise N = 2 au niveau 2, celui du test du jour', () => {
    expect(nbackLevel(2)).toMatchObject({ n: 2, mode: 'letter' });
  });
});

describe('score du Double retour', () => {
  const seq = generateNBack(createRng(7), 2);
  const stream = seq.letter!;
  const perfect = stream.targets.slice();
  const never = stream.targets.map(() => false);
  const always = stream.targets.map((_, i) => i >= seq.n);

  it('compte bonnes réponses et bonnes abstentions', () => {
    expect(tallyStream(stream, seq.n, perfect)).toEqual({ hits: 6, misses: 0, falseAlarms: 0, correctRejections: 14 });
    expect(tallyStream(stream, seq.n, never)).toEqual({ hits: 0, misses: 6, falseAlarms: 0, correctRejections: 14 });
  });

  it('plafonne selon N : 70 à N = 1, 100 à N = 2', () => {
    const tally = tallyStream(stream, seq.n, perfect);
    expect(scoreNBack([tally], 1)).toBe(70);
    expect(scoreNBack([tally], 2)).toBe(100);
    expect(scoreNBack([tally], 20)).toBe(100);
  });

  it('ne donne rien pour une stratégie automatique (jamais ou toujours)', () => {
    expect(scoreNBack([tallyStream(stream, seq.n, never)], 2)).toBe(0);
    expect(scoreNBack([tallyStream(stream, seq.n, always)], 2)).toBe(0);
  });

  it('fait la moyenne des deux flux en mode double, et reste entre 0 et 100', () => {
    const dual = generateNBack(createRng(3), 10);
    const good = tallyStream(dual.letter!, dual.n, dual.letter!.targets);
    const bad = tallyStream(dual.position!, dual.n, dual.position!.targets.map(() => false));
    expect(scoreNBack([good, bad], 10)).toBeLessThan(scoreNBack([good, good], 10));
    const rng = createRng(3);
    for (let i = 0; i < 300; i++) {
      const responses = stream.targets.map(() => rng.chance(0.5));
      const score = scoreNBack([tallyStream(stream, seq.n, responses)], rng.int(1, MAX_LEVEL));
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe('essai guidé de Double retour', () => {
  it('propose des « pareil » et des « différent », et un piège à 2 en arrière', () => {
    for (const n of [1, 2] as const) {
      for (const channel of ['letter', 'position'] as const) {
        const t = tutorialTrials(n, channel);
        const scored = t.targets.slice(n);
        expect(scored.length).toBeGreaterThanOrEqual(10);
        expect(scored.filter(Boolean).length).toBeGreaterThanOrEqual(3);
        expect(scored.filter((x) => !x).length).toBeGreaterThanOrEqual(5);
      }
    }
    const two = tutorialTrials(2, 'letter');
    expect(two.values.some((v, i) => i >= 2 && v === two.values[i - 1] && !two.targets[i])).toBe(true);
  });
});
