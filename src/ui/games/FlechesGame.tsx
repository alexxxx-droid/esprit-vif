import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { flechesAnswer, flechesLevel, FLECHES_TRIALS, generateFleches, scoreFleches, type Dir } from '../../core/games/fleches';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { Icon } from '../components/Icon';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameHud } from '../game/Hud';
import { useKeyDown } from '../hooks';

type Phase = 'fix' | 'stim' | 'fb';

const ROTATION: Record<Dir, number> = { right: 0, down: 90, left: 180, up: -90 };
const DIR_NAMES: Record<Dir, string> = { left: 'gauche', right: 'droite', up: 'haut', down: 'bas' };
const KEYS: Record<string, Dir> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

export function Arrow({ dir, size = 44 }: { dir: Dir; size?: number }) {
  return (
    <span className="arrow" style={{ transform: `rotate(${ROTATION[dir]}deg)` }}>
      <Icon name="arrow" size={size} strokeWidth={2.8} />
    </span>
  );
}

export function FlechesGame({ seed, level, onFinish }: GameProps) {
  const config = flechesLevel(level);
  const trials = useMemo(() => generateFleches(createRng(seed), level), [seed, level]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('fix');
  const [correct, setCorrect] = useState(0);
  const [rts, setRts] = useState<number[]>([]);
  const [mark, showMark] = useFeedback();
  const shownAt = useRef(0);
  const trial = trials[Math.min(index, trials.length - 1)];
  const done = index >= trials.length;

  const finish = useEffectEvent((total: number, times: number[]) => {
    const mean = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;
    onFinish({
      score: scoreFleches(total, mean, level),
      stats: { correct: total, meanRt: mean === null ? 0 : Math.round(mean) },
      headline: `${total}/${FLECHES_TRIALS} justes${mean ? ` · ${Math.round(mean)} ms` : ''}`,
      lines: [
        { label: 'Bonnes réponses', value: `${total} / ${FLECHES_TRIALS}` },
        { label: 'Temps de réaction moyen', value: mean ? `${Math.round(mean)} ms` : '—' },
      ],
    });
  });

  const record = (ok: boolean, rt: number | null) => {
    const total = correct + (ok ? 1 : 0);
    const times = ok && rt !== null ? [...rts, rt] : rts;
    setCorrect(total);
    setRts(times);
    setPhase('fb');
    return { total, times };
  };

  const timeout = useEffectEvent(() => {
    fx.bad();
    showMark('bad', 'Trop tard !');
    record(false, null);
  });

  useEffect(() => {
    if (done) return;
    if (phase === 'fix') {
      const id = window.setTimeout(() => {
        shownAt.current = performance.now();
        setPhase('stim');
      }, 450);
      return () => window.clearTimeout(id);
    }
    if (phase === 'stim') {
      const id = window.setTimeout(() => timeout(), config.windowMs);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => {
      if (index + 1 >= trials.length) finish(correct, rts);
      setIndex(index + 1);
      setPhase('fix');
    }, 280);
    return () => window.clearTimeout(id);
  }, [phase, index, done, trials.length, config.windowMs, correct, rts]);

  const answer = (dir: Dir) => {
    if (phase !== 'stim') return;
    const ok = dir === flechesAnswer(trial);
    if (ok) fx.good();
    else {
      fx.bad();
      showMark('bad', `C’était ${DIR_NAMES[flechesAnswer(trial)]}`);
    }
    record(ok, performance.now() - shownAt.current);
  };

  useKeyDown((e) => {
    const dir = KEYS[e.key];
    if (dir && (config.dirs === 4 || dir === 'left' || dir === 'right')) {
      e.preventDefault();
      answer(dir);
    }
  }, !done);

  const row = Array.from({ length: config.flankers * 2 + 1 }, (_, i) => (i === config.flankers ? trial.center : trial.flank));

  return (
    <div className="game">
      <GameHud progress={index / FLECHES_TRIALS}>
        <span className="chip">
          {Math.min(index + 1, FLECHES_TRIALS)}/{FLECHES_TRIALS}
        </span>
      </GameHud>
      <div className="game__stage fleches">
        {config.rule === 'switch' && phase !== 'fix' && (
          <p key={index} className={`fleches__ask fleches__ask--${trial.ask}`}>
            {trial.ask === 'center' ? 'Celle du milieu' : 'Les voisines'}
          </p>
        )}
        <div className="fleches__row" aria-live="polite" style={{ translate: `${trial.offset}% 0` }}>
          {phase === 'fix' ? (
            <span className="fleches__fix" aria-hidden="true">
              +
            </span>
          ) : (
            row.map((dir, i) => <Arrow key={i} dir={dir} />)
          )}
        </div>
        <p className="sr-only">
          {phase !== 'fix' && `Milieu : ${DIR_NAMES[trial.center]}, voisines : ${DIR_NAMES[trial.flank]}`}
        </p>
        <p className="fleches__hint">
          {config.rule === 'flank' ? 'Sens des flèches voisines ?' : config.rule === 'center' ? 'Sens de la flèche du milieu ?' : 'Suis la consigne !'}
        </p>
        <FeedbackMark mark={mark} />
      </div>
      <div className={`game__controls fleches__pad fleches__pad--${config.dirs}`}>
        {(config.dirs === 2 ? (['left', 'right'] as Dir[]) : (['up', 'left', 'right', 'down'] as Dir[])).map((dir) => (
          <TapButton key={dir} className={`dir-btn dir-btn--${dir}`} onTap={() => answer(dir)} aria-label={DIR_NAMES[dir]}>
            <Arrow dir={dir} size={34} />
          </TapButton>
        ))}
      </div>
    </div>
  );
}
