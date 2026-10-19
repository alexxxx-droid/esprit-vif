import { addDays, dayIndex } from './daily';
import { DOMAIN_ORDER, DOMAINS, GAME_ORDER, GAMES, gamesOfDomain } from './games/registry';
import { createRng, hashSeed } from './rng';
import type { GameId } from './types';

/**
 * Événements : un défi par semaine et des saisons (Halloween, Noël, printemps, été) qui
 * décorent l'appli et apportent un trophée qu'on ne gagne que pendant leur fenêtre.
 * Tout se déduit de l'historique : rien à télécharger, rien à synchroniser.
 */

export interface EventPlay {
  gameId: GameId;
  score: number;
  day: string;
}

/* ---------- Saisons ---------- */

export type SeasonId = 'halloween' | 'noel' | 'printemps' | 'ete';

export interface Season {
  id: SeasonId;
  name: string;
  /** Bornes « MM-JJ », incluses. */
  from: string;
  to: string;
  trophy: { id: string; name: string; description: string };
  /** Phrase d'accueil sur l'écran d'accueil. */
  greeting: string;
}

export const SEASON_PLAYS = 3;

export const SEASONS: readonly Season[] = [
  {
    id: 'halloween',
    name: 'Halloween',
    from: '10-15',
    to: '11-02',
    trophy: { id: 'saison-halloween', name: 'Citrouille futée', description: 'Jouer 3 parties pendant Halloween (15 oct. – 2 nov.).' },
    greeting: 'C’est Halloween ! Trois parties d’ici le 2 novembre pour la Citrouille futée.',
  },
  {
    id: 'noel',
    name: 'Noël',
    from: '12-01',
    to: '12-31',
    trophy: { id: 'saison-noel', name: 'Lutin malin', description: 'Jouer 3 parties en décembre.' },
    greeting: 'C’est bientôt Noël ! Trois parties en décembre pour le Lutin malin.',
  },
  {
    id: 'printemps',
    name: 'Printemps',
    from: '03-20',
    to: '04-20',
    trophy: { id: 'saison-printemps', name: 'Premier bourgeon', description: 'Jouer 3 parties au printemps (20 mars – 20 avril).' },
    greeting: 'Le printemps est là ! Trois parties d’ici le 20 avril pour le Premier bourgeon.',
  },
  {
    id: 'ete',
    name: 'Été',
    from: '07-01',
    to: '08-31',
    trophy: { id: 'saison-ete', name: 'Coup de soleil', description: 'Jouer 3 parties en juillet ou en août.' },
    greeting: 'C’est l’été ! Trois parties d’ici fin août pour le Coup de soleil.',
  },
];

const monthDay = (day: string) => day.slice(5);

export function seasonOf(day: string): Season | null {
  const md = monthDay(day);
  return SEASONS.find((s) => md >= s.from && md <= s.to) ?? null;
}

/** Parties jouées pendant cette saison, toutes années confondues, ou seulement celle de `year`. */
export function seasonPlays(plays: readonly EventPlay[], season: Season, year?: string): number {
  return plays.filter((p) => {
    const md = monthDay(p.day);
    return md >= season.from && md <= season.to && (!year || p.day.startsWith(year));
  }).length;
}

/* ---------- Défi de la semaine ---------- */

export const WEEKLY_XP = 60;

export type ChallengeKind = 'domain-plays' | 'game-score' | 'days' | 'variety' | 'sessions';

export interface WeeklyChallenge {
  /** Lundi de la semaine (AAAA-MM-JJ) : l'identifiant du défi. */
  week: string;
  kind: ChallengeKind;
  label: string;
  target: number;
  gameId?: GameId;
  domain?: (typeof DOMAIN_ORDER)[number];
  /** Score à atteindre (défi « score »). */
  score?: number;
}

/** Lundi de la semaine d'un jour donné. */
export function weekStart(day: string): string {
  // Le 1er janvier 1970 était un jeudi : l'indice du jour donne le jour de la semaine.
  const weekday = (((dayIndex(day) + 3) % 7) + 7) % 7;
  return addDays(day, -weekday);
}

export function weeklyChallenge(day: string): WeeklyChallenge {
  const week = weekStart(day);
  const rng = createRng(hashSeed(`esprit-vif:defi:${week}`));
  const kind = rng.pick<ChallengeKind>(['domain-plays', 'game-score', 'days', 'variety', 'sessions']);
  if (kind === 'domain-plays') {
    const domain = rng.pick(DOMAIN_ORDER.filter((d) => gamesOfDomain(d).length > 0));
    return { week, kind, domain, target: 8, label: `Jouer 8 parties de ${DOMAINS[domain].name}` };
  }
  if (kind === 'game-score') {
    const gameId = rng.pick(GAME_ORDER);
    return { week, kind, gameId, score: 85, target: 1, label: `Obtenir 85 points ou plus en ${GAMES[gameId].name}` };
  }
  if (kind === 'days') return { week, kind, target: 5, label: 'S’entraîner 5 jours différents cette semaine' };
  if (kind === 'variety') return { week, kind, target: 8, label: 'Jouer à 8 jeux différents cette semaine' };
  return { week, kind, target: 3, label: 'Terminer 3 séances du jour cette semaine' };
}

/** Avancement d'un défi d'après les parties et les séances de sa semaine. */
export function challengeProgress(challenge: WeeklyChallenge, plays: readonly EventPlay[], sessions: readonly string[]): number {
  const end = addDays(challenge.week, 6);
  const inWeek = plays.filter((p) => p.day >= challenge.week && p.day <= end);
  switch (challenge.kind) {
    case 'domain-plays':
      return inWeek.filter((p) => GAMES[p.gameId].domain === challenge.domain).length;
    case 'game-score':
      return inWeek.some((p) => p.gameId === challenge.gameId && p.score >= (challenge.score ?? 0)) ? 1 : 0;
    case 'days':
      return new Set(inWeek.map((p) => p.day)).size;
    case 'variety':
      return new Set(inWeek.map((p) => p.gameId)).size;
    case 'sessions':
      return sessions.filter((d) => d >= challenge.week && d <= end).length;
  }
}

/** Nombre de défis de la semaine relevés depuis le début. */
export function weekliesDone(plays: readonly EventPlay[], sessions: readonly string[]): number {
  const weeks = new Set([...plays.map((p) => weekStart(p.day)), ...sessions.map(weekStart)]);
  let done = 0;
  for (const week of weeks) {
    const challenge = weeklyChallenge(week);
    if (challengeProgress(challenge, plays, sessions) >= challenge.target) done++;
  }
  return done;
}
