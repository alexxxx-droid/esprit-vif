import { useEffect, useSyncExternalStore } from 'react';
import { App } from '../App';
import { resolveLang, setLang } from '../core/lang';
import type { ProfileManager } from '../store/profiles';
import type { ProgressStore } from '../store/progress';
import { ProfilesContext } from './profiles-context';
import { ProgressContext } from './progress-context';

/** Le profil actif fournit sa progression ; changer de joueur repart d'un écran neuf. */
export function ProfilesRoot({ manager }: { manager: ProfileManager }) {
  const { active, store } = useSyncExternalStore(manager.subscribe, manager.getSnapshot);
  return (
    <ProfilesContext value={manager}>
      <ProgressContext value={store}>
        <LanguageRoot store={store} profileId={active.id} />
      </ProgressContext>
    </ProfilesContext>
  );
}

/**
 * La langue suit le réglage du joueur : elle est fixée avant de dessiner l'appli, qui repart
 * d'un écran neuf quand elle change (tous les textes se recalculent).
 */
function LanguageRoot({ store, profileId }: { store: ProgressStore; profileId: string }) {
  const choice = useSyncExternalStore(store.subscribe, () => store.getSnapshot().settings.language);
  const current = resolveLang(choice, navigator.language);
  setLang(current);
  useEffect(() => {
    document.documentElement.lang = current;
  }, [current]);
  return <App key={`${profileId}-${current}`} />;
}
