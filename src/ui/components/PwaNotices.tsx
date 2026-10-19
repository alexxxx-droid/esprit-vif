import { useEffect } from 'react';
import { applyUpdate, dismissOfflineReady, usePwa } from '../pwa';
import { Icon } from './Icon';

/** Annonces discrètes du mode hors ligne : jamais pendant une partie. */
export function PwaNotices() {
  const { needRefresh, offlineReady } = usePwa();

  useEffect(() => {
    if (!offlineReady) return;
    const id = window.setTimeout(dismissOfflineReady, 4500);
    return () => window.clearTimeout(id);
  }, [offlineReady]);

  if (needRefresh) {
    return (
      <div className="toast toast--action" role="status">
        <span>Une nouvelle version d’Esprit Vif est prête.</span>
        <button type="button" className="btn btn--primary" onClick={() => void applyUpdate()}>
          <Icon name="replay" size={20} />
          Mettre à jour
        </button>
      </div>
    );
  }
  if (offlineReady) {
    return (
      <p className="toast" role="status">
        Esprit Vif fonctionne maintenant hors ligne.
      </p>
    );
  }
  return null;
}
