import { describe, expect, it } from 'vitest';
import { addDays } from './daily';
import { GAMES, gamesOfDomain } from './games/registry';
import { duelRounds, duelWinner, marathonGames, roundWinner, sessionDone, sessionGames, SESSION_SIZE } from './modes';
import type { GameId } from './types';

const play = (gameId: GameId, score: number, day: string) => ({ gameId, score, day, at: `${day}T10:00:00.000Z`, mode: 'free' });

describe('Séance du jour', () => {
  it('choisit 4 jeux de 4 domaines différents, toujours les mêmes pour un jour donné', () => {
    const picks = sessionGames('2026-10-19', []);
    expect(picks).toHaveLength(SESSION_SIZE);
    expect(new Set(picks.map((p) => p.domain)).size).toBe(SESSION_SIZE);
    for (const p of picks) expect(GAMES[p.gameId].domain).toBe(p.domain);
    expect(sessionGames('2026-10-19', [])).toEqual(picks);
    expect(picks.slice(0, 2).every((p) => p.reason === 'new')).toBe(true);
  });

  it('commence par les domaines les plus faibles', () => {
    const day = '2026-10-19';
    const yesterday = addDays(day, -1);
    const plays = [
      play('calcul', 95, yesterday),
      play('matrice', 90, yesterday),
      play('stroop', 92, yesterday),
      play('schulte', 30, yesterday),
      play('anagrammes', 20, yesterday),
      play('rotation', 88, yesterday),
    ];
    const picks = sessionGames(day, plays);
    expect(picks.slice(0, 2).map((p) => p.domain)).toEqual(['langage', 'vitesse']);
    expect(picks[0].reason).toBe('weak');
    // Dans un domaine déjà joué, on propose un jeu pas encore essayé.
    expect(picks[0].gameId).not.toBe('anagrammes');
  });

  it('fait passer les objectifs du joueur en tête', () => {
    const picks = sessionGames('2026-10-19', [], ['logique', 'langage']);
    expect(picks.slice(0, 2).map((p) => p.domain).sort()).toEqual(['langage', 'logique']);
    expect(picks[0].reason).toBe('goal');
    expect(new Set(picks.map((p) => p.domain)).size).toBe(SESSION_SIZE);
  });

  it('ne change pas quand on joue dans la journée, et sait ce qui est fait', () => {
    const day = '2026-10-19';
    const picks = sessionGames(day, []);
    const today = [play(picks[0].gameId, 10, day), play(picks[1].gameId, 15, day)];
    expect(sessionGames(day, today)).toEqual(picks);
    expect([...sessionDone(picks, today, day)]).toEqual([picks[0].gameId, picks[1].gameId]);
    expect(sessionDone(picks, [{ ...today[0], mode: 'daily' }], day).size).toBe(0);
  });
});

describe('Marathon', () => {
  it('enchaîne tous les jeux du domaine', () => {
    expect(marathonGames('logique')).toEqual(gamesOfDomain('logique'));
    expect(marathonGames('memoire').length).toBeGreaterThanOrEqual(4);
  });
});

describe('Duel', () => {
  it('tire trois manches de domaines différents, avec une graine par manche', () => {
    const rounds = duelRounds(1234);
    expect(rounds).toHaveLength(3);
    expect(new Set(rounds.map((r) => GAMES[r.gameId].domain)).size).toBe(3);
    expect(new Set(rounds.map((r) => r.seed)).size).toBe(3);
    expect(duelRounds(1234)).toEqual(rounds);
  });

  it('désigne le vainqueur aux manches, puis au total', () => {
    expect(roundWinner([50, 40])).toBe(0);
    expect(roundWinner([50, 50])).toBeNull();
    expect(
      duelWinner([
        [80, 70],
        [20, 90],
        [60, 50],
      ]),
    ).toBe(0);
    expect(
      duelWinner([
        [80, 70],
        [20, 90],
        [50, 50],
      ]),
    ).toBe(1);
    expect(
      duelWinner([
        [50, 50],
        [50, 50],
        [50, 50],
      ]),
    ).toBeNull();
  });
});
