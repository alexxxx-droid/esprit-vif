import type { Domain, GameId } from '../types';

export interface DomainMeta {
  name: string;
}

export const DOMAINS: Record<Domain, DomainMeta> = {
  calcul: { name: 'Calcul' },
  memoire: { name: 'Mémoire' },
  attention: { name: 'Attention' },
  vitesse: { name: 'Vitesse' },
  langage: { name: 'Langage' },
};

export const DOMAIN_ORDER: readonly Domain[] = ['calcul', 'memoire', 'attention', 'vitesse', 'langage'];

export interface GameMeta {
  id: GameId;
  name: string;
  domain: Domain;
  /** La règle en une phrase, affichée à l'intro. */
  rule: (level: number) => string;
  /** Durée indicative d'une partie. */
  duration: string;
  maxLevel: number;
  /** Niveau imposé au test du jour, pour que les résultats restent comparables. */
  dailyLevel: number;
  /** Ce que change le niveau, en quelques mots. */
  levelLabel: (level: number) => string;
}

export const GAMES: Record<GameId, GameMeta> = {
  calcul: {
    id: 'calcul',
    name: 'Calcul éclair',
    domain: 'calcul',
    rule: () => 'Résous 20 calculs le plus vite possible : ta réponse se valide toute seule.',
    duration: '≈ 40 s',
    maxLevel: 3,
    dailyLevel: 1,
    levelLabel: (level) =>
      ['Tables à un chiffre', 'Deux chiffres et divisions', 'Jusqu’à 100, tables de 12'][level - 1] ?? '',
  },
  stroop: {
    id: 'stroop',
    name: 'Couleurs piégées',
    domain: 'attention',
    rule: () => 'Touche la couleur de l’encre, pas celle du mot écrit.',
    duration: '≈ 30 s',
    maxLevel: 3,
    dailyLevel: 1,
    levelLabel: (level) =>
      ['Boutons fixes', 'Boutons qui changent de place', 'Boutons piégés eux aussi'][level - 1] ?? '',
  },
  schulte: {
    id: 'schulte',
    name: 'Table de Schulte',
    domain: 'vitesse',
    rule: (level) => `Touche les nombres de 1 à ${level === 1 ? 25 : 36} dans l’ordre, le plus vite possible.`,
    duration: '≈ 30 s',
    maxLevel: 3,
    dailyLevel: 1,
    levelLabel: (level) => ['Grille 5 × 5', 'Grille 6 × 6', 'Grille 6 × 6 brouillée'][level - 1] ?? '',
  },
};

/** Ordre d'affichage dans l'entraînement. */
export const GAME_ORDER: readonly GameId[] = ['calcul', 'stroop', 'schulte'];

/** Jeux qui tournent sur le 3e emplacement du test du jour. */
export const DAILY_ROTATION: readonly GameId[] = ['schulte'];

export function isGameId(value: string): value is GameId {
  return Object.hasOwn(GAMES, value);
}
