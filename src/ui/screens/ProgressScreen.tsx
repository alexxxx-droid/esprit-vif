import { useState } from 'react';
import { addMonths, bestStreak, currentStreak, monthGrid } from '../../core/daily';
import { formatMonth, formatWeekday, plural } from '../../core/format';
import { DOMAIN_ORDER, DOMAINS, GAME_ORDER, GAMES } from '../../core/games/registry';
import { domainProfile } from '../../core/stats';
import { bestOverall, officialTests } from '../../store/progress';
import { BrainAgeChart } from '../components/BrainAgeChart';
import { DomainBadge, ScreenHeader } from '../components/bits';
import { Icon } from '../components/Icon';
import { useToday } from '../hooks';
import { useProgress } from '../progress-context';
import { navigate } from '../router';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export function ProgressScreen() {
  const data = useProgress();
  const today = useToday();
  const playedDays = new Set(data.plays.map((p) => p.day));
  const tests = officialTests(data)
    .slice(-30)
    .filter((t) => t.brainAge !== undefined)
    .map((t) => ({ day: t.day, age: t.brainAge as number }));
  const profile = domainProfile(data.plays);

  return (
    <div className="screen screen-in progress">
      <ScreenHeader title="Progrès" subtitle="Ce qui compte, c’est la régularité." />

      <div className="tiles">
        <StatTile label="Série en cours" value={currentStreak(playedDays, today)} unit="jour" icon="flame" />
        <StatTile label="Meilleure série" value={bestStreak(playedDays)} unit="jour" icon="star" />
        <StatTile label="Jours joués" value={playedDays.size} unit="jour" icon="calendar" />
      </div>

      <section className="card" aria-labelledby="curve-title">
        <h2 className="section-title" id="curve-title">
          Âge cérébral
        </h2>
        <p className="card__sub">Tes {tests.length > 1 ? `${tests.length} derniers` : ''} tests du jour officiels</p>
        {tests.length ? (
          <BrainAgeChart points={tests} />
        ) : (
          <Empty text="Ta courbe apparaîtra après ton premier test du jour." />
        )}
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
                  <span className={`score-bar__value${value === null ? ' is-empty' : ''}`}>
                    {value ?? 'Pas encore joué'}
                  </span>
                </div>
                <div className="bar" aria-hidden="true">
                  {value !== null && (
                    <span className={`bar__fill bar__fill--${domain}`} style={{ width: `${Math.max(2, value)}%` }} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <Calendar playedDays={playedDays} today={today} />

      <section aria-labelledby="records-title">
        <h2 className="section-title" id="records-title">
          Records
        </h2>
        <ul className="records">
          {GAME_ORDER.map((id) => {
            const best = bestOverall(data, id);
            return (
              <li key={id}>
                <button type="button" className="record" onClick={() => navigate({ name: 'play', gameId: id })}>
                  <DomainBadge domain={GAMES[id].domain} size={36} />
                  <span className="record__text">
                    <span className="record__name">{GAMES[id].name}</span>
                    <span className="record__detail">
                      {best ? `${best.headline} · niveau ${best.level}` : 'Pas encore de record'}
                    </span>
                  </span>
                  <span className="record__score">{best ? best.score : '—'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
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
