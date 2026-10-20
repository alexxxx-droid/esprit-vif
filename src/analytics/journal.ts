/**
 * Journal d'utilisation, gardé sur l'appareil et jamais envoyé (choix d'Alex, 20-10-2026 : aucun
 * SDK d'analytics, aucune collecte). Il sert à vérifier les parcours pendant les tests et pourra
 * être partagé à la main par un testeur volontaire (Réglages → Données). Les chiffres de rétention
 * et de conversion de l'ensemble des joueurs viennent de la Play Console (voir docs/METRIQUES.md).
 * Aucune donnée personnelle : ni prénom, ni contenu des parties, seulement des noms d'événements.
 */

export type EventName =
  | 'first_open'
  | 'first_game_done'
  | 'game_started'
  | 'game_done'
  | 'daily_test_started'
  | 'daily_test_done'
  | 'level_unlocked'
  | 'record'
  | 'objective_done'
  | 'premium_viewed'
  | 'purchase_started'
  | 'purchase_confirmed'
  | 'purchase_pending'
  | 'purchase_cancelled'
  | 'purchase_failed'
  | 'restore'
  | 'reminder_enabled';

/** Événements qui n'arrivent qu'une fois par appareil. */
const ONCE: readonly EventName[] = ['first_open', 'first_game_done'];

export type EventProps = Record<string, string | number | boolean>;

export interface JournalEntry {
  e: EventName;
  /** Horodatage ISO. */
  at: string;
  p?: EventProps;
}

const KEY = 'esprit-vif:journal';
/** Les plus anciens s'effacent au-delà : de quoi suivre des semaines de jeu sans grossir. */
export const JOURNAL_MAX = 500;

function read(): JournalEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is JournalEntry => typeof x?.e === 'string' && typeof x?.at === 'string') : [];
  } catch {
    return [];
  }
}

function write(entries: readonly JournalEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(-JOURNAL_MAX)));
  } catch {
    // Stockage indisponible : le journal n'est qu'un outil de suivi, l'appli n'en dépend pas.
  }
}

/** Note un événement (les événements « une fois » ne sont jamais notés deux fois). */
export function track(e: EventName, p?: EventProps, now = new Date()): void {
  const entries = read();
  if (ONCE.includes(e) && entries.some((x) => x.e === e)) return;
  write([...entries, { e, at: now.toISOString(), ...(p ? { p } : {}) }]);
}

export function readJournal(): JournalEntry[] {
  return read();
}

export function clearJournal(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Rien à effacer.
  }
}

export interface JournalSummary {
  total: number;
  firstOpen: string | null;
  /** Jours distincts où l'appli a servi (au moins une partie commencée). */
  activeDays: number;
  counts: Partial<Record<EventName, number>>;
}

export function summarize(entries: readonly JournalEntry[]): JournalSummary {
  const counts: Partial<Record<EventName, number>> = {};
  for (const x of entries) counts[x.e] = (counts[x.e] ?? 0) + 1;
  return {
    total: entries.length,
    firstOpen: entries.find((x) => x.e === 'first_open')?.at ?? null,
    activeDays: new Set(entries.filter((x) => x.e === 'game_started').map((x) => x.at.slice(0, 10))).size,
    counts,
  };
}
