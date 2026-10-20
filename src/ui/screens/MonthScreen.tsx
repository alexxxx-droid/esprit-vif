import { useMemo, useState } from 'react';
import { dayKey } from '../../core/daily';
import { formatMonth } from '../../core/format';
import { DOMAIN_ORDER, DOMAINS, GAMES } from '../../core/games/registry';
import { tr } from '../../core/lang';
import { durationLabel, monthlyReport, previousMonth, type MonthReport } from '../../core/summary';
import { DomainBadge } from '../components/bits';
import { GameArt } from '../components/GameArt';
import { Icon } from '../components/Icon';
import { Mascot } from '../components/Mascot';
import { ShareButton } from '../components/ShareButton';
import { useProgress } from '../progress-context';
import { navigate } from '../router';
import { renderCard } from '../share-card';
import { usePremium } from '../theme';

function goBack() {
  if (history.length > 1) history.back();
  else navigate({ name: 'progress' }, { replace: true });
}

const nextMonth = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};

/** Le bilan d'un mois (Premium) : une carte illustrée, tirée des seules parties du mois, à partager. */
export function MonthScreen() {
  const data = useProgress();
  const premium = usePremium();
  const current = dayKey().slice(0, 7);
  const first = data.plays[0]?.day.slice(0, 7) ?? current;
  const [month, setMonth] = useState(current);
  const report = useMemo(() => monthlyReport(data.plays, data.tests, month), [data.plays, data.tests, month]);
  const name = formatMonth(`${month}-01`);

  return (
    <div className="screen screen-in month">
      <header className="theme-head">
        <button type="button" className="icon-btn" onClick={goBack} aria-label={tr('Retour', 'Back')}>
          <Icon name="back" />
        </button>
        <div>
          <h1 className="screen-title">{tr('Bilan du mois', 'Monthly recap')}</h1>
          <p className="screen-subtitle">{tr('Tes parties du mois, en une carte.', 'Your games of the month, on one card.')}</p>
        </div>
      </header>

      <div className="month__nav">
        <button type="button" className="icon-btn icon-btn--flat" onClick={() => setMonth(previousMonth(month))} disabled={month <= first} aria-label={tr('Mois précédent', 'Previous month')}>
          <Icon name="back" />
        </button>
        <strong className="month__name">{name}</strong>
        <button
          type="button"
          className="icon-btn icon-btn--flat icon-btn--next"
          onClick={() => setMonth(nextMonth(month))}
          disabled={month >= current}
          aria-label={tr('Mois suivant', 'Next month')}
        >
          <Icon name="back" />
        </button>
      </div>

      {!report.plays ? (
        <p className="empty empty--vif">
          <Mascot mood="sleep" size={48} />
          {tr('Aucune partie ce mois-ci : le bilan se remplit dès la première.', 'No games this month: the recap fills up from the first one.')}
        </p>
      ) : premium ? (
        <Report report={report} name={name} />
      ) : (
        <div className="teaser teaser--locked">
          <div className="teaser__content" aria-hidden="true">
            <Report report={report} name={name} />
          </div>
          <div className="teaser__veil teaser__veil--card">
            <Icon name="lock" size={20} />
            <span>{tr(`Ton bilan de ${name} est prêt. Il fait partie d’Esprit Vif Premium.`, `Your ${name} recap is ready. It comes with Esprit Vif Premium.`)}</span>
            <button type="button" className="btn btn--primary" onClick={() => navigate({ name: 'premium' })}>
              {tr('Découvrir Premium', 'Discover Premium')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Report({ report, name }: { report: MonthReport; name: string }) {
  const most = Math.max(1, ...Object.values(report.domains).map((n) => n ?? 0));
  const delta = report.plays - report.previous.plays;
  return (
    <>
      <section className="month-card">
        <div className="month-card__head">
          <div>
            <p className="month-card__kicker">{tr('Mon mois', 'My month')}</p>
            <h2 className="month-card__title">{name}</h2>
            {/* Seulement les bonnes nouvelles : un mois en cours ne se compare pas à un mois entier, et jamais pour culpabiliser. */}
            {report.previous.plays > 0 && delta > 0 && (
              <p className="month-card__compare">{tr(`${delta} parties de plus que le mois d’avant`, `${delta} more games than the month before`)}</p>
            )}
          </div>
          <Mascot mood="cheer" size={84} hat="couronne-etoilee" className="month-card__vif" />
        </div>
        <dl className="month-card__grid">
          <div>
            <dt>{tr('Parties', 'Games')}</dt>
            <dd>{report.plays}</dd>
          </div>
          <div>
            <dt>{tr('Jours actifs', 'Active days')}</dt>
            <dd>{report.days}</dd>
          </div>
          <div>
            <dt>{tr('Temps de jeu', 'Play time')}</dt>
            <dd>{report.timeMs ? durationLabel(report.timeMs) : '—'}</dd>
          </div>
          <div>
            <dt>{tr('Score moyen', 'Average score')}</dt>
            <dd>{report.average ?? '—'}</dd>
          </div>
        </dl>
        <ul className="month-card__facts">
          {report.favorite && (
            <li>
              <GameArt gameId={report.favorite.gameId} size={34} />
              <span>
                {tr('Jeu préféré', 'Favorite game')} : <strong>{GAMES[report.favorite.gameId].name}</strong>
                <small>{tr(`${report.favorite.plays} parties`, `${report.favorite.plays} games`)}</small>
              </span>
            </li>
          )}
          {report.bestGain && (
            <li>
              <GameArt gameId={report.bestGain.gameId} size={34} />
              <span>
                {tr('Plus beau progrès', 'Biggest gain')} : <strong>{GAMES[report.bestGain.gameId].name}</strong>
                <small>{tr(`moyenne ${report.bestGain.before} → ${report.bestGain.now}`, `average ${report.bestGain.before} → ${report.bestGain.now}`)}</small>
              </span>
            </li>
          )}
          <li>
            <span className="month-card__icon">
              <Icon name="star" size={18} />
            </span>
            <span>
              <strong>{report.records}</strong> {tr('records battus', 'best scores beaten')} · <strong>{report.stars}</strong> {tr('étoiles', 'stars')}
            </span>
          </li>
          <li>
            <span className="month-card__icon">
              <Icon name="check" size={18} />
            </span>
            <span>
              <strong>{report.objectives}</strong> {tr('objectifs remplis', 'goals completed')} · <strong>{report.tests}</strong> {tr('tests du jour', 'daily tests')}
              {report.bestAge !== null && <small>{tr(`meilleur âge cérébral : ${report.bestAge} ans`, `best brain age: ${report.bestAge}`)}</small>}
            </span>
          </li>
        </ul>
        <ul className="month-card__domains">
          {DOMAIN_ORDER.filter((d) => report.domains[d]).map((d) => (
            <li key={d}>
              <DomainBadge domain={d} size={26} />
              <span className="month-card__domain-name">{DOMAINS[d].name}</span>
              <span className="bar" aria-hidden="true">
                <span className={`bar__fill bar__fill--${d}`} style={{ width: `${((report.domains[d] ?? 0) / most) * 100}%` }} />
              </span>
              <span className="month-card__domain-n">{report.domains[d]}</span>
            </li>
          ))}
        </ul>
      </section>
      <ShareButton
        label={tr('Partager mon bilan', 'Share my recap')}
        build={async () => ({
          image: await renderCard(
            {
              kind: 'month',
              month: name,
              figures: [
                [String(report.plays), tr('parties', 'games')],
                [String(report.days), tr('jours actifs', 'active days')],
                [String(report.records), tr('records', 'best scores')],
                [String(report.stars), tr('étoiles', 'stars')],
              ],
              line: report.favorite ? tr(`Jeu préféré : ${GAMES[report.favorite.gameId].name}`, `Favorite game: ${GAMES[report.favorite.gameId].name}`) : undefined,
              mascot: document.querySelector<SVGSVGElement>('.month-card__vif'),
            },
            name,
          ),
          name: `esprit-vif-${report.month}.png`,
          text: tr(
            `Mon mois sur Esprit Vif : ${report.plays} parties en ${report.days} jours. https://alexxxx-droid.github.io/esprit-vif/`,
            `My month on Esprit Vif: ${report.plays} games over ${report.days} days. https://alexxxx-droid.github.io/esprit-vif/`,
          ),
        })}
      />
    </>
  );
}
