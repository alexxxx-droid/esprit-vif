import { describe, expect, it } from 'vitest';
import { MAX_LEVEL, TOP_LEVEL } from '../levels';
import { DAILY_POOL, DOMAIN_ORDER, GAME_ORDER, GAMES, gamesOfDomain } from './registry';

describe('catalogue des jeux', () => {
  it('donne à chaque jeu 20 niveaux, chacun avec un libellé et une règle', () => {
    for (const id of GAME_ORDER) {
      const game = GAMES[id];
      expect(game.maxLevel).toBe(TOP_LEVEL);
      expect(game.dailyLevel).toBeGreaterThanOrEqual(1);
      expect(game.levelLabel(MAX_LEVEL + 3)).toMatch(/Maîtrise III · 72 pts/);
      for (let level = 1; level <= TOP_LEVEL; level++) {
        expect(game.levelLabel(level).length).toBeGreaterThan(2);
        expect(game.rule(level).length).toBeGreaterThan(10);
      }
    }
  });

  it('liste chaque jeu une seule fois et le range dans un domaine connu', () => {
    expect(new Set(GAME_ORDER).size).toBe(GAME_ORDER.length);
    expect(GAME_ORDER.length).toBe(Object.keys(GAMES).length);
    for (const id of GAME_ORDER) expect(DOMAIN_ORDER).toContain(GAMES[id].domain);
    expect(DOMAIN_ORDER.flatMap(gamesOfDomain).sort()).toEqual([...GAME_ORDER].sort());
  });

  it('propose tous les jeux au test du jour, rangés par domaine', () => {
    expect(DAILY_POOL).toHaveLength(DOMAIN_ORDER.length);
    DOMAIN_ORDER.forEach((domain, i) => expect(DAILY_POOL[i]).toEqual(gamesOfDomain(domain)));
  });
});
