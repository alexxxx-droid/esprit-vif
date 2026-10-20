import { mergeResults } from '../core/challenges';
import { DOMAIN_ORDER } from '../core/games/registry';
import type { GameId } from '../core/types';
import { uniqueHats, type Extras, type GameProgress, type ProgressData, type TestRecord } from './progress';

/**
 * Fusion de deux progressions du même joueur (téléphone et tablette, via le Drive) : rien ne
 * se perd. Les parties et les tests s'additionnent (par identifiant), chaque jeu garde son
 * meilleur niveau et ses meilleurs scores, les compteurs leur maximum. Les réglages restent
 * ceux de l'appareil (thème, sons…), sauf ce qui décrit le joueur (objectifs, accueil passé).
 * La fusion est commutative et idempotente : synchroniser deux fois ne change plus rien.
 */
export function mergeProgress(local: ProgressData, remote: ProgressData): ProgressData {
  return {
    plays: unionById(local.plays, remote.plays, (a) => a).sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id)),
    tests: unionById(local.tests, remote.tests, betterTest).sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id)),
    games: mergeGames(local.games, remote.games),
    settings: {
      ...local.settings,
      onboarded: local.settings.onboarded || remote.settings.onboarded,
      placementDone: local.settings.placementDone || remote.settings.placementDone,
      goals: local.settings.goals.length ? local.settings.goals : remote.settings.goals,
    },
    extras: mergeExtras(local.extras, remote.extras),
  };
}

function unionById<T extends { id: string }>(a: readonly T[], b: readonly T[], pick: (x: T, y: T) => T): T[] {
  const map = new Map<string, T>();
  for (const item of a) map.set(item.id, item);
  for (const item of b) {
    const mine = map.get(item.id);
    map.set(item.id, mine ? pick(mine, item) : item);
  }
  return [...map.values()];
}

/** Le même test sur deux appareils : on garde le plus avancé (terminé, plus de résultats). */
function betterTest(a: TestRecord, b: TestRecord): TestRecord {
  if (a.done !== b.done) return a.done ? a : b;
  if (a.results.length !== b.results.length) return a.results.length > b.results.length ? a : b;
  return a.id <= b.id ? a : b;
}

function mergeGames(a: ProgressData['games'], b: ProgressData['games']): ProgressData['games'] {
  const out: Partial<Record<GameId, GameProgress>> = {};
  // Ordre fixe des clés : la même fusion donne le même texte, quel que soit le sens.
  const ids = [...new Set([...Object.keys(a), ...Object.keys(b)] as GameId[])].sort();
  for (const id of ids) {
    const x = a[id];
    const y = b[id];
    if (!x || !y) {
      out[id] = (x ?? y)!;
      continue;
    }
    const merged: GameProgress['bests'] = { ...x.bests };
    for (const [level, best] of Object.entries(y.bests)) {
      const mine = merged[level];
      if (!mine || best.score > mine.score || (best.score === mine.score && best.day < mine.day)) merged[level] = best;
    }
    const bests = Object.fromEntries(Object.entries(merged).sort((p, q) => Number(p[0]) - Number(q[0])));
    const start = Math.max(x.start ?? 0, y.start ?? 0);
    out[id] = { level: Math.max(x.level, y.level), bests, ...(start ? { start } : {}) };
  }
  return out;
}

function mergeExtras(a: Extras, b: Extras): Extras {
  const marathons: Extras['marathons'] = {};
  for (const domain of DOMAIN_ORDER) {
    const x = a.marathons[domain];
    const y = b.marathons[domain];
    if (x || y) marathons[domain] = { best: Math.max(x?.best ?? 0, y?.best ?? 0), count: Math.max(x?.count ?? 0, y?.count ?? 0) };
  }
  return {
    sessions: [...new Set([...a.sessions, ...b.sessions])].sort(),
    marathons,
    duels: Math.max(a.duels, b.duels),
    challenges: unionById(a.challenges, b.challenges, (x) => x).sort((x, y) => x.day.localeCompare(y.day) || x.id.localeCompare(y.id)),
    friends: mergeResults(a.friends, b.friends).sort(
      (x, y) => x.challenge.localeCompare(y.challenge) || Number(y.me) - Number(x.me) || x.name.localeCompare(y.name) || x.gameId.localeCompare(y.gameId),
    ),
    wardrobe: uniqueHats([...a.wardrobe, ...b.wardrobe]).sort((x, y) => x.id.localeCompare(y.id)),
  };
}
