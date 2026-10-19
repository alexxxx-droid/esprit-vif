import { mergeResults, type ChallengeLink, type FriendResult } from '../core/challenges';
import { tr, type LangChoice } from '../core/lang';
import { dayKey, hasOfficialTest } from '../core/daily';
import { DOMAIN_ORDER, GAMES, isGameId } from '../core/games/registry';
import { unlockedLevel, type ProgressionInput } from '../core/progression';
import { adaptLevel, brainAge, clampLevel } from '../core/scoring';
import type { Domain, GameId, PlayMode, PlayOutcome } from '../core/types';
import type { Storage, StoredData } from './storage';

export interface PlayRecord {
  id: string;
  gameId: GameId;
  level: number;
  mode: PlayMode;
  seed: number;
  score: number;
  stats: Record<string, number>;
  headline: string;
  /** Horodatage ISO de la fin de partie. */
  at: string;
  /** Jour local (AAAA-MM-JJ). */
  day: string;
  testId?: string;
}

export interface TestGameResult {
  gameId: GameId;
  playId: string;
  score: number;
}

export interface TestRecord {
  id: string;
  day: string;
  startedAt: string;
  finishedAt?: string;
  /** Le premier test terminé de la journée est officiel ; les suivants sont de l'entraînement. */
  official: boolean;
  games: GameId[];
  results: TestGameResult[];
  brainAge?: number;
  done: boolean;
}

export interface BestRecord {
  score: number;
  headline: string;
  day: string;
}

export interface GameProgress {
  level: number;
  /** Meilleur score par niveau. */
  bests: Record<string, BestRecord>;
  /** Niveau de départ donné par le bilan : les niveaux jusqu'à lui sont ouverts d'emblée. */
  start?: number;
}

export type ThemeChoice = 'auto' | 'light' | 'dark';
export type TextSize = 'normal' | 'large' | 'xlarge';

export interface Settings {
  sound: boolean;
  vibration: boolean;
  voice: boolean;
  theme: ThemeChoice;
  reminder: boolean;
  /** Heure du rappel, « HH:MM ». */
  reminderTime: string;
  /** Accueil du premier lancement passé (ou écarté). */
  onboarded: boolean;
  /** Niveaux de départ déjà placés par le bilan. */
  placementDone: boolean;
  /** Domaines que le joueur veut travailler en priorité (3 au plus). */
  goals: Domain[];
  /** Accessibilité : taille du texte, contraste, temps, main, animations. */
  textSize: TextSize;
  highContrast: boolean;
  generousTime: boolean;
  leftHanded: boolean;
  reduceMotion: boolean;
  /** Musique d'ambiance pendant les parties, et volumes (0 à 1). */
  music: boolean;
  musicVolume: number;
  effectsVolume: number;
  /** Décorations de saison (Halloween, Noël…) et accessoires des compagnons. */
  seasonal: boolean;
  /** Jeux de nombres : écrire la réponse au doigt plutôt que toucher le pavé. */
  handwriting: boolean;
  /** Langue de l'interface (« auto » : celle du téléphone). */
  language: LangChoice;
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  vibration: true,
  voice: false,
  theme: 'auto',
  reminder: false,
  reminderTime: '18:30',
  onboarded: false,
  placementDone: false,
  goals: [],
  textSize: 'normal',
  highContrast: false,
  generousTime: false,
  leftHanded: false,
  reduceMotion: false,
  music: true,
  musicVolume: 0.5,
  effectsVolume: 0.9,
  seasonal: true,
  handwriting: false,
  language: 'auto',
};

export interface MarathonRecord {
  best: number;
  count: number;
}

/** Ce qui ne se déduit pas des parties : séances du jour terminées, marathons, duels. */
export interface Extras {
  /** Jours où la séance du jour a été terminée. */
  sessions: string[];
  marathons: Partial<Record<Domain, MarathonRecord>>;
  duels: number;
  /** Défis entre amies : les parties (graine, niveau, jeux) et les scores reçus ou joués ici. */
  challenges: ChallengeInfo[];
  friends: FriendResult[];
}

export type ChallengeInfo = Omit<ChallengeLink, 'scores'>;

/** Assez pour des mois de défis, sans laisser grossir la base indéfiniment. */
const MAX_CHALLENGES = 60;

export const EMPTY_EXTRAS: Extras = { sessions: [], marathons: {}, duels: 0, challenges: [], friends: [] };

export interface ProgressData {
  plays: PlayRecord[];
  tests: TestRecord[];
  settings: Settings;
  games: Partial<Record<GameId, GameProgress>>;
  extras: Extras;
}

export type RecordKind = 'first' | 'new' | null;

export interface SavedPlay {
  play: PlayRecord;
  record: RecordKind;
  previousBest: BestRecord | null;
  nextLevel: number;
}

export interface PlayInput {
  gameId: GameId;
  level: number;
  mode: PlayMode;
  seed: number;
  outcome: PlayOutcome;
  testId?: string;
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Niveau conseillé pour la prochaine partie (jamais au-delà du dernier niveau débloqué). */
export function gameLevel(data: ProgressData, gameId: GameId): number {
  const progress = data.games[gameId];
  return Math.min(clampLevel(progress?.level ?? progress?.start ?? 1, GAMES[gameId].maxLevel), gameUnlocked(data, gameId));
}

/** Dernier niveau débloqué d'un jeu (par les étoiles, ou d'emblée par le bilan de départ). */
export function gameUnlocked(data: ProgressData, gameId: GameId): number {
  const progress = data.games[gameId];
  return Math.min(GAMES[gameId].maxLevel, Math.max(unlockedLevel(progress?.bests), progress?.start ?? 1));
}

/** Données utiles au calcul de la progression (XP, rang, trophées). */
export function progressionInput(data: ProgressData): ProgressionInput {
  const bests: ProgressionInput['bests'] = {};
  for (const [id, progress] of Object.entries(data.games)) bests[id as GameId] = progress.bests;
  return {
    plays: data.plays,
    tests: data.tests,
    bests,
    sessions: data.extras.sessions,
    marathons: Object.values(data.extras.marathons).reduce((sum, m) => sum + (m?.count ?? 0), 0),
    duels: data.extras.duels,
    challenges: new Set(data.extras.friends.filter((r) => r.me).map((r) => r.challenge)).size,
  };
}

export function bestFor(data: ProgressData, gameId: GameId, level: number): BestRecord | null {
  return data.games[gameId]?.bests[level] ?? null;
}

/** Test du jour commencé mais pas terminé. */
export function testInProgress(data: ProgressData, day: string): TestRecord | null {
  return data.tests.find((t) => !t.done && t.day === day) ?? null;
}

/** Meilleur score d'un jeu, tous niveaux confondus. */
export function bestOverall(data: ProgressData, gameId: GameId): (BestRecord & { level: number }) | null {
  let best: (BestRecord & { level: number }) | null = null;
  for (const [level, record] of Object.entries(data.games[gameId]?.bests ?? {})) {
    if (!best || record.score > best.score || (record.score === best.score && Number(level) > best.level)) {
      best = { ...record, level: Number(level) };
    }
  }
  return best;
}

export function officialTests(data: ProgressData): TestRecord[] {
  return data.tests.filter((t) => t.done && t.official).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

const BACKUP_APP = 'esprit-vif';
const BACKUP_FORMAT = 1;

/**
 * Source de vérité de la progression : un instantané immuable en mémoire,
 * recopié à chaque changement dans le stockage local.
 */
export class ProgressStore {
  private data: ProgressData;
  private readonly listeners = new Set<() => void>();
  private readonly storage: Storage;

  private constructor(storage: Storage, data: ProgressData) {
    this.storage = storage;
    this.data = data;
  }

  static async load(storage: Storage): Promise<ProgressStore> {
    return new ProgressStore(storage, normalize(await storage.readAll()));
  }

  get persistent(): boolean {
    return this.storage.persistent;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): ProgressData => this.data;

  private commit(next: ProgressData) {
    this.data = next;
    for (const listener of this.listeners) listener();
  }

  async recordPlay(input: PlayInput, now = new Date()): Promise<SavedPlay> {
    const meta = GAMES[input.gameId];
    const level = clampLevel(input.level, meta.maxLevel);
    const play: PlayRecord = {
      id: newId(),
      gameId: input.gameId,
      level,
      mode: input.mode,
      seed: input.seed,
      score: input.outcome.score,
      stats: input.outcome.stats,
      headline: input.outcome.headline,
      at: now.toISOString(),
      day: dayKey(now),
      ...(input.testId ? { testId: input.testId } : {}),
    };

    const progress = this.data.games[input.gameId] ?? { level: 1, bests: {} };
    const previousBest = progress.bests[level] ?? null;
    const record: RecordKind = !previousBest ? 'first' : play.score > previousBest.score ? 'new' : null;
    const bests = record
      ? { ...progress.bests, [level]: { score: play.score, headline: play.headline, day: play.day } }
      : progress.bests;
    // Seul l'entraînement libre fait bouger le niveau : le test du jour reste à niveau fixe.
    const unlocked = Math.max(unlockedLevel(bests), progress.start ?? 1);
    const nextLevel = input.mode === 'free' ? Math.min(adaptLevel(level, play.score, meta.maxLevel), unlocked) : progress.level;
    const updated: GameProgress = { level: nextLevel, bests, ...(progress.start ? { start: progress.start } : {}) };
    const games = { ...this.data.games, [input.gameId]: updated };

    await this.storage.put('plays', play);
    await this.storage.setKv('games', games);
    this.commit({ ...this.data, plays: [...this.data.plays, play], games });
    return { play, record, previousBest, nextLevel };
  }

  /** Démarre un test du jour ; il n'est officiel que si aucun test officiel n'a été terminé aujourd'hui. */
  async startTest(games: GameId[], now = new Date()): Promise<TestRecord> {
    const day = dayKey(now);
    const abandoned = this.data.tests.filter((t) => !t.done);
    for (const t of abandoned) await this.storage.remove('tests', t.id);

    const test: TestRecord = {
      id: newId(),
      day,
      startedAt: now.toISOString(),
      official: !hasOfficialTest(this.data.tests, day),
      games,
      results: [],
      done: false,
    };
    await this.storage.put('tests', test);
    this.commit({ ...this.data, tests: [...this.data.tests.filter((t) => t.done), test] });
    return test;
  }

  /** Ajoute le résultat d'un jeu au test ; le test se termine avec son dernier jeu. */
  async addTestResult(testId: string, play: PlayRecord, now = new Date()): Promise<TestRecord> {
    const current = this.data.tests.find((t) => t.id === testId);
    if (!current) throw new Error(tr('Test introuvable', 'Test not found'));
    const results = [
      ...current.results.filter((r) => r.gameId !== play.gameId),
      { gameId: play.gameId, playId: play.id, score: play.score },
    ];
    const done = current.games.every((g) => results.some((r) => r.gameId === g));
    const others = this.data.tests.filter((t) => t.id !== testId);
    const test: TestRecord = {
      ...current,
      results,
      done,
      ...(done
        ? {
            finishedAt: now.toISOString(),
            brainAge: brainAge(results.map((r) => r.score)),
            official: current.official && !hasOfficialTest(others, current.day),
          }
        : {}),
    };
    await this.storage.put('tests', test);
    this.commit({ ...this.data, tests: [...others, test] });
    return test;
  }

  private async saveExtras(extras: Extras) {
    await this.storage.setKv('extras', extras);
    this.commit({ ...this.data, extras });
  }

  /** Séance du jour terminée (une fois par jour). */
  async completeSession(day: string): Promise<void> {
    if (this.data.extras.sessions.includes(day)) return;
    await this.saveExtras({ ...this.data.extras, sessions: [...this.data.extras.sessions, day] });
  }

  /** Marathon terminé : renvoie vrai si c'est un nouveau record pour ce domaine. */
  async recordMarathon(domain: Domain, total: number): Promise<boolean> {
    const previous = this.data.extras.marathons[domain];
    const isRecord = !previous || total > previous.best;
    await this.saveExtras({
      ...this.data.extras,
      marathons: {
        ...this.data.extras.marathons,
        [domain]: { best: Math.max(previous?.best ?? 0, total), count: (previous?.count ?? 0) + 1 },
      },
    });
    return isRecord;
  }

  async recordDuel(): Promise<void> {
    await this.saveExtras({ ...this.data.extras, duels: this.data.extras.duels + 1 });
  }

  /** Défi entre amies : garde la partie et ses résultats (les plus anciens défis s'effacent au-delà de 60). */
  async recordChallenge(link: ChallengeLink, results: readonly FriendResult[]): Promise<void> {
    // Une réponse reçue garde la fiche d'origine (qui a lancé le défi) ; elle remonte seulement en tête.
    const info: ChallengeInfo = this.data.extras.challenges.find((c) => c.id === link.id) ?? {
      id: link.id,
      seed: link.seed,
      level: link.level,
      games: link.games,
      from: link.from,
      day: link.day,
    };
    const challenges = [...this.data.extras.challenges.filter((c) => c.id !== info.id), info].slice(-MAX_CHALLENGES);
    const kept = new Set(challenges.map((c) => c.id));
    const friends = mergeResults(this.data.extras.friends, results).filter((r) => kept.has(r.challenge));
    await this.saveExtras({ ...this.data.extras, challenges, friends });
  }

  /** Bilan de départ : ouvre d'emblée les premiers niveaux des jeux où le joueur est déjà à l'aise. */
  async placeLevels(starts: Partial<Record<GameId, number>>): Promise<void> {
    const games = { ...this.data.games };
    for (const [id, start] of Object.entries(starts) as [GameId, number][]) {
      const current = games[id] ?? { level: 1, bests: {} };
      const placed = clampLevel(Math.max(current.start ?? 1, start), GAMES[id].maxLevel);
      games[id] = { ...current, start: placed, level: Math.max(current.level, placed) };
    }
    await this.storage.setKv('games', games);
    this.commit({ ...this.data, games });
  }

  async updateSettings(patch: Partial<Settings>): Promise<void> {
    const settings = { ...this.data.settings, ...patch };
    await this.storage.setKv('settings', settings);
    this.commit({ ...this.data, settings });
  }

  exportJson(now = new Date()): string {
    const { plays, tests, settings, games, extras } = this.data;
    return JSON.stringify(
      { app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt: now.toISOString(), plays, tests, settings, games, extras },
      null,
      2,
    );
  }

  /** Remplace toute la progression par une sauvegarde exportée auparavant. */
  async importJson(text: string): Promise<void> {
    const next = parseBackup(text);
    await this.storage.replaceAll(toStored(next));
    this.commit(next);
  }

  async reset(): Promise<void> {
    const next = normalize({ plays: [], tests: [], kv: { settings: this.data.settings } });
    await this.storage.replaceAll(toStored(next));
    this.commit(next);
  }
}

function toStored(data: ProgressData): StoredData {
  return { plays: data.plays, tests: data.tests, kv: { settings: data.settings, games: data.games, extras: data.extras } };
}

function normalizeExtras(raw: unknown): Extras {
  if (!isObject(raw)) return { ...EMPTY_EXTRAS };
  const marathons: Extras['marathons'] = {};
  if (isObject(raw.marathons)) {
    for (const domain of DOMAIN_ORDER) {
      const m = raw.marathons[domain];
      if (isObject(m)) marathons[domain] = { best: Number(m.best) || 0, count: Number(m.count) || 0 };
    }
  }
  return {
    sessions: Array.isArray(raw.sessions) ? raw.sessions.filter((d): d is string => typeof d === 'string') : [],
    marathons,
    duels: Number(raw.duels) || 0,
    challenges: Array.isArray(raw.challenges) ? raw.challenges.filter(isChallengeInfo) : [],
    friends: Array.isArray(raw.friends) ? raw.friends.filter(isFriendResult) : [],
  };
}

function isChallengeInfo(v: unknown): v is ChallengeInfo {
  return (
    isObject(v) &&
    typeof v.id === 'string' &&
    Number.isInteger(v.seed) &&
    Number.isInteger(v.level) &&
    typeof v.from === 'string' &&
    typeof v.day === 'string' &&
    Array.isArray(v.games) &&
    v.games.every((g) => typeof g === 'string' && isGameId(g))
  );
}

function isFriendResult(v: unknown): v is FriendResult {
  return (
    isObject(v) &&
    typeof v.challenge === 'string' &&
    typeof v.name === 'string' &&
    typeof v.me === 'boolean' &&
    typeof v.gameId === 'string' &&
    isGameId(v.gameId) &&
    Number.isInteger(v.score) &&
    typeof v.day === 'string'
  );
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function isPlay(v: unknown): v is PlayRecord {
  return (
    isObject(v) &&
    typeof v.id === 'string' &&
    typeof v.gameId === 'string' &&
    isGameId(v.gameId) &&
    typeof v.score === 'number' &&
    typeof v.at === 'string' &&
    typeof v.day === 'string'
  );
}

function isTest(v: unknown): v is TestRecord {
  return (
    isObject(v) &&
    typeof v.id === 'string' &&
    typeof v.day === 'string' &&
    typeof v.startedAt === 'string' &&
    Array.isArray(v.games) &&
    Array.isArray(v.results)
  );
}

/** Remet d'aplomb des données lues (stockage ou sauvegarde) : tout ce qui est illisible est écarté. */
function normalize(raw: StoredData): ProgressData {
  const settings = isObject(raw.kv.settings) ? { ...DEFAULT_SETTINGS, ...raw.kv.settings } : { ...DEFAULT_SETTINGS };
  settings.goals = Array.isArray(settings.goals) ? settings.goals.filter((d): d is Domain => DOMAIN_ORDER.includes(d as Domain)).slice(0, 3) : [];
  if (!['auto', 'fr', 'en'].includes(settings.language)) settings.language = 'auto';
  const games: Partial<Record<GameId, GameProgress>> = {};
  if (isObject(raw.kv.games)) {
    for (const [id, value] of Object.entries(raw.kv.games)) {
      if (isGameId(id) && isObject(value) && isObject(value.bests)) {
        const start = Number(value.start);
        games[id] = {
          level: Number(value.level) || 1,
          bests: value.bests as Record<string, BestRecord>,
          ...(Number.isInteger(start) && start > 1 ? { start } : {}),
        };
      }
    }
  }
  return {
    plays: raw.plays.filter(isPlay).sort((a, b) => a.at.localeCompare(b.at)),
    tests: raw.tests.filter(isTest),
    settings,
    games,
    extras: normalizeExtras(raw.kv.extras),
  };
}

export function parseBackup(text: string): ProgressData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(tr('Ce fichier n’est pas une sauvegarde lisible.', 'This file isn’t a readable backup.'));
  }
  if (!isObject(parsed) || parsed.app !== BACKUP_APP) {
    throw new Error(tr('Ce fichier ne vient pas d’Esprit Vif.', 'This file doesn’t come from Esprit Vif.'));
  }
  if (typeof parsed.format !== 'number' || parsed.format > BACKUP_FORMAT) {
    throw new Error(tr('Cette sauvegarde vient d’une version plus récente de l’appli.', 'This backup comes from a newer version of the app.'));
  }
  if (!Array.isArray(parsed.plays) || !Array.isArray(parsed.tests)) {
    throw new Error(tr('Cette sauvegarde est incomplète.', 'This backup is incomplete.'));
  }
  return normalize({
    plays: parsed.plays,
    tests: parsed.tests,
    kv: { settings: parsed.settings, games: parsed.games, extras: parsed.extras },
  });
}
