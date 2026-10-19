import { describe, expect, it } from 'vitest';
import { addDays } from './daily';
import { insights, type InsightPlay } from './insights';
import type { GameId } from './types';

const TODAY = '2026-10-19';
const play = (gameId: GameId, score: number, daysAgo: number, hour = 10): InsightPlay => {
  const day = addDays(TODAY, -daysAgo);
  const at = new Date(`${day}T00:00:00`);
  at.setHours(hour);
  return { gameId, score, day, at: at.toISOString() };
};

describe('Constats', () => {
  it('ne dit rien sans assez de parties', () => {
    expect(insights([], TODAY)).toEqual([]);
    expect(insights([play('calcul', 50, 0)], TODAY)).toEqual([]);
  });

  it('repère le domaine qui progresse', () => {
    const plays = [
      ...[40, 50, 45].map((s, i) => play('rotation', s, 40 + i)),
      ...[70, 75, 72].map((s, i) => play('balance', s, 2 + i)),
    ];
    const found = insights(plays, TODAY).find((i) => i.id === 'progress');
    expect(found?.text).toBe('En Logique, +27 pts en moyenne ces 30 derniers jours par rapport aux 30 d’avant.');
  });

  it('trouve le meilleur moment, à jeu égal', () => {
    const plays = [
      ...Array.from({ length: 6 }, (_, i) => play('calcul', 80, i, 9)),
      ...Array.from({ length: 6 }, (_, i) => play('calcul', 60, i, 21)),
    ];
    const found = insights(plays, TODAY).find((i) => i.id === 'moment');
    expect(found?.text).toBe('Tu réussis mieux le matin : +20 pts par rapport à tes autres moments.');
    expect(found?.icon).toBe('sun');
  });

  it('salue la régularité et propose un domaine à découvrir', () => {
    const plays = Array.from({ length: 10 }, (_, i) => play('calcul', 60, i));
    const found = insights(plays, TODAY);
    expect(found.find((i) => i.id === 'regularity')?.text).toBe('10 jours d’entraînement sur les 14 derniers : une régularité exemplaire.');
    expect(found.find((i) => i.id === 'discovery')?.text).toBe('Tu n’as pas encore essayé le domaine Mémoire : commence par Matrice.');
  });
});
