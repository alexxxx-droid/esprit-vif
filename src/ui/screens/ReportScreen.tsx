import { useEffect } from 'react';
import { formatLongDay, plural } from '../../core/format';
import { DOMAINS, GAMES } from '../../core/games/registry';
import { MAX_BRAIN_AGE, MIN_BRAIN_AGE } from '../../core/scoring';
import { officialTests, type TestRecord } from '../../store/progress';
import { GameArt } from '../components/GameArt';
import { Icon } from '../components/Icon';
import { useCountUp } from '../hooks';
import { useProgress } from '../progress-context';
import { navigate } from '../router';

function verdict(age: number, previous: number | undefined): string {
  if (previous === undefined) return 'Premier test : voici ton point de départ. Reviens demain pour voir ta progression !';
  const diff = age - previous;
  if (diff < 0) return `${plural(-diff, 'an')} de moins qu’au test précédent. Bravo !`;
  if (diff === 0) return 'Comme au test précédent. La régularité, c’est ce qui compte !';
  return `${plural(diff, 'an')} de plus qu’au test précédent. Un jour sans, ça arrive : on se retrouve demain ?`;
}

export function ReportScreen({ testId }: { testId: string }) {
  const data = useProgress();
  const test = data.tests.find((t) => t.id === testId && t.done && t.brainAge !== undefined) ?? null;
  const shown = useCountUp(test?.brainAge ?? MAX_BRAIN_AGE, 1100);

  useEffect(() => {
    if (!test) navigate({ name: 'home' }, { replace: true });
  }, [test]);

  // Un test terminé est un bon moment pour demander au navigateur de ne pas effacer les données.
  useEffect(() => {
    void navigator.storage?.persist?.().catch(() => false);
  }, []);

  if (!test || test.brainAge === undefined) return null;

  const official = officialTests(data).filter((t) => t.id !== test.id && t.startedAt < test.startedAt);
  const previous: TestRecord | undefined = official.at(-1);
  const scoreBefore = (gameId: string) => previous?.results.find((r) => r.gameId === gameId)?.score;

  return (
    <div className="screen screen-in report">
      <p className="report__kicker">
        {test.official ? 'Test du jour' : 'Test pour le plaisir'} · {formatLongDay(test.day)}
      </p>

      <section className="hero report__hero" aria-label="Âge cérébral">
        <div className="hero__glow" aria-hidden="true" />
        <p className="hero__label">Âge cérébral</p>
        <p className="hero__age" aria-label={`${test.brainAge} ans`}>
          <span className="hero__value">{shown}</span>
          <span className="hero__unit">ans</span>
        </p>
        <AgeScale age={test.brainAge} previous={previous?.brainAge} />
        <p className="report__verdict">{verdict(test.brainAge, previous?.brainAge)}</p>
      </section>

      <section className="card" aria-labelledby="scores-title">
        <h2 className="section-title" id="scores-title">
          Score par domaine
        </h2>
        <ul className="score-bars">
          {test.games.map((gameId) => {
            const result = test.results.find((r) => r.gameId === gameId);
            if (!result) return null;
            const meta = GAMES[gameId];
            const before = scoreBefore(gameId);
            const delta = before === undefined ? null : result.score - before;
            return (
              <li key={gameId} className="score-bar">
                <div className="score-bar__head">
                  <GameArt gameId={gameId} size={36} />
                  <span className="score-bar__name">
                    {DOMAINS[meta.domain].name}
                    <span className="score-bar__game">{meta.name}</span>
                  </span>
                  <span className="score-bar__value">
                    {result.score}
                    {delta !== null && delta !== 0 && (
                      <span className={`delta ${delta > 0 ? 'delta--good' : 'delta--soft'}`}>
                        {delta > 0 ? '+' : '−'}
                        {Math.abs(delta)}
                      </span>
                    )}
                  </span>
                </div>
                <div className="bar" aria-hidden="true">
                  <span className={`bar__fill bar__fill--${meta.domain}`} style={{ width: `${Math.max(2, result.score)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {!test.official && (
        <p className="notice">
          <Icon name="info" size={20} />
          Le test officiel du jour était déjà fait : celui-ci ne compte pas dans tes progrès.
        </p>
      )}

      <p className="disclaimer">
        <Icon name="info" size={18} />
        Indicateur ludique, pas une mesure médicale.
      </p>

      <button type="button" className="cta" onClick={() => navigate({ name: 'home' }, { replace: true })}>
        <span className="cta__text">
          <span className="cta__label">Terminer</span>
        </span>
        <span className="cta__icon">
          <Icon name="check" />
        </span>
      </button>
    </div>
  );
}

const position = (age: number) => ((age - MIN_BRAIN_AGE) / (MAX_BRAIN_AGE - MIN_BRAIN_AGE)) * 100;

/** Réglette 20 → 80 ans : le point plein est le test du jour, le point creux le test précédent. */
function AgeScale({ age, previous }: { age: number; previous?: number }) {
  return (
    <div className="age-scale" aria-hidden="true">
      <div className="age-scale__track">
        {previous !== undefined && previous !== age && (
          <span className="age-scale__dot age-scale__dot--previous" style={{ left: `${position(previous)}%` }} />
        )}
        <span className="age-scale__dot" style={{ left: `${position(age)}%` }} />
      </div>
      <div className="age-scale__labels">
        <span>{MIN_BRAIN_AGE} ans</span>
        {previous !== undefined && previous !== age && (
          <span className="age-scale__legend">
            <span className="age-scale__key" /> précédent
          </span>
        )}
        <span>{MAX_BRAIN_AGE} ans</span>
      </div>
    </div>
  );
}
