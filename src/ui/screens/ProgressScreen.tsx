import { useState } from 'react';
import { addMonths, bestStreak, currentStreak, monthGrid } from '../../core/daily';
import { byCount, formatLongDay, formatMonth, formatWeekday, plural } from '../../core/format';
import { DOMAIN_ORDER, DOMAINS, GAME_ORDER, GAMES } from '../../core/games/registry';
import { localized, tr } from '../../core/lang';
import { MEDAL_NAMES, MEDAL_ORDER, MEDAL_RULES, medalFor } from '../../core/progression';
import { seasonOf, SEASONS } from '../../core/events';
import { insights } from '../../core/insights';
import { domainMastery } from '../../core/stats';
import { bestOverall, gameUnlocked, officialTests, progressionInput } from '../../store/progress';
import { BrainAgeChart } from '../components/BrainAgeChart';
import { BrainMap } from '../components/BrainMap';
import { DomainBadge, ScreenHeader } from '../components/bits';
import { GameArt } from '../components/GameArt';
import { Icon } from '../components/Icon';
import { Mascot } from '../components/Mascot';
import { MedalBadge, RankBar } from '../components/progress-bits';
import { useToday } from '../hooks';
import { useProgress } from '../progress-context';
import { useProgression } from '../progression';
import { navigate } from '../router';
import { TROPHY_ICONS } from '../trophy-icons';

/** Les initiales des jours, du lundi au dimanche, dans la langue de l'interface. */
const weekdays = () => tr('LMMJVSD', 'MTWTFSS').split('');

type Tab = 'resume' | 'trophees' | 'records';
// Les libellés portent les deux langues : `tr` se choisit à l'affichage, jamais au chargement.
const TABS: { id: Tab; fr: string; en: string }[] = [
  { id: 'resume', fr: 'Résumé', en: 'Summary' },
  { id: 'trophees', fr: 'Trophées', en: 'Trophies' },
  { id: 'records', fr: 'Records', en: 'Best scores' },
];
const TAB_KEY = 'esprit-vif:progress-tab';

/** Onglet retenu d'une visite à l'autre : simple confort, l'écran marche sans. */
function useRememberedTab(): [Tab, (tab: Tab) => void] {
  const [tab, setTab] = useState<Tab>(() => {
    try {
      const saved = localStorage.getItem(TAB_KEY);
      return saved === 'trophees' || saved === 'records' ? saved : 'resume';
    } catch {
      return 'resume';
    }
  });
  const choose = (next: Tab) => {
    setTab(next);
    try {
      localStorage.setItem(TAB_KEY, next);
    } catch {
      // Stockage indisponible : l'onglet ne sera simplement pas retenu.
    }
  };
  return [tab, choose];
}

export function ProgressScreen() {
  const data = useProgress();
  const today = useToday();
  const playedDays = new Set(data.plays.map((p) => p.day));
  const tests = officialTests(data)
    .slice(-30)
    .filter((t) => t.brainAge !== undefined)
    .map((t) => ({ day: t.day, age: t.brainAge as number }));
  const profile = domainMastery(progressionInput(data).bests);
  const { rank, stars, trophies } = useProgression();
  const medals = GAME_ORDER.map((id) => medalFor(data.games[id]?.bests));
  const trophiesWon = trophies.filter((t) => t.unlocked).length;
  const [tab, setTab] = useRememberedTab();
  const notes = insights(data.plays, today);
  // Trophées gagnés d'abord, puis les plus proches d'être gagnés.
  const ratio = (t: (typeof trophies)[number]) => (t.unlocked ? 2 : t.progress ? t.progress[0] / t.progress[1] : 0);
  const sortedTrophies = [...trophies].sort((a, b) => ratio(b) - ratio(a));

  return (
    <div className="screen screen-in progress">
      <ScreenHeader title={tr('Progrès', 'Progress')} subtitle={tr('Ce qui compte, c’est la régularité.', 'What counts is showing up regularly.')} />

      <div className="tabs" role="tablist" aria-label={tr('Rubriques des progrès', 'Progress sections')}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className="tabs__tab"
            onClick={() => setTab(t.id)}
          >
            {localized(t)}
            {t.id === 'trophees' && <span className="tabs__count">{trophiesWon}</span>}
          </button>
        ))}
      </div>

      {tab === 'resume' && (
        <div className="tab-panel" role="tabpanel" id="panel-resume" aria-labelledby="tab-resume">
          <section className="card rank-card" aria-label={tr('Ton rang', 'Your rank')}>
            <RankBar rank={rank} />
            <div className="rank-card__stats">
              <span>
                <Icon name="star" size={16} />
                <strong>{stars}</strong> {tr(byCount(stars, 'étoile', 'étoiles'), byCount(stars, 'star', 'stars'))}
              </span>
              <span>
                <Icon name="trophy" size={16} />
                <strong>
                  {trophiesWon}
                  <small>/{trophies.length}</small>
                </strong>{' '}
                {tr('trophées', 'trophies')}
              </span>
              <span>
                <Icon name="medal" size={16} />
                <strong>
                  {medals.filter(Boolean).length}
                  <small>/{GAME_ORDER.length}</small>
                </strong>{' '}
                {tr('médailles', 'medals')}
              </span>
            </div>
          </section>

          <section className="card insights" aria-labelledby="insights-title">
            <h2 className="section-title" id="insights-title">
              {tr('Ce que disent tes parties', 'What your games say')}
            </h2>
            {notes.length ? (
              <ul className="insights__list">
                {notes.map((note) => (
                  <li key={note.id} className="insight">
                    <span className={`insight__icon insight__icon--${note.icon}`} aria-hidden="true">
                      <Icon name={note.icon} size={18} />
                    </span>
                    {note.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty empty--vif">
                <Mascot mood="think" size={48} />
                {tr('Joue quelques parties : je te dirai ce que j’y remarque.', 'Play a few games: I’ll tell you what I notice.')}
              </p>
            )}
          </section>

          <div className="tiles">
            <StatTile label={tr('Série en cours', 'Current streak')} value={currentStreak(playedDays, today)} unit={tr('jour', 'day')} icon="flame" />
            <StatTile label={tr('Meilleure série', 'Best streak')} value={bestStreak(playedDays)} unit={tr('jour', 'day')} icon="star" />
            <StatTile label={tr('Jours joués', 'Days played')} value={playedDays.size} unit={tr('jour', 'day')} icon="calendar" />
          </div>
          <p className="hint progress__rest">{tr('Un jour de repos par semaine ne casse pas ta série.', 'One rest day a week won’t break your streak.')}</p>

          <section className="card" aria-labelledby="curve-title">
            <h2 className="section-title" id="curve-title">
              {tr('Âge cérébral', 'Brain age')}
            </h2>
            <p className="card__sub">
              {tr(
                `Tes ${tests.length > 1 ? `${tests.length} derniers` : ''} tests du jour officiels`,
                `Your ${tests.length > 1 ? `last ${tests.length} ` : ''}official daily tests`,
              )}
            </p>
            {tests.length ? (
              <BrainAgeChart points={tests} />
            ) : (
              <Empty text={tr('Ta courbe apparaîtra après ton premier test du jour.', 'Your curve will appear after your first daily test.')} />
            )}
          </section>

          <section className="card" aria-labelledby="map-title">
            <h2 className="section-title" id="map-title">
              {tr('Carte du cerveau', 'Brain map')}
            </h2>
            <p className="card__sub">
              {tr('Ta maîtrise de chaque domaine : elle grandit avec les niveaux réussis', 'Your mastery of each area: it grows as you clear levels')}
            </p>
            <BrainMap profile={profile} />
          </section>

          <section className="card" aria-labelledby="domains-title">
            <h2 className="section-title" id="domains-title">
              {tr('Par domaine', 'By area')}
            </h2>
            <p className="card__sub">{tr('Sur 100 : 100, c’est le niveau 50 réussi sans faute', 'Out of 100: 100 means level 50 cleared perfectly')}</p>
            <ul className="score-bars score-bars--profile">
              {DOMAIN_ORDER.map((domain) => {
                const value = profile[domain];
                return (
                  <li key={domain} className="score-bar">
                    <div className="score-bar__head">
                      <DomainBadge domain={domain} size={32} />
                      <span className="score-bar__name">{DOMAINS[domain].name}</span>
                      <span className={`score-bar__value${value === null ? ' is-empty' : ''}`}>{value ?? tr('Pas encore joué', 'Not played yet')}</span>
                    </div>
                    <div className="bar" aria-hidden="true">
                      {value !== null && <span className={`bar__fill bar__fill--${domain}`} style={{ width: `${Math.max(2, value)}%` }} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <Calendar playedDays={playedDays} today={today} />
        </div>
      )}

      {tab === 'trophees' && (
        <div className="tab-panel" role="tabpanel" id="panel-trophees" aria-labelledby="tab-trophees">
          <section aria-labelledby="medals-title">
            <h2 className="section-title" id="medals-title">
              {tr('Médailles', 'Medals')}
            </h2>
            <ul className="medal-legend">
              {MEDAL_ORDER.map((medal) => (
                <li key={medal}>
                  <MedalBadge medal={medal} size={30} />
                  <span>
                    <strong>
                      {MEDAL_NAMES[medal]} · {medals.filter((m) => m === medal).length}
                    </strong>
                    <span className="medal-legend__rule">{MEDAL_RULES[medal]}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="trophies-title">
            <h2 className="section-title" id="trophies-title">
              {tr(`Trophées · ${trophiesWon}/${trophies.length}`, `Trophies · ${trophiesWon}/${trophies.length}`)}
            </h2>
            <ul className="trophies">
              {sortedTrophies.map((trophy) => (
                <li key={trophy.id} className={`trophy${trophy.unlocked ? ' is-won' : ''}`}>
                  <span className="trophy__icon" aria-hidden="true">
                    <Icon name={trophy.unlocked ? TROPHY_ICONS[trophy.icon] : 'lock'} size={20} />
                  </span>
                  <span className="trophy__name">{trophy.name}</span>
                  <span className="trophy__desc">{trophy.description}</span>
                  {trophy.season && <span className="trophy__season">{SEASONS.find((s) => s.id === trophy.season)?.name}</span>}
                  {trophy.unlocked ? (
                    <span className="trophy__state">{tr('Débloqué', 'Unlocked')}</span>
                  ) : trophy.season && seasonOf(today)?.id !== trophy.season ? (
                    <span className="trophy__state">
                      {tr(`De retour le ${seasonReturn(trophy.season, today)}`, `Back on ${seasonReturn(trophy.season, today)}`)}
                    </span>
                  ) : (
                    trophy.progress && (
                      <span className="trophy__state">
                        {trophy.progress[0]} / {trophy.progress[1]}
                      </span>
                    )
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {tab === 'records' && (
        <div className="tab-panel" role="tabpanel" id="panel-records" aria-labelledby="tab-records">
          <section aria-labelledby="records-title">
            <h2 className="section-title" id="records-title">
              {tr('Tes meilleurs scores, jeu par jeu', 'Your best scores, game by game')}
            </h2>
            <ul className="records">
              {GAME_ORDER.map((id, i) => {
                const best = bestOverall(data, id);
                const medal = medals[i];
                return (
                  <li key={id}>
                    <button type="button" className="record" onClick={() => navigate({ name: 'play', gameId: id })}>
                      <GameArt gameId={id} size={40} />
                      <span className="record__text">
                        <span className="record__name">{GAMES[id].name}</span>
                        <span className="record__detail">
                          {best
                            ? tr(
                                `${best.headline} · niveau ${best.level} · ${gameUnlocked(data, id)}/20 ouverts`,
                                `${best.headline} · level ${best.level} · ${gameUnlocked(data, id)}/20 unlocked`,
                              )
                            : tr('Pas encore de record', 'No best score yet')}
                        </span>
                      </span>
                      {medal && <MedalBadge medal={medal} size={26} />}
                      <span className="record__score">{best ? best.score : '—'}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

/** Prochaine ouverture d'une saison, en toutes lettres (« 15 octobre », « October 15 »). */
function seasonReturn(id: string, today: string): string {
  const season = SEASONS.find((s) => s.id === id);
  if (!season) return '';
  const year = Number(today.slice(0, 4));
  const thisYear = `${year}-${season.from}`;
  const next = thisYear > today ? thisYear : `${year + 1}-${season.from}`;
  return formatLongDay(next).split(' ').slice(1).join(' ');
}

function StatTile({ label, value, unit, icon }: { label: string; value: number; unit: string; icon: 'flame' | 'star' | 'calendar' }) {
  return (
    <div className="tile-stat">
      <span className={`tile-stat__icon tile-stat__icon--${icon}`}>
        <Icon name={icon} size={18} />
      </span>
      <span className="tile-stat__value">{value}</span>
      <span className="tile-stat__unit">{plural(value, unit).replace(/^\S+\s/, '')}</span>
      <span className="tile-stat__label">{label}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="empty">
      <Icon name="progress" size={22} />
      {text}
    </p>
  );
}

function Calendar({ playedDays, today }: { playedDays: Set<string>; today: string }) {
  const [thisYear, thisMonth] = today.split('-').map(Number);
  const [offset, setOffset] = useState(0);
  const [year, month] = addMonths(thisYear, thisMonth, offset);
  const cells = monthGrid(year, month);
  const firstDay = [...playedDays].sort()[0] ?? today;
  const [firstYear, firstMonth] = firstDay.split('-').map(Number);
  const minOffset = Math.min(0, (firstYear - thisYear) * 12 + (firstMonth - thisMonth));
  const playedThisMonth = cells.filter((d) => d && playedDays.has(d)).length;

  return (
    <section className="card calendar" aria-labelledby="calendar-title">
      <div className="calendar__head">
        <button
          type="button"
          className="icon-btn icon-btn--flat"
          onClick={() => setOffset(offset - 1)}
          disabled={offset <= minOffset}
          aria-label={tr('Mois précédent', 'Previous month')}
        >
          <Icon name="back" />
        </button>
        <div className="calendar__title">
          <h2 className="section-title" id="calendar-title">
            {formatMonth(`${year}-${String(month).padStart(2, '0')}-01`)}
          </h2>
          <p className="card__sub">
            {playedThisMonth
              ? tr(byCount(playedThisMonth, `${playedThisMonth}\u00a0jour d’entraînement`, `${playedThisMonth}\u00a0jours d’entraînement`), plural(playedThisMonth, 'training day'))
              : tr('Aucun entraînement ce mois-ci', 'No training this month')}
          </p>
        </div>
        <button
          type="button"
          className="icon-btn icon-btn--flat icon-btn--next"
          onClick={() => setOffset(offset + 1)}
          disabled={offset >= 0}
          aria-label={tr('Mois suivant', 'Next month')}
        >
          <Icon name="back" />
        </button>
      </div>
      <div className="calendar__grid" role="list">
        {weekdays().map((d, i) => (
          <span key={i} className="calendar__weekday" aria-hidden="true">
            {d}
          </span>
        ))}
        {cells.map((day, i) =>
          day ? (
            <span
              key={day}
              role="listitem"
              className={`calendar__day${playedDays.has(day) ? ' is-played' : ''}${day === today ? ' is-today' : ''}${day > today ? ' is-future' : ''}`}
              aria-label={
                playedDays.has(day)
                  ? tr(`${formatWeekday(day)} : entraînement fait`, `${formatWeekday(day)}: trained`)
                  : tr(`${formatWeekday(day)} : pas d’entraînement`, `${formatWeekday(day)}: no training`)
              }
            >
              {Number(day.slice(8))}
            </span>
          ) : (
            <span key={`blank-${i}`} aria-hidden="true" />
          ),
        )}
      </div>
    </section>
  );
}
