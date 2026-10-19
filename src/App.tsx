import { useEffect } from 'react';
import { hasOfficialTest } from './core/daily';
import type { Settings } from './store/progress';
import { PwaNotices } from './ui/components/PwaNotices';
import { TabBar } from './ui/components/TabBar';
import { setHapticsEnabled } from './ui/fx/haptics';
import { setSoundEnabled } from './ui/fx/sound';
import { useToday } from './ui/hooks';
import { platform } from './ui/platform';
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

/** Appli Android : les rappels sont reprogrammés à l'ouverture, et sautent le jour où le test est fait. */
function useReminderSync(settings: Settings, doneToday: boolean) {
  useEffect(() => {
    const schedule = platform().scheduleReminder;
    if (!schedule || !settings.reminder) return;
    void schedule(settings.reminderTime, { skipToday: doneToday, ask: false });
  }, [settings.reminder, settings.reminderTime, doneToday]);
}

export function App() {
  const route = useRoute();
  const { settings, tests } = useProgress();
  const today = useToday();
  useApplySettings(settings);
  useReminderSync(settings, hasOfficialTest(tests, today));
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
      {tabbed && <PwaNotices />}
    </div>
  );
}
