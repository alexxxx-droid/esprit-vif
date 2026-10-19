/**
 * Où se situe une partie par rapport aux précédentes du même jeu : sans serveur, on se compare
 * à soi-même. Une moyenne glissante sur les 10 dernières parties, un écart de 3 points tolérés.
 */

export type Comparison =
  | { kind: 'first' }
  | { kind: 'above' | 'level' | 'below'; diff: number; average: number; count: number };

export const COMPARE_WINDOW = 10;
export const COMPARE_TOLERANCE = 3;

/** `previous` : scores des parties précédentes, de la plus récente à la plus ancienne. */
export function compareToHistory(score: number, previous: readonly number[]): Comparison {
  const recent = previous.slice(0, COMPARE_WINDOW);
  if (recent.length === 0) return { kind: 'first' };
  const average = Math.round(recent.reduce((sum, s) => sum + s, 0) / recent.length);
  const diff = score - average;
  const kind = Math.abs(diff) <= COMPARE_TOLERANCE ? 'level' : diff > 0 ? 'above' : 'below';
  return { kind, diff, average, count: recent.length };
}
