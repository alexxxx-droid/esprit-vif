import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { GameMeta } from '../../core/games/registry';
import { progressionDelta, type ProgressionDelta } from '../../core/progression';
import { randomSeed } from '../../core/rng';
import type { PlayMode, PlayOutcome } from '../../core/types';
import { progressionInput, type SavedPlay } from '../../store/progress';
import { fx } from '../fx/fx';
import { startMusic, stopMusic } from '../fx/music';
import { GAME_COMPONENTS, GAME_TUTORIALS } from '../games/catalog';
import { useStore } from '../progress-context';
import { GameChromeContext } from './chrome';
import { Countdown } from './Countdown';
import { GameIntro } from './GameIntro';
import { GameResult } from './GameResult';

type Phase = 'intro' | 'tutorial' | 'countdown' | 'play' | 'saving' | 'result';

interface Run {
  id: number;
  seed: number;
  level: number;
}

/** Ce qu'affiche l'écran de résultat. */
export interface RunResult {
  outcome: PlayOutcome;
  /** Partie enregistrée (null en duel : rien n'est gardé). */
  saved: SavedPlay | null;
  level: number;
  seed: number;
  delta: ProgressionDelta | null;
}

export interface RunnerActionsArgs {
  result: RunResult;
  /** Relance une partie, au même niveau ou au niveau indiqué. */
  replay: (level?: number) => void;
}

interface GameRunnerProps {
  meta: GameMeta;
  level: number;
  mode: PlayMode;
  /** Le joueur peut choisir son niveau parmi ceux qu'il a débloqués. */
  selectable?: boolean;
  /** Graine imposée (test officiel, duel) ; sinon une nouvelle graine à chaque partie. */
  fixedSeed?: number;
  /** Mention au-dessus du titre, par exemple « Test du jour · 1/3 ». */
  badge?: string;
  /** Texte du bouton de départ. */
  startLabel?: string;
  save: (outcome: PlayOutcome, run: { seed: number; level: number }) => Promise<SavedPlay | null>;
  actions: (args: RunnerActionsArgs) => ReactNode;
  onQuit: () => void;
}

/** Déroulé commun à tous les jeux : intro → 3-2-1 → partie → résultat. */
export function GameRunner({ meta, level, mode, selectable, fixedSeed, badge, startLabel, save, actions, onQuit }: GameRunnerProps) {
  const store = useStore();
  const [phase, setPhase] = useState<Phase>('intro');
  const [selected, setSelected] = useState(level);
  const [run, setRun] = useState<Run>({ id: 0, seed: 0, level });
  const [result, setResult] = useState<RunResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const chrome = useMemo(() => ({ title: meta.name, onQuit }), [meta.name, onQuit]);
  const chosen = selectable ? selected : level;

  const begin = (override?: number) => {
    const seed = fixedSeed ?? randomSeed();
    const playLevel = override ?? chosen;
    if (override !== undefined) setSelected(override);
    setRun((previous) => ({ id: previous.id + 1, seed, level: playLevel }));
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

  // L'ambiance du domaine accompagne la partie, puis s'efface au résultat (ou si l'on quitte).
  useEffect(() => {
    if (phase !== 'play') return;
    fx.start();
    startMusic(meta.domain);
    return () => stopMusic();
  }, [phase, meta.domain, run.id]);

  const finish = async (outcome: PlayOutcome) => {
    setPhase('saving');
    try {
      const before = progressionInput(store.getSnapshot());
      const saved = await save(outcome, { seed: run.seed, level: run.level });
      const delta = saved ? progressionDelta(before, progressionInput(store.getSnapshot()), meta.id, run.level) : null;
      if (delta && (delta.rankAfter.level > delta.rankBefore.level || delta.newTrophies.length || saved?.record === 'new')) fx.record();
      else fx.done();
      setResult({ outcome, saved, level: run.level, seed: run.seed, delta });
      setPhase('result');
    } catch {
      setNotice('Cette partie n’a pas pu être enregistrée. Réessaie quand tu veux.');
      setPhase('intro');
    }
  };

  // Toute la partie baigne dans la couleur de son domaine (halo, barre de progression).
  const tinted = (node: ReactNode) => (
    <div className="domain-scope" style={{ '--dom': `var(--d-${meta.domain})` } as CSSProperties}>
      {node}
    </div>
  );

  const Tutorial = GAME_TUTORIALS[meta.id];
  if (phase === 'tutorial' && Tutorial) {
    return tinted(<Tutorial level={chosen} onDone={(play) => (play ? begin() : setPhase('intro'))} />);
  }
  if (phase === 'intro') {
    return tinted(
      <GameIntro
        meta={meta}
        level={chosen}
        onLevelChange={selectable ? setSelected : undefined}
        badge={badge}
        notice={notice}
        startLabel={startLabel}
        onStart={() => begin()}
        onTutorial={Tutorial ? () => setPhase('tutorial') : undefined}
        onQuit={onQuit}
      />,
    );
  }
  if (phase === 'countdown') {
    return tinted(<Countdown title={meta.name} onDone={() => setPhase('play')} onQuit={onQuit} />);
  }
  if (phase === 'result' && result) {
    return tinted(
      <GameResult meta={meta} mode={mode} result={result}>
        {actions({ result, replay: begin })}
      </GameResult>,
    );
  }
  const Game = GAME_COMPONENTS[meta.id];
  return tinted(
    <GameChromeContext value={chrome}>
      <Game key={run.id} seed={run.seed} level={run.level} onFinish={finish} />
    </GameChromeContext>,
  );
}
