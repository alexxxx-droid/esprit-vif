import { DOMAIN_ORDER, GAMES } from './games/registry';
import type { Domain, GameId } from './types';

export interface ScoredPlay {
  gameId: GameId;
  score: number;
  /** Horodatage ISO. */
  at: string;
}

/** Moyenne des `count` dernières parties de chaque domaine (null si aucune partie). */
export function domainProfile(plays: readonly ScoredPlay[], count = 5): Record<Domain, number | null> {
  const sorted = [...plays].sort((p, q) => q.at.localeCompare(p.at));
  const profile = {} as Record<Domain, number | null>;
  for (const domain of DOMAIN_ORDER) {
    const recent = sorted.filter((p) => GAMES[p.gameId].domain === domain).slice(0, count);
    profile[domain] = recent.length
      ? Math.round(recent.reduce((sum, p) => sum + p.score, 0) / recent.length)
      : null;
  }
  return profile;
}

/**
 * Jeu conseillé pour « Continuer » : d'abord un jeu jamais essayé, sinon un jeu
 * du domaine le plus faible, en évitant celui qui vient d'être joué.
 */
export function suggestGame(plays: readonly ScoredPlay[], available: readonly GameId[]): GameId {
  const lastPlayed = new Map<GameId, string>();
  for (const p of plays) {
    const previous = lastPlayed.get(p.gameId);
    if (!previous || p.at > previous) lastPlayed.set(p.gameId, p.at);
  }
  const neverPlayed = available.find((id) => !lastPlayed.has(id));
  if (neverPlayed) return neverPlayed;

  const profile = domainProfile(plays);
  const latest = [...lastPlayed.entries()].sort((p, q) => q[1].localeCompare(p[1]))[0]?.[0];
  const candidates = available.length > 1 ? available.filter((id) => id !== latest) : available;
  return [...candidates].sort((x, y) => {
    const byDomain = (profile[GAMES[x].domain] ?? 0) - (profile[GAMES[y].domain] ?? 0);
    if (byDomain !== 0) return byDomain;
    return (lastPlayed.get(x) ?? '').localeCompare(lastPlayed.get(y) ?? '');
  })[0];
}
