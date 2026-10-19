import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';
import './styles/game.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ProgressStore } from './store/progress';
import { createMemoryStorage, openIndexedDbStorage, type Storage } from './store/storage';
import { platform } from './ui/platform';
import { ProgressContext } from './ui/progress-context';
import { setupPwa } from './ui/pwa';

async function openStorage(): Promise<Storage> {
  try {
    return await openIndexedDbStorage();
  } catch {
    // Navigation privée stricte, stockage bloqué… l'appli reste jouable, sans sauvegarde.
    return createMemoryStorage();
  }
}

async function boot() {
  if (!platform().native) setupPwa();
  const store = await ProgressStore.load(await openStorage());
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ProgressContext value={store}>
        <App />
      </ProgressContext>
    </StrictMode>,
  );
}

void boot();
