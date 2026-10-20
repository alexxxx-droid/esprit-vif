import { addDays } from './daily';
import { weekStart } from './events';
import { GAMES } from './games/registry';
import { markPlays, objectivesDone, type HistoryTest } from './objectives';
import type { Domain, GameId } from './types';

/**
 * Chiffres du tableau de bord des Progrès, tous calculés sur les parties enregistrées : rien n'est
 * estimé ni inventé. Une mesure absente de certaines parties (durée avant la v2.9, précision des
 * jeux qui ne comptent pas les erreurs) est calculée sur les seules parties qui l'ont, et le dit.
 */

export interface SummaryPlay {
  gameId: GameId;
  level: number;
  score: number;
  at: string;
  day: string;
  mode: string;
  stats: Record<string, number>;
  durationMs?: number;
}

export interface Totals {
  plays: number;
  days: number;
  /** Temps de jeu cumulé, sur les parties dont la durée est connue. */
  timeMs: number;
  timedPlays: number;
  /** Part de bonnes réponses (0-100), sur les jeux qui comptent bonnes réponses et erreurs. */
  accuracy: number | null;
  accuracyPlays: number;
  /** Temps de réaction moyen (ms), sur les jeux qui le mesurent (Flèches, Réflexe). */
  reactionMs: number | null;
  reactionPlays: number;
}

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

export function totals(plays: readonly SummaryPlay[]): Totals {
  let timeMs = 0;
  let timedPlays = 0;
  let correct = 0;
  let answered = 0;
  let accuracyPlays = 0;
  let reaction = 0;
  let reactionPlays = 0;
  for (const play of plays) {
    if (isCount(play.durationMs) && play.durationMs > 0) {
      timeMs += play.durationMs;
      timedPlays++;
    }
    const { correct: ok, errors, meanRt } = play.stats ?? {};
    if (isCount(ok) && isCount(errors) && ok + errors > 0) {
      correct += ok;
      answered += ok + errors;
      accuracyPlays++;
    }
    if (isCount(meanRt) && meanRt > 0) {
      reaction += meanRt;
      reactionPlays++;
    }
  }
  return {
    plays: plays.length,
    days: new Set(plays.map((p) => p.day)).size,
    timeMs,
    timedPlays,
    accuracy: answered ? Math.round((correct / answered) * 100) : null,
    accuracyPlays,
    reactionMs: reactionPlays ? Math.round(reaction / reactionPlays) : null,
    reactionPlays,
  };
}

export interface WeekStats {
  /** Lundi de la semaine. */
  week: string;
  plays: number;
  days: number;
  timeMs: number;
  /** Score moyen des parties de la semaine (null : aucune partie). */
  average: number | null;
}

export function weekStats(plays: readonly SummaryPlay[], week: string): WeekStats {
  const end = addDays(week, 6);
  const inWeek = plays.filter((p) => p.day >= week && p.day <= end);
  const t = totals(inWeek);
  return {
    week,
    plays: t.plays,
    days: t.days,
    timeMs: t.timeMs,
    average: inWeek.length ? Math.round(inWeek.reduce((sum, p) => sum + p.score, 0) / inWeek.length) : null,
  };
}

/** La semaine en cours et la précédente, pour les comparer. */
export function weeklyRecap(plays: readonly SummaryPlay[], today: string): { current: WeekStats; previous: WeekStats } {
  const week = weekStart(today);
  return { current: weekStats(plays, week), previous: weekStats(plays, addDays(week, -7)) };
}

/** Les dernières parties, la plus récente d'abord. */
export function recentPlays<P extends SummaryPlay>(plays: readonly P[], count = 6): P[] {
  return [...plays].sort((a, b) => b.at.localeCompare(a.at)).slice(0, count);
}

/** Une durée lisible : « 42 min », « 3 h 05 », « 40 s ». */
export function durationLabel(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (ms < 60_000) return `${Math.round(ms / 1000)} s`;
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}

export interface GameHistory {
  plays: number;
  best: number | null;
  /** Moyenne des 10 dernières parties, et des 10 d'avant (null s'il n'y en a pas assez). */
  recent: number | null;
  before: number | null;
  /** Précision et temps de réaction des 10 dernières parties, puis des 10 d'avant, quand le jeu les mesure. */
  accuracy: { recent: number | null; before: number | null };
  reaction: { recent: number | null; before: number | null };
}

const WINDOW = 10;
const mean = (values: readonly number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null);

/** L'historique d'un jeu : tendance récente comparée aux parties d'avant, sur les seules parties enregistrées. */
export function gameHistory(plays: readonly SummaryPlay[], gameId: GameId): GameHistory {
  const mine = plays.filter((p) => p.gameId === gameId).sort((a, b) => a.at.localeCompare(b.at));
  const recent = mine.slice(-WINDOW);
  const before = mine.slice(-2 * WINDOW, -WINDOW);
  return {
    plays: mine.length,
    best: mine.length ? Math.max(...mine.map((p) => p.score)) : null,
    recent: mean(recent.map((p) => p.score)),
    before: before.length >= 3 ? mean(before.map((p) => p.score)) : null,
    accuracy: { recent: totals(recent).accuracy, before: before.length >= 3 ? totals(before).accuracy : null },
    reaction: { recent: totals(recent).reactionMs, before: before.length >= 3 ? totals(before).reactionMs : null },
  };
}

export interface MonthReport {
  /** « AAAA-MM ». */
  month: string;
  plays: number;
  days: number;
  timeMs: number;
  average: number | null;
  /** Le jeu le plus joué du mois. */
  favorite: { gameId: GameId; plays: number } | null;
  /** Le jeu dont la moyenne a le plus monté par rapport au mois d'avant (3 parties au moins chaque mois). */
  bestGain: { gameId: GameId; before: number; now: number } | null;
  records: number;
  stars: number;
  objectives: number;
  tests: number;
  bestAge: number | null;
  domains: Partial<Record<Domain, number>>;
  previous: { plays: number; days: number };
}

const inMonth = (day: string, month: string) => day.startsWith(month);

/** Le mois d'avant, « AAAA-MM ». */
export function previousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

/**
 * Le bilan d'un mois (Premium), entièrement tiré des parties enregistrées : rien n'est extrapolé, et
 * une rubrique sans données suffisantes reste vide (null) plutôt que d'afficher un chiffre bancal.
 */
export function monthlyReport(
  plays: readonly SummaryPlay[],
  tests: readonly (HistoryTest & { brainAge?: number })[],
  month: string,
): MonthReport {
  const mine = plays.filter((p) => inMonth(p.day, month));
  const before = plays.filter((p) => inMonth(p.day, previousMonth(month)));
  const t = totals(mine);
  const count = new Map<GameId, number>();
  const domains: Partial<Record<Domain, number>> = {};
  for (const p of mine) {
    count.set(p.gameId, (count.get(p.gameId) ?? 0) + 1);
    const domain = GAMES[p.gameId].domain;
    domains[domain] = (domains[domain] ?? 0) + 1;
  }
  const favorite = [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  let bestGain: MonthReport['bestGain'] = null;
  for (const gameId of count.keys()) {
    const now = mine.filter((p) => p.gameId === gameId);
    const then = before.filter((p) => p.gameId === gameId);
    if (now.length < 3 || then.length < 3) continue;
    const a = mean(then.map((p) => p.score)) ?? 0;
    const b = mean(now.map((p) => p.score)) ?? 0;
    if (b > a && (!bestGain || b - a > bestGain.now - bestGain.before)) bestGain = { gameId, before: a, now: b };
  }
  const marked = markPlays(plays).filter((m) => inMonth(m.play.day, month));
  const official = tests.filter((x) => x.done && x.official && inMonth(x.day, month));
  const ages = official.map((x) => x.brainAge).filter((age): age is number => age !== undefined);
  return {
    month,
    plays: t.plays,
    days: t.days,
    timeMs: t.timeMs,
    average: mean(mine.map((p) => p.score)),
    favorite: favorite ? { gameId: favorite[0], plays: favorite[1] } : null,
    bestGain,
    records: marked.filter((m) => m.record).length,
    stars: marked.reduce((sum, m) => sum + m.stars, 0),
    objectives: objectivesDone(plays, tests).filter((o) => inMonth(o.day, month)).length,
    tests: official.length,
    bestAge: ages.length ? Math.min(...ages) : null,
    domains,
    previous: { plays: before.length, days: new Set(before.map((p) => p.day)).size },
  };
}
