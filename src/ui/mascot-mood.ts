export type Mood = 'hello' | 'happy' | 'cheer' | 'think' | 'sleep' | 'wow' | 'gentle';

/** L'humeur de Vif selon un score : la fête au sommet, des encouragements quand ça coince. */
export function moodForScore(score: number): Mood {
  if (score >= 95) return 'cheer';
  if (score >= 70) return 'happy';
  if (score >= 45) return 'think';
  return 'gentle';
}
