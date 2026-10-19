import { useState, type CSSProperties } from 'react';
import { coachTip } from '../../core/coach';
import { addDays, currentStreakDetail, dailyGames, hasOfficialTest } from '../../core/daily';
import { formatLongDay, formatShortDay, formatWeekday, formatWeekdayInitial, plural } from '../../core/format';
import { DAILY_ROTATION, DOMAINS, GAME_ORDER, GAMES } from '../../core/games/registry';
import { sessionDone, sessionGames } from '../../core/modes';
import { suggestGame } from '../../core/stats';
import type { GameId } from '../../core/types';
import { characterName } from '../../core/characters';
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
      label: 'Continuer le test',
      sub: `Jeu ${inProgress.results.length + 1} sur ${inProgress.games.length} · ${GAMES[next].name}`,
      action: () => navigate({ name: 'test' }),
    };
  } else if (!doneToday) {
    cta = { label: 'Test du jour', sub: '3 jeux · environ 5 minutes', action: () => void startTest() };
  } else {
    const suggestion = suggestGame(data.plays, GAME_ORDER);
    cta = {
      label: 'Continuer',
      sub: `Entraînement conseillé : ${GAMES[suggestion].name}`,
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
          aria-label={`${profileName(active, profiles)} joue. Changer de joueur`}
        >
          <ProfileAvatar profile={active} profiles={profiles} size={42} />
          <span className="player-chip__text">
            {active.name && <span className="player-chip__hello">Bonjour,</span>}
            <span className="player-chip__name">{active.name || 'Esprit Vif'}</span>
          </span>
        </button>
        <span className="home__chips">
          {streak > 0 && (
            <span className="streak" title="Jours d’entraînement d’affilée">
              <Icon name="flame" size={18} />
              {plural(streak, 'jour')}
            </span>
          )}
          <a
            href="#/progres"
            className="rank-chip"
            aria-label={`Niveau ${rank.level}, ${rank.title}. Voir mes progrès`}
            onClick={(event) => {
              event.preventDefault();
              navigate({ name: 'progress' }, { replace: true });
            }}
          >
            <span className="rank-chip__ring" style={{ '--p': rankProgress } as CSSProperties}>
              {rank.level}
            </span>
            <span className="rank-chip__label">Niv.</span>
          </a>
        </span>
      </header>
      <p className="home__date">{formatLongDay(today)}</p>

      {!store.persistent && (
        <p className="notice">
          <Icon name="info" size={20} />
          Ce navigateur ne permet pas d’enregistrer tes progrès : ils seront perdus à la fermeture.
        </p>
      )}
      {reminderDue && (
        <p className="notice notice--accent" role="status">
          <Icon name="bell" size={20} />
          C’est l’heure de ton test du jour. Cinq minutes suffisent&nbsp;!
        </p>
      )}

      {restedYesterday && (
        <p className="notice notice--warm" role="status">
          <Mascot mood="sleep" size={34} />
          Hier était ton jour de repos. Une partie aujourd’hui et ta série de {plural(streak, 'jour')} continue&nbsp;!
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
        <SessionCard />

        <WeekStrip playedDays={new Set(data.plays.map((p) => p.day))} today={today} />

        <section className="coach" aria-labelledby="coach-title">
          <Mascot mood="hello" size={58} className="coach__vif" />
          <div>
            <h2 className="coach__title" id="coach-title">
              Le mot de {characterName(active.character)}, ton coach
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
        <span className="card__title">Séance du jour</span>
        <span className="card__sub">
          {completed
            ? 'Terminée : bravo, à demain !'
            : done.size
              ? `${done.size} jeux sur ${picks.length} · on continue ?`
              : `${picks.length} jeux choisis pour toi · ≈ 6 min`}
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
          Installe Esprit Vif
        </span>
        <span className="card__sub">Une icône sur ton écran d’accueil, et ça marche même sans réseau.</span>
      </span>
      <span className="install-card__actions">
        <button type="button" className="btn btn--primary" onClick={() => void promptInstall()}>
          Installer
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--flat"
          aria-label="Plus tard"
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
        Tes 7 derniers jours
      </h2>
      <ol className="week">
        {days.map((day) => {
          const played = playedDays.has(day);
          return (
            <li key={day} className={`week__day${played ? ' is-played' : ''}${day === today ? ' is-today' : ''}`}>
              <span className="week__initial" aria-hidden="true">
                {formatWeekdayInitial(day)}
              </span>
              <span className="week__stamp" aria-hidden="true">
                {played ? <Icon name="check" size={18} strokeWidth={3} /> : Number(day.slice(8))}
              </span>
              <span className="sr-only">
                {formatWeekday(day)} : {played ? 'entraînement fait' : 'pas d’entraînement'}
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
    <section className="hero" aria-label="Ton âge cérébral">
      <div className="hero__glow" aria-hidden="true" />
      <p className="hero__label">Ton âge cérébral</p>
      <p className="hero__age">
        <span className="hero__value">{last.brainAge}</span>
        <span className="hero__unit">ans</span>
      </p>
      <div className="hero__meta">
        {diff !== null && diff !== 0 && (
          <span className={`delta ${diff < 0 ? 'delta--good' : 'delta--soft'}`}>
            <Icon name={diff < 0 ? 'down' : 'up'} size={16} />
            {plural(Math.abs(diff), 'an')}
          </span>
        )}
        {diff === 0 && <span className="delta delta--soft">stable</span>}
        <span>{doneToday ? 'Test du jour fait' : `Dernier test : ${formatShortDay(last.day)}`}</span>
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
      <p className="hero__label">Bienvenue&nbsp;!</p>
      <p className="hero__title">Quelques minutes par jour pour garder l’esprit vif.</p>
      <p className="hero__text">Ton premier test du jour te donne ton âge cérébral de départ.</p>
    </section>
  );
}

function Programme({ games, test }: { games: GameId[]; test: TestRecord | null }) {
  return (
    <section className="programme" aria-labelledby="programme-title">
      <h2 className="section-title" id="programme-title">
        Au programme aujourd’hui
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
                  <span className="sr-only">fait</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
