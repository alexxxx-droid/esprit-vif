import { useState } from 'react';
import { addMonths, bestStreak, currentStreak, monthGrid } from '../../core/daily';
import { formatMonth, formatWeekday, plural } from '../../core/format';
import { DOMAIN_ORDER, DOMAINS, GAME_ORDER, GAMES } from '../../core/games/registry';
import { MEDAL_NAMES, MEDAL_ORDER, MEDAL_RULES, medalFor } from '../../core/progression';
import { insights } from '../../core/insights';
import { domainProfile } from '../../core/stats';
import { bestOverall, gameUnlocked, officialTests } from '../../store/progress';
import { BrainAgeChart } from '../components/BrainAgeChart';
import { BrainMap } from '../components/BrainMap';
import { DomainBadge, ScreenHeader } from '../components/bits';
import { GameArt } from '../components/GameArt';
import { Icon } from '../components/Icon';
import { MedalBadge, RankBar } from '../components/progress-bits';
import { useToday } from '../hooks';
import { useProgress } from '../progress-context';
import { useProgression } from '../progression';
import { navigate } from '../router';
import { TROPHY_ICONS } from '../trophy-icons';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

type Tab = 'resume' | 'trophees' | 'records';
const TABS: { id: Tab; label: string }[] = [
  { id: 'resume', label: 'Résumé' },
  { id: 'trophees', label: 'Trophées' },
  { id: 'records', label: 'Records' },
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
  const profile = domainProfile(data.plays);
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
      <ScreenHeader title="Progrès" subtitle="Ce qui compte, c’est la régularité." />

      <div className="tabs" role="tablist" aria-label="Rubriques des progrès">
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
            {t.label}
            {t.id === 'trophees' && <span className="tabs__count">{trophiesWon}</span>}
          </button>
        ))}
      </div>

      {tab === 'resume' && (
        <div className="tab-panel" role="tabpanel" id="panel-resume" aria-labelledby="tab-resume">
          <section className="card rank-card" aria-label="Ton rang">
            <RankBar rank={rank} />
            <div className="rank-card__stats">
              <span>
                <Icon name="star" size={16} />
                <strong>{stars}</strong> étoiles
              </span>
              <span>
                <Icon name="trophy" size={16} />
                <strong>{trophiesWon}</strong>/{trophies.length} trophées
              </span>
              <span>
                <Icon name="medal" size={16} />
                <strong>{medals.filter(Boolean).length}</strong>/{GAME_ORDER.length} médailles
              </span>
            </div>
          </section>

          <section className="card insights" aria-labelledby="insights-title">
            <h2 className="section-title" id="insights-title">
              Ce que disent tes parties
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
              <Empty text="Joue quelques parties : tes tendances apparaîtront ici." />
            )}
          </section>

          <div className="tiles">
            <StatTile label="Série en cours" value={currentStreak(playedDays, today)} unit="jour" icon="flame" />
            <StatTile label="Meilleure série" value={bestStreak(playedDays)} unit="jour" icon="star" />
            <StatTile label="Jours joués" value={playedDays.size} unit="jour" icon="calendar" />
          </div>
          <p className="hint progress__rest">Un jour de repos par semaine ne casse pas ta série.</p>

          <section className="card" aria-labelledby="curve-title">
            <h2 className="section-title" id="curve-title">
              Âge cérébral
            </h2>
            <p className="card__sub">Tes {tests.length > 1 ? `${tests.length} derniers` : ''} tests du jour officiels</p>
            {tests.length ? <BrainAgeChart points={tests} /> : <Empty text="Ta courbe apparaîtra après ton premier test du jour." />}
          </section>

          <section className="card" aria-labelledby="map-title">
            <h2 className="section-title" id="map-title">
              Carte du cerveau
            </h2>
            <p className="card__sub">Tes points forts d’un coup d’œil (moyenne des 5 dernières parties)</p>
            <BrainMap profile={profile} />
          </section>

          <section className="card" aria-labelledby="domains-title">
            <h2 className="section-title" id="domains-title">
              Par domaine
            </h2>
            <p className="card__sub">Moyenne de tes 5 dernières parties</p>
            <ul className="score-bars score-bars--profile">
              {DOMAIN_ORDER.map((domain) => {
                const value = profile[domain];
                return (
                  <li key={domain} className="score-bar">
                    <div className="score-bar__head">
                      <DomainBadge domain={domain} size={32} />
                      <span className="score-bar__name">{DOMAINS[domain].name}</span>
                      <span className={`score-bar__value${value === null ? ' is-empty' : ''}`}>{value ?? 'Pas encore joué'}</span>
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
              Médailles
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
              Trophées · {trophiesWon}/{trophies.length}
            </h2>
            <ul className="trophies">
              {sortedTrophies.map((trophy) => (
                <li key={trophy.id} className={`trophy${trophy.unlocked ? ' is-won' : ''}`}>
                  <span className="trophy__icon" aria-hidden="true">
                    <Icon name={trophy.unlocked ? TROPHY_ICONS[trophy.icon] : 'lock'} size={20} />
                  </span>
                  <span className="trophy__name">{trophy.name}</span>
                  <span className="trophy__desc">{trophy.description}</span>
                  {trophy.unlocked ? (
                    <span className="trophy__state">Débloqué</span>
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
              Records
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
                          {best ? `${best.headline} · niveau ${best.level} · ${gameUnlocked(data, id)}/20 ouverts` : 'Pas encore de record'}
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
          aria-label="Mois précédent"
        >
          <Icon name="back" />
        </button>
        <div className="calendar__title">
          <h2 className="section-title" id="calendar-title">
            {formatMonth(`${year}-${String(month).padStart(2, '0')}-01`)}
          </h2>
          <p className="card__sub">
            {playedThisMonth ? `${plural(playedThisMonth, 'jour')} d’entraînement` : 'Aucun entraînement ce mois-ci'}
          </p>
        </div>
        <button
          type="button"
          className="icon-btn icon-btn--flat icon-btn--next"
          onClick={() => setOffset(offset + 1)}
          disabled={offset >= 0}
          aria-label="Mois suivant"
        >
          <Icon name="back" />
        </button>
      </div>
      <div className="calendar__grid" role="list">
        {WEEKDAYS.map((d, i) => (
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
              aria-label={`${formatWeekday(day)} : ${playedDays.has(day) ? 'entraînement fait' : 'pas d’entraînement'}`}
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
