import { GAMES, gamesOfDomain } from './games/registry';
import type { Domain, GameId } from './types';

/**
 * Bilan de départ : le premier test du jour place le joueur. Un très bon score ouvre d'emblée
 * quelques niveaux dans tout le domaine du jeu ; les autres domaines commencent au niveau 1.
 */
export function startLevelFor(score: number): number {
  if (score >= 95) return 4;
  if (score >= 85) return 3;
  if (score >= 70) return 2;
  return 1;
}

export function placement(results: readonly { gameId: GameId; score: number }[]): Partial<Record<GameId, number>> {
  const byDomain = new Map<Domain, number>();
  for (const r of results) {
    const domain = GAMES[r.gameId].domain;
    byDomain.set(domain, Math.max(byDomain.get(domain) ?? 1, startLevelFor(r.score)));
  }
  const starts: Partial<Record<GameId, number>> = {};
  for (const [domain, level] of byDomain) if (level > 1) for (const id of gamesOfDomain(domain)) starts[id] = level;
  return starts;
}
