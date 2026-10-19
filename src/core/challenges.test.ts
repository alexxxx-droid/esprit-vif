import { describe, expect, it } from 'vitest';
import {
  challengeGames,
  challengeStandings,
  decodeChallenge,
  encodeChallenge,
  friendRanking,
  mergeResults,
  resultsFromLink,
  type ChallengeLink,
  type FriendResult,
} from './challenges';
import { GAMES } from './games/registry';

const link: ChallengeLink = {
  id: 'abc123',
  seed: 4242,
  level: 5,
  games: ['calcul', 'matrice', 'rotation'],
  from: 'Léa',
  scores: [80, 65, 92],
  day: '2026-10-19',
};

describe('Défis entre amies', () => {
  it('fait tenir un défi dans un lien, et le relit à l’identique', () => {
    const code = encodeChallenge(link);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeChallenge(code)).toEqual(link);
    expect(decodeChallenge(`https://alexxxx-droid.github.io/esprit-vif/#/defi/${code}`)).toEqual(link);
    expect(decodeChallenge('n-importe-quoi')).toBeNull();
    expect(decodeChallenge(encodeChallenge({ ...link, scores: [80, 65, 120] }))).toBeNull();
  });

  it('tire trois jeux, mélangés ou d’une même catégorie', () => {
    const mix = challengeGames(7, 'mix');
    expect(mix).toHaveLength(3);
    expect(new Set(mix.map((id) => GAMES[id].domain)).size).toBe(3);
    const logic = challengeGames(7, 'logique');
    expect(logic.every((id) => GAMES[id].domain === 'logique')).toBe(true);
    expect(challengeGames(7, 'mix')).toEqual(mix);
  });

  it('range les amies par catégorie, sans compter deux fois un même résultat', () => {
    const mine: FriendResult[] = link.games.map((gameId, i) => ({ challenge: link.id, name: 'Alex', me: true, gameId, score: [90, 50, 70][i], day: link.day }));
    const all = mergeResults(mergeResults(mine, resultsFromLink(link)), resultsFromLink(link));
    expect(all).toHaveLength(6);
    const domainOf = (id: keyof typeof GAMES) => GAMES[id].domain;
    expect(friendRanking(all, 'calcul', domainOf).map((r) => [r.name, r.average])).toEqual([
      ['Alex', 90],
      ['Léa', 80],
    ]);
    expect(friendRanking(all, 'all', domainOf)[0]).toMatchObject({ name: 'Léa', average: 79, games: 3 });
  });

  it('classe les participantes d’un défi, les parties incomplètes à la fin', () => {
    const results: FriendResult[] = [
      ...resultsFromLink(link),
      { challenge: link.id, name: 'Moi', me: true, gameId: 'calcul', score: 100, day: link.day },
      { challenge: link.id, name: 'Moi', me: true, gameId: 'matrice', score: 100, day: link.day },
      { challenge: 'autre', name: 'Zoé', me: false, gameId: 'calcul', score: 100, day: link.day },
    ];
    const standings = challengeStandings(results, link);
    expect(standings.map((s) => [s.name, s.total, s.complete])).toEqual([
      ['Léa', 237, true],
      ['Moi', 200, false],
    ]);
    expect(standings[1].scores).toEqual([100, 100, null]);
  });
});
