import { DOMAIN_ORDER, gamesOfDomain, isGameId } from './games/registry';
import { createRng, deriveSeed } from './rng';
import type { Domain, GameId } from './types';

/**
 * Défis entre amies, sans serveur : un défi tient tout entier dans un lien (graine, niveau,
 * jeux, et les scores de celle qui l'envoie). Chacune garde chez elle les résultats reçus,
 * d'où un classement par catégorie.
 */

export const CHALLENGE_GAMES = 3;
export const CHALLENGE_LEVELS = [1, 5, 10] as const;

export interface ChallengeLink {
  /** Identifiant du défi (le même pour toutes celles qui le jouent). */
  id: string;
  seed: number;
  level: number;
  games: GameId[];
  /** Qui envoie le lien, et ses scores (dans l'ordre des jeux), s'il les a déjà joués. */
  from: string;
  scores: number[] | null;
  day: string;
}

export interface FriendResult {
  challenge: string;
  name: string;
  /** Le joueur de cet appareil (pour le mettre en avant dans le classement). */
  me: boolean;
  gameId: GameId;
  score: number;
  day: string;
}

/** Trois jeux : un par catégorie tirée au sort, ou trois d'une même catégorie. */
export function challengeGames(seed: number, domain: Domain | 'mix'): GameId[] {
  const rng = createRng(seed);
  if (domain === 'mix') {
    const domains = rng.shuffle(DOMAIN_ORDER.filter((d) => gamesOfDomain(d).length > 0)).slice(0, CHALLENGE_GAMES);
    return domains.map((d) => rng.pick(gamesOfDomain(d)));
  }
  return rng.shuffle(gamesOfDomain(domain)).slice(0, CHALLENGE_GAMES);
}

/** Graine de la partie n° `index` d'un défi : la même pour toutes les joueuses. */
export function challengeSeed(link: Pick<ChallengeLink, 'seed'>, index: number): number {
  return deriveSeed(link.seed, index);
}

const toBase64Url = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (code: string) => {
  const binary = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
};

export function encodeChallenge(link: ChallengeLink): string {
  return toBase64Url(JSON.stringify({ v: 1, i: link.id, s: link.seed, l: link.level, g: link.games, n: link.from, r: link.scores, d: link.day }));
}

/** Lit un code de défi (ou un lien entier qui en contient un) ; null s'il est abîmé. */
export function decodeChallenge(input: string): ChallengeLink | null {
  const code = input.includes('/defi/') ? input.slice(input.indexOf('/defi/') + 6).split(/[?#\s]/)[0] : input.trim();
  try {
    const raw = JSON.parse(fromBase64Url(code)) as Record<string, unknown>;
    const games = Array.isArray(raw.g) ? raw.g.filter((g): g is GameId => typeof g === 'string' && isGameId(g)) : [];
    const scores = Array.isArray(raw.r) ? raw.r.map(Number) : null;
    if (raw.v !== 1 || typeof raw.i !== 'string' || !Number.isInteger(raw.s) || games.length !== CHALLENGE_GAMES) return null;
    if (scores && (scores.length !== CHALLENGE_GAMES || scores.some((s) => !Number.isInteger(s) || s < 0 || s > 100))) return null;
    return {
      id: raw.i.slice(0, 40),
      seed: Number(raw.s) >>> 0,
      level: Math.min(20, Math.max(1, Number(raw.l) || 1)),
      games,
      from: String(raw.n ?? '').trim().slice(0, 16) || 'Une amie',
      scores,
      day: typeof raw.d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.d) ? raw.d : '',
    };
  } catch {
    return null;
  }
}

/** Les résultats qu'un lien apporte (vide s'il ne porte pas de scores). */
export function resultsFromLink(link: ChallengeLink): FriendResult[] {
  if (!link.scores) return [];
  return link.games.map((gameId, i) => ({ challenge: link.id, name: link.from, me: false, gameId, score: link.scores![i], day: link.day }));
}

/** Ajoute des résultats sans doublon (même défi, même joueuse, même jeu : le dernier reçu gagne). */
export function mergeResults(current: readonly FriendResult[], incoming: readonly FriendResult[]): FriendResult[] {
  const key = (r: FriendResult) => `${r.challenge}|${r.me ? '' : r.name.toLowerCase()}|${r.gameId}`;
  const map = new Map(current.map((r) => [key(r), r]));
  for (const r of incoming) map.set(key(r), r);
  return [...map.values()];
}

export interface RankingRow {
  name: string;
  me: boolean;
  average: number;
  games: number;
}

/** Classement par catégorie : la moyenne de chacune sur les jeux de défi de cette catégorie. */
export function friendRanking(results: readonly FriendResult[], domain: Domain | 'all', domainOf: (id: GameId) => Domain): RankingRow[] {
  const rows = new Map<string, { name: string; me: boolean; total: number; games: number }>();
  for (const r of results) {
    if (domain !== 'all' && domainOf(r.gameId) !== domain) continue;
    const key = r.me ? '\u0000moi' : r.name.toLowerCase();
    const row = rows.get(key) ?? { name: r.name, me: r.me, total: 0, games: 0 };
    row.total += r.score;
    row.games++;
    rows.set(key, row);
  }
  return [...rows.values()]
    .map((r) => ({ name: r.name, me: r.me, games: r.games, average: Math.round(r.total / r.games) }))
    .sort((a, b) => b.average - a.average || b.games - a.games);
}

/** Adresse publique de l'appli : le lien marche aussi pour qui ne l'a pas encore installée. */
export const SITE_URL = 'https://alexxxx-droid.github.io/esprit-vif/';

export function challengeUrl(link: ChallengeLink): string {
  return `${SITE_URL}#/defi/${encodeChallenge(link)}`;
}

export interface Standing {
  name: string;
  me: boolean;
  /** Score de chaque jeu du défi, dans l'ordre (null s'il manque). */
  scores: (number | null)[];
  total: number;
  complete: boolean;
}

/** Les participantes d'un défi, de la meilleure à la moins bonne (les parties incomplètes à la fin). */
export function challengeStandings(results: readonly FriendResult[], link: Pick<ChallengeLink, 'id' | 'games'>): Standing[] {
  const rows = new Map<string, Standing>();
  for (const r of results) {
    const index = link.games.indexOf(r.gameId);
    if (r.challenge !== link.id || index < 0) continue;
    const key = r.me ? '\u0000moi' : r.name.toLowerCase();
    const row = rows.get(key) ?? { name: r.name, me: r.me, scores: link.games.map(() => null), total: 0, complete: false };
    row.scores[index] = r.score;
    rows.set(key, row);
  }
  return [...rows.values()]
    .map((row) => ({ ...row, total: row.scores.reduce<number>((sum, s) => sum + (s ?? 0), 0), complete: row.scores.every((s) => s !== null) }))
    .sort((a, b) => Number(b.complete) - Number(a.complete) || b.total - a.total);
}
