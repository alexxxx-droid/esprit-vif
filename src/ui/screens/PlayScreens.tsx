import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { dailyGames, dailySeed } from '../../core/daily';
import { DAILY_ROTATION, GAMES } from '../../core/games/registry';
import { tr } from '../../core/lang';
import { MAX_LEVEL } from '../../core/levels';
import type { GameId } from '../../core/types';
import { gameLevel, gameUnlocked, officialTests, testInProgress, type TestRecord } from '../../store/progress';
import { Icon } from '../components/Icon';
import { GameRunner } from '../game/GameRunner';
import { useToday } from '../hooks';
import { useProgress, useStore } from '../progress-context';
import { navigate } from '../router';

/** Entraînement libre : choix du niveau parmi ceux débloqués, étoiles, record, « Niveau suivant ». */
export function PlayScreen({ gameId }: { gameId: GameId }) {
  const data = useProgress();
  const store = useStore();
  const meta = GAMES[gameId];
  const unlocked = gameUnlocked(data, gameId);
  const quit = useCallback(() => navigate({ name: 'training' }, { replace: true }), []);
  return (
    <GameRunner
      key={gameId}
      meta={meta}
      level={gameLevel(data, gameId)}
      selectable
      mode="free"
      save={(outcome, run) => store.recordPlay({ gameId, level: run.level, mode: 'free', seed: run.seed, outcome })}
      actions={({ result, replay }) => {
        const next = result.level < Math.min(unlocked, MAX_LEVEL) ? result.level + 1 : null;
        return (
          <>
            {next && (
              <button type="button" className="btn btn--primary btn--lg" onClick={() => replay(next)} autoFocus>
                {tr(`Niveau ${next}`, `Level ${next}`)}
                <Icon name="arrow" />
              </button>
            )}
            <button type="button" className={`btn btn--lg${next ? '' : ' btn--primary'}`} onClick={() => replay()} autoFocus={!next}>
              <Icon name="replay" />
              {next ? tr('Rejouer ce niveau', 'Replay this level') : tr('Rejouer', 'Play again')}
            </button>
            <button type="button" className="btn btn--lg btn--ghost" onClick={quit}>
              {tr('Terminer', 'Finish')}
            </button>
          </>
        );
      }}
      onQuit={quit}
    />
  );
}

function nextPending(test: TestRecord): GameId | null {
  return test.games.find((g) => !test.results.some((r) => r.gameId === g)) ?? null;
}

/** Test du jour : trois jeux à niveau fixe, enchaînés, puis le bilan. */
/** Raccourci « Test du jour » : reprend le test commencé, sinon le commence ; déjà fait, son bilan. */
export function StartTestScreen() {
  const data = useProgress();
  const store = useStore();
  const today = useToday();
  const started = useRef(false);

  const go = useEffectEvent(async () => {
    if (testInProgress(data, today)) return navigate({ name: 'test' }, { replace: true });
    const done = officialTests(data).find((t) => t.day === today);
    if (done) return navigate({ name: 'report', testId: done.id }, { replace: true });
    await store.startTest(dailyGames(today, DAILY_ROTATION));
    navigate({ name: 'test' }, { replace: true });
  });

  useEffect(() => {
    // Une seule fois, même si l'effet est rejoué (mode strict) : sinon deux tests seraient créés.
    if (started.current) return;
    started.current = true;
    void go();
  }, []);

  return null;
}

export function DailyTestScreen() {
  const data = useProgress();
  const store = useStore();
  const today = useToday();
  const [testId] = useState(() => testInProgress(data, today)?.id ?? null);
  const test = data.tests.find((t) => t.id === testId) ?? null;
  const [current, setCurrent] = useState<GameId | null>(() => (test ? nextPending(test) : null));
  const quit = useCallback(() => navigate({ name: 'home' }, { replace: true }), []);

  useEffect(() => {
    if (!test || !current) navigate({ name: 'home' }, { replace: true });
  }, [test, current]);

  if (!test || !current) return null;

  const meta = GAMES[current];
  const position = test.games.indexOf(current) + 1;
  const following = nextPending(test);

  return (
    <GameRunner
      key={current}
      meta={meta}
      level={meta.dailyLevel}
      mode="daily"
      fixedSeed={test.official ? dailySeed(test.day, current) : undefined}
      badge={`${test.official ? tr('Test du jour', 'Daily test') : tr('Test pour le plaisir', 'Just-for-fun test')} · ${position}/${test.games.length}`}
      save={async (outcome, run) => {
        const saved = await store.recordPlay({
          gameId: current,
          level: run.level,
          mode: 'daily',
          seed: run.seed,
          outcome,
          testId: test.id,
        });
        await store.addTestResult(test.id, saved.play);
        return saved;
      }}
      actions={() =>
        following ? (
          <button type="button" className="btn btn--primary btn--lg" onClick={() => setCurrent(following)} autoFocus>
            {tr(`Jeu suivant : ${GAMES[following].name}`, `Next game: ${GAMES[following].name}`)}
            <Icon name="arrow" />
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary btn--lg"
            onClick={() => navigate({ name: 'report', testId: test.id }, { replace: true })}
            autoFocus
          >
            {tr('Voir mon bilan', 'See my report')}
            <Icon name="arrow" />
          </button>
        )
      }
      onQuit={quit}
    />
  );
}
