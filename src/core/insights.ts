import { addDays } from './daily';
import { DOMAIN_ORDER, DOMAINS, GAMES, gamesOfDomain } from './games/registry';
import type { GameId } from './types';

/**
 * Ce que disent les parties, en phrases simples : un score sans interprétation n'aide personne.
 * Chaque constat demande assez de parties pour ne pas tirer de conclusion d'un hasard.
 */

export interface InsightPlay {
  gameId: GameId;
  score: number;
  /** Horodatage ISO. */
  at: string;
  day: string;
}

export type InsightIcon = 'up' | 'sun' | 'moon' | 'calendar' | 'target' | 'spark';

export interface Insight {
  id: string;
  icon: InsightIcon;
  text: string;
}

const average = (values: readonly number[]) => values.reduce((s, v) => s + v, 0) / values.length;

/** Le domaine qui a le plus progressé : 30 derniers jours contre les 30 d'avant (3 parties de chaque côté). */
function progressInsight(plays: readonly InsightPlay[], today: string): Insight | null {
  const recentFrom = addDays(today, -29);
  const olderFrom = addDays(today, -59);
  let best: { name: string; diff: number } | null = null;
  for (const domain of DOMAIN_ORDER) {
    const own = plays.filter((p) => GAMES[p.gameId].domain === domain);
    const recent = own.filter((p) => p.day >= recentFrom).map((p) => p.score);
    const older = own.filter((p) => p.day >= olderFrom && p.day < recentFrom).map((p) => p.score);
    if (recent.length < 3 || older.length < 3) continue;
    const diff = Math.round(average(recent) - average(older));
    if (diff >= 5 && (!best || diff > best.diff)) best = { name: DOMAINS[domain].name, diff };
  }
  return best && { id: 'progress', icon: 'up', text: `En ${best.name}, +${best.diff} pts en moyenne ces 30 derniers jours par rapport aux 30 d’avant.` };
}

type Moment = 'matin' | 'après-midi' | 'soir';

const momentOf = (iso: string): Moment => {
  const hour = new Date(iso).getHours();
  return hour >= 5 && hour < 12 ? 'matin' : hour >= 12 && hour < 18 ? 'après-midi' : 'soir';
};

/**
 * Le meilleur moment de la journée. Les jeux n'ont pas tous la même difficulté : on compare
 * chaque partie à la moyenne de son jeu, puis on regroupe par moment (6 parties au moins).
 */
function momentInsight(plays: readonly InsightPlay[]): Insight | null {
  const byGame = new Map<GameId, number[]>();
  for (const p of plays) byGame.set(p.gameId, [...(byGame.get(p.gameId) ?? []), p.score]);
  const gameMean = new Map([...byGame].map(([id, scores]) => [id, average(scores)]));
  const residuals = new Map<Moment, number[]>();
  for (const p of plays) {
    const moment = momentOf(p.at);
    residuals.set(moment, [...(residuals.get(moment) ?? []), p.score - (gameMean.get(p.gameId) ?? p.score)]);
  }
  const moments = [...residuals].filter(([, values]) => values.length >= 6).map(([moment, values]) => ({ moment, mean: average(values) }));
  if (moments.length < 2) return null;
  moments.sort((a, b) => b.mean - a.mean);
  const gap = Math.round(moments[0].mean - average(moments.slice(1).map((m) => m.mean)));
  if (gap < 4) return null;
  const when = moments[0].moment === 'matin' ? 'le matin' : moments[0].moment === 'soir' ? 'le soir' : 'l’après-midi';
  return { id: 'moment', icon: moments[0].moment === 'soir' ? 'moon' : 'sun', text: `Tu réussis mieux ${when} : +${gap} pts par rapport à tes autres moments.` };
}

function regularityInsight(plays: readonly InsightPlay[], today: string): Insight | null {
  const from = addDays(today, -13);
  const days = new Set(plays.filter((p) => p.day >= from && p.day <= today).map((p) => p.day)).size;
  if (days < 3) return null;
  const tail = days >= 10 ? ' : une régularité exemplaire.' : days >= 6 ? ' : continue comme ça.' : '.';
  return { id: 'regularity', icon: 'calendar', text: `${days} jours d’entraînement sur les 14 derniers${tail}` };
}

/** Un domaine jamais essayé : la porte d'entrée la plus douce, son premier jeu. */
function discoveryInsight(plays: readonly InsightPlay[]): Insight | null {
  const played = new Set(plays.map((p) => GAMES[p.gameId].domain));
  const missing = DOMAIN_ORDER.find((d) => !played.has(d) && gamesOfDomain(d).length > 0);
  if (!missing || plays.length < 5) return null;
  return { id: 'discovery', icon: 'target', text: `Tu n’as pas encore essayé le domaine ${DOMAINS[missing].name} : commence par ${GAMES[gamesOfDomain(missing)[0]].name}.` };
}

/** Jusqu'à trois constats, les plus parlants d'abord. */
export function insights(plays: readonly InsightPlay[], today: string, max = 3): Insight[] {
  const found = [progressInsight(plays, today), momentInsight(plays), regularityInsight(plays, today), discoveryInsight(plays)].filter(
    (i): i is Insight => i !== null,
  );
  return found.slice(0, max);
}
