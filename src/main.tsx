import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';
import './styles/game.css';
import './styles/filature.css';
import './styles/lucioles.css';
import './styles/contraires.css';
import './styles/meles.css';
import './styles/combien.css';
import './styles/code.css';
import './styles/miroir.css';
import './styles/echo.css';
import './styles/compte.css';
import './styles/suites.css';

import { Capacitor } from '@capacitor/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ProfileManager, type ProfileBackend } from './store/profiles';
import { createMemoryStorage, deleteIndexedDb, openIndexedDbStorage } from './store/storage';
import { ProfilesRoot } from './ui/ProfilesRoot';
import { setupPwa } from './ui/pwa';

const backend: ProfileBackend = {
  async open(name) {
    try {
      return await openIndexedDbStorage(name);
    } catch {
      // Navigation privée stricte, stockage bloqué… l'appli reste jouable, sans sauvegarde.
      return createMemoryStorage();
    }
  },
  async remove(name) {
    try {
      await deleteIndexedDb(name);
    } catch {
      // Base déjà absente : rien à faire.
    }
  },
};

async function boot() {
  if (Capacitor.isNativePlatform()) {
    const { setupNative } = await import('./native');
    await setupNative();
  } else {
    setupPwa();
  }
  const manager = await ProfileManager.open(backend);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ProfilesRoot manager={manager} />
    </StrictMode>,
  );
}

void boot();
