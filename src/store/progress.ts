import { dayKey, hasOfficialTest } from '../core/daily';
import { GAMES, isGameId } from '../core/games/registry';
import { adaptLevel, brainAge, clampLevel } from '../core/scoring';
import type { GameId, PlayMode, PlayOutcome } from '../core/types';
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
}

export type ThemeChoice = 'auto' | 'light' | 'dark';

export interface Settings {
  sound: boolean;
  vibration: boolean;
  voice: boolean;
  theme: ThemeChoice;
  reminder: boolean;
  /** Heure du rappel, « HH:MM ». */
  reminderTime: string;
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  vibration: true,
  voice: false,
  theme: 'auto',
  reminder: false,
  reminderTime: '18:30',
};

export interface ProgressData {
  plays: PlayRecord[];
  tests: TestRecord[];
  settings: Settings;
  games: Partial<Record<GameId, GameProgress>>;
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

export function gameLevel(data: ProgressData, gameId: GameId): number {
  return clampLevel(data.games[gameId]?.level ?? 1, GAMES[gameId].maxLevel);
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
    // Seul l'entraînement libre fait bouger le niveau : le test du jour reste à niveau fixe.
    const nextLevel = input.mode === 'free' ? adaptLevel(level, play.score, meta.maxLevel) : progress.level;
    const updated: GameProgress = {
      level: nextLevel,
      bests: record
        ? { ...progress.bests, [level]: { score: play.score, headline: play.headline, day: play.day } }
        : progress.bests,
    };
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
    if (!current) throw new Error('Test introuvable');
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

  async updateSettings(patch: Partial<Settings>): Promise<void> {
    const settings = { ...this.data.settings, ...patch };
    await this.storage.setKv('settings', settings);
    this.commit({ ...this.data, settings });
  }

  exportJson(now = new Date()): string {
    const { plays, tests, settings, games } = this.data;
    return JSON.stringify(
      { app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt: now.toISOString(), plays, tests, settings, games },
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
  return { plays: data.plays, tests: data.tests, kv: { settings: data.settings, games: data.games } };
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
  const games: Partial<Record<GameId, GameProgress>> = {};
  if (isObject(raw.kv.games)) {
    for (const [id, value] of Object.entries(raw.kv.games)) {
      if (isGameId(id) && isObject(value) && isObject(value.bests)) {
        games[id] = { level: Number(value.level) || 1, bests: value.bests as Record<string, BestRecord> };
      }
    }
  }
  return {
    plays: raw.plays.filter(isPlay).sort((a, b) => a.at.localeCompare(b.at)),
    tests: raw.tests.filter(isTest),
    settings,
    games,
  };
}

export function parseBackup(text: string): ProgressData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Ce fichier n’est pas une sauvegarde lisible.');
  }
  if (!isObject(parsed) || parsed.app !== BACKUP_APP) {
    throw new Error('Ce fichier ne vient pas d’Esprit Vif.');
  }
  if (typeof parsed.format !== 'number' || parsed.format > BACKUP_FORMAT) {
    throw new Error('Cette sauvegarde vient d’une version plus récente de l’appli.');
  }
  if (!Array.isArray(parsed.plays) || !Array.isArray(parsed.tests)) {
    throw new Error('Cette sauvegarde est incomplète.');
  }
  return normalize({ plays: parsed.plays, tests: parsed.tests, kv: { settings: parsed.settings, games: parsed.games } });
}
