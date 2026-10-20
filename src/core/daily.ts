import { createRng, hashSeed } from './rng';
import type { GameId } from './types';

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

/** Jeux du test du jour, rangés par domaine : un tableau de jeux par domaine. */
export type DailyPool = readonly (readonly GameId[])[];

/** Nombre de jeux (et donc de domaines différents) dans un test du jour. */
export const DAILY_SIZE = 3;

function combinations(items: readonly number[], size: number): number[][] {
  if (size === 0) return [[]];
  return items.flatMap((item, i) => combinations(items.slice(i + 1), size - 1).map((rest) => [item, ...rest]));
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

/**
 * Les trois jeux du jour, dans trois domaines différents. Tout se déduit de la date, rien n'est tiré
 * au hasard au lancement : fermer et rouvrir l'appli redonne le même test.
 * - Les domaines : les 20 trios possibles des six domaines défilent dans un ordre mélangé, renouvelé
 *   tous les 20 jours ; chaque domaine revient ainsi un jour sur deux.
 * - Dans un domaine, on fait le tour de tous ses jeux (dans un ordre mélangé) avant d'en revoir un,
 *   et jamais le même deux fois de suite, même d'un tour à l'autre.
 */
export function dailyGames(day: string, pool: DailyPool): GameId[] {
  const domains = pool.map((_, i) => i).filter((i) => pool[i].length > 0);
  if (domains.length < DAILY_SIZE) return pool.flat().slice(0, DAILY_SIZE);
  const trios = combinations(domains, DAILY_SIZE);
  const index = dayIndex(day);
  const cycle = Math.floor(index / trios.length);
  const order = (c: number) => createRng(hashSeed(`esprit-vif:test:${c}`)).shuffle(trios);
  const current = order(cycle);
  const position = mod(index, trios.length);
  // Chaque domaine figure dans le même nombre de trios : de quoi compter ses apparitions passées sans tout rejouer.
  const perCycle = trios.filter((t) => t.includes(domains[0])).length;
  const shuffled = (domain: number, n: number) => createRng(hashSeed(`esprit-vif:test:${domain}:${n}`)).shuffle(pool[domain]);
  const lap = (domain: number, n: number): readonly GameId[] => {
    // Deux jeux ou moins : ils alternent simplement.
    if (pool[domain].length <= 2) return pool[domain];
    const games = shuffled(domain, n);
    // L'échange ne touche que les deux premiers : le dernier jeu du tour précédent est celui de son mélange.
    if (n > 0 && games[0] === shuffled(domain, n - 1).at(-1)) [games[0], games[1]] = [games[1], games[0]];
    return games;
  };
  return current[position].map((domain) => {
    const seen = cycle * perCycle + current.slice(0, position).filter((t) => t.includes(domain)).length;
    const size = pool[domain].length;
    return lap(domain, Math.floor(seen / size))[mod(seen, size)];
  });
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
 * La série du jour et le dernier jour où elle tiendra encore sans nouvelle partie (jour de repos
 * compris) : de quoi l'afficher hors de l'appli, sur le widget, sans la recalculer.
 */
export function streakHorizon(days: Iterable<string>, today: string): { count: number; until: string | null } {
  const set = new Set(days);
  const count = currentStreakDetail(set, today).count;
  if (count === 0) return { count, until: null };
  let until = today;
  for (let d = 1; d <= REST_DAY_EVERY && currentStreakDetail(set, addDays(today, d)).count > 0; d++) until = addDays(today, d);
  return { count, until };
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
