import { useMemo, useSyncExternalStore } from 'react';
import { resolveTheme, type ResolvedTheme } from '../core/themes';
import { isPremium, subscribePremium } from '../premium/entitlement';
import { useToday } from './hooks';
import { useProgress } from './progress-context';
import { useProgression } from './progression';

/** Le joueur a-t-il Esprit Vif Premium sur cet appareil ? */
export function usePremium(): boolean {
  return useSyncExternalStore(subscribePremium, isPremium, () => false);
}

/** Le thème appliqué : celui choisi s'il est débloqué, sinon celui de la saison (ou le classique). */
export function useResolvedTheme(): ResolvedTheme {
  const { settings } = useProgress();
  const { rank } = useProgression();
  const premium = usePremium();
  const today = useToday();
  return useMemo(
    () => resolveTheme(settings.palette, today, settings.seasonal, rank.level, premium),
    [settings.palette, settings.seasonal, today, rank.level, premium],
  );
}
