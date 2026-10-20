import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng } from '../rng';
import { COUP_LEVELS, coupLevel, generateCoupTrial, scoreCoup } from './coupdoeil';

const area = (dots: { r: number }[]) => dots.reduce((sum, d) => sum + d.r * d.r, 0);

describe('Coup d’œil', () => {
  it('a MAX_LEVEL niveaux qui resserrent l’écart et raccourcissent l’affichage', () => {
    expect(COUP_LEVELS).toHaveLength(MAX_LEVEL);
    for (let i = 1; i < COUP_LEVELS.length; i++) {
      expect(COUP_LEVELS[i].ratio).toBeLessThanOrEqual(COUP_LEVELS[i - 1].ratio);
      expect(COUP_LEVELS[i].showMs).toBeLessThanOrEqual(COUP_LEVELS[i - 1].showMs);
    }
  });

  it('montre deux nuées entières, sans chevauchement, la bonne étant la plus nombreuse', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const rng = createRng(level * 31);
      for (let k = 0; k < 15; k++) {
        const t = generateCoupTrial(rng, level);
        const [a, b] = t.groups;
        const c = coupLevel(level);
        const [many, few] = t.answer === 0 ? [a, b] : [b, a];
        expect(many.length).toBeGreaterThan(few.length);
        expect(few.length).toBeGreaterThanOrEqual(c.min);
        expect(few.length).toBeLessThanOrEqual(c.max);
        const all = [...a, ...b, ...(t.noise ?? [])];
        // Jusqu'à 120 points : on cherche le pire cas, puis un seul `expect` (des milliers d'appels ralentiraient le test).
        let outside = 0;
        let overlaps = 0;
        for (let i = 0; i < all.length; i++) {
          const d = all[i];
          if (d.x - d.r < 0 || d.x + d.r > 100 || d.y - d.r < 0 || d.y + d.r > 100) outside++;
          for (let j = i + 1; j < all.length; j++) if (Math.hypot(d.x - all[j].x, d.y - all[j].y) <= d.r + all[j].r) overlaps++;
        }
        expect({ level, outside, overlaps }).toEqual({ level, outside: 0, overlaps: 0 });
      }
    }
  });

  it('ne laisse pas la quantité d’encre trahir la réponse', () => {
    const rng = createRng(5);
    let inkTells = 0;
    const n = 400;
    for (let k = 0; k < n; k++) {
      const t = generateCoupTrial(rng, 12);
      const [a, b] = t.groups.map(area);
      if ((a > b ? 0 : 1) === t.answer) inkTells++;
    }
    // Au hasard : 50 %. La surface ne doit pas être un raccourci fiable.
    expect(inkTells / n).toBeLessThan(0.75);
    expect(generateCoupTrial(createRng(9), 4)).toEqual(generateCoupTrial(createRng(9), 4));
  });

  it('ne récompense pas les réponses au hasard', () => {
    expect(scoreCoup(10, 10, 1)).toBe(0);
    expect(scoreCoup(20, 0, 1)).toBe(100);
    expect(scoreCoup(14, 3, 20)).toBe(100);
  });
});
