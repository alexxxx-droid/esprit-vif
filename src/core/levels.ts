import { formatDecimal, NBSP } from './format';
import { tr } from './lang';
import { clampLevel } from './scoring';

/** Nombre de niveaux de chaque jeu. */
export const MAX_LEVEL = 50;

/** Les paliers de difficulté : cinq chapitres de dix niveaux. */
export type TierId = 'debutant' | 'confirme' | 'expert' | 'maitre' | 'legende';

export const TIERS: readonly { id: TierId; from: number; to: number }[] = [
  { id: 'debutant', from: 1, to: 10 },
  { id: 'confirme', from: 11, to: 20 },
  { id: 'expert', from: 21, to: 30 },
  { id: 'maitre', from: 31, to: 40 },
  { id: 'legende', from: 41, to: 50 },
];

export function tierOf(level: number): TierId {
  return (TIERS.find((t) => level >= t.from && level <= t.to) ?? TIERS[TIERS.length - 1]).id;
}

/** Nom du palier, dans la langue de l'interface. */
export function tierName(tier: TierId): string {
  switch (tier) {
    case 'debutant':
      return tr('Débutant', 'Beginner');
    case 'confirme':
      return tr('Confirmé', 'Skilled');
    case 'expert':
      return tr('Expert', 'Expert');
    case 'maitre':
      return tr('Maître', 'Master');
    case 'legende':
      return tr('Légende', 'Legend');
  }
}

/** Étoiles d'un niveau : 1 dès 60 pts (le niveau suivant se débloque), 2 dès 80, 3 dès 95. */
export const STAR_THRESHOLDS = [60, 80, 95] as const;
export const UNLOCK_SCORE = STAR_THRESHOLDS[0];

export type Stars = 0 | 1 | 2 | 3;

export function starsFor(score: number): Stars {
  return STAR_THRESHOLDS.filter((threshold) => score >= threshold).length as Stars;
}

/** Configuration d'un niveau dans une table (une ligne par niveau). */
export function pickLevel<T>(table: readonly T[], level: number): T {
  return table[clampLevel(level, table.length) - 1];
}

/** 1500 → « 1,5 s », pour les libellés de niveau. */
export function secondsLabel(ms: number): string {
  return `${formatDecimal(ms / 1000)}${NBSP}s`;
}
