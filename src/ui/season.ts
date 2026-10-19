import { useContext, useSyncExternalStore } from 'react';
import { seasonOf, type Season } from '../core/events';
import { useToday } from './hooks';
import { ProgressContext } from './progress-context';

const noSubscribe = () => () => {};

/** La saison en cours, si le joueur garde les thèmes de saison (réglage « Apparence »). */
export function useSeason(): Season | null {
  const store = useContext(ProgressContext);
  const data = useSyncExternalStore(store?.subscribe ?? noSubscribe, () => store?.getSnapshot() ?? null);
  const today = useToday();
  if (data && !data.settings.seasonal) return null;
  return seasonOf(today);
}
