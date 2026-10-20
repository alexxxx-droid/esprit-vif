import { useMemo } from 'react';
import { wardrobe, type Wardrobe } from '../core/wardrobe';
import { progressionInput } from '../store/progress';
import { useProgress } from './progress-context';
import { useProgression } from './progression';
import { usePremium } from './theme';

/** Le solde d'étincelles et les chapeaux du joueur, recalculés quand la progression change. */
export function useWardrobe(): Wardrobe {
  const data = useProgress();
  const { sparks } = useProgression();
  const premium = usePremium();
  return useMemo(() => wardrobe(progressionInput(data), data.extras.wardrobe, sparks, premium), [data, sparks, premium]);
}
