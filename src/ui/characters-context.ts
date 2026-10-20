import { useContext, useSyncExternalStore } from 'react';
import type { CharacterId } from '../core/characters';
import type { HatId } from '../core/wardrobe';
import { ProfilesContext } from './profiles-context';
import { ProgressContext } from './progress-context';

const noSubscribe = () => () => {};

/** Le compagnon du joueur en cours (Vif quand il n'y a pas encore de profil). */
export function useActiveCharacter(): CharacterId {
  const manager = useContext(ProfilesContext);
  const state = useSyncExternalStore(manager?.subscribe ?? noSubscribe, () => manager?.getSnapshot() ?? null);
  return state?.active.character ?? 'vif';
}

/** Le chapeau que porte le compagnon du joueur en cours (null : aucun). */
export function useActiveHat(): HatId | null {
  const store = useContext(ProgressContext);
  const hat = useSyncExternalStore(store?.subscribe ?? noSubscribe, () => store?.getSnapshot().settings.hat ?? '');
  return hat || null;
}
