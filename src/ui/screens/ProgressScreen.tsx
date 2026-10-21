import { useState } from 'react';
import { addDays, addMonths, bestStreak, currentStreak, dayKey, monthGrid } from '../../core/daily';
import { byCount, formatLongDay, formatMonth, formatShortDay, formatWeekday, plural } from '../../core/format';
import { DOMAIN_ORDER, DOMAINS, GAME_ORDER, GAMES } from '../../core/games/registry';
import { localized, tr } from '../../core/lang';
import { MAX_LEVEL, masteryName } from '../../core/levels';
import { AURAS, highestPassed, masteryOf, MEDAL_NAMES, MEDAL_ORDER, MEDAL_RULES, medalFor, nextTitle } from '../../core/progression';
import { legendChallenge } from '../../core/legend';
import { durationLabel, recentPlays, totals, weeklyRecap } from '../../core/summary';
import { nextLevelTheme, themeName } from '../../core/themes';
import { seasonOf, SEASONS } from '../../core/events';
import { insights } from '../../core/insights';
import { domainMastery } from '../../core/stats';
import { bestOverall, gameUnlocked, officialTests, progressionInput, type PlayRecord } from '../../store/progress';
import { BrainAgeChart } from '../components/BrainAgeChart';
import { BrainMap } from '../components/BrainMap';
import { DomainBadge, ScreenHeader } from '../components/bits';
import { GameArt } from '../components/GameArt';
import { Icon, type IconName } from '../components/Icon';
import { Mascot } from '../components/Mascot';
import { MedalBadge, RankBar } from '../components/progress-bits';
import { useToday } from '../hooks';
import { useProgress } from '../progress-context';
import { useProgression } from '../progression';
import { navigate } from '../router';
import { TROPHY_ICONS } from '../trophy-icons';
import { useWardrobe } from '../wardrobe';
import { usePremium } from '../theme';

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

          <NextRewards />
          <WeekRecap plays={data.plays} today={today} />
          <KeyFigures plays={data.plays} />
          {data.plays.length > 0 && <MonthEntry />}

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

          {data.settings.showStreak ? (
            <>
              <div className="tiles">
                <StatTile label={tr('Série en cours', 'Current streak')} value={currentStreak(playedDays, today)} unit={dayUnit} icon="flame" />
                <StatTile label={tr('Meilleure série', 'Best streak')} value={bestStreak(playedDays)} unit={dayUnit} icon="star" />
                <StatTile label={tr('Jours joués', 'Days played')} value={playedDays.size} unit={dayUnit} icon="calendar" />
              </div>
              <p className="hint progress__rest">{tr('Un jour de repos par semaine ne casse pas ta série.', 'One rest day a week won’t break your streak.')}</p>
            </>
          ) : (
            <div className="tiles">
              <StatTile label={tr('Jours joués', 'Days played')} value={playedDays.size} unit={dayUnit} icon="calendar" />
            </div>
          )}

          <section className="card" aria-labelledby="curve-title">
            <h2 className="section-title" id="curve-title">
              {tr('Âge cérébral', 'Brain age')}
            </h2>
            <p className="card__sub">
              {tests.length > 1
                ? tr(`Tes ${tests.length} derniers tests du jour officiels`, `Your last ${tests.length} official daily tests`)
                : tr('Tes tests du jour officiels', 'Your official daily tests')}
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

          <RecentActivity plays={data.plays} today={today} />
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
                                `${best.headline} · niveau ${best.level} · ${Math.min(gameUnlocked(data, id), MAX_LEVEL)}/${MAX_LEVEL} ouverts${masteryOf(data.games[id]?.bests) ? ` · ${masteryName(MAX_LEVEL + masteryOf(data.games[id]?.bests))}` : ''}`,
                                `${best.headline} · level ${best.level} · ${Math.min(gameUnlocked(data, id), MAX_LEVEL)}/${MAX_LEVEL} unlocked${masteryOf(data.games[id]?.bests) ? ` · ${masteryName(MAX_LEVEL + masteryOf(data.games[id]?.bests))}` : ''}`,
                              )
                            : tr('Pas encore de record', 'No best score yet')}
                        </span>
                      </span>
                      {medal && <MedalBadge medal={medal} size={26} />}
                      <span className="record__score">{best ? best.score : '—'}</span>
                    </button>
                    {best && (
                      <button
                        type="button"
                        className="icon-btn icon-btn--flat record__history"
                        onClick={() => navigate({ name: 'history', gameId: id })}
                        aria-label={tr(`Historique de ${GAMES[id].name}`, `${GAMES[id].name} history`)}
                      >
                        <Icon name="progress" size={20} />
                      </button>
                    )}
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

/** Ce qui arrive bientôt : titre et thème du prochain niveau, chapeaux en vue. Vif le montre du doigt. */
function NextRewards() {
  const { rank } = useProgression();
  const status = useWardrobe();
  const title = nextTitle(rank.level);
  const theme = nextLevelTheme(rank.level);
  const rows: { key: string; icon: IconName; text: string; meta: string }[] = [];
  rows.push({ key: 'title', icon: 'crown', text: tr(`Titre « ${title[1]} »`, `“${title[1]}” title`), meta: tr(`niveau ${title[0]}`, `level ${title[0]}`) });
  const data = useProgress();
  if (!legendChallenge(dayKey(), data.plays) && !data.plays.some((p) => p.mode === 'legende')) {
    const best = Math.max(0, ...Object.values(data.games).map((g) => highestPassed(g?.bests)));
    rows.push({ key: 'legend', icon: 'crown', text: tr('Défi Légende du jour', 'Daily Legend challenge'), meta: tr(`niveau 40 · ${Math.min(best, 40)}/40`, `level 40 · ${Math.min(best, 40)}/40`) });
  }
  const aura = AURAS.find((a) => a.level > rank.level);
  if (aura && rank.level >= 50) rows.push({ key: 'aura', icon: 'spark', text: localized(aura.name), meta: tr(`niveau ${aura.level}`, `level ${aura.level}`) });
  if (theme) rows.push({ key: 'theme', icon: 'sun', text: tr(`Thème ${themeName(theme.id)}`, `${themeName(theme.id)} theme`), meta: tr(`niveau ${theme.unlock.level}`, `level ${theme.unlock.level}`) });
  if (status.nextPrestige) {
    const p = status.nextPrestige;
    rows.push({ key: 'prestige', icon: 'medal', text: p.name, meta: p.progress ? `${p.progress[0]} / ${p.progress[1]}` : p.rule });
  }
  if (status.nextShop) {
    const s = status.nextShop;
    rows.push({
      key: 'shop',
      icon: 'spark',
      text: s.name,
      meta: status.balance >= s.price ? tr('à portée !', 'within reach!') : `${status.balance} / ${s.price}`,
    });
  }
  if (!rows.length) return null;
  return (
    <section className="card next-rewards" aria-labelledby="next-title">
      <div className="next-rewards__head">
        <h2 className="section-title" id="next-title">
          {tr('Prochaines récompenses', 'Coming up next')}
        </h2>
        <Mascot mood="point" size={52} className="next-rewards__vif" />
      </div>
      <ul className="next-rewards__list">
        {rows.map((row) => (
          <li key={row.key}>
            <span className="next-rewards__icon" aria-hidden="true">
              <Icon name={row.icon} size={16} />
            </span>
            <span className="next-rewards__text">{row.text}</span>
            <span className="next-rewards__meta">{row.meta}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn--ghost next-rewards__link" onClick={() => navigate({ name: 'wardrobe' })}>
        {tr('Ouvrir le vestiaire', 'Open the wardrobe')}
        <Icon name="arrow" size={16} />
      </button>
    </section>
  );
}

/** Cette semaine face à la précédente : de quoi voir sa régularité, sans prétendre mesurer autre chose. */
function WeekRecap({ plays, today }: { plays: readonly PlayRecord[]; today: string }) {
  const { current, previous } = weeklyRecap(plays, today);
  const rows: { label: string; now: string; delta: number | null }[] = [
    { label: tr('Parties', 'Games'), now: String(current.plays), delta: current.plays - previous.plays },
    { label: tr('Jours actifs', 'Active days'), now: String(current.days), delta: current.days - previous.days },
    { label: tr('Temps de jeu', 'Play time'), now: current.timeMs ? durationLabel(current.timeMs) : '—', delta: null },
    {
      label: tr('Score moyen', 'Average score'),
      now: current.average === null ? '—' : String(current.average),
      delta: current.average !== null && previous.average !== null ? current.average - previous.average : null,
    },
  ];
  return (
    <section className="card week-recap" aria-labelledby="recap-title">
      <h2 className="section-title" id="recap-title">
        {tr('Ta semaine', 'Your week')}
      </h2>
      <p className="card__sub">
        {tr(`Depuis lundi ${formatShortDay(current.week)}, comparée à la semaine d’avant.`, `Since Monday ${formatShortDay(current.week)}, compared with the week before.`)}
      </p>
      {current.plays === 0 && previous.plays === 0 ? (
        <Empty text={tr('Pas encore de partie cette semaine : une seule suffit pour lancer le bilan.', 'No games yet this week: one is enough to start the recap.')} />
      ) : (
        <dl className="week-recap__grid">
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>
                {row.now}
                {row.delta !== null && row.delta !== 0 && (
                  <span className={`delta ${row.delta > 0 ? 'delta--good' : 'delta--soft'}`}>
                    {row.delta > 0 ? '+' : '−'}
                    {Math.abs(row.delta)}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/** Les chiffres de toujours, chacun calculé sur les parties qui le mesurent vraiment. */
function KeyFigures({ plays }: { plays: readonly PlayRecord[] }) {
  const t = totals(plays);
  if (!t.plays) return null;
  const daily = plays.filter((p) => p.mode === 'daily').length;
  return (
    <section className="card key-figures" aria-labelledby="figures-title">
      <h2 className="section-title" id="figures-title">
        {tr('En chiffres', 'By the numbers')}
      </h2>
      <dl className="key-figures__grid">
        <div>
          <dt>{tr('Parties terminées', 'Games finished')}</dt>
          <dd>{t.plays}</dd>
          <span className="key-figures__note">{tr(`dont ${daily} au test du jour`, `${daily} of them in daily tests`)}</span>
        </div>
        <div>
          <dt>{tr('Temps de jeu', 'Play time')}</dt>
          <dd>{t.timedPlays ? durationLabel(t.timeMs) : '—'}</dd>
          <span className="key-figures__note">
            {t.timedPlays === t.plays
              ? tr('chrono des parties seules', 'games only, no menus')
              : tr(
                  byCount(t.timedPlays, `mesuré sur ${t.timedPlays} partie (depuis la v2.9)`, `mesuré sur ${t.timedPlays} parties (depuis la v2.9)`),
                  byCount(t.timedPlays, `measured on ${t.timedPlays} game (since v2.9)`, `measured on ${t.timedPlays} games (since v2.9)`),
                )}
          </span>
        </div>
        <div>
          <dt>{tr('Précision', 'Accuracy')}</dt>
          <dd>{t.accuracy === null ? '—' : tr(`${t.accuracy}\u00a0%`, `${t.accuracy}%`)}</dd>
          <span className="key-figures__note">
            {t.accuracy === null
              ? tr('dans les jeux qui comptent les erreurs', 'in games that count mistakes')
              : tr(`bonnes réponses, sur ${t.accuracyPlays} parties`, `correct answers, over ${t.accuracyPlays} games`)}
          </span>
        </div>
        <div>
          <dt>{tr('Temps de réaction', 'Reaction time')}</dt>
          <dd>{t.reactionMs === null ? '—' : `${t.reactionMs} ms`}</dd>
          <span className="key-figures__note">
            {t.reactionMs === null ? tr('se mesure à Flèches et Réflexe', 'measured in Arrows and Reflex') : tr(`moyenne de ${t.reactionPlays} parties`, `average of ${t.reactionPlays} games`)}
          </span>
        </div>
      </dl>
    </section>
  );
}

/** Les dernières parties, avec leur score : ce que les chiffres résument. */
function RecentActivity({ plays, today }: { plays: readonly PlayRecord[]; today: string }) {
  const recent = recentPlays(plays, 6);
  return (
    <section className="card" aria-labelledby="recent-title">
      <h2 className="section-title" id="recent-title">
        {tr('Activité récente', 'Recent activity')}
      </h2>
      {recent.length ? (
        <ul className="recent">
          {recent.map((p) => (
            <li key={p.id} className="recent__item">
              <GameArt gameId={p.gameId} size={32} />
              <span className="recent__text">
                <span className="recent__name">{GAMES[p.gameId].name}</span>
                <span className="recent__meta">
                  {p.day === today ? tr('Aujourd’hui', 'Today') : p.day === addDays(today, -1) ? tr('Hier', 'Yesterday') : formatShortDay(p.day)} ·{' '}
                  {p.mode === 'daily' ? tr('test du jour', 'daily test') : tr(`niveau ${p.level}`, `level ${p.level}`)}
                </span>
              </span>
              <span className="recent__score">{p.score}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty text={tr('Tes parties apparaîtront ici. Commence par le test du jour !', 'Your games will show up here. Start with the daily test!')} />
      )}
    </section>
  );
}

/** L'accès au bilan du mois (Premium) : une ligne discrète, avec un cadenas sans Premium. */
function MonthEntry() {
  const premium = usePremium();
  return (
    <button type="button" className="card card--action month-entry" onClick={() => navigate({ name: 'month' })}>
      <span className="card__icon">
        <Icon name="calendar" />
      </span>
      <span className="card__text">
        <span className="card__title">{tr('Bilan du mois', 'Monthly recap')}</span>
        <span className="card__sub">
          {premium ? tr('Ta carte du mois, à garder ou à partager', 'Your month on one card, to keep or share') : tr('Inclus dans Premium · ton bilan est prêt', 'Included with Premium · your recap is ready')}
        </span>
      </span>
      <Icon name={premium ? 'arrow' : 'lock'} />
    </button>
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

/** L'unité des tuiles de série, accordée au nombre (chaque langue a son pluriel). */
function dayUnit(count: number): string {
  return tr(byCount(count, 'jour', 'jours'), byCount(count, 'day', 'days'));
}

function StatTile({ label, value, unit, icon }: { label: string; value: number; unit: (count: number) => string; icon: 'flame' | 'star' | 'calendar' }) {
  return (
    <div className="tile-stat">
      <span className={`tile-stat__icon tile-stat__icon--${icon}`}>
        <Icon name={icon} size={18} />
      </span>
      <span className="tile-stat__value">{value}</span>
      <span className="tile-stat__unit">{unit(value)}</span>
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
