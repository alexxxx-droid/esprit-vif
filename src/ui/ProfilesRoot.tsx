import { useSyncExternalStore } from 'react';
import { App } from '../App';
import type { ProfileManager } from '../store/profiles';
import { ProfilesContext } from './profiles-context';
import { ProgressContext } from './progress-context';

/** Le profil actif fournit sa progression ; changer de joueur repart d'un écran neuf. */
export function ProfilesRoot({ manager }: { manager: ProfileManager }) {
  const { active, store } = useSyncExternalStore(manager.subscribe, manager.getSnapshot);
  return (
    <ProfilesContext value={manager}>
      <ProgressContext value={store}>
        <App key={active.id} />
      </ProgressContext>
    </ProfilesContext>
  );
}
