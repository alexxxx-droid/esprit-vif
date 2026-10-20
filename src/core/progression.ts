import { bestStreak } from './daily';
import { SEASON_PLAYS, SEASONS, seasonPlays, WEEKLY_XP, weekliesDone, type Season, type SeasonId } from './events';
import { DOMAIN_ORDER, GAME_ORDER, gamesOfDomain } from './games/registry';
import { tr } from './lang';
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
  /** Défis entre amies relevés (joués sur cet appareil). */
  challenges: number;
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

/** Un texte dans les deux langues : [français, anglais], choisi à l'affichage. */
type Bilingual = readonly [fr: string, en: string];

export type Medal = 'bronze' | 'argent' | 'or' | 'platine' | 'diamant' | 'legende';
export const MEDAL_ORDER: readonly Medal[] = ['bronze', 'argent', 'or', 'platine', 'diamant', 'legende'];
/** Noms des médailles (accesseurs : lus dans la langue de l'interface). */
export const MEDAL_NAMES: Record<Medal, string> = {
  get bronze() {
    return tr('Bronze', 'Bronze');
  },
  get argent() {
    return tr('Argent', 'Silver');
  },
  get or() {
    return tr('Or', 'Gold');
  },
  get platine() {
    return tr('Platine', 'Platinum');
  },
  get diamant() {
    return tr('Diamant', 'Diamond');
  },
  get legende() {
    return tr('Légende', 'Legend');
  },
};

/** Médailles par jeu, selon le niveau réussi (le platine demande 3 étoiles au niveau 20). */
export const MEDAL_RULES: Record<Medal, string> = {
  get bronze() {
    return tr('Réussir le niveau 5', 'Pass level 5');
  },
  get argent() {
    return tr('Réussir le niveau 10', 'Pass level 10');
  },
  get or() {
    return tr('Réussir le niveau 15', 'Pass level 15');
  },
  get platine() {
    return tr('Trois étoiles au niveau 20', 'Three stars on level 20');
  },
  get diamant() {
    return tr('Réussir le niveau 35', 'Pass level 35');
  },
  get legende() {
    return tr('Trois étoiles au niveau 50', 'Three stars on level 50');
  },
};

export function medalFor(bests: LevelBests | undefined): Medal | null {
  const top = highestPassed(bests);
  if (top >= 50 && starsFor(bests?.[50]?.score ?? 0) === 3) return 'legende';
  if (top >= 35) return 'diamant';
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

export const XP_BONUS = { test: 40, star: 10, session: 30, marathon: 30, duel: 10, challenge: 20, weekly: WEEKLY_XP };

/** XP d'une partie : de 5 à 50 selon le score, plus 5 % par niveau, plafonné au niveau 30 (×2,45). */
export function playXp(score: number, level: number): number {
  return Math.round((5 + score * 0.45) * (1 + Math.min(level - 1, 29) * 0.05));
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
  xp += input.challenges * XP_BONUS.challenge;
  xp += weekliesDone(input.plays, input.sessions) * XP_BONUS.weekly;
  return xp;
}

/** XP cumulée pour atteindre un niveau : 100 pour le niveau 2, puis 25 de plus à chaque palier. */
export function xpToReach(level: number): number {
  const n = Math.max(1, Math.floor(level)) - 1;
  return 100 * n + (25 * n * (n - 1)) / 2;
}

/** Titres de rang : niveau minimum, puis le titre en français et en anglais. */
export const TITLES: readonly (readonly [min: number, fr: string, en: string])[] = [
  [1, 'Esprit curieux', 'Curious Mind'],
  [5, 'Esprit éveillé', 'Awakened Mind'],
  [10, 'Esprit agile', 'Agile Mind'],
  [15, 'Esprit vif', 'Quick Mind'],
  [20, 'Esprit affûté', 'Sharp Mind'],
  [25, 'Esprit brillant', 'Brilliant Mind'],
  [30, 'Esprit lumineux', 'Radiant Mind'],
  [40, 'Esprit étincelant', 'Dazzling Mind'],
  [50, 'Esprit légendaire', 'Legendary Mind'],
];

/** Le titre du rang, dans la langue de l'interface. */
export function titleFor(level: number): string {
  const [, fr, en] = [...TITLES].reverse().find(([min]) => level >= min) ?? TITLES[0];
  return tr(fr, en);
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

export type TrophyIcon =
  | 'check'
  | 'calendar'
  | 'flame'
  | 'training'
  | 'replay'
  | 'star'
  | 'spark'
  | 'progress'
  | 'medal'
  | 'trophy'
  | 'crown'
  | 'duel'
  | 'sun'
  | 'moon'
  | 'target'
  | 'pumpkin'
  | 'snow'
  | 'flower'
  | 'users';

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
  challenges: number;
  earlyTest: boolean;
  lateGame: boolean;
  weeklies: number;
}

interface TrophyDef {
  id: string;
  /** Nom et description dans la langue de l'interface (accesseurs : lus à l'affichage). */
  name: string;
  description: string;
  icon: TrophyIcon;
  /** Valeur actuelle et objectif ; un objectif de 1 sans compteur est un trophée « tout ou rien ». */
  value: (c: TrophyContext) => number;
  target: number;
  counter?: boolean;
  /** Trophée de saison : on ne le gagne que pendant sa fenêtre. */
  season?: SeasonId;
}

const t = (
  id: string,
  name: Bilingual,
  description: Bilingual,
  icon: TrophyIcon,
  value: TrophyDef['value'],
  target = 1,
  counter = target > 1,
): TrophyDef => ({
  id,
  get name() {
    return tr(...name);
  },
  get description() {
    return tr(...description);
  },
  icon,
  value,
  target,
  counter,
});

const has = (condition: boolean) => (condition ? 1 : 0);
const SEASON_ICONS: Record<SeasonId, TrophyIcon> = { halloween: 'pumpkin', noel: 'snow', printemps: 'flower', ete: 'sun' };
const medalsAtLeast = (c: TrophyContext, medal: Medal) => c.medals.filter((m) => medalRank(m) >= medalRank(medal)).length;

/** Trophée de saison : ses textes viennent de la saison (déjà dans les deux langues). */
const seasonTrophy = (season: Season): TrophyDef => ({
  id: season.trophy.id,
  get name() {
    return season.trophy.name;
  },
  get description() {
    return season.trophy.description;
  },
  icon: SEASON_ICONS[season.id],
  value: (c) => seasonPlays(c.plays, season),
  target: SEASON_PLAYS,
  counter: SEASON_PLAYS > 1,
  season: season.id,
});

export const TROPHIES: readonly TrophyDef[] = [
  t('premiers-pas', ['Premiers pas', 'First Steps'], ['Terminer une première partie.', 'Finish your first game.'], 'check', (c) => c.plays.length),
  t('rendez-vous', ['Rendez-vous', 'Check-In'], ['Terminer un test du jour.', 'Finish a daily test.'], 'calendar', (c) => c.official.length),
  t('habitue', ['Habitué', 'Regular'], ['Terminer 10 tests du jour.', 'Finish 10 daily tests.'], 'calendar', (c) => c.official.length, 10),
  t('fidele', ['Fidèle', 'Faithful'], ['Terminer 50 tests du jour.', 'Finish 50 daily tests.'], 'calendar', (c) => c.official.length, 50),
  t('serie-3', ['Bon rythme', 'In the Groove'], ['Tenir une série de 3 jours.', 'Keep a 3-day streak.'], 'flame', (c) => c.streak, 3),
  t('serie-7', ['Une semaine pile', 'A Full Week'], ['Tenir une série de 7 jours.', 'Keep a 7-day streak.'], 'flame', (c) => c.streak, 7),
  t('serie-30', ['Un mois sans faille', 'A Flawless Month'], ['Tenir une série de 30 jours.', 'Keep a 30-day streak.'], 'flame', (c) => c.streak, 30),
  t('curieux', ['Curieux', 'Curious'], ['Essayer 12 jeux différents.', 'Try 12 different games.'], 'training', (c) => c.distinctGames, 12),
  t('touche-a-tout', ['Touche-à-tout', 'Jack of All Trades'], ['Essayer tous les jeux.', 'Try every game.'], 'training', (c) => c.distinctGames, GAME_ORDER.length),
  t('cent', ['Cent parties', 'A Hundred Games'], ['Jouer 100 parties.', 'Play 100 games.'], 'replay', (c) => c.plays.length, 100),
  t('infatigable', ['Infatigable', 'Tireless'], ['Jouer 500 parties.', 'Play 500 games.'], 'replay', (c) => c.plays.length, 500),
  t('sans-faute', ['Sans faute', 'Perfect Score'], ['Obtenir 100 points dans une partie.', 'Score 100 points in a game.'], 'star', (c) => c.perfects),
  t('perfection', ['Perfectionniste', 'Perfectionist'], ['Obtenir 100 points 25 fois.', 'Score 100 points 25 times.'], 'star', (c) => c.perfects, 25),
  t(
    'age-40',
    ['Esprit alerte', 'Alert Mind'],
    ['Atteindre un âge cérébral de 40 ans ou moins.', 'Reach a brain age of 40 or under.'],
    'spark',
    (c) => has(c.minAge !== null && c.minAge <= 40),
  ),
  t(
    'age-30',
    ['Esprit vif', 'Quick Mind'],
    ['Atteindre un âge cérébral de 30 ans ou moins.', 'Reach a brain age of 30 or under.'],
    'spark',
    (c) => has(c.minAge !== null && c.minAge <= 30),
  ),
  t('age-20', ['Au sommet', 'At the Top'], ['Atteindre l’âge cérébral de 20 ans.', 'Reach a brain age of 20.'], 'spark', (c) => has(c.minAge === 20)),
  t(
    'progres',
    ['En progrès', 'On the Rise'],
    ['Gagner 5 ans d’âge cérébral depuis ton premier test.', 'Take 5 years off your brain age since your first test.'],
    'progress',
    (c) => (c.firstAge !== null && c.minAge !== null ? c.firstAge - c.minAge : 0),
    5,
  ),
  t('etoiles-50', ['Pluie d’étoiles', 'Shower of Stars'], ['Gagner 50 étoiles.', 'Earn 50 stars.'], 'star', (c) => c.stars, 50),
  t('etoiles-250', ['Constellation', 'Constellation'], ['Gagner 250 étoiles.', 'Earn 250 stars.'], 'star', (c) => c.stars, 250),
  t('etoiles-1000', ['Voie lactée', 'Milky Way'], ['Gagner 1 000 étoiles.', 'Earn 1,000 stars.'], 'star', (c) => c.stars, 1000),
  t('bronze', ['Première médaille', 'First Medal'], ['Gagner une médaille de bronze.', 'Earn a bronze medal.'], 'medal', (c) => medalsAtLeast(c, 'bronze')),
  t('or', ['Médaille d’or', 'Gold Medal'], ['Gagner une médaille d’or.', 'Earn a gold medal.'], 'medal', (c) => medalsAtLeast(c, 'or')),
  t('platine', ['Platine', 'Platinum'], ['Gagner une médaille de platine.', 'Earn a platinum medal.'], 'medal', (c) => medalsAtLeast(c, 'platine')),
  t(
    'collection',
    ['Collectionneur', 'Collector'],
    ['Une médaille dans chaque jeu.', 'A medal in every game.'],
    'medal',
    (c) => medalsAtLeast(c, 'bronze'),
    GAME_ORDER.length,
  ),
  t('specialiste', ['Spécialiste', 'Specialist'], ['L’or dans tous les jeux d’un même domaine.', 'Gold in every game of one domain.'], 'trophy', (c) => has(c.domainGold)),
  t(
    'tout-en-haut',
    ['Tout en haut', 'Top of the Ladder'],
    ['Débloquer le niveau 20 d’un jeu.', 'Unlock level 20 in a game.'],
    'trophy',
    (c) => c.maxUnlocked,
    20,
    false,
  ),
  t(
    'sommet',
    ['Le sommet', 'The Summit'],
    ['Débloquer le niveau 50 d’un jeu.', 'Unlock level 50 in a game.'],
    'crown',
    (c) => c.maxUnlocked,
    MAX_LEVEL,
    false,
  ),
  t('diamant', ['Diamant', 'Diamond'], ['Gagner une médaille de diamant.', 'Earn a diamond medal.'], 'medal', (c) => medalsAtLeast(c, 'diamant')),
  t('legende', ['Légende vivante', 'Living Legend'], ['Gagner une médaille légende.', 'Earn a legend medal.'], 'medal', (c) => medalsAtLeast(c, 'legende')),
  t('niveau-10', ['Niveau 10', 'Level 10'], ['Atteindre le niveau 10 de joueur.', 'Reach player level 10.'], 'crown', (c) => c.rank, 10, false),
  t('niveau-25', ['Niveau 25', 'Level 25'], ['Atteindre le niveau 25 de joueur.', 'Reach player level 25.'], 'crown', (c) => c.rank, 25, false),
  t('niveau-50', ['Niveau 50', 'Level 50'], ['Atteindre le niveau 50 de joueur.', 'Reach player level 50.'], 'crown', (c) => c.rank, 50, false),
  t('seance', ['Séance complète', 'Session Complete'], ['Terminer une séance du jour.', 'Finish a daily session.'], 'training', (c) => c.sessions),
  t('assidu', ['Assidu', 'Dedicated'], ['Terminer 20 séances du jour.', 'Finish 20 daily sessions.'], 'training', (c) => c.sessions, 20),
  t('marathon', ['Marathonien', 'Marathoner'], ['Terminer un marathon.', 'Finish a marathon.'], 'flame', (c) => c.marathons),
  t('duel', ['Premier duel', 'First Duel'], ['Jouer un duel à deux.', 'Play a two-player duel.'], 'duel', (c) => c.duels),
  t('amies', ['Entre amies', 'Among Friends'], ['Relever un défi entre amies.', 'Take on a friend challenge.'], 'users', (c) => c.challenges),
  t('amies-10', ['La bande au complet', 'The Whole Gang'], ['Relever 10 défis entre amies.', 'Take on 10 friend challenges.'], 'users', (c) => c.challenges, 10),
  t('leve-tot', ['Lève-tôt', 'Early Bird'], ['Faire le test du jour avant 8 h.', 'Take the daily test before 8 a.m.'], 'sun', (c) => has(c.earlyTest)),
  t('nuit', ['Oiseau de nuit', 'Night Owl'], ['Jouer une partie après 23 h.', 'Play a game after 11 p.m.'], 'moon', (c) => has(c.lateGame)),
  t('defi', ['Défi relevé', 'Challenge Met'], ['Relever un défi de la semaine.', 'Complete a weekly challenge.'], 'target', (c) => c.weeklies),
  t('defis-5', ['Toujours partant', 'Always Game'], ['Relever 5 défis de la semaine.', 'Complete 5 weekly challenges.'], 'target', (c) => c.weeklies, 5),
  ...SEASONS.map(seasonTrophy),
];

export interface TrophyStatus {
  id: string;
  name: string;
  description: string;
  icon: TrophyIcon;
  unlocked: boolean;
  /** Compteur affichable (ex. 4 / 7), ou null pour un trophée « tout ou rien ». */
  progress: [number, number] | null;
  /** Trophée de saison : il ne se gagne que pendant sa fenêtre. */
  season?: SeasonId;
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
    challenges: input.challenges,
    earlyTest: official.some((test) => new Date(test.startedAt).getHours() < 8),
    lateGame: input.plays.some((p) => new Date(p.at).getHours() >= 23),
    weeklies: weekliesDone(input.plays, input.sessions),
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
      ...(def.season ? { season: def.season } : {}),
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
