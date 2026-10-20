import { useState, type CSSProperties } from 'react';
import { coachTip } from '../../core/coach';
import { addDays, currentStreakDetail, dailyGames, dayIndex, hasOfficialTest } from '../../core/daily';
import { byCount, formatLongDay, formatShortDay, formatWeekday, formatWeekdayShort, plural } from '../../core/format';
import { DAILY_ROTATION, DOMAINS, GAME_ORDER, GAMES } from '../../core/games/registry';
import { tr } from '../../core/lang';
import { sessionDone, sessionGames } from '../../core/modes';
import { suggestGame } from '../../core/stats';
import type { GameId } from '../../core/types';
import { characterName } from '../../core/characters';
import { challengeProgress, SEASON_PLAYS, seasonPlays, WEEKLY_XP, weeklyChallenge } from '../../core/events';
import { officialTests, testInProgress, type TestRecord } from '../../store/progress';
import { profileName } from '../../store/profiles';
import { GameArt } from '../components/GameArt';
import { Mascot } from '../components/Mascot';
import { PlayersDialog, ProfileAvatar } from '../components/Players';
import { Icon } from '../components/Icon';
import { useMinuteOfDay, useToday } from '../hooks';
import { useProfiles } from '../profiles-context';
import { useProgress, useStore } from '../progress-context';
import { useProgression } from '../progression';
import { promptInstall, usePwa } from '../pwa';
import { navigate } from '../router';
import { useSeason } from '../season';
import { WelcomeScreen } from './WelcomeScreen';

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function HomeScreen() {
  const data = useProgress();
  // Tout premier lancement de ce joueur : on fait connaissance avant tout.
  if (!data.settings.onboarded && data.plays.length === 0 && data.tests.length === 0) return <WelcomeScreen />;
  return <Home />;
}

function Home() {
  const data = useProgress();
  const store = useStore();
  const today = useToday();
  const minute = useMinuteOfDay();
  const [starting, setStarting] = useState(false);
  const [playersOpen, setPlayersOpen] = useState(false);
  const { profiles, active } = useProfiles();
  const { rank } = useProgression();
  const rankProgress = (rank.xp - rank.levelStart) / (rank.nextAt - rank.levelStart);

  const inProgress = testInProgress(data, today);
  const doneToday = hasOfficialTest(data.tests, today);
  const tests = officialTests(data);
  const last = tests.at(-1);
  const previous = tests.at(-2);
  const { count: streak, rests } = currentStreakDetail(
    data.plays.map((p) => p.day),
    today,
  );
  // Hier a servi de jour de repos : un mot gentil, pas une alarme.
  const restedYesterday = streak > 0 && rests[0] === addDays(today, -1) && !data.plays.some((p) => p.day === today);
  const programme = inProgress?.games ?? dailyGames(today, DAILY_ROTATION);
  const reminderDue = data.settings.reminder && !doneToday && !inProgress && minute >= minutesOf(data.settings.reminderTime);

  const startTest = async () => {
    setStarting(true);
    await store.startTest(dailyGames(today, DAILY_ROTATION));
    navigate({ name: 'test' });
  };

  let cta: { label: string; sub: string; action: () => void };
  if (inProgress) {
    const next = inProgress.games.find((g) => !inProgress.results.some((r) => r.gameId === g)) ?? inProgress.games[0];
    cta = {
      label: tr('Continuer le test', 'Continue the test'),
      sub: tr(
        `Jeu ${inProgress.results.length + 1} sur ${inProgress.games.length} · ${GAMES[next].name}`,
        `Game ${inProgress.results.length + 1} of ${inProgress.games.length} · ${GAMES[next].name}`,
      ),
      action: () => navigate({ name: 'test' }),
    };
  } else if (!doneToday) {
    cta = { label: tr('Test du jour', 'Daily test'), sub: tr('3 jeux · environ 5 minutes', '3 games · about 5 minutes'), action: () => void startTest() };
  } else {
    const suggestion = suggestGame(data.plays, GAME_ORDER);
    cta = {
      label: tr('Continuer', 'Keep going'),
      sub: tr(`Entraînement conseillé : ${GAMES[suggestion].name}`, `Suggested training: ${GAMES[suggestion].name}`),
      action: () => navigate({ name: 'play', gameId: suggestion }),
    };
  }

  return (
    <div className="screen screen-in home">
      <header className="home__top">
        <button
          type="button"
          className="player-chip"
          onClick={() => setPlayersOpen(true)}
          aria-label={tr(`${profileName(active, profiles)} joue. Changer de joueur`, `${profileName(active, profiles)} is playing. Switch players`)}
        >
          <ProfileAvatar profile={active} profiles={profiles} size={42} />
          <span className="player-chip__text">
            {active.name && <span className="player-chip__hello">{tr('Bonjour,', 'Hi,')}</span>}
            <span className="player-chip__name">{active.name || 'Esprit Vif'}</span>
          </span>
        </button>
        <span className="home__chips">
          {streak > 0 && (
            <span className="streak" title={tr('Jours d’entraînement d’affilée', 'Training days in a row')}>
              <Icon name="flame" size={18} />
              {tr(plural(streak, 'jour'), plural(streak, 'day'))}
            </span>
          )}
          <a
            href="#/progres"
            className="rank-chip"
            aria-label={tr(`Niveau ${rank.level}, ${rank.title}. Voir mes progrès`, `Level ${rank.level}, ${rank.title}. See my progress`)}
            onClick={(event) => {
              event.preventDefault();
              navigate({ name: 'progress' }, { replace: true });
            }}
          >
            <span className="rank-chip__ring" style={{ '--p': rankProgress } as CSSProperties}>
              {rank.level}
            </span>
            <span className="rank-chip__label">{tr('Niv.', 'Lv.')}</span>
          </a>
        </span>
      </header>
      <p className="home__date">{formatLongDay(today)}</p>

      {!store.persistent && (
        <p className="notice">
          <Icon name="info" size={20} />
          {tr(
            'Ce navigateur ne permet pas d’enregistrer tes progrès : ils seront perdus à la fermeture.',
            'This browser can’t save your progress: it will be lost when you close it.',
          )}
        </p>
      )}
      {reminderDue && (
        <p className="notice notice--accent" role="status">
          <Icon name="bell" size={20} />
          {tr('C’est l’heure de ton test du jour. Cinq minutes suffisent\u00a0!', 'Time for your daily test. Five minutes is all it takes!')}
        </p>
      )}

      {restedYesterday && (
        <p className="notice notice--warm" role="status">
          <Mascot mood="sleep" size={34} />
          {tr(
            byCount(
              streak,
              `Hier était ton jour de repos. Une partie aujourd’hui et ta série de ${streak}\u00a0jour continue\u00a0!`,
              `Hier était ton jour de repos. Une partie aujourd’hui et ta série de ${streak}\u00a0jours continue\u00a0!`,
            ),
            `Yesterday was your rest day. Play one game today and your ${streak}-day streak keeps going!`,
          )}
        </p>
      )}

      {/* Deux colonnes sur grand écran ; sur téléphone, ces deux blocs s'effacent et tout s'empile. */}
      <div className="home__main">
        {last ? <AgeHero last={last} previous={previous} doneToday={doneToday} /> : <WelcomeHero />}

        <button type="button" className="cta cta--hero" onClick={cta.action} disabled={starting}>
          <span className="cta__text">
            <span className="cta__label">{cta.label}</span>
            <span className="cta__sub">{cta.sub}</span>
          </span>
          <span className="cta__icon">
            <Icon name={doneToday && !inProgress ? 'arrow' : 'play'} />
          </span>
        </button>

        {!doneToday && <Programme games={programme} test={inProgress} />}
      </div>

      <div className="home__side">
        <SeasonCard />
        <WeeklyCard />
        <SessionCard />

        <WeekStrip playedDays={new Set(data.plays.map((p) => p.day))} today={today} />

        <section className="coach" aria-labelledby="coach-title">
          <Mascot mood="hello" size={58} className="coach__vif" />
          <div>
            <h2 className="coach__title" id="coach-title">
              {tr(`Le mot de ${characterName(active.character)}, ton coach`, `Tip from your coach, ${characterName(active.character)}`)}
            </h2>
            <p className="coach__tip">{coachTip(today)}</p>
          </div>
        </section>

        <InstallCard />
      </div>
      <PlayersDialog open={playersOpen} onClose={() => setPlayersOpen(false)} />
    </div>
  );
}

/** La saison en cours : un mot de bienvenue décoré et le trophée éphémère à gagner. */
function SeasonCard() {
  const data = useProgress();
  const today = useToday();
  const season = useSeason();
  if (!season) return null;
  const count = Math.min(SEASON_PLAYS, seasonPlays(data.plays, season, today.slice(0, 4)));
  return (
    <section className={`season season--${season.id}`} aria-label={tr(`Saison : ${season.name}`, `Season: ${season.name}`)}>
      <Mascot mood="hello" size={60} />
      <div className="season__text">
        <p className="season__greeting">{season.greeting}</p>
        <p className="season__progress">
          {count >= SEASON_PLAYS
            ? tr(`Trophée « ${season.trophy.name} » gagné !`, `“${season.trophy.name}” trophy earned!`)
            : tr(`${count} / ${SEASON_PLAYS} parties`, `${count} / ${SEASON_PLAYS} games`)}
        </p>
      </div>
    </section>
  );
}

/** Le défi de la semaine : une consigne, une jauge, 60 XP à la clé. */
function WeeklyCard() {
  const data = useProgress();
  const today = useToday();
  const challenge = weeklyChallenge(today);
  const progress = Math.min(challenge.target, challengeProgress(challenge, data.plays, data.extras.sessions));
  const done = progress >= challenge.target;
  const daysLeft = dayIndex(addDays(challenge.week, 6)) - dayIndex(today) + 1;
  return (
    <section className={`weekly${done ? ' is-done' : ''}`} aria-labelledby="weekly-title">
      <span className="weekly__icon" aria-hidden="true">
        <Icon name={done ? 'check' : 'target'} size={20} />
      </span>
      <div className="weekly__text">
        <h2 className="weekly__title" id="weekly-title">
          {tr('Défi de la semaine', 'Weekly challenge')}
        </h2>
        <p className="weekly__label">{challenge.label}</p>
        <span className="mini-bar" aria-hidden="true">
          <span style={{ transform: `scaleX(${progress / challenge.target})` }} />
        </span>
        <p className="weekly__meta">
          {done
            ? tr(`Relevé ! +${WEEKLY_XP} XP`, `Done! +${WEEKLY_XP} XP`)
            : `${progress} / ${challenge.target} · +${WEEKLY_XP} XP · ${
                daysLeft === 1 ? tr('dernier jour', 'last day') : tr(byCount(daysLeft, `encore ${daysLeft}\u00a0jour`, `encore ${daysLeft}\u00a0jours`), `${plural(daysLeft, 'day')} left`)
              }`}
        </p>
      </div>
    </section>
  );
}

/** La séance du jour sur mesure : quatre jeux, une pastille par domaine qui se remplit une fois joué. */
function SessionCard() {
  const data = useProgress();
  const today = useToday();
  const picks = sessionGames(today, data.plays, data.settings.goals);
  const done = sessionDone(picks, data.plays, today);
  const completed = data.extras.sessions.includes(today);
  return (
    <button type="button" className="card card--action session-card" onClick={() => navigate({ name: 'session' })}>
      <span className="card__icon">
        <Icon name="target" />
      </span>
      <span className="card__text">
        <span className="card__title">{tr('Séance du jour', 'Daily session')}</span>
        <span className="card__sub">
          {completed
            ? tr('Terminée : bravo, à demain !', 'All done. Great job, see you tomorrow!')
            : done.size
              ? tr(`${done.size} jeux sur ${picks.length} · on continue ?`, `${done.size} of ${picks.length} games · keep going?`)
              : tr(`${picks.length} jeux choisis pour toi · ≈ 6 min`, `${picks.length} games picked for you · ≈ 6 min`)}
        </span>
      </span>
      <span className="session-card__dots" aria-hidden="true">
        {picks.map((pick) => (
          <span
            key={pick.gameId}
            className={done.has(pick.gameId) ? 'is-done' : undefined}
            style={{ '--c': `var(--d-${pick.domain})` } as CSSProperties}
          />
        ))}
      </span>
      <Icon name="arrow" />
    </button>
  );
}

const INSTALL_DISMISSED = 'esprit-vif:install-dismissed';

/** Proposition d'installation, tant que le navigateur l'autorise et qu'elle n'a pas été écartée. */
function InstallCard() {
  const { canInstall } = usePwa();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(INSTALL_DISMISSED) === '1';
    } catch {
      return false;
    }
  });
  if (!canInstall || dismissed) return null;
  return (
    <section className="card install-card" aria-labelledby="install-title">
      <span className="card__icon">
        <Icon name="download" />
      </span>
      <span className="card__text">
        <span className="card__title" id="install-title">
          {tr('Installe Esprit Vif', 'Install Esprit Vif')}
        </span>
        <span className="card__sub">
          {tr('Une icône sur ton écran d’accueil, et ça marche même sans réseau.', 'An icon on your home screen, and it works even offline.')}
        </span>
      </span>
      <span className="install-card__actions">
        <button type="button" className="btn btn--primary" onClick={() => void promptInstall()}>
          {tr('Installer', 'Install')}
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--flat"
          aria-label={tr('Plus tard', 'Later')}
          onClick={() => {
            setDismissed(true);
            try {
              localStorage.setItem(INSTALL_DISMISSED, '1');
            } catch {
              // Stockage indisponible : la carte reviendra à la prochaine visite, rien de grave.
            }
          }}
        >
          <Icon name="close" />
        </button>
      </span>
    </section>
  );
}

/** Les 7 derniers jours, avec un tampon pour chaque jour d'entraînement. */
function WeekStrip({ playedDays, today }: { playedDays: Set<string>; today: string }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  return (
    <section aria-labelledby="week-title">
      <h2 className="section-title" id="week-title">
        {tr('Tes 7 derniers jours', 'Your last 7 days')}
      </h2>
      <ol className="week">
        {days.map((day) => {
          const played = playedDays.has(day);
          return (
            <li key={day} className={`week__day${played ? ' is-played' : ''}${day === today ? ' is-today' : ''}`}>
              <span className="week__initial" aria-hidden="true">
                {formatWeekdayShort(day)}
              </span>
              <span className="week__stamp" aria-hidden="true">
                {played ? <Icon name="check" size={18} strokeWidth={3} /> : Number(day.slice(8))}
              </span>
              <span className="sr-only">
                {played
                  ? tr(`${formatWeekday(day)} : entraînement fait`, `${formatWeekday(day)}: trained`)
                  : tr(`${formatWeekday(day)} : pas d’entraînement`, `${formatWeekday(day)}: no training`)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function AgeHero({ last, previous, doneToday }: { last: TestRecord; previous?: TestRecord; doneToday: boolean }) {
  const diff = previous?.brainAge !== undefined && last.brainAge !== undefined ? last.brainAge - previous.brainAge : null;
  return (
    <section className="hero" aria-label={tr('Ton âge cérébral', 'Your brain age')}>
      <div className="hero__glow" aria-hidden="true" />
      <p className="hero__label">{tr('Ton âge cérébral', 'Your brain age')}</p>
      <p className="hero__age">
        <span className="hero__value">{last.brainAge}</span>
        <span className="hero__unit">{tr('ans', 'years')}</span>
      </p>
      <div className="hero__meta">
        {diff !== null && diff !== 0 && (
          <span className={`delta ${diff < 0 ? 'delta--good' : 'delta--soft'}`}>
            <Icon name={diff < 0 ? 'down' : 'up'} size={16} />
            {tr(plural(Math.abs(diff), 'an'), plural(Math.abs(diff), 'year'))}
          </span>
        )}
        {diff === 0 && <span className="delta delta--soft">{tr('stable', 'steady')}</span>}
        <span>{doneToday ? tr('Test du jour fait', 'Daily test done') : tr(`Dernier test : ${formatShortDay(last.day)}`, `Last test: ${formatShortDay(last.day)}`)}</span>
        {doneToday && (
          <span className="stamp-mini" aria-hidden="true">
            <Icon name="check" size={14} strokeWidth={3} />
          </span>
        )}
      </div>
    </section>
  );
}

function WelcomeHero() {
  return (
    <section className="hero hero--welcome">
      <div className="hero__glow" aria-hidden="true" />
      <p className="hero__label">{tr('Bienvenue\u00a0!', 'Welcome!')}</p>
      <p className="hero__title">{tr('Quelques minutes par jour pour garder l’esprit vif.', 'A few minutes a day to keep your mind sharp.')}</p>
      <p className="hero__text">{tr('Ton premier test du jour te donne ton âge cérébral de départ.', 'Your first daily test gives you your starting brain age.')}</p>
    </section>
  );
}

function Programme({ games, test }: { games: GameId[]; test: TestRecord | null }) {
  return (
    <section className="programme" aria-labelledby="programme-title">
      <h2 className="section-title" id="programme-title">
        {tr('Au programme aujourd’hui', 'On today’s program')}
      </h2>
      <ol className="programme__list">
        {games.map((id) => {
          const done = test?.results.some((r) => r.gameId === id);
          return (
            <li key={id} className={`programme__item${done ? ' is-done' : ''}`}>
              <GameArt gameId={id} size={40} />
              <span className="programme__text">
                <span className="programme__name">{GAMES[id].name}</span>
                <span className="programme__domain">{DOMAINS[GAMES[id].domain].name}</span>
              </span>
              {done && (
                <span className="programme__check">
                  <Icon name="check" size={18} strokeWidth={3} />
                  <span className="sr-only">{tr('fait', 'done')}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
