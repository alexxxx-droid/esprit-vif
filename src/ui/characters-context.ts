import { useContext, useSyncExternalStore } from 'react';
import type { CharacterId } from '../core/characters';
import { ProfilesContext } from './profiles-context';

const noSubscribe = () => () => {};

/** Le compagnon du joueur en cours (Vif quand il n'y a pas encore de profil). */
export function useActiveCharacter(): CharacterId {
  const manager = useContext(ProfilesContext);
  const state = useSyncExternalStore(manager?.subscribe ?? noSubscribe, () => manager?.getSnapshot() ?? null);
  return state?.active.character ?? 'vif';
}
