import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { dailyGames, dailySeed } from '../../core/daily';
import { legendChallenge } from '../../core/legend';
import { DAILY_POOL, GAMES } from '../../core/games/registry';
import { tr } from '../../core/lang';
import { isMastery, masteryName, TOP_LEVEL } from '../../core/levels';
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
  // Après une partie, on revient à la page du thème du jeu.
  const quit = useCallback(() => navigate({ name: 'training', domain: meta.domain }, { replace: true }), [meta.domain]);
  return (
    <GameRunner
      key={gameId}
      meta={meta}
      level={gameLevel(data, gameId)}
      selectable
      mode="free"
      save={(outcome, run) => store.recordPlay({ gameId, level: run.level, mode: 'free', seed: run.seed, outcome })}
      actions={({ result, replay }) => {
        const next = result.level < Math.min(unlocked, TOP_LEVEL) ? result.level + 1 : null;
        return (
          <>
            {next && (
              <button type="button" className="btn btn--primary btn--lg" onClick={() => replay(next)} autoFocus>
                {isMastery(next) ? masteryName(next) : tr(`Niveau ${next}`, `Level ${next}`)}
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
    await store.startTest(dailyGames(today, DAILY_POOL));
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

/**
 * Le Défi Légende du jour : la même partie toute la journée, au plus haut niveau ouvert du jeu choisi.
 * On peut la rejouer pour battre son meilleur score ; les récompenses du défi ne comptent qu'une fois.
 */
export function LegendScreen() {
  const data = useProgress();
  const store = useStore();
  const today = useToday();
  const challenge = useMemo(() => legendChallenge(today, data.plays), [today, data.plays]);
  const quit = useCallback(() => navigate({ name: 'home' }, { replace: true }), []);

  useEffect(() => {
    if (!challenge) navigate({ name: 'home' }, { replace: true });
  }, [challenge]);

  if (!challenge) return null;
  const meta = GAMES[challenge.gameId];
  return (
    <GameRunner
      key={challenge.gameId}
      meta={meta}
      level={challenge.level}
      mode="legende"
      fixedSeed={challenge.seed}
      badge={tr('Défi Légende du jour', 'Daily Legend challenge')}
      save={(outcome, run) => store.recordPlay({ gameId: challenge.gameId, level: run.level, mode: 'legende', seed: run.seed, outcome })}
      actions={({ replay }) => (
        <>
          <button type="button" className="btn btn--primary btn--lg" onClick={() => replay()} autoFocus>
            <Icon name="replay" />
            {tr('Retenter le défi', 'Try the challenge again')}
          </button>
          <button type="button" className="btn btn--lg btn--ghost" onClick={quit}>
            {tr('Terminer', 'Finish')}
          </button>
        </>
      )}
      onQuit={quit}
    />
  );
}
