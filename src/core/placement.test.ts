import { describe, expect, it } from 'vitest';
import { gamesOfDomain } from './games/registry';
import { placement, startLevelFor } from './placement';

describe('Bilan de départ', () => {
  it('place selon le score du test', () => {
    expect([50, 70, 85, 95].map(startLevelFor)).toEqual([1, 2, 3, 4]);
  });

  it('ouvre tout le domaine du jeu réussi, et rien ailleurs', () => {
    const starts = placement([
      { gameId: 'calcul', score: 90 },
      { gameId: 'stroop', score: 40 },
      { gameId: 'matrice', score: 72 },
    ]);
    for (const id of gamesOfDomain('calcul')) expect(starts[id]).toBe(3);
    for (const id of gamesOfDomain('memoire')) expect(starts[id]).toBe(2);
    expect(starts.stroop).toBeUndefined();
  });
});
