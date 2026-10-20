import { describe, expect, it } from 'vitest';
import { domainMastery, domainProfile, suggestGame, type ScoredPlay } from './stats';

const play = (gameId: ScoredPlay['gameId'], score: number, at: string): ScoredPlay => ({ gameId, score, at });

describe('domainProfile', () => {
  it('fait la moyenne des 5 dernières parties de chaque domaine', () => {
    const plays = [
      play('calcul', 10, '2026-10-01T10:00:00Z'), // la plus ancienne : écartée
      play('calcul', 50, '2026-10-02T10:00:00Z'),
      play('calcul', 60, '2026-10-03T10:00:00Z'),
      play('calcul', 70, '2026-10-04T10:00:00Z'),
      play('calcul', 80, '2026-10-05T10:00:00Z'),
      play('calcul', 90, '2026-10-06T10:00:00Z'),
      play('stroop', 40, '2026-10-06T11:00:00Z'),
    ];
    const profile = domainProfile(plays);
    expect(profile.calcul).toBe(70);
    expect(profile.attention).toBe(40);
    expect(profile.memoire).toBeNull();
  });
});

describe('suggestGame', () => {
  it('propose d’abord un jeu jamais essayé', () => {
    expect(suggestGame([play('calcul', 90, '2026-10-01T10:00:00Z')], ['calcul', 'stroop', 'schulte'])).toBe('stroop');
  });

  it('puis le domaine le plus faible, sans reproposer la dernière partie', () => {
    const plays = [
      play('calcul', 20, '2026-10-01T10:00:00Z'),
      play('stroop', 90, '2026-10-01T11:00:00Z'),
      play('schulte', 60, '2026-10-01T12:00:00Z'),
    ];
    expect(suggestGame(plays, ['calcul', 'stroop', 'schulte'])).toBe('calcul');
    expect(suggestGame([...plays, play('calcul', 30, '2026-10-02T10:00:00Z')], ['calcul', 'stroop', 'schulte'])).toBe(
      'schulte',
    );
  });
});

describe('domainMastery', () => {
  it('monte avec les niveaux, pas avec un seul bon score', () => {
    expect(domainMastery({ sudoku: { 1: { score: 100 } } }).logique).toBe(14);
    expect(domainMastery({ sudoku: { 10: { score: 100 } } }).logique).toBe(45);
    expect(domainMastery({ sudoku: { 20: { score: 100 } } }).logique).toBe(63);
    expect(domainMastery({ sudoku: { 35: { score: 100 } } }).logique).toBe(84);
    expect(domainMastery({ sudoku: { 50: { score: 100 } } }).logique).toBe(100);
  });

  it('prend le meilleur point de chaque jeu et la moyenne des jeux joués du domaine', () => {
    const m = domainMastery({ sudoku: { 1: { score: 100 }, 2: { score: 40 } }, balance: { 1: { score: 100 } }, calcul: {} });
    // Sudoku : niveau 2 à 40 → (1 + 0,4) / 50 ; Balance : niveau 1 réussi → 1 / 50.
    expect(m.logique).toBe(Math.round(100 * Math.sqrt((1.4 / 50 + 1 / 50) / 2)));
    expect(m.calcul).toBeNull();
    expect(m.memoire).toBeNull();
  });
});
