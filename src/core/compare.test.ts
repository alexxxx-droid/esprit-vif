import { describe, expect, it } from 'vitest';
import { compareToHistory } from './compare';

describe('Comparaison avec ses propres parties', () => {
  it('marque la première partie comme point de départ', () => {
    expect(compareToHistory(50, [])).toEqual({ kind: 'first' });
  });

  it('compare à la moyenne des 10 dernières parties, avec 3 points de tolérance', () => {
    expect(compareToHistory(80, [60, 70])).toEqual({ kind: 'above', diff: 15, average: 65, count: 2 });
    expect(compareToHistory(67, [60, 70])).toEqual({ kind: 'level', diff: 2, average: 65, count: 2 });
    expect(compareToHistory(50, [60, 70])).toEqual({ kind: 'below', diff: -15, average: 65, count: 2 });
    const many = [...Array(10).fill(80), ...Array(20).fill(0)];
    expect(compareToHistory(80, many)).toMatchObject({ kind: 'level', average: 80, count: 10 });
  });
});
