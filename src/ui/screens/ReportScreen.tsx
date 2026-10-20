import { useEffect } from 'react';
import { placement } from '../../core/placement';
import { byCount, formatLongDay, plural } from '../../core/format';
import { DOMAINS, GAMES, gamesOfDomain } from '../../core/games/registry';
import { tr } from '../../core/lang';
import { SPARKS } from '../../core/objectives';
import { XP_BONUS } from '../../core/progression';
import { MAX_BRAIN_AGE, MIN_BRAIN_AGE } from '../../core/scoring';
import { officialTests, type TestRecord } from '../../store/progress';
import { GameArt } from '../components/GameArt';
import { Mascot } from '../components/Mascot';
import { ShareButton } from '../components/ShareButton';
import { renderCard } from '../share-card';
import { Icon } from '../components/Icon';
import { useCountUp, useToday } from '../hooks';
import { useProgress, useStore } from '../progress-context';
import { navigate } from '../router';

function verdict(age: number, previous: number | undefined): string {
  if (previous === undefined)
    return tr(
      'Premier test : voici ton point de départ. Reviens demain pour voir ta progression !',
      'First test: this is your starting point. Come back tomorrow to see your progress!',
    );
  const diff = age - previous;
  if (diff < 0)
    return tr(
      byCount(-diff, `${-diff}\u00a0an de moins qu’au test précédent. Bravo !`, `${-diff}\u00a0ans de moins qu’au test précédent. Bravo !`),
      `${plural(-diff, 'year')} younger than your last test. Well done!`,
    );
  if (diff === 0) return tr('Comme au test précédent. La régularité, c’est ce qui compte !', 'Same as your last test. Sticking with it is what counts!');
  return tr(
    byCount(
      diff,
      `${diff}\u00a0an de plus qu’au test précédent. Un jour sans, ça arrive : on se retrouve demain ?`,
      `${diff}\u00a0ans de plus qu’au test précédent. Un jour sans, ça arrive : on se retrouve demain ?`,
    ),
    `${plural(diff, 'year')} older than your last test. Everyone has off days: see you tomorrow?`,
  );
}

export function ReportScreen({ testId }: { testId: string }) {
  const data = useProgress();
  const store = useStore();
  const today = useToday();
  const test = data.tests.find((t) => t.id === testId && t.done && t.brainAge !== undefined) ?? null;
  const shown = useCountUp(test?.brainAge ?? MAX_BRAIN_AGE, 1100);
  const firstOfficial = Boolean(test?.official) && !officialTests(data).some((t) => test && t.id !== test.id && t.startedAt < test.startedAt);

  // Le tout premier test officiel sert de bilan de départ : il place les niveaux, une seule fois.
  useEffect(() => {
    if (!test || !firstOfficial || data.settings.placementDone || test.day !== today) return;
    void store.placeLevels(placement(test.results)).then(() => store.updateSettings({ placementDone: true }));
  }, [test, firstOfficial, data.settings.placementDone, today, store]);

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
  // Les jeux changent chaque jour : on compare à la dernière fois où ce jeu est passé dans un test.
  const scoreBefore = (gameId: string) => data.plays.findLast((p) => p.gameId === gameId && p.mode === 'daily' && p.at < test.startedAt)?.score;
  const previousAge = previous?.brainAge;
  const dayScore = Math.round(test.results.reduce((sum, r) => sum + r.score, 0) / Math.max(1, test.results.length));

  return (
    <div className="screen screen-in report">
      <p className="report__kicker">
        {test.official ? tr('Test du jour', 'Daily test') : tr('Test pour le plaisir', 'Just-for-fun test')} · {formatLongDay(test.day)}
      </p>

      <section className="hero report__hero" aria-label={tr('Âge cérébral', 'Brain age')}>
        <div className="hero__glow" aria-hidden="true" />
        <p className="hero__label">{tr('Âge cérébral', 'Brain age')}</p>
        <p className="hero__age" aria-label={tr(`${test.brainAge} ans`, `${test.brainAge} years`)}>
          <span className="hero__value">{shown}</span>
          <span className="hero__unit">{tr('ans', 'years')}</span>
        </p>
        <AgeScale age={test.brainAge} previous={previous?.brainAge} />
        <p className="report__verdict">
          <Mascot mood={previousAge === undefined || test.brainAge < previousAge ? 'cheer' : test.brainAge === previousAge ? 'happy' : 'gentle'} size={52} />
          <span>{verdict(test.brainAge, previous?.brainAge)}</span>
        </p>
      </section>

      <section className="card" aria-labelledby="scores-title">
        <h2 className="section-title report__day-score" id="scores-title">
          {tr('Score du jour', 'Today’s score')}
          <span>{dayScore} / 100</span>
        </h2>
        <p className="card__sub report__formula">
          {tr(
            `La moyenne des trois jeux. Âge cérébral = 80 − 0,6 × ${dayScore}, entre 20 et 80 ans.`,
            `The average of the three games. Brain age = 80 − 0.6 × ${dayScore}, between 20 and 80.`,
          )}
        </p>
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

      {firstOfficial && data.settings.placementDone && (
        <section className="card placement" aria-labelledby="placement-title">
          <h2 className="section-title" id="placement-title">
            {tr('Tes niveaux de départ', 'Your starting levels')}
          </h2>
          <ul className="placement__list">
            {[...new Set(test.results.map((r) => GAMES[r.gameId].domain))].map((domain) => {
              const start = data.games[gamesOfDomain(domain)[0]]?.start ?? 1;
              return (
                <li key={domain}>
                  <strong>{DOMAINS[domain].name}</strong>
                  <span>
                    {start > 1
                      ? tr(`niveaux 1 à ${start} ouverts d’emblée`, `levels 1 to ${start} unlocked right away`)
                      : tr('on commence au niveau 1', 'starting at level 1')}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="card__sub">
            {tr('Les autres domaines démarrent au niveau 1 : chaque étoile ouvre la suite.', 'The other areas start at level 1: each star unlocks the next one.')}
          </p>
        </section>
      )}

      {test.official && (
        <p className="report__rewards">
          <Icon name="spark" size={18} />
          {tr(
            `Test du jour : +${XP_BONUS.test} XP et +${SPARKS.test} étincelles, en plus de chaque partie. Tu peux rejouer ces jeux en entraînement libre : le test, lui, ne compte qu’une fois par jour.`,
            `Daily test: +${XP_BONUS.test} XP and +${SPARKS.test} sparks, on top of each game. You can replay these games in free training: the test itself only counts once a day.`,
          )}
        </p>
      )}

      {!test.official && (
        <p className="notice">
          <Icon name="info" size={20} />
          {tr(
            'Le test officiel du jour était déjà fait : celui-ci ne compte pas dans tes progrès.',
            'Today’s official test was already done: this one doesn’t count toward your progress.',
          )}
        </p>
      )}

      <ShareButton
        label={tr('Partager mon âge cérébral', 'Share my brain age')}
        build={async () => ({
          image: await renderCard(
            { kind: 'age', age: test.brainAge ?? 0, verdict: verdict(test.brainAge ?? 0, previousAge), mascot: document.querySelector<SVGSVGElement>('.report__verdict .vif') },
            formatLongDay(test.day),
          ),
          name: `esprit-vif-age-${test.day}.png`,
          text: tr(
            `Mon âge cérébral du jour sur Esprit Vif : ${test.brainAge} ans (indicateur ludique). Et toi ? https://alexxxx-droid.github.io/esprit-vif/`,
            `My brain age today on Esprit Vif: ${test.brainAge} years (a playful indicator). What’s yours? https://alexxxx-droid.github.io/esprit-vif/`,
          ),
        })}
      />

      <p className="disclaimer">
        <Icon name="info" size={18} />
        {tr('Indicateur ludique, pas une mesure médicale.', 'A playful indicator, not a medical measure.')}
      </p>

      <button type="button" className="cta" onClick={() => navigate({ name: 'home' }, { replace: true })}>
        <span className="cta__text">
          <span className="cta__label">{tr('Terminer', 'Finish')}</span>
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
        <span>{tr(`${MIN_BRAIN_AGE} ans`, `${MIN_BRAIN_AGE} years`)}</span>
        {previous !== undefined && previous !== age && (
          <span className="age-scale__legend">
            <span className="age-scale__key" /> {tr('précédent', 'previous')}
          </span>
        )}
        <span>{tr(`${MAX_BRAIN_AGE} ans`, `${MAX_BRAIN_AGE} years`)}</span>
      </div>
    </div>
  );
}
