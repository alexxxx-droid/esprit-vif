import { formatSeconds, plural } from './format';
import { tr } from './lang';
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
    headline: `${formatSeconds(totalMs)} · ${tr(plural(errors, 'erreur'), plural(errors, 'error'))}`,
    lines: [
      { label: tr('Temps', 'Time'), value: formatSeconds(elapsedMs) },
      { label: tr('Erreurs', 'Errors'), value: errors ? `${errors} (+${formatSeconds(penaltyMs)})` : tr('Aucune', 'None') },
      { label: tr('Temps retenu', 'Final time'), value: formatSeconds(totalMs) },
      ...extraLines,
    ],
  };
}

/** Mot d'encouragement selon le score : on félicite toujours, on ne culpabilise jamais. */
export function cheer(score: number): string {
  if (score >= 90) return tr('Exceptionnel !', 'Outstanding!');
  if (score >= 75) return tr('Superbe partie !', 'Great game!');
  if (score >= 55) return tr('Très bien joué.', 'Very well played.');
  if (score >= 35) return tr('Bien, ça vient !', 'Nice, you’re getting there!');
  return tr('Chaque partie compte. On remet ça ?', 'Every game counts. Play again?');
}
