import { useEffect } from 'react';
import { tr } from '../../core/lang';
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
        <span>{tr('Une nouvelle version d’Esprit Vif est prête.', 'A new version of Esprit Vif is ready.')}</span>
        <button type="button" className="btn btn--primary" onClick={() => void applyUpdate()}>
          <Icon name="replay" size={20} />
          {tr('Mettre à jour', 'Update')}
        </button>
      </div>
    );
  }
  if (offlineReady) {
    return (
      <p className="toast" role="status">
        <Icon name="check" size={18} strokeWidth={3} />
        {tr('Prêt à jouer hors ligne', 'Ready to play offline')}
      </p>
    );
  }
  return null;
}
