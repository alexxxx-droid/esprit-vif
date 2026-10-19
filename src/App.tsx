import { useEffect } from 'react';
import type { Settings } from './store/progress';
import { TabBar } from './ui/components/TabBar';
import { setHapticsEnabled } from './ui/fx/haptics';
import { setSoundEnabled } from './ui/fx/sound';
import { useProgress } from './ui/progress-context';
import { routeHash, useRoute, type Route } from './ui/router';
import { HomeScreen } from './ui/screens/HomeScreen';
import { DailyTestScreen, PlayScreen } from './ui/screens/PlayScreens';
import { ProgressScreen } from './ui/screens/ProgressScreen';
import { ReportScreen } from './ui/screens/ReportScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { TrainingScreen } from './ui/screens/TrainingScreen';

const TABBED: Route['name'][] = ['home', 'training', 'progress', 'settings'];

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <HomeScreen />;
    case 'progress':
      return <ProgressScreen />;
    case 'training':
      return <TrainingScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'play':
      return <PlayScreen gameId={route.gameId} />;
    case 'test':
      return <DailyTestScreen />;
    case 'report':
      return <ReportScreen testId={route.testId} />;
  }
}

/** Thème, sons et vibrations suivent les réglages. */
function useApplySettings(settings: Settings) {
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'auto') delete root.dataset.theme;
    else root.dataset.theme = settings.theme;
    const background = getComputedStyle(root).getPropertyValue('--bg').trim();
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      if (settings.theme === 'auto') meta.content = meta.dataset.default ?? meta.content;
      else meta.content = background;
    }
  }, [settings.theme]);

  useEffect(() => {
    setSoundEnabled(settings.sound);
    setHapticsEnabled(settings.vibration);
  }, [settings.sound, settings.vibration]);
}

export function App() {
  const route = useRoute();
  const { settings } = useProgress();
  useApplySettings(settings);
  const tabbed = TABBED.includes(route.name);
  const key = routeHash(route);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);

  return (
    <div className={`app${tabbed ? ' app--tabbed' : ''}`}>
      <main className="app__main" key={key}>
        <Screen route={route} />
      </main>
      {tabbed && <TabBar current={route.name} />}
    </div>
  );
}
