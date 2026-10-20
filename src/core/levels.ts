import { formatDecimal, NBSP } from './format';
import { tr } from './lang';
import { clampLevel } from './scoring';

/** Nombre de niveaux de chaque jeu. */
export const MAX_LEVEL = 50;

/**
 * La maîtrise, après le niveau 50 : dix crans (niveaux 51 à 60, « Maîtrise I à X ») qui rejouent la
 * partie du niveau 50 en demandant toujours mieux (64 points pour I, puis 4 de plus à chaque cran,
 * 100 pour X), avec des fenêtres d'affichage un peu plus courtes dans les jeux chronométrés.
 */
export const MASTERY_LEVELS = 10;
export const TOP_LEVEL = MAX_LEVEL + MASTERY_LEVELS;

/** Les paliers de difficulté : cinq chapitres de dix niveaux (les tables des jeux), puis la maîtrise. */
export type TierId = 'debutant' | 'confirme' | 'expert' | 'maitre' | 'legende' | 'maitrise';

export const TIERS: readonly { id: TierId; from: number; to: number }[] = [
  { id: 'debutant', from: 1, to: 10 },
  { id: 'confirme', from: 11, to: 20 },
  { id: 'expert', from: 21, to: 30 },
  { id: 'maitre', from: 31, to: 40 },
  { id: 'legende', from: 41, to: 50 },
];

/** Le palier de maîtrise (niveaux 51 à 60), à part : il rejoue le niveau 50 au lieu d'avoir sa table. */
export const MASTERY_TIER = { id: 'maitrise' as TierId, from: MAX_LEVEL + 1, to: MAX_LEVEL + 10 };
export const ALL_TIERS: readonly { id: TierId; from: number; to: number }[] = [...TIERS, MASTERY_TIER];

export function tierOf(level: number): TierId {
  return (ALL_TIERS.find((t) => level >= t.from && level <= t.to) ?? ALL_TIERS[ALL_TIERS.length - 1]).id;
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
    case 'maitrise':
      return tr('Maîtrise', 'Mastery');
  }
}

export const isMastery = (level: number) => level > MAX_LEVEL;

/** Le cran de maîtrise d'un niveau (0 jusqu'au 50, puis 1 à 10). */
export function masteryRank(level: number): number {
  return Math.max(0, Math.min(MASTERY_LEVELS, Math.round(level) - MAX_LEVEL));
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/** « Maîtrise III » ; le chiffre seul (« III ») avec `short`. */
export function masteryName(level: number, short = false): string {
  const numeral = ROMAN[masteryRank(level)] ?? '';
  return short ? numeral : `${tierName('maitrise')} ${numeral}`;
}

/** Les fenêtres d'affichage raccourcissent de 2 % par cran de maîtrise (jusqu'à 20 % en Maîtrise X). */
export function masteryTempo(level: number): number {
  return 1 - 0.02 * masteryRank(level);
}

/** Le niveau dont la partie se joue : un cran de maîtrise rejoue le niveau 50. */
export function playedLevel(level: number): number {
  return Math.min(level, MAX_LEVEL);
}

/** Étoiles d'un niveau : 1 dès 60 pts (le niveau suivant se débloque), 2 dès 80, 3 dès 95. */
export const STAR_THRESHOLDS = [60, 80, 95] as const;
export const UNLOCK_SCORE = STAR_THRESHOLDS[0];

/** Score qui réussit un niveau (et ouvre le suivant) : la 1re étoile jusqu'au 50, puis 64, 68… 100 en maîtrise. */
export function passScore(level: number): number {
  return isMastery(level) ? UNLOCK_SCORE + 4 * masteryRank(level) : UNLOCK_SCORE;
}

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
