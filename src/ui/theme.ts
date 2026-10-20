import { useMemo, useSyncExternalStore } from 'react';
import { resolveTheme, type ResolvedTheme } from '../core/themes';
import { isPremium, subscribePremium } from '../premium/entitlement';
import { useToday } from './hooks';
import { useThemePreview } from './theme-preview';
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
  const preview = useThemePreview();
  // Un thème essayé s'applique comme s'il était débloqué, le temps de l'aperçu.
  return useMemo(
    () => (preview ? resolveTheme(preview, today, settings.seasonal, Infinity, true) : resolveTheme(settings.palette, today, settings.seasonal, rank.level, premium)),
    [preview, settings.palette, settings.seasonal, today, rank.level, premium],
  );
}
