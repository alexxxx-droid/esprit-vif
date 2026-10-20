import { addDays } from './daily';
import { weekliesDone } from './events';
import { DOMAIN_ORDER, DOMAINS, GAME_ORDER, GAMES } from './games/registry';
import { tr } from './lang';
import { starsFor } from './levels';
import { createRng, hashSeed } from './rng';
import type { Domain, GameId } from './types';

/**
 * Objectifs du jour et étincelles. Comme le reste de la progression, tout se déduit de l'historique :
 * un objectif ne peut être versé qu'une fois, puisqu'il est recalculé, jamais « crédité ».
 */

export interface HistoryPlay {
  gameId: GameId;
  level: number;
  score: number;
  /** Horodatage ISO. */
  at: string;
  day: string;
}

export interface HistoryTest {
  day: string;
  official: boolean;
  done: boolean;
}

/** Une partie et ce qu'elle a apporté au moment où elle a été jouée. */
export interface MarkedPlay<P extends HistoryPlay = HistoryPlay> {
  play: P;
  /** Elle a battu le meilleur score du même jeu au même niveau (une première partie ne compte pas). */
  record: boolean;
  /** Étoiles gagnées à ce niveau grâce à elle. */
  stars: number;
}

/** Rejoue l'historique dans l'ordre : records battus et étoiles gagnées, partie par partie. */
export function markPlays<P extends HistoryPlay>(plays: readonly P[]): MarkedPlay<P>[] {
  const best = new Map<string, number>();
  return [...plays]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((play) => {
      const key = `${play.gameId}:${play.level}`;
      const before = best.get(key);
      if (before === undefined || play.score > before) best.set(key, play.score);
      return {
        play,
        record: before !== undefined && play.score > before,
        stars: Math.max(0, starsFor(play.score) - (before === undefined ? 0 : starsFor(before))),
      };
    });
}

/* ---------- Objectifs du jour ---------- */

/** Les objectifs existent depuis la v2.9 : les journées d'avant n'en rapportent pas après coup. */
export const OBJECTIVES_START = '2026-10-20';
export const OBJECTIVES_PER_DAY = 3;
export const OBJECTIVE_XP = 15;
export const OBJECTIVE_SPARKS = 5;
/** En dessous de ce nombre de parties, le joueur débute : des objectifs plus simples. */
const BEGINNER_PLAYS = 10;
/** Un jeu « peu joué » n'a pas été lancé depuis ce nombre de jours. */
const RARE_AFTER_DAYS = 7;

export type ObjectiveKind = 'plays' | 'domains' | 'theme' | 'rare' | 'test' | 'score' | 'record' | 'stars';

export interface DailyObjective {
  /** « AAAA-MM-JJ:sorte » : unique, stable toute la journée. */
  id: string;
  day: string;
  kind: ObjectiveKind;
  target: number;
  domain?: Domain;
  score?: number;
  /** Jeux peu joués au début de la journée (objectif « rare »). */
  rare?: readonly GameId[];
}

/** Ce que le joueur avait fait avant la journée : de quoi choisir des objectifs à sa portée. */
interface Before {
  count: number;
  lastDay: Map<GameId, string>;
  domainCount: Map<Domain, number>;
}

const emptyBefore = (): Before => ({ count: 0, lastDay: new Map(), domainCount: new Map() });

function learn(before: Before, plays: readonly HistoryPlay[]) {
  for (const play of plays) {
    before.count++;
    if ((before.lastDay.get(play.gameId) ?? '') < play.day) before.lastDay.set(play.gameId, play.day);
    const domain = GAMES[play.gameId].domain;
    before.domainCount.set(domain, (before.domainCount.get(domain) ?? 0) + 1);
  }
}

/**
 * Trois objectifs : un de volume (jouer), un de variété (domaines, thème, jeu oublié), un d'exploit
 * (test du jour, score, record, étoiles). Tirés de la date et de ce qui précède la journée : ils
 * ne changent pas en cours de route. Un débutant a des objectifs plus simples, sans record à battre.
 */
function pickObjectives(day: string, before: Before): DailyObjective[] {
  const rng = createRng(hashSeed(`esprit-vif:objectifs:${day}`));
  const beginner = before.count < BEGINNER_PLAYS;
  const make = (kind: ObjectiveKind, target: number, extra: Partial<DailyObjective> = {}): DailyObjective => ({
    id: `${day}:${kind}`,
    day,
    kind,
    target,
    ...extra,
  });

  const volume = make('plays', beginner ? 2 : rng.pick([2, 3]));

  const limit = addDays(day, -RARE_AFTER_DAYS);
  const rare = GAME_ORDER.filter((id) => (before.lastDay.get(id) ?? '') < limit);
  const varieties = beginner ? (['domains', 'theme'] as const) : rare.length ? (['domains', 'theme', 'rare'] as const) : (['domains', 'theme'] as const);
  const varietyKind = rng.pick(varieties);
  // Le thème proposé : le moins joué jusque-là (à égalité, le hasard du jour départage).
  const theme = rng.shuffle(DOMAIN_ORDER).sort((a, b) => (before.domainCount.get(a) ?? 0) - (before.domainCount.get(b) ?? 0))[0];
  const variety =
    varietyKind === 'domains'
      ? make('domains', beginner ? 2 : rng.pick([2, 3]))
      : varietyKind === 'theme'
        ? make('theme', 1, { domain: theme })
        : make('rare', 1, { rare });

  const exploitKind = rng.pick(beginner ? (['test', 'score'] as const) : (['test', 'test', 'score', 'record', 'stars'] as const));
  const exploit =
    exploitKind === 'score' ? make('score', 1, { score: beginner ? 60 : 80 }) : exploitKind === 'stars' ? make('stars', 2) : make(exploitKind, 1);

  return [volume, variety, exploit];
}

/** Avancement d'un objectif d'après les parties de sa journée (marquées) et le test du jour. */
export function objectiveProgress(objective: DailyObjective, plays: readonly MarkedPlay[], testDone: boolean): number {
  switch (objective.kind) {
    case 'plays':
      return plays.length;
    case 'domains':
      return new Set(plays.map((m) => GAMES[m.play.gameId].domain)).size;
    case 'theme':
      return plays.filter((m) => GAMES[m.play.gameId].domain === objective.domain).length;
    case 'rare':
      return plays.some((m) => objective.rare?.includes(m.play.gameId)) ? 1 : 0;
    case 'test':
      return testDone ? 1 : 0;
    case 'score':
      return plays.some((m) => m.play.score >= (objective.score ?? 0)) ? 1 : 0;
    case 'record':
      return plays.some((m) => m.record) ? 1 : 0;
    case 'stars':
      return plays.reduce((sum, m) => sum + m.stars, 0);
  }
}

/** Le texte d'un objectif, dans la langue de l'interface. */
export function objectiveLabel(objective: DailyObjective): string {
  const n = objective.target;
  switch (objective.kind) {
    case 'plays':
      return tr(`Terminer ${n} parties`, `Finish ${n} games`);
    case 'domains':
      return tr(`Jouer dans ${n} domaines différents`, `Play in ${n} different areas`);
    case 'theme': {
      const name = DOMAINS[objective.domain ?? 'calcul'].name;
      return tr(`Jouer une partie de ${name}`, `Play a ${name} game`);
    }
    case 'rare':
      return tr('Rejouer un jeu laissé de côté depuis une semaine', 'Play a game you haven’t touched in a week');
    case 'test':
      return tr('Terminer le test du jour', 'Finish the daily test');
    case 'score':
      return tr(`Obtenir ${objective.score} points ou plus dans une partie`, `Score ${objective.score} points or more in a game`);
    case 'record':
      return tr('Battre un de tes records', 'Beat one of your best scores');
    case 'stars':
      return tr(`Gagner ${n} nouvelles étoiles`, `Earn ${n} new stars`);
  }
}

export interface ObjectiveStatus {
  objective: DailyObjective;
  progress: number;
  done: boolean;
}

interface DayGroup<P extends HistoryPlay> {
  day: string;
  plays: MarkedPlay<P>[];
}

function byDay<P extends HistoryPlay>(marked: readonly MarkedPlay<P>[]): DayGroup<P>[] {
  const groups: DayGroup<P>[] = [];
  for (const m of [...marked].sort((a, b) => a.play.day.localeCompare(b.play.day) || a.play.at.localeCompare(b.play.at))) {
    const last = groups.at(-1);
    if (last && last.day === m.play.day) last.plays.push(m);
    else groups.push({ day: m.play.day, plays: [m] });
  }
  return groups;
}

const officialDays = (tests: readonly HistoryTest[]) => new Set(tests.filter((t) => t.done && t.official).map((t) => t.day));

function statuses(objectives: readonly DailyObjective[], plays: readonly MarkedPlay[], testDone: boolean): ObjectiveStatus[] {
  return objectives.map((objective) => {
    const progress = objectiveProgress(objective, plays, testDone);
    return { objective, progress: Math.min(progress, objective.target), done: progress >= objective.target };
  });
}

/** Les objectifs d'une journée et leur avancement (vide avant le lancement des objectifs). */
export function dailyObjectives(day: string, plays: readonly HistoryPlay[], tests: readonly HistoryTest[]): ObjectiveStatus[] {
  if (day < OBJECTIVES_START) return [];
  const marked = markPlays(plays);
  const before = emptyBefore();
  learn(
    before,
    marked.filter((m) => m.play.day < day).map((m) => m.play),
  );
  return statuses(
    pickObjectives(day, before),
    marked.filter((m) => m.play.day === day),
    officialDays(tests).has(day),
  );
}

/** Tous les objectifs remplis depuis leur lancement, journée par journée, en un seul passage. */
export function objectivesDone(plays: readonly HistoryPlay[], tests: readonly HistoryTest[]): DailyObjective[] {
  const done: DailyObjective[] = [];
  const before = emptyBefore();
  const tested = officialDays(tests);
  for (const group of byDay(markPlays(plays))) {
    if (group.day >= OBJECTIVES_START) {
      for (const s of statuses(pickObjectives(group.day, before), group.plays, tested.has(group.day))) if (s.done) done.push(s.objective);
    }
    learn(
      before,
      group.plays.map((m) => m.play),
    );
  }
  return done;
}

/* ---------- Étincelles ---------- */

/**
 * Les étincelles se gagnent en jouant et servent à habiller Vif (le vestiaire). Jamais achetées,
 * jamais perdues. Le gain des parties est plafonné chaque jour : enchaîner les parties pour
 * amasser n'apporte rien au-delà d'une dizaine.
 */
export const SPARKS = {
  /** Plafond quotidien des étincelles de parties. */
  playsPerDay: 25,
  test: 10,
  objective: OBJECTIVE_SPARKS,
  weekly: 20,
} as const;

/** Étincelles d'une partie : de 1 à 5 selon le score. */
export function playSparks(score: number): number {
  return 1 + Math.floor(Math.min(100, Math.max(0, score)) / 25);
}

export interface SparksInput {
  plays: readonly HistoryPlay[];
  tests: readonly HistoryTest[];
  sessions: readonly string[];
}

/** Toutes les étincelles gagnées depuis le début. */
export function sparksEarned({ plays, tests, sessions }: SparksInput): number {
  const perDay = new Map<string, number>();
  for (const play of plays) perDay.set(play.day, (perDay.get(play.day) ?? 0) + playSparks(play.score));
  let total = 0;
  for (const value of perDay.values()) total += Math.min(SPARKS.playsPerDay, value);
  total += officialDays(tests).size * SPARKS.test;
  total += objectivesDone(plays, tests).length * SPARKS.objective;
  total += weekliesDone(plays, sessions) * SPARKS.weekly;
  return total;
}
