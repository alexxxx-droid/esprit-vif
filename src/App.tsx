import { useEffect, useMemo } from 'react';
import { hasOfficialTest } from './core/daily';
import { sessionDone, sessionGames } from './core/modes';
import type { Domain } from './core/types';
import type { PlayRecord, Settings } from './store/progress';
import { PwaNotices } from './ui/components/PwaNotices';
import { TabBar } from './ui/components/TabBar';
import { setHapticsEnabled } from './ui/fx/haptics';
import { setSoundEnabled } from './ui/fx/sound';
import { useToday } from './ui/hooks';
import { platform } from './ui/platform';
import { useProgress, useStore } from './ui/progress-context';
import { routeHash, useRoute, type Route } from './ui/router';
import { HomeScreen } from './ui/screens/HomeScreen';
import { DuelScreen, MarathonScreen, SessionScreen } from './ui/screens/ModeScreens';
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
    case 'session':
      return <SessionScreen />;
    case 'marathon':
      return <MarathonScreen domain={route.domain} />;
    case 'duel':
      return <DuelScreen />;
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

/** Les quatre jeux de la séance joués, d'une façon ou d'une autre : la séance compte, même hors de son écran. */
function useSessionAutoComplete(plays: readonly PlayRecord[], sessions: readonly string[], goals: readonly Domain[], today: string) {
  const store = useStore();
  const picks = useMemo(() => sessionGames(today, plays, goals), [today, plays, goals]);
  const allDone = sessionDone(picks, plays, today).size === picks.length;
  const completed = sessions.includes(today);
  useEffect(() => {
    if (allDone && !completed) void store.completeSession(today);
  }, [allDone, completed, store, today]);
}

export function App() {
  const route = useRoute();
  const { settings, tests, plays, extras } = useProgress();
  const today = useToday();
  useApplySettings(settings);
  useReminderSync(settings, hasOfficialTest(tests, today));
  useSessionAutoComplete(plays, extras.sessions, settings.goals, today);
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
