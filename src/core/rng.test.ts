import { describe, expect, it } from 'vitest';
import { createRng, hashSeed } from './rng';

describe('createRng', () => {
  it('rejoue exactement la même suite pour une même graine', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('donne des suites différentes pour des graines différentes', () => {
    const a = Array.from({ length: 5 }, createRng(1).next);
    const b = Array.from({ length: 5 }, createRng(2).next);
    expect(a).not.toEqual(b);
  });

  it('int reste dans les bornes et les atteint', () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const n = rng.int(3, 6);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(6);
      seen.add(n);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
  });

  it('shuffle renvoie une permutation sans toucher à l’original', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = createRng(3).shuffle(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...shuffled].sort((x, y) => x - y)).toEqual(items);
  });

  it('pick refuse une liste vide', () => {
    expect(() => createRng(1).pick([])).toThrow();
  });
});

describe('hashSeed', () => {
  it('est stable et sensible au texte', () => {
    expect(hashSeed('2026-10-19')).toBe(hashSeed('2026-10-19'));
    expect(hashSeed('2026-10-19')).not.toBe(hashSeed('2026-10-20'));
  });
});
