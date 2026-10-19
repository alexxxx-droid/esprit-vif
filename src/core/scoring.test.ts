import { describe, expect, it } from 'vitest';
import { adaptLevel, brainAge, clampScore, countScore, timeScore } from './scoring';

describe('brainAge', () => {
  it('applique arrondi(80 − 0,6 × moyenne)', () => {
    expect(brainAge([100, 100, 100])).toBe(20);
    expect(brainAge([0, 0, 0])).toBe(80);
    expect(brainAge([50, 50, 50])).toBe(50);
    expect(brainAge([70, 80, 90])).toBe(32); // 80 − 0,6 × 80 = 32
    expect(brainAge([71, 72, 73])).toBe(37); // 80 − 43,2 = 36,8
  });

  it('reste entre 20 et 80 quoi qu’il arrive', () => {
    expect(brainAge([])).toBe(80);
    expect(brainAge([150, 200])).toBe(20);
    expect(brainAge([-40])).toBe(80);
    for (let s = 0; s <= 100; s++) {
      const age = brainAge([s]);
      expect(age).toBeGreaterThanOrEqual(20);
      expect(age).toBeLessThanOrEqual(80);
    }
  });
});

describe('timeScore', () => {
  const thresholds = { best: 20, worst: 80 };

  it('donne 100 au seuil haut, 0 au seuil bas, linéaire entre les deux', () => {
    expect(timeScore(20, thresholds)).toBe(100);
    expect(timeScore(10, thresholds)).toBe(100);
    expect(timeScore(80, thresholds)).toBe(0);
    expect(timeScore(500, thresholds)).toBe(0);
    expect(timeScore(50, thresholds)).toBe(50);
  });

  it('borne tout résultat entre 0 et 100', () => {
    for (const seconds of [-5, 0, 0.1, 19.99, 47.3, 79.9, 1e9, Infinity]) {
      const score = timeScore(seconds, thresholds);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe('countScore et clampScore', () => {
  it('bornent et arrondissent', () => {
    expect(countScore(9, 3, 9)).toBe(100);
    expect(countScore(3, 3, 9)).toBe(0);
    expect(countScore(6, 3, 9)).toBe(50);
    expect(countScore(12, 3, 9)).toBe(100);
    expect(clampScore(Number.NaN)).toBe(0);
    expect(clampScore(-Infinity)).toBe(0);
    expect(clampScore(99.6)).toBe(100);
  });
});

describe('adaptLevel', () => {
  it('monte après un bon score, descend après un score faible, sans sortir des bornes', () => {
    expect(adaptLevel(1, 80, 3)).toBe(2);
    expect(adaptLevel(3, 95, 3)).toBe(3);
    expect(adaptLevel(2, 60, 3)).toBe(2);
    expect(adaptLevel(2, 20, 3)).toBe(1);
    expect(adaptLevel(1, 0, 3)).toBe(1);
  });
});
