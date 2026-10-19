import { bestStreak } from './daily';
import { DOMAIN_ORDER, GAME_ORDER, gamesOfDomain } from './games/registry';
import { MAX_LEVEL, starsFor, UNLOCK_SCORE } from './levels';
import type { GameId } from './types';

/**
 * Progression du joueur : étoiles, niveaux débloqués, médailles, XP, rang et trophées.
 * Tout se déduit de l'historique (parties, tests, séances…) : rien à migrer, rien à désynchroniser.
 */

export interface ProgressionPlay {
  gameId: GameId;
  level: number;
  score: number;
  /** Horodatage ISO. */
  at: string;
  day: string;
}

export interface ProgressionTest {
  day: string;
  official: boolean;
  done: boolean;
  brainAge?: number;
  startedAt: string;
}

/** Meilleur score par niveau d'un jeu. */
export type LevelBests = Record<string, { score: number }>;

export interface ProgressionInput {
  plays: readonly ProgressionPlay[];
  tests: readonly ProgressionTest[];
  bests: Partial<Record<GameId, LevelBests>>;
  /** Jours où la séance du jour a été terminée. */
  sessions: readonly string[];
  marathons: number;
  duels: number;
}

// ---------- Niveaux, étoiles, médailles ----------

/** Plus haut niveau réussi (au moins une étoile), 0 si aucun. */
export function highestPassed(bests: LevelBests | undefined): number {
  let top = 0;
  for (const [level, best] of Object.entries(bests ?? {})) {
    if (best.score >= UNLOCK_SCORE) top = Math.max(top, Number(level));
  }
  return top;
}

/** Dernier niveau jouable : celui qui suit le plus haut niveau réussi. */
export function unlockedLevel(bests: LevelBests | undefined): number {
  return Math.min(MAX_LEVEL, highestPassed(bests) + 1);
}

export function gameStars(bests: LevelBests | undefined): number {
  return Object.values(bests ?? {}).reduce((sum, best) => sum + starsFor(best.score), 0);
}

export function totalStars(bests: ProgressionInput['bests']): number {
  return Object.values(bests).reduce((sum, b) => sum + gameStars(b), 0);
}

export type Medal = 'bronze' | 'argent' | 'or' | 'platine';
export const MEDAL_ORDER: readonly Medal[] = ['bronze', 'argent', 'or', 'platine'];
export const MEDAL_NAMES: Record<Medal, string> = { bronze: 'Bronze', argent: 'Argent', or: 'Or', platine: 'Platine' };

/** Médailles par jeu, selon le niveau réussi (le platine demande 3 étoiles au niveau 20). */
export const MEDAL_RULES: Record<Medal, string> = {
  bronze: 'Réussir le niveau 5',
  argent: 'Réussir le niveau 10',
  or: 'Réussir le niveau 15',
  platine: 'Trois étoiles au niveau 20',
};

export function medalFor(bests: LevelBests | undefined): Medal | null {
  const top = highestPassed(bests);
  if (top >= 20 && starsFor(bests?.[20]?.score ?? 0) === 3) return 'platine';
  if (top >= 15) return 'or';
  if (top >= 10) return 'argent';
  if (top >= 5) return 'bronze';
  return null;
}

export function medalRank(medal: Medal | null): number {
  return medal ? MEDAL_ORDER.indexOf(medal) + 1 : 0;
}

// ---------- XP et rang ----------

export const XP_BONUS = { test: 40, star: 10, session: 30, marathon: 30, duel: 10 };

/** XP d'une partie : de 5 à 50 selon le score, jusqu'à presque ×2 au niveau 20. */
export function playXp(score: number, level: number): number {
  return Math.round((5 + score * 0.45) * (1 + (level - 1) * 0.05));
}

export function totalXp(input: ProgressionInput): number {
  const best = new Map<string, number>();
  let xp = 0;
  for (const play of [...input.plays].sort((a, b) => a.at.localeCompare(b.at))) {
    xp += playXp(play.score, play.level);
    const key = `${play.gameId}:${play.level}`;
    const before = best.get(key);
    const gained = starsFor(play.score) - (before === undefined ? 0 : starsFor(before));
    if (gained > 0) xp += gained * XP_BONUS.star;
    if (before === undefined || play.score > before) best.set(key, play.score);
  }
  xp += input.tests.filter((t) => t.done && t.official).length * XP_BONUS.test;
  xp += input.sessions.length * XP_BONUS.session;
  xp += input.marathons * XP_BONUS.marathon;
  xp += input.duels * XP_BONUS.duel;
  return xp;
}

/** XP cumulée pour atteindre un niveau : 100 pour le niveau 2, puis 25 de plus à chaque palier. */
export function xpToReach(level: number): number {
  const n = Math.max(1, Math.floor(level)) - 1;
  return 100 * n + (25 * n * (n - 1)) / 2;
}

export const TITLES: readonly [number, string][] = [
  [1, 'Esprit curieux'],
  [5, 'Esprit éveillé'],
  [10, 'Esprit agile'],
  [15, 'Esprit vif'],
  [20, 'Esprit affûté'],
  [25, 'Esprit brillant'],
  [30, 'Esprit lumineux'],
  [40, 'Esprit étincelant'],
  [50, 'Esprit légendaire'],
];

export function titleFor(level: number): string {
  return [...TITLES].reverse().find(([min]) => level >= min)?.[1] ?? TITLES[0][1];
}

export interface Rank {
  level: number;
  title: string;
  xp: number;
  /** XP du début du niveau actuel et du suivant. */
  levelStart: number;
  nextAt: number;
}

export function rankFor(xp: number): Rank {
  let level = 1;
  while (xpToReach(level + 1) <= xp) level++;
  return { level, title: titleFor(level), xp, levelStart: xpToReach(level), nextAt: xpToReach(level + 1) };
}

// ---------- Trophées ----------

export type TrophyIcon = 'check' | 'calendar' | 'flame' | 'training' | 'replay' | 'star' | 'spark' | 'progress' | 'medal' | 'trophy' | 'crown' | 'duel' | 'sun' | 'moon';

interface TrophyContext {
  plays: readonly ProgressionPlay[];
  official: ProgressionTest[];
  distinctGames: number;
  perfects: number;
  streak: number;
  minAge: number | null;
  firstAge: number | null;
  stars: number;
  medals: (Medal | null)[];
  domainGold: boolean;
  maxUnlocked: number;
  rank: number;
  sessions: number;
  marathons: number;
  duels: number;
  earlyTest: boolean;
  lateGame: boolean;
}

interface TrophyDef {
  id: string;
  name: string;
  description: string;
  icon: TrophyIcon;
  /** Valeur actuelle et objectif ; un objectif de 1 sans compteur est un trophée « tout ou rien ». */
  value: (c: TrophyContext) => number;
  target: number;
  counter?: boolean;
}

const t = (id: string, name: string, description: string, icon: TrophyIcon, value: TrophyDef['value'], target = 1, counter = target > 1): TrophyDef => ({
  id,
  name,
  description,
  icon,
  value,
  target,
  counter,
});

const has = (condition: boolean) => (condition ? 1 : 0);
const medalsAtLeast = (c: TrophyContext, medal: Medal) => c.medals.filter((m) => medalRank(m) >= medalRank(medal)).length;

export const TROPHIES: readonly TrophyDef[] = [
  t('premiers-pas', 'Premiers pas', 'Terminer une première partie.', 'check', (c) => c.plays.length),
  t('rendez-vous', 'Rendez-vous', 'Terminer un test du jour.', 'calendar', (c) => c.official.length),
  t('habitue', 'Habitué', 'Terminer 10 tests du jour.', 'calendar', (c) => c.official.length, 10),
  t('fidele', 'Fidèle', 'Terminer 50 tests du jour.', 'calendar', (c) => c.official.length, 50),
  t('serie-3', 'Bon rythme', 'S’entraîner 3 jours d’affilée.', 'flame', (c) => c.streak, 3),
  t('serie-7', 'Une semaine pile', 'S’entraîner 7 jours d’affilée.', 'flame', (c) => c.streak, 7),
  t('serie-30', 'Un mois sans faille', 'S’entraîner 30 jours d’affilée.', 'flame', (c) => c.streak, 30),
  t('curieux', 'Curieux', 'Essayer 12 jeux différents.', 'training', (c) => c.distinctGames, 12),
  t('touche-a-tout', 'Touche-à-tout', 'Essayer tous les jeux.', 'training', (c) => c.distinctGames, GAME_ORDER.length),
  t('cent', 'Cent parties', 'Jouer 100 parties.', 'replay', (c) => c.plays.length, 100),
  t('infatigable', 'Infatigable', 'Jouer 500 parties.', 'replay', (c) => c.plays.length, 500),
  t('sans-faute', 'Sans faute', 'Obtenir 100 points dans une partie.', 'star', (c) => c.perfects),
  t('perfection', 'Perfectionniste', 'Obtenir 100 points 25 fois.', 'star', (c) => c.perfects, 25),
  t('age-40', 'Esprit alerte', 'Atteindre un âge cérébral de 40 ans ou moins.', 'spark', (c) => has(c.minAge !== null && c.minAge <= 40)),
  t('age-30', 'Esprit vif', 'Atteindre un âge cérébral de 30 ans ou moins.', 'spark', (c) => has(c.minAge !== null && c.minAge <= 30)),
  t('age-20', 'Au sommet', 'Atteindre l’âge cérébral de 20 ans.', 'spark', (c) => has(c.minAge === 20)),
  t(
    'progres',
    'En progrès',
    'Gagner 5 ans d’âge cérébral depuis ton premier test.',
    'progress',
    (c) => (c.firstAge !== null && c.minAge !== null ? c.firstAge - c.minAge : 0),
    5,
  ),
  t('etoiles-50', 'Pluie d’étoiles', 'Gagner 50 étoiles.', 'star', (c) => c.stars, 50),
  t('etoiles-250', 'Constellation', 'Gagner 250 étoiles.', 'star', (c) => c.stars, 250),
  t('etoiles-1000', 'Voie lactée', 'Gagner 1 000 étoiles.', 'star', (c) => c.stars, 1000),
  t('bronze', 'Première médaille', 'Gagner une médaille de bronze.', 'medal', (c) => medalsAtLeast(c, 'bronze')),
  t('or', 'Médaille d’or', 'Gagner une médaille d’or.', 'medal', (c) => medalsAtLeast(c, 'or')),
  t('platine', 'Platine', 'Gagner une médaille de platine.', 'medal', (c) => medalsAtLeast(c, 'platine')),
  t('collection', 'Collectionneur', 'Une médaille dans chaque jeu.', 'medal', (c) => medalsAtLeast(c, 'bronze'), GAME_ORDER.length),
  t('specialiste', 'Spécialiste', 'L’or dans tous les jeux d’un même domaine.', 'trophy', (c) => has(c.domainGold)),
  t('tout-en-haut', 'Tout en haut', 'Débloquer le niveau 20 d’un jeu.', 'trophy', (c) => c.maxUnlocked, MAX_LEVEL, false),
  t('niveau-10', 'Niveau 10', 'Atteindre le niveau 10 de joueur.', 'crown', (c) => c.rank, 10, false),
  t('niveau-25', 'Niveau 25', 'Atteindre le niveau 25 de joueur.', 'crown', (c) => c.rank, 25, false),
  t('niveau-50', 'Niveau 50', 'Atteindre le niveau 50 de joueur.', 'crown', (c) => c.rank, 50, false),
  t('seance', 'Séance complète', 'Terminer une séance du jour.', 'training', (c) => c.sessions),
  t('assidu', 'Assidu', 'Terminer 20 séances du jour.', 'training', (c) => c.sessions, 20),
  t('marathon', 'Marathonien', 'Terminer un marathon.', 'flame', (c) => c.marathons),
  t('duel', 'Premier duel', 'Jouer un duel à deux.', 'duel', (c) => c.duels),
  t('leve-tot', 'Lève-tôt', 'Faire le test du jour avant 8 h.', 'sun', (c) => has(c.earlyTest)),
  t('nuit', 'Oiseau de nuit', 'Jouer une partie après 23 h.', 'moon', (c) => has(c.lateGame)),
];

export interface TrophyStatus {
  id: string;
  name: string;
  description: string;
  icon: TrophyIcon;
  unlocked: boolean;
  /** Compteur affichable (ex. 4 / 7), ou null pour un trophée « tout ou rien ». */
  progress: [number, number] | null;
}

export function trophyStatuses(input: ProgressionInput, rank = rankFor(totalXp(input)).level): TrophyStatus[] {
  const official = input.tests.filter((test) => test.done && test.official).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const ages = official.map((test) => test.brainAge).filter((age): age is number => age !== undefined);
  const medals = GAME_ORDER.map((id) => medalFor(input.bests[id]));
  const context: TrophyContext = {
    plays: input.plays,
    official,
    distinctGames: new Set(input.plays.map((p) => p.gameId)).size,
    perfects: input.plays.filter((p) => p.score >= 100).length,
    streak: bestStreak(input.plays.map((p) => p.day)),
    minAge: ages.length ? Math.min(...ages) : null,
    firstAge: ages.length ? ages[0] : null,
    stars: totalStars(input.bests),
    medals,
    domainGold: DOMAIN_ORDER.some((domain) => {
      const games = gamesOfDomain(domain);
      return games.length > 0 && games.every((id) => medalRank(medalFor(input.bests[id])) >= medalRank('or'));
    }),
    maxUnlocked: Math.max(1, ...GAME_ORDER.map((id) => unlockedLevel(input.bests[id]))),
    rank,
    sessions: input.sessions.length,
    marathons: input.marathons,
    duels: input.duels,
    earlyTest: official.some((test) => new Date(test.startedAt).getHours() < 8),
    lateGame: input.plays.some((p) => new Date(p.at).getHours() >= 23),
  };
  return TROPHIES.map((def) => {
    const value = def.value(context);
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      unlocked: value >= def.target,
      progress: def.counter ? [Math.min(value, def.target), def.target] : null,
    };
  });
}

/** Ce qu'une partie vient de faire gagner : affiché sur l'écran de résultat. */
export interface ProgressionDelta {
  xpGained: number;
  rankBefore: Rank;
  rankAfter: Rank;
  starsBefore: number;
  starsAfter: number;
  medalBefore: Medal | null;
  medalAfter: Medal | null;
  /** Le niveau suivant vient de se débloquer. */
  unlockedNext: boolean;
  newTrophies: TrophyStatus[];
}

export function progressionDelta(before: ProgressionInput, after: ProgressionInput, gameId: GameId, level: number): ProgressionDelta {
  const rankBefore = rankFor(totalXp(before));
  const rankAfter = rankFor(totalXp(after));
  const unlockedBefore = new Set(trophyStatuses(before, rankBefore.level).filter((s) => s.unlocked).map((s) => s.id));
  const levelStars = (input: ProgressionInput) => starsFor(input.bests[gameId]?.[level]?.score ?? 0);
  return {
    xpGained: rankAfter.xp - rankBefore.xp,
    rankBefore,
    rankAfter,
    starsBefore: levelStars(before),
    starsAfter: levelStars(after),
    medalBefore: medalFor(before.bests[gameId]),
    medalAfter: medalFor(after.bests[gameId]),
    unlockedNext: unlockedLevel(after.bests[gameId]) > unlockedLevel(before.bests[gameId]),
    newTrophies: trophyStatuses(after, rankAfter.level).filter((s) => s.unlocked && !unlockedBefore.has(s.id)),
  };
}

/** Résumé de la progression pour l'interface. */
export interface ProgressionSummary {
  rank: Rank;
  stars: number;
  trophies: TrophyStatus[];
}

export function progressionSummary(input: ProgressionInput): ProgressionSummary {
  const rank = rankFor(totalXp(input));
  return { rank, stars: totalStars(input.bests), trophies: trophyStatuses(input, rank.level) };
}
