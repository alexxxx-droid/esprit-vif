import { useMemo } from 'react';
import { DOMAINS, GAMES } from '../../core/games/registry';
import { tr } from '../../core/lang';
import { MAX_LEVEL, starsFor } from '../../core/levels';
import { gameHistory } from '../../core/summary';
import type { GameId } from '../../core/types';
import { gameUnlocked } from '../../store/progress';
import { GameArt } from '../components/GameArt';
import { Icon } from '../components/Icon';
import { Mascot } from '../components/Mascot';
import { ScoreChart } from '../components/ScoreChart';
import { useProgress } from '../progress-context';
import { navigate } from '../router';
import { usePremium } from '../theme';

function goBack() {
  if (history.length > 1) history.back();
  else navigate({ name: 'progress' }, { replace: true });
}

/** L'historique détaillé d'un jeu (Premium) : tous les scores, chaque niveau, la tendance récente. */
export function HistoryScreen({ gameId }: { gameId: GameId }) {
  const premium = usePremium();
  const meta = GAMES[gameId];
  return (
    <div className="screen screen-in history">
      <header className="theme-head">
        <button type="button" className="icon-btn" onClick={goBack} aria-label={tr('Retour', 'Back')}>
          <Icon name="back" />
        </button>
        <GameArt gameId={gameId} size={44} />
        <div>
          <h1 className="screen-title">{meta.name}</h1>
          <p className="screen-subtitle">{tr(`Historique · ${DOMAINS[meta.domain].name}`, `History · ${DOMAINS[meta.domain].name}`)}</p>
        </div>
      </header>
      {premium ? <Details gameId={gameId} /> : <Locked />}
    </div>
  );
}

function Locked() {
  return (
    <section className="card history__locked">
      <Mascot mood="think" size={64} />
      <h2 className="section-title">{tr('L’historique détaillé fait partie de Premium', 'Detailed history is part of Premium')}</h2>
      <p className="card__sub">
        {tr(
          'La courbe de tous tes scores dans ce jeu, ton meilleur score à chaque niveau, et ta tendance récente. Tes records et tes statistiques restent gratuits.',
          'A chart of all your scores in this game, your best score on every level, and your recent trend. Your best scores and stats stay free.',
        )}
      </p>
      <button type="button" className="btn btn--primary" onClick={() => navigate({ name: 'premium' })}>
        {tr('Découvrir Premium', 'Discover Premium')}
      </button>
    </section>
  );
}

function Trend({ label, now, before, unit = '', lowerIsBetter = false }: { label: string; now: number | null; before: number | null; unit?: string; lowerIsBetter?: boolean }) {
  if (now === null) return null;
  const diff = before === null ? null : now - before;
  const good = diff !== null && (lowerIsBetter ? diff < 0 : diff > 0);
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {now}
        {unit}
        {diff !== null && diff !== 0 && (
          <span className={`delta ${good ? 'delta--good' : 'delta--soft'}`}>
            {diff > 0 ? '+' : '−'}
            {Math.abs(diff)}
          </span>
        )}
      </dd>
    </div>
  );
}

function Details({ gameId }: { gameId: GameId }) {
  const data = useProgress();
  const plays = useMemo(() => data.plays.filter((p) => p.gameId === gameId).sort((a, b) => a.at.localeCompare(b.at)), [data.plays, gameId]);
  const h = useMemo(() => gameHistory(data.plays, gameId), [data.plays, gameId]);
  const bests = data.games[gameId]?.bests ?? {};
  const unlocked = gameUnlocked(data, gameId);

  if (plays.length < 2) {
    return (
      <p className="empty empty--vif">
        <Mascot mood="hello" size={48} />
        {tr('Joue encore une partie ou deux : la courbe apparaîtra ici.', 'Play a game or two more: your chart will appear here.')}
      </p>
    );
  }

  return (
    <>
      <section className="card" aria-labelledby="curve-title">
        <h2 className="section-title" id="curve-title">
          {tr('Tous tes scores', 'All your scores')}
        </h2>
        <p className="card__sub">{tr(`${h.plays} parties, la plus ancienne à gauche`, `${h.plays} games, oldest on the left`)}</p>
        <ScoreChart points={plays.map((p) => ({ day: p.day, score: p.score, level: p.level }))} />
      </section>

      <section className="card" aria-labelledby="trend-title">
        <h2 className="section-title" id="trend-title">
          {tr('Tendance', 'Trend')}
        </h2>
        <p className="card__sub">{tr('Tes 10 dernières parties, comparées aux 10 d’avant.', 'Your last 10 games, compared with the 10 before.')}</p>
        <dl className="week-recap__grid">
          <Trend label={tr('Score moyen', 'Average score')} now={h.recent} before={h.before} />
          <div>
            <dt>{tr('Record', 'Best')}</dt>
            <dd>{h.best}</dd>
          </div>
          <Trend label={tr('Précision', 'Accuracy')} now={h.accuracy.recent} before={h.accuracy.before} unit=" %" />
          <Trend label={tr('Temps de réaction', 'Reaction time')} now={h.reaction.recent} before={h.reaction.before} unit=" ms" lowerIsBetter />
        </dl>
      </section>

      <section className="card" aria-labelledby="levels-title">
        <h2 className="section-title" id="levels-title">
          {tr('Niveau par niveau', 'Level by level')}
        </h2>
        <p className="card__sub">{tr(`Meilleur score de chaque niveau ouvert (${unlocked} sur ${MAX_LEVEL}).`, `Best score on each unlocked level (${unlocked} of ${MAX_LEVEL}).`)}</p>
        <ol className="level-bests">
          {Array.from({ length: unlocked }, (_, i) => i + 1).map((level) => {
            const best = bests[level]?.score;
            return (
              <li key={level} className={`level-best level-best--s${best === undefined ? 'x' : starsFor(best)}`}>
                <span className="level-best__n">{level}</span>
                <span className="level-best__score">{best ?? '—'}</span>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
