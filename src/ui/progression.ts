import { useMemo } from 'react';
import { progressionSummary, type ProgressionSummary } from '../core/progression';
import { progressionInput } from '../store/progress';
import { useProgress } from './progress-context';

/** Rang, étoiles et trophées du joueur, recalculés quand la progression change. */
export function useProgression(): ProgressionSummary {
  const data = useProgress();
  return useMemo(() => progressionSummary(progressionInput(data)), [data]);
}
