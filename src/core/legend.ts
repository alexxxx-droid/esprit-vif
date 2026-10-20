import { GAME_ORDER } from './games/registry';
import { passScore, TOP_LEVEL } from './levels';
import { createRng, hashSeed } from './rng';
import type { GameId } from './types';

/**
 * Le Défi Légende du jour, pour les joueurs aguerris : un de leurs jeux de niveau Expert ou plus, à leur
 * plus haut niveau ouvert (maîtrise comprise), et la même partie toute la journée. Il s'ouvre quand un
 * jeu atteint le palier Légende (niveau 41). Tout se déduit des parties d'avant la journée : le défi ne
 * change pas en cours de route, même si l'on progresse entre-temps.
 */

export interface LegendPlay {
  gameId: GameId;
  level: number;
  score: number;
  day: string;
  mode?: string;
}

export interface LegendChallenge {
  day: string;
  gameId: GameId;
  level: number;
  seed: number;
}

/** Il faut avoir ouvert le palier Légende d'un jeu. */
export const LEGEND_UNLOCK = 41;
/** Les jeux proposés : ceux dont le palier Expert est ouvert. */
export const LEGEND_MIN_LEVEL = 21;
export const LEGEND_MODE = 'legende';

/** Dernier niveau ouvert de chaque jeu d'après les parties jouées avant `day`. */
function unlockedBefore(plays: readonly LegendPlay[], day: string): Map<GameId, number> {
  const top = new Map<GameId, number>();
  for (const p of plays) {
    if (p.day >= day || p.score < passScore(p.level)) continue;
    top.set(p.gameId, Math.max(top.get(p.gameId) ?? 0, p.level));
  }
  return new Map([...top].map(([id, level]) => [id, Math.min(TOP_LEVEL, level + 1)]));
}

export function legendChallenge(day: string, plays: readonly LegendPlay[]): LegendChallenge | null {
  const unlocked = unlockedBefore(plays, day);
  if (![...unlocked.values()].some((level) => level >= LEGEND_UNLOCK)) return null;
  const eligible = GAME_ORDER.filter((id) => (unlocked.get(id) ?? 0) >= LEGEND_MIN_LEVEL);
  const rng = createRng(hashSeed(`esprit-vif:legende:${day}`));
  const gameId = rng.pick(eligible);
  return { day, gameId, level: unlocked.get(gameId) ?? LEGEND_MIN_LEVEL, seed: hashSeed(`esprit-vif:legende:${day}:${gameId}`) };
}

/** Les journées où un Défi Légende a été joué (pour ses récompenses, une fois par jour). */
export function legendDays(plays: readonly LegendPlay[]): Set<string> {
  return new Set(plays.filter((p) => p.mode === LEGEND_MODE).map((p) => p.day));
}

/** Le meilleur score du défi d'une journée (null s'il n'a pas été joué). */
export function legendBest(plays: readonly LegendPlay[], day: string): number | null {
  const scores = plays.filter((p) => p.mode === LEGEND_MODE && p.day === day).map((p) => p.score);
  return scores.length ? Math.max(...scores) : null;
}
