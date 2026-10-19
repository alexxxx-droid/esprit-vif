import { hashSeed } from './rng';
import type { GameId } from './types';

/** Les deux jeux présents à chaque test du jour. */
export const DAILY_FIXED: readonly GameId[] = ['calcul', 'stroop'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Jour local au format AAAA-MM-JJ. */
export function dayKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parts(day: string): [number, number, number] {
  const [y, m, d] = day.split('-').map(Number);
  return [y, m, d];
}

/** Numéro du jour depuis le 1er janvier 1970, indépendant du fuseau. */
export function dayIndex(day: string): number {
  const [y, m, d] = parts(day);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function addDays(day: string, delta: number): string {
  const [y, m, d] = parts(day);
  const date = new Date(Date.UTC(y, m - 1, d + delta));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Les trois jeux du jour : les deux fixes, puis un troisième qui tourne chaque jour. */
export function dailyGames(day: string, rotation: readonly GameId[]): GameId[] {
  if (rotation.length === 0) return [...DAILY_FIXED];
  const index = ((dayIndex(day) % rotation.length) + rotation.length) % rotation.length;
  return [...DAILY_FIXED, rotation[index]];
}

/** Graine du test officiel : la même pour un jour et un jeu donnés. */
export function dailySeed(day: string, gameId: GameId): number {
  return hashSeed(`esprit-vif:${day}:${gameId}`);
}

export interface TestLike {
  day: string;
  official: boolean;
  done: boolean;
}

/** Un seul test officiel par jour : vrai si celui du jour est déjà terminé. */
export function hasOfficialTest(tests: readonly TestLike[], day: string): boolean {
  return tests.some((t) => t.done && t.official && t.day === day);
}

/** Un jour de repos est pardonné, au plus une fois tous les 7 jours : encourager, jamais culpabiliser. */
export const REST_DAY_EVERY = 7;

export interface StreakDetail {
  /** Jours joués dans la série. */
  count: number;
  /** Jours manqués pardonnés à l'intérieur de la série. */
  rests: string[];
}

/** Remonte le temps depuis `start` tant que la série tient (deux jours manqués d'affilée la rompent). */
function walkBack(set: ReadonlySet<string>, start: string, leadingRest: boolean): StreakDetail {
  let cursor = start;
  let count = 0;
  const rests: string[] = [];
  for (;;) {
    if (set.has(cursor)) {
      count++;
      cursor = addDays(cursor, -1);
      continue;
    }
    const before = addDays(cursor, -1);
    const lastRest = rests.at(-1);
    const restAllowed = (count > 0 || leadingRest) && set.has(before) && (!lastRest || dayIndex(lastRest) - dayIndex(cursor) >= REST_DAY_EVERY);
    if (!restAllowed) break;
    rests.push(cursor);
    cursor = before;
  }
  return { count, rests };
}

/**
 * Série en cours : jours d'entraînement à la suite, un jour de repos par semaine toléré.
 * Tant que la journée n'est pas finie, la série d'hier reste valable (et hier peut être le jour de repos).
 */
export function currentStreakDetail(days: Iterable<string>, today: string): StreakDetail {
  const set = new Set(days);
  return set.has(today) ? walkBack(set, today, false) : walkBack(set, addDays(today, -1), true);
}

export function currentStreak(days: Iterable<string>, today: string): number {
  return currentStreakDetail(days, today).count;
}

/**
 * Grille d'un mois pour le calendrier, semaines commençant le lundi :
 * des cases vides (null) avant le 1er, puis un jour par case.
 */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const leading = (first.getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`),
  ];
}

/** Décale un mois « AAAA-MM » de `delta` mois. */
export function addMonths(year: number, month: number, delta: number): [number, number] {
  const index = year * 12 + (month - 1) + delta;
  return [Math.floor(index / 12), (index % 12) + 1];
}

export function bestStreak(days: Iterable<string>): number {
  const set = new Set(days);
  let best = 0;
  // Une série se termine forcément sur un jour joué dont le lendemain ne l'est pas.
  for (const day of set) if (!set.has(addDays(day, 1))) best = Math.max(best, walkBack(set, day, false).count);
  return best;
}
