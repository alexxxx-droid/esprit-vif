import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { GameMeta } from '../../core/games/registry';
import { randomSeed } from '../../core/rng';
import type { PlayMode, PlayOutcome } from '../../core/types';
import type { SavedPlay } from '../../store/progress';
import { fx } from '../fx/fx';
import { GAME_COMPONENTS } from '../games/catalog';
import { GameChromeContext } from './chrome';
import { Countdown } from './Countdown';
import { GameIntro } from './GameIntro';
import { GameResult } from './GameResult';

type Phase = 'intro' | 'countdown' | 'play' | 'saving' | 'result';

interface Run {
  id: number;
  seed: number;
  level: number;
}

export interface RunnerActionsArgs {
  saved: SavedPlay;
  replay: () => void;
}

interface GameRunnerProps {
  meta: GameMeta;
  level: number;
  mode: PlayMode;
  /** Graine imposée (test officiel du jour) ; sinon une nouvelle graine à chaque partie. */
  fixedSeed?: number;
  /** Mention au-dessus du titre, par exemple « Test du jour · 1/3 ». */
  badge?: string;
  save: (outcome: PlayOutcome, run: { seed: number; level: number }) => Promise<SavedPlay>;
  actions: (args: RunnerActionsArgs) => ReactNode;
  onQuit: () => void;
}

/** Déroulé commun à tous les jeux : intro → 3-2-1 → partie → résultat. */
export function GameRunner({ meta, level, mode, fixedSeed, badge, save, actions, onQuit }: GameRunnerProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [run, setRun] = useState<Run>({ id: 0, seed: 0, level });
  const [result, setResult] = useState<{ outcome: PlayOutcome; saved: SavedPlay } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const chrome = useMemo(() => ({ title: meta.name, onQuit }), [meta.name, onQuit]);

  const begin = () => {
    const seed = fixedSeed ?? randomSeed();
    setRun((previous) => ({ id: previous.id + 1, seed, level }));
    setResult(null);
    setNotice(null);
    setPhase('countdown');
  };

  // Quitter l'appli en pleine partie fausserait le chrono : la partie est annulée, sans reproche.
  useEffect(() => {
    if (phase !== 'countdown' && phase !== 'play') return;
    const onVisibility = () => {
      if (document.visibilityState !== 'hidden') return;
      setPhase('intro');
      setNotice('Partie interrompue. Elle reprendra depuis le début quand tu voudras.');
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [phase]);

  const finish = async (outcome: PlayOutcome) => {
    setPhase('saving');
    try {
      const saved = await save(outcome, { seed: run.seed, level: run.level });
      if (saved.record === 'new') fx.record();
      else fx.done();
      setResult({ outcome, saved });
      setPhase('result');
    } catch {
      setNotice('Cette partie n’a pas pu être enregistrée. Réessaie quand tu veux.');
      setPhase('intro');
    }
  };

  if (phase === 'intro') {
    return <GameIntro meta={meta} level={level} badge={badge} notice={notice} onStart={begin} onQuit={onQuit} />;
  }
  if (phase === 'countdown') {
    return <Countdown title={meta.name} onDone={() => setPhase('play')} onQuit={onQuit} />;
  }
  if (phase === 'result' && result) {
    return (
      <GameResult meta={meta} mode={mode} outcome={result.outcome} saved={result.saved}>
        {actions({ saved: result.saved, replay: begin })}
      </GameResult>
    );
  }
  const Game = GAME_COMPONENTS[meta.id];
  return (
    <GameChromeContext value={chrome}>
      <Game key={run.id} seed={run.seed} level={run.level} onFinish={finish} />
    </GameChromeContext>
  );
}
