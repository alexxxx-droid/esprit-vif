import { formatSeconds, plural } from './format';
import type { PlayOutcome, StatLine } from './types';

interface TimedResult {
  score: number;
  elapsedMs: number;
  errors: number;
  /** Pénalité ajoutée par erreur. */
  penaltyPerError: number;
  extraLines?: StatLine[];
  extraStats?: Record<string, number>;
}

/** Résultat d'un jeu « au temps + pénalités » (Calcul éclair, Couleurs piégées, Table de Schulte). */
export function timedOutcome({ score, elapsedMs, errors, penaltyPerError, extraLines = [], extraStats = {} }: TimedResult): PlayOutcome {
  const penaltyMs = errors * penaltyPerError;
  const totalMs = elapsedMs + penaltyMs;
  return {
    score,
    stats: { timeMs: Math.round(elapsedMs), errors, totalMs: Math.round(totalMs), ...extraStats },
    headline: `${formatSeconds(totalMs)} · ${plural(errors, 'erreur')}`,
    lines: [
      { label: 'Temps', value: formatSeconds(elapsedMs) },
      { label: 'Erreurs', value: errors ? `${errors} (+${formatSeconds(penaltyMs)})` : 'Aucune' },
      { label: 'Temps retenu', value: formatSeconds(totalMs) },
      ...extraLines,
    ],
  };
}

/** Mot d'encouragement selon le score : on félicite toujours, on ne culpabilise jamais. */
export function cheer(score: number): string {
  if (score >= 90) return 'Exceptionnel !';
  if (score >= 75) return 'Superbe partie !';
  if (score >= 55) return 'Très bien joué.';
  if (score >= 35) return 'Bien, ça vient !';
  return 'Chaque partie compte. On remet ça ?';
}
