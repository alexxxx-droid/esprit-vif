import { useState, type CSSProperties } from 'react';
import { coachTip } from '../../core/coach';
import { addDays, currentStreak, dailyGames, hasOfficialTest } from '../../core/daily';
import { formatLongDay, formatShortDay, formatWeekday, formatWeekdayInitial, plural } from '../../core/format';
import { DAILY_ROTATION, DOMAINS, GAME_ORDER, GAMES } from '../../core/games/registry';
import { suggestGame } from '../../core/stats';
import type { GameId } from '../../core/types';
import { officialTests, testInProgress, type TestRecord } from '../../store/progress';
import { DomainBadge } from '../components/bits';
import { Icon } from '../components/Icon';
import { useMinuteOfDay, useToday } from '../hooks';
import { useProgress, useStore } from '../progress-context';
import { useProgression } from '../progression';
import { promptInstall, usePwa } from '../pwa';
import { navigate } from '../router';

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function HomeScreen() {
  const data = useProgress();
  const store = useStore();
  const today = useToday();
  const minute = useMinuteOfDay();
  const [starting, setStarting] = useState(false);
  const { rank } = useProgression();
  const rankProgress = (rank.xp - rank.levelStart) / (rank.nextAt - rank.levelStart);

  const inProgress = testInProgress(data, today);
  const doneToday = hasOfficialTest(data.tests, today);
  const tests = officialTests(data);
  const last = tests.at(-1);
  const previous = tests.at(-2);
  const streak = currentStreak(
    data.plays.map((p) => p.day),
    today,
  );
  const programme = inProgress?.games ?? dailyGames(today, DAILY_ROTATION);
  const reminderDue =
    data.settings.reminder && !doneToday && !inProgress && minute >= minutesOf(data.settings.reminderTime);

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
        <div className="brand">
          <span className="brand__mark">
            <Icon name="spark" size={20} />
          </span>
          <span className="brand__name">Esprit Vif</span>
        </div>
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

      <WeekStrip playedDays={new Set(data.plays.map((p) => p.day))} today={today} />

      <section className="coach" aria-labelledby="coach-title">
        <span className="coach__icon" aria-hidden="true">
          <Icon name="spark" size={20} />
        </span>
        <div>
          <h2 className="coach__title" id="coach-title">
            Le mot du coach
          </h2>
          <p className="coach__tip">{coachTip(today)}</p>
        </div>
      </section>

      <InstallCard />
    </div>
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
              <DomainBadge domain={GAMES[id].domain} size={36} />
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
