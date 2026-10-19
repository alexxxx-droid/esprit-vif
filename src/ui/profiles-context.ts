import { createContext, useContext, useSyncExternalStore } from 'react';
import type { ProfileManager, ProfilesState } from '../store/profiles';

export const ProfilesContext = createContext<ProfileManager | null>(null);

export function useProfileManager(): ProfileManager {
  const manager = useContext(ProfilesContext);
  if (!manager) throw new Error('ProfilesContext manquant');
  return manager;
}

/** Les joueurs de l'appareil et celui qui joue en ce moment. */
export function useProfiles(): ProfilesState {
  const manager = useProfileManager();
  return useSyncExternalStore(manager.subscribe, manager.getSnapshot);
}
