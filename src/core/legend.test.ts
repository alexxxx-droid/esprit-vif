import { describe, expect, it } from 'vitest';
import { legendBest, legendChallenge, legendDays, type LegendPlay } from './legend';
import { sparksEarned, SPARKS } from './objectives';

const passed = (gameId: LegendPlay['gameId'], upTo: number, day = '2026-10-10'): LegendPlay[] =>
  Array.from({ length: upTo }, (_, i) => ({ gameId, level: i + 1, score: 80, day }));

describe('Défi Légende du jour', () => {
  it('reste fermé tant qu’aucun jeu n’a ouvert le palier Légende', () => {
    expect(legendChallenge('2026-10-20', passed('calcul', 39))).toBeNull();
    expect(legendChallenge('2026-10-20', passed('calcul', 40))).not.toBeNull();
  });

  it('propose un jeu de niveau Expert au moins, à son plus haut niveau ouvert, toujours le même pour la journée', () => {
    const plays = [...passed('calcul', 40), ...passed('stroop', 25), ...passed('schulte', 5)];
    for (let d = 10; d < 30; d++) {
      const day = `2026-11-${d}`;
      const c = legendChallenge(day, plays)!;
      expect(['calcul', 'stroop']).toContain(c.gameId);
      expect(c.level).toBe(c.gameId === 'calcul' ? 41 : 26);
      expect(legendChallenge(day, [...plays, { gameId: 'stroop', level: 26, score: 99, day }])).toEqual(c);
    }
  });

  it('passe en maîtrise quand le niveau 50 est réussi', () => {
    expect(legendChallenge('2026-10-20', passed('calcul', 50))?.level).toBe(51);
  });

  it('récompense une fois par jour, et garde le meilleur score du jour', () => {
    const day = '2026-10-20';
    const plays = [
      { gameId: 'calcul' as const, level: 41, score: 70, day, mode: 'legende', at: `${day}T08:00:00Z` },
      { gameId: 'calcul' as const, level: 41, score: 85, day, mode: 'legende', at: `${day}T09:00:00Z` },
    ];
    expect(legendDays(plays).size).toBe(1);
    expect(legendBest(plays, day)).toBe(85);
    const base = sparksEarned({ plays: plays.map((p) => ({ ...p, mode: 'free' })), tests: [], sessions: [] });
    expect(sparksEarned({ plays, tests: [], sessions: [] }) - base).toBe(SPARKS.legende);
  });
});
