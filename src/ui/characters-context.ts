import { useContext, useSyncExternalStore } from 'react';
import { shownCharacter, type CharacterId } from '../core/characters';
import { isAuraId, type AuraId } from '../core/progression';
import { hatWearable, type WornHat } from '../core/wardrobe';
import { isPremium, subscribePremium } from '../premium/entitlement';
import { ProfilesContext } from './profiles-context';
import { ProgressContext } from './progress-context';

const noSubscribe = () => () => {};

const usePremiumFlag = () => useSyncExternalStore(subscribePremium, isPremium, () => false);

/** Le compagnon du joueur en cours (Vif quand il n'y a pas encore de profil, ou un compagnon Premium sans Premium). */
export function useActiveCharacter(): CharacterId {
  const manager = useContext(ProfilesContext);
  const state = useSyncExternalStore(manager?.subscribe ?? noSubscribe, () => manager?.getSnapshot() ?? null);
  return shownCharacter(state?.active.character ?? 'vif', usePremiumFlag());
}

/** Le chapeau que porte le compagnon du joueur en cours (null : aucun). */
export function useActiveHat(): WornHat | null {
  const store = useContext(ProgressContext);
  const hat = useSyncExternalStore(store?.subscribe ?? noSubscribe, () => store?.getSnapshot().settings.hat ?? '');
  const premium = usePremiumFlag();
  return hat && hatWearable(hat, premium) ? hat : null;
}

/** L'aura de Vif choisie par le joueur en cours (gagnée aux grands niveaux de joueur). */
export function useActiveAura(): AuraId | null {
  const store = useContext(ProgressContext);
  const aura = useSyncExternalStore(store?.subscribe ?? noSubscribe, () => store?.getSnapshot().settings.aura ?? '');
  return isAuraId(aura) ? aura : null;
}
