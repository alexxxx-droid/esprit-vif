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

/**
 * Série de jours consécutifs avec au moins un entraînement. Tant que la journée
 * n'est pas finie, la série d'hier reste valable.
 */
export function currentStreak(days: Iterable<string>, today: string): number {
  const set = new Set(days);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (set.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function bestStreak(days: Iterable<string>): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of sorted) {
    run = previous !== null && addDays(previous, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}
