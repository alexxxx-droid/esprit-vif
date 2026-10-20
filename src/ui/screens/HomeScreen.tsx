import { useMemo, useState, type CSSProperties } from 'react';
import { coachTip } from '../../core/coach';
import { addDays, currentStreakDetail, dailyGames, dayIndex, hasOfficialTest } from '../../core/daily';
import { byCount, formatLongDay, formatWeekday, formatWeekdayShort, plural } from '../../core/format';
import { DAILY_POOL, DOMAIN_ORDER, DOMAINS, GAME_ORDER, GAMES } from '../../core/games/registry';
import { tr } from '../../core/lang';
import { sessionDone, sessionGames } from '../../core/modes';
import { suggestGame } from '../../core/stats';
import type { GameId } from '../../core/types';
import { characterName } from '../../core/characters';
import { challengeProgress, SEASON_PLAYS, seasonPlays, WEEKLY_XP, weeklyChallenge } from '../../core/events';
import { dailyObjectives, OBJECTIVE_SPARKS, OBJECTIVE_XP, objectiveLabel } from '../../core/objectives';
import { gameLevel, officialTests, testInProgress, type TestRecord } from '../../store/progress';
import { profileName } from '../../store/profiles';
import { GameArt } from '../components/GameArt';
import { Mascot } from '../components/Mascot';
import { VifGuide } from '../components/VifGuide';
import { PlayersDialog, ProfileAvatar } from '../components/Players';
import { Icon } from '../components/Icon';
import { useMinuteOfDay, useToday } from '../hooks';
import { useProfiles } from '../profiles-context';
import { useProgress, useStore } from '../progress-context';
import { useProgression } from '../progression';
import { promptInstall, usePwa } from '../pwa';
import { navigate } from '../router';
import { useSeason } from '../season';
import { useWardrobe } from '../wardrobe';
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
  const { count: streak, rests } = currentStreakDetail(
    data.plays.map((p) => p.day),
    today,
  );
  // Hier a servi de jour de repos : un mot gentil, pas une alarme.
  const restedYesterday = streak > 0 && rests[0] === addDays(today, -1) && !data.plays.some((p) => p.day === today);
  const reminderDue = data.settings.reminder && !doneToday && !inProgress && minute >= minutesOf(data.settings.reminderTime);
  const lastFree = data.plays.findLast((p) => p.mode === 'free');
  const suggestion = suggestGame(data.plays, GAME_ORDER);

  const startTest = async () => {
    setStarting(true);
    await store.startTest(dailyGames(today, DAILY_POOL));
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
    cta = {
      label: tr('Commencer le test du jour', 'Start the daily test'),
      sub: tr('3 jeux · environ 4 minutes', '3 games · about 4 minutes'),
      action: () => void startTest(),
    };
  } else {
    cta = {
      label: tr('Continuer', 'Keep going'),
      sub: tr(`Entraînement conseillé : ${GAMES[suggestion].name}`, `Suggested training: ${GAMES[suggestion].name}`),
      action: () => navigate({ name: 'play', gameId: suggestion }),
    };
  }
  // « Reprendre » n'a de sens que s'il propose autre chose que le bouton principal.
  const resume = lastFree && !(doneToday && !inProgress && lastFree.gameId === suggestion) ? lastFree.gameId : null;

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
            {active.name ? (
              <>
                <span className="player-chip__hello">{tr('Bonjour,', 'Hi,')}</span>
                <span className="player-chip__name">{active.name}</span>
              </>
            ) : (
              <span className="player-chip__name">{tr('Bonjour\u00a0!', 'Hello!')}</span>
            )}
          </span>
        </button>
        <span className="home__chips">
          {streak > 0 && (
            <span className="streak" title={tr('Jours d’entraînement d’affilée', 'Training days in a row')}>
              <Icon name="flame" size={18} />
              {streak}
              <span className="sr-only">{tr(byCount(streak, ' jour d’affilée', ' jours d’affilée'), streak === 1 ? ' day in a row' : ' days in a row')}</span>
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
          {tr('C’est l’heure de ton test du jour. Quelques minutes suffisent\u00a0!', 'Time for your daily test. A few minutes is all it takes!')}
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
        <DailyCard test={inProgress} doneToday={doneToday} />

        <div className="cta-wrap">
          <button type="button" className="cta cta--hero" onClick={cta.action} disabled={starting}>
            <span className="cta__text">
              <span className="cta__label">{cta.label}</span>
              <span className="cta__sub">{cta.sub}</span>
            </span>
            <span className="cta__icon">
              <Icon name={doneToday && !inProgress ? 'arrow' : 'play'} />
            </span>
          </button>
          <VifGuide />
        </div>

        <ObjectivesCard />
      </div>

      <div className="home__side">
        <WeekCard />
        {resume && <ResumeCard gameId={resume} />}
        <ThemesRow />
        <SessionCard />
        <SeasonCard />

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

/**
 * Le test du jour : ses trois jeux et l'âge cérébral du dernier test ; une fois fait, son résultat.
 * On peut alors rejouer chaque jeu en entraînement libre, sans toucher aux récompenses du test.
 */
function DailyCard({ test, doneToday }: { test: TestRecord | null; doneToday: boolean }) {
  const data = useProgress();
  const today = useToday();
  const tests = officialTests(data);
  const official = doneToday ? tests.findLast((t) => t.day === today) : undefined;
  const shown = official ?? tests.at(-1);
  const previous = official ? tests.at(-2) : undefined;
  const games = official?.games ?? test?.games ?? dailyGames(today, DAILY_POOL);
  const diff = official && previous?.brainAge !== undefined && official.brainAge !== undefined ? official.brainAge - previous.brainAge : null;
  const dayScore = official ? Math.round(official.results.reduce((sum, r) => sum + r.score, 0) / Math.max(1, official.results.length)) : null;

  return (
    <section className={`daily${official ? ' is-done' : ''}`} aria-labelledby="daily-title">
      <div className="hero__glow" aria-hidden="true" />
      <header className="daily__head">
        <div>
          <h2 className="daily__title" id="daily-title">
            {tr('Test du jour', 'Daily test')}
            {official && (
              <span className="stamp-mini">
                <Icon name="check" size={14} strokeWidth={3} />
                <span className="sr-only">{tr('fait', 'done')}</span>
              </span>
            )}
          </h2>
          <p className="daily__sub">
            {official
              ? tr(`Score du jour : ${dayScore} / 100`, `Today’s score: ${dayScore} / 100`)
              : shown
                ? tr('Trois domaines, trois jeux, un nouveau mélange chaque jour.', 'Three areas, three games, a new mix every day.')
                : tr('Ton premier test donne ton âge cérébral de départ.', 'Your first test gives your starting brain age.')}
          </p>
        </div>
        {shown?.brainAge !== undefined && (
          <p className="daily__age">
            <span className="daily__age-label">{official ? tr('Âge cérébral', 'Brain age') : tr('Dernier âge', 'Last age')}</span>
            <span className="daily__age-value">
              {shown.brainAge}
              <span className="daily__age-unit">{tr('ans', 'yrs')}</span>
            </span>
            {diff !== null && diff !== 0 && (
              <span className={`delta ${diff < 0 ? 'delta--good' : 'delta--soft'}`}>
                <Icon name={diff < 0 ? 'down' : 'up'} size={14} />
                {tr(plural(Math.abs(diff), 'an'), plural(Math.abs(diff), 'year'))}
              </span>
            )}
          </p>
        )}
      </header>
      <ol className="daily__list">
        {games.map((id) => {
          const result = (official ?? test)?.results.find((r) => r.gameId === id);
          const row = (
            <>
              <GameArt gameId={id} size={36} />
              <span className="programme__text">
                <span className="programme__name">{GAMES[id].name}</span>
                <span className="programme__domain">{DOMAINS[GAMES[id].domain].name}</span>
              </span>
              {result && (
                <span className="daily__score">
                  {result.score}
                  <span className="sr-only">{tr(' points', ' points')}</span>
                </span>
              )}
            </>
          );
          return (
            <li key={id} className={`daily__item${result ? ' is-done' : ''}`}>
              {official ? (
                <button
                  type="button"
                  className="daily__replay"
                  onClick={() => navigate({ name: 'play', gameId: id })}
                  aria-label={tr(`Rejouer ${GAMES[id].name} en entraînement libre`, `Play ${GAMES[id].name} again in free training`)}
                >
                  {row}
                  <Icon name="replay" size={18} />
                </button>
              ) : (
                row
              )}
            </li>
          );
        })}
      </ol>
      {official && (
        <a
          className="daily__link"
          href={`#/bilan/${official.id}`}
          onClick={(event) => {
            event.preventDefault();
            navigate({ name: 'report', testId: official.id });
          }}
        >
          {tr('Voir le bilan', 'See the report')}
          <Icon name="arrow" size={16} />
        </a>
      )}
    </section>
  );
}

/** Les trois objectifs du jour et ce qu'ils rapportent ; en dessous, le vestiaire. */
function ObjectivesCard() {
  const data = useProgress();
  const today = useToday();
  const objectives = useMemo(() => dailyObjectives(today, data.plays, data.tests), [today, data.plays, data.tests]);
  const status = useWardrobe();
  if (!objectives.length) return null;
  const done = objectives.filter((o) => o.done).length;
  return (
    <section className="objectives" aria-labelledby="objectives-title">
      <header className="objectives__head">
        <h2 className="objectives__title" id="objectives-title">
          {tr('Objectifs du jour', 'Daily goals')}
        </h2>
        <span className="objectives__count">{`${done} / ${objectives.length}`}</span>
      </header>
      <ul className="objectives__list">
        {objectives.map(({ objective, progress, done: complete }) => (
          <li key={objective.id} className={`objective${complete ? ' is-done' : ''}`}>
            <span className="objective__check" aria-hidden="true">
              {complete && <Icon name="check" size={16} strokeWidth={3} />}
            </span>
            <span className="objective__label">
              {objectiveLabel(objective)}
              <span className="sr-only">{complete ? tr(' : fait', ': done') : ` : ${progress} / ${objective.target}`}</span>
            </span>
            <span className="objective__meta" aria-hidden="true">
              {!complete && objective.target > 1 ? `${progress}/${objective.target}` : `+${OBJECTIVE_XP} XP`}
            </span>
          </li>
        ))}
      </ul>
      <p className="objectives__reward">
        {tr(
          `Chaque objectif : +${OBJECTIVE_XP} XP et +${OBJECTIVE_SPARKS} étincelles. De nouveaux demain.`,
          `Each goal: +${OBJECTIVE_XP} XP and +${OBJECTIVE_SPARKS} sparks. New ones tomorrow.`,
        )}
      </p>
      <button type="button" className="wardrobe-link" onClick={() => navigate({ name: 'wardrobe' })}>
        <Mascot size={44} still />
        <span className="wardrobe-link__text">
          <span className="wardrobe-link__title">{tr('Le vestiaire', 'The wardrobe')}</span>
          <span className="wardrobe-link__sub">
            {status.nextShop
              ? status.balance >= status.nextShop.price
                ? tr(`De quoi offrir : ${status.nextShop.name}`, `You can afford: ${status.nextShop.name}`)
                : tr(`Prochain : ${status.nextShop.name}, ${status.nextShop.price}`, `Next: ${status.nextShop.name}, ${status.nextShop.price}`)
              : tr('La boutique est au complet\u00a0!', 'You own the whole shop!')}
          </span>
        </span>
        <span className="wardrobe-link__balance">
          <Icon name="spark" size={16} />
          {status.balance}
          <span className="sr-only">{tr(' étincelles', ' sparks')}</span>
        </span>
      </button>
    </section>
  );
}

/** Reprendre le dernier jeu joué en entraînement libre, au niveau conseillé. */
function ResumeCard({ gameId }: { gameId: GameId }) {
  const data = useProgress();
  const meta = GAMES[gameId];
  return (
    <button type="button" className="card card--action resume-card" onClick={() => navigate({ name: 'play', gameId })}>
      <GameArt gameId={gameId} size={44} />
      <span className="card__text">
        <span className="card__title">{tr(`Reprendre : ${meta.name}`, `Resume: ${meta.name}`)}</span>
        <span className="card__sub">
          {tr(`Niveau ${gameLevel(data, gameId)} · ${DOMAINS[meta.domain].name}`, `Level ${gameLevel(data, gameId)} · ${DOMAINS[meta.domain].name}`)}
        </span>
      </span>
      <Icon name="play" />
    </button>
  );
}

/** Accès direct aux six thèmes de l'entraînement. */
function ThemesRow() {
  return (
    <section aria-labelledby="themes-row-title">
      <h2 className="section-title" id="themes-row-title">
        {tr('S’entraîner par thème', 'Train by area')}
      </h2>
      <div className="theme-row">
        {DOMAIN_ORDER.map((domain) => (
          <button
            key={domain}
            type="button"
            className="theme-chip"
            onClick={() => navigate({ name: 'training', domain })}
            style={{ '--tile': `var(--d-${domain})` } as CSSProperties}
          >
            <span className="theme-chip__icon">
              <Icon name={domain} size={18} />
            </span>
            {DOMAINS[domain].name}
          </button>
        ))}
      </div>
    </section>
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

/** Ta semaine : les 7 derniers jours (un tampon par jour joué) et le défi de la semaine. */
function WeekCard() {
  const data = useProgress();
  const today = useToday();
  const playedDays = new Set(data.plays.map((p) => p.day));
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const challenge = weeklyChallenge(today);
  const progress = Math.min(challenge.target, challengeProgress(challenge, data.plays, data.extras.sessions));
  const done = progress >= challenge.target;
  const daysLeft = dayIndex(addDays(challenge.week, 6)) - dayIndex(today) + 1;
  return (
    <section className="week-card" aria-labelledby="week-title">
      <h2 className="section-title" id="week-title">
        {tr('Ta semaine', 'Your week')}
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
      <div className={`weekly${done ? ' is-done' : ''}`}>
        <span className="weekly__icon" aria-hidden="true">
          <Icon name={done ? 'check' : 'target'} size={20} />
        </span>
        <div className="weekly__text">
          <h3 className="weekly__title">{tr('Défi de la semaine', 'Weekly challenge')}</h3>
          <p className="weekly__label">{challenge.label}</p>
          <span className="mini-bar" aria-hidden="true">
            <span style={{ transform: `scaleX(${progress / challenge.target})` }} />
          </span>
          <p className="weekly__meta">
            {done
              ? tr(`Relevé ! +${WEEKLY_XP} XP`, `Done! +${WEEKLY_XP} XP`)
              : `${progress} / ${challenge.target} · +${WEEKLY_XP} XP · ${
                  daysLeft === 1
                    ? tr('dernier jour', 'last day')
                    : tr(byCount(daysLeft, `encore ${daysLeft}\u00a0jour`, `encore ${daysLeft}\u00a0jours`), `${plural(daysLeft, 'day')} left`)
                }`}
          </p>
        </div>
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
