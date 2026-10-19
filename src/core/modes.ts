import { DOMAIN_ORDER, gamesOfDomain } from './games/registry';
import { createRng, deriveSeed, hashSeed } from './rng';
import { domainProfile, type ScoredPlay } from './stats';
import type { Domain, GameId } from './types';

/* ---------- Séance du jour sur mesure ---------- */

export const SESSION_SIZE = 4;

export type SessionReason = 'goal' | 'weak' | 'new' | 'variety';

export interface SessionPick {
  gameId: GameId;
  domain: Domain;
  reason: SessionReason;
}

export const SESSION_REASONS: Record<SessionReason, string> = {
  goal: 'Ton objectif',
  weak: 'À renforcer',
  new: 'À découvrir',
  variety: 'Pour varier',
};

/**
 * Quatre jeux de quatre domaines différents : les deux domaines les plus faibles d'abord
 * (un domaine jamais joué passe en tête : c'est l'occasion de le découvrir), puis deux autres pour varier.
 * Seules les parties d'avant aujourd'hui comptent : la séance ne change pas en cours de journée.
 */
export function sessionGames(day: string, plays: readonly (ScoredPlay & { day: string })[], goals: readonly Domain[] = []): SessionPick[] {
  const before = plays.filter((p) => p.day < day);
  const profile = domainProfile(before);
  const rng = createRng(hashSeed(`esprit-vif:seance:${day}`));
  const ranked = rng.shuffle(DOMAIN_ORDER).sort((a, b) => (profile[a] ?? -1) - (profile[b] ?? -1));
  // Les objectifs du joueur passent devant (les plus fragiles d'abord), puis les domaines faibles.
  const focus = [...ranked.filter((d) => goals.includes(d)).slice(0, 2), ...ranked.filter((d) => !goals.includes(d))].slice(0, 2);
  const domains = [...focus, ...rng.shuffle(ranked.filter((d) => !focus.includes(d))).slice(0, SESSION_SIZE - 2)];
  const lastPlayed = new Map<GameId, string>();
  for (const p of before) if ((lastPlayed.get(p.gameId) ?? '') < p.at) lastPlayed.set(p.gameId, p.at);
  return domains.map((domain, i) => {
    const games = gamesOfDomain(domain);
    const fresh = games.filter((g) => !lastPlayed.has(g));
    // Dans le domaine : un jeu jamais essayé, sinon celui qui attend depuis le plus longtemps.
    const gameId = fresh.length ? rng.pick(fresh) : [...games].sort((a, b) => (lastPlayed.get(a) ?? '').localeCompare(lastPlayed.get(b) ?? ''))[0];
    const reason: SessionReason = i >= 2 ? 'variety' : goals.includes(domain) ? 'goal' : profile[domain] === null ? 'new' : 'weak';
    return { gameId, domain, reason };
  });
}

/** Jeux de la séance déjà joués aujourd'hui (en entraînement libre). */
export function sessionDone(picks: readonly SessionPick[], plays: readonly { gameId: GameId; day: string; mode: string }[], day: string): Set<GameId> {
  const today = new Set(plays.filter((p) => p.day === day && p.mode === 'free').map((p) => p.gameId));
  return new Set(picks.map((p) => p.gameId).filter((id) => today.has(id)));
}

/* ---------- Marathon ---------- */

/** Tous les jeux d'un domaine, à la suite : le total des scores fait le record. */
export function marathonGames(domain: Domain): GameId[] {
  return gamesOfDomain(domain);
}

/* ---------- Duel à deux ---------- */

export const DUEL_ROUNDS = 3;

export type DuelDifficulty = 'facile' | 'moyen' | 'difficile';

export const DUEL_DIFFICULTIES: Record<DuelDifficulty, { label: string; level: number }> = {
  facile: { label: 'Facile', level: 1 },
  moyen: { label: 'Moyen', level: 5 },
  difficile: { label: 'Difficile', level: 10 },
};

export interface DuelRound {
  gameId: GameId;
  /** Même graine pour les deux joueurs : exactement la même partie. */
  seed: number;
}

/** Trois manches, trois domaines différents, tirés d'une graine. */
export function duelRounds(seed: number): DuelRound[] {
  const rng = createRng(seed);
  const domains = rng.shuffle(DOMAIN_ORDER.filter((d) => gamesOfDomain(d).length > 0)).slice(0, DUEL_ROUNDS);
  return domains.map((domain, i) => ({ gameId: rng.pick(gamesOfDomain(domain)), seed: deriveSeed(seed, i) }));
}

/** 0 ou 1 : le joueur qui gagne la manche ; null en cas d'égalité. */
export function roundWinner(scores: readonly [number, number]): 0 | 1 | null {
  if (scores[0] === scores[1]) return null;
  return scores[0] > scores[1] ? 0 : 1;
}

/** Vainqueur du duel : le plus de manches gagnées, puis le meilleur total ; null si tout est égal. */
export function duelWinner(rounds: readonly (readonly [number, number])[]): 0 | 1 | null {
  const wins = [0, 0];
  const totals = [0, 0];
  for (const scores of rounds) {
    const winner = roundWinner(scores);
    if (winner !== null) wins[winner]++;
    totals[0] += scores[0];
    totals[1] += scores[1];
  }
  if (wins[0] !== wins[1]) return wins[0] > wins[1] ? 0 : 1;
  if (totals[0] !== totals[1]) return totals[0] > totals[1] ? 0 : 1;
  return null;
}
