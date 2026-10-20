import { lazy, Suspense, useEffect, useMemo } from 'react';
import { hasOfficialTest, streakHorizon } from './core/daily';
import { tr } from './core/lang';
import { sessionDone, sessionGames } from './core/modes';
import type { Domain } from './core/types';
import { profileName } from './store/profiles';
import type { PlayRecord, Settings, TestRecord } from './store/progress';
import { PwaNotices } from './ui/components/PwaNotices';
import { TabBar } from './ui/components/TabBar';
import { setHapticsEnabled } from './ui/fx/haptics';
import { setMusicEnabled, setMusicVolume } from './ui/fx/music';
import { setEffectsVolume, setSoundEnabled } from './ui/fx/sound';
import { MOTION_EVENT, useToday } from './ui/hooks';
import { platform } from './ui/platform';
import { setGenerousTime } from './ui/tempo';
import { useCloudSync } from './ui/cloud';
import { SeasonDecor } from './ui/components/SeasonDecor';
import { useResolvedTheme } from './ui/theme';
import type { ResolvedTheme } from './core/themes';
import { useProfiles } from './ui/profiles-context';
import { useProgress, useStore } from './ui/progress-context';
import { routeHash, useRoute, type Route } from './ui/router';
import { ChallengeScreen } from './ui/screens/ChallengeScreen';
import { HomeScreen } from './ui/screens/HomeScreen';
import { DuelScreen, MarathonScreen, SessionScreen } from './ui/screens/ModeScreens';
import { PartyScreen } from './ui/screens/PartyScreen';
import { DailyTestScreen, PlayScreen, StartTestScreen } from './ui/screens/PlayScreens';
import { ProgressScreen } from './ui/screens/ProgressScreen';
import { ReportScreen } from './ui/screens/ReportScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { TrainingScreen } from './ui/screens/TrainingScreen';
import { WardrobeScreen } from './ui/screens/WardrobeScreen';

const TABBED: Route['name'][] = ['home', 'training', 'progress', 'settings'];

// Le transfert (QR codes, appareil photo) n'est chargé que si l'on s'en sert.
const TransferScreen = lazy(() => import('./ui/screens/TransferScreen').then((m) => ({ default: m.TransferScreen })));

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <HomeScreen />;
    case 'progress':
      return <ProgressScreen />;
    case 'training':
      return <TrainingScreen domain={route.domain} />;
    case 'settings':
      return <SettingsScreen />;
    case 'play':
      return <PlayScreen gameId={route.gameId} />;
    case 'test':
      return <DailyTestScreen />;
    case 'start-test':
      return <StartTestScreen />;
    case 'report':
      return <ReportScreen testId={route.testId} />;
    case 'session':
      return <SessionScreen />;
    case 'marathon':
      return <MarathonScreen domain={route.domain} />;
    case 'duel':
      return <DuelScreen />;
    case 'party':
      return <PartyScreen />;
    case 'challenge':
      return <ChallengeScreen code={route.code} />;
    case 'wardrobe':
      return <WardrobeScreen />;
    case 'transfer':
      return (
        <Suspense fallback={null}>
          <TransferScreen />
        </Suspense>
      );
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
    setEffectsVolume(settings.effectsVolume);
    setMusicEnabled(settings.music);
    setMusicVolume(settings.musicVolume);
  }, [settings.sound, settings.vibration, settings.effectsVolume, settings.music, settings.musicVolume]);

  // Accessibilité : des attributs sur la racine, que les feuilles de style suivent.
  useEffect(() => {
    const root = document.documentElement;
    const flag = (name: string, value: string | null) => {
      if (value) root.dataset[name] = value;
      else delete root.dataset[name];
    };
    flag('text', settings.textSize === 'normal' ? null : settings.textSize);
    flag('contrast', settings.highContrast ? 'high' : null);
    flag('hand', settings.leftHanded ? 'left' : null);
    flag('motion', settings.reduceMotion ? 'reduce' : null);
    window.dispatchEvent(new Event(MOTION_EVENT));
    setGenerousTime(settings.generousTime);
  }, [settings.textSize, settings.highContrast, settings.leftHanded, settings.reduceMotion, settings.generousTime]);
}

/** Le thème (saison ou choix du joueur) : ses couleurs passent par des variables sur la racine. */
function useApplyTheme(look: ResolvedTheme, mode: Settings['theme']) {
  useEffect(() => {
    const root = document.documentElement;
    if (look.id === 'classique') {
      delete root.dataset.palette;
      for (const name of ['--pal-light', '--pal-dark', '--pal-tint']) root.style.removeProperty(name);
    } else {
      root.dataset.palette = look.id;
      root.style.setProperty('--pal-light', look.light);
      root.style.setProperty('--pal-dark', look.dark);
      root.style.setProperty('--pal-tint', look.tint);
    }
    // La barre du navigateur suit le fond du thème quand le mode clair ou sombre est imposé.
    if (mode !== 'auto') {
      const background = getComputedStyle(root).getPropertyValue('--bg').trim();
      for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) meta.content = background;
    }
  }, [look, mode]);
}

/** Appli Android : les rappels sont reprogrammés à l'ouverture, et sautent le jour où le test est fait. */
function useReminderSync(settings: Settings, doneToday: boolean) {
  useEffect(() => {
    const schedule = platform().scheduleReminder;
    if (!schedule || !settings.reminder) return;
    void schedule(settings.reminderTime, { skipToday: doneToday, ask: false });
  }, [settings.reminder, settings.reminderTime, doneToday]);
}

/** Appli Android : le widget d'écran d'accueil suit la série et le test du jour. */
function useWidgetSync(plays: readonly PlayRecord[], tests: readonly TestRecord[], today: string, showStreak: boolean) {
  const { active, profiles } = useProfiles();
  // Un prénom choisi, ou « Joueur 2 » quand plusieurs joueurs partagent l'appareil ; sinon rien.
  const name = active.name || profiles.length > 1 ? profileName(active, profiles) : '';
  useEffect(() => {
    const update = platform().updateWidget;
    if (!update) return;
    const horizon = streakHorizon(
      plays.map((p) => p.day),
      today,
    );
    // Série masquée par le joueur : le widget n'en parle pas non plus.
    const { count, until } = showStreak ? horizon : { count: 0, until: null };
    const last = tests.filter((t) => t.done && t.official).sort((a, b) => a.startedAt.localeCompare(b.startedAt)).at(-1);
    const texts = {
      streakOne: tr('Série : 1 jour', 'Streak: 1 day'),
      streakMany: tr('Série : %d jours', 'Streak: %d days'),
      noStreak: showStreak ? tr('Une partie aujourd’hui lance ta série', 'Play today to start a streak') : tr('Quelques minutes par jour', 'A few minutes a day'),
      testDoneAge: tr('Test du jour fait · âge cérébral %d ans', 'Daily test done · brain age %d'),
      testDone: tr('Test du jour fait', 'Daily test done'),
      testTodo: tr('Test du jour : à faire', 'Daily test: to do'),
      test: tr('Test du jour', 'Daily test'),
      training: tr('Entraînement', 'Training'),
      session: tr('Séance du jour', 'Daily session'),
    };
    void update({ name, streak: count, streakUntil: until ?? '', testDay: last?.day ?? '', brainAge: last?.brainAge ?? 0, texts });
  }, [plays, tests, today, name, showStreak]);
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
  useWidgetSync(plays, tests, today, settings.showStreak);
  useCloudSync();
  const tabbed = TABBED.includes(route.name);
  const key = routeHash(route);
  const look = useResolvedTheme();
  useApplyTheme(look, settings.theme);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);

  return (
    <div className={`app${tabbed ? ' app--tabbed' : ''}`}>
      {tabbed && look.decor && <SeasonDecor decor={look.decor} />}
      <main className="app__main" key={key}>
        <Screen route={route} />
      </main>
      {tabbed && <TabBar current={route.name} />}
      {tabbed && <PwaNotices />}
    </div>
  );
}
