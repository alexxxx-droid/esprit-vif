import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { byCount, plural } from '../../core/format';
import { tr } from '../../core/lang';
import { generateMiroir, isAxisCell, isSource, MIROIR_DURATION_MS, miroirLevel, scoreMiroir, type MiroirPuzzle } from '../../core/games/miroir';
import { createRng, deriveSeed } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';

/** La grille d'une figure ; les cases du reflet se touchent, celles de la figure non. */
export function MiroirGrid({ puzzle, picked, onTap, disabled }: { puzzle: MiroirPuzzle; picked: readonly number[]; onTap?: (cell: number) => void; disabled?: boolean }) {
  const { axis, size, shape } = puzzle;
  return (
    <div className={`miroir__grid miroir__grid--${size} miroir__grid--${axis}`} role="group" aria-label={tr('La grille du miroir', 'The mirror grid')}>
      {Array.from({ length: size * size }, (_, cell) => {
        const source = isSource(axis, size, cell) || isAxisCell(axis, size, cell);
        const state = isAxisCell(axis, size, cell) ? ' is-axis' : shape.includes(cell) ? ' is-shape' : picked.includes(cell) ? ' is-picked' : '';
        return source || !onTap ? (
          <span key={cell} className={`miroir__cell${source ? ' is-source' : ''}${state}`} />
        ) : (
          <TapButton
            key={cell}
            className={`miroir__cell${state}`}
            onTap={() => onTap(cell)}
            disabled={disabled}
            aria-pressed={picked.includes(cell)}
            aria-label={tr(`Case ${cell + 1}`, `Square ${cell + 1}`)}
          />
        );
      })}
    </div>
  );
}

export function MiroirGame({ seed, level, onFinish }: GameProps) {
  const config = miroirLevel(level);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const puzzle = useMemo(() => generateMiroir(createRng(deriveSeed(seed, index)), level), [seed, index, level]);

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreMiroir(correct, level),
      stats: { correct, errors },
      headline: tr(byCount(correct, `${correct} reflet juste`, `${correct} reflets justes`), plural(correct, 'correct reflection')),
      lines: [
        { label: tr('Reflets justes', 'Correct reflections'), value: String(correct) },
        { label: tr('Erreurs', 'Errors'), value: errors ? String(errors) : tr('Aucune', 'None') },
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: String(config.target) },
      ],
    });
  });

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= MIROIR_DURATION_MS) {
        window.clearInterval(id);
        clock.stop();
        finish();
      }
    }, 100);
    return () => {
      window.clearInterval(id);
      clock.stop();
    };
  }, [clock]);

  const tap = (cell: number) => {
    if (over) return;
    if (picked.includes(cell)) {
      fx.tap();
      setPicked(picked.filter((c) => c !== cell));
      return;
    }
    const next = [...picked, cell];
    if (next.length < puzzle.shape.length) {
      fx.tap();
      setPicked(next);
      return;
    }
    // Autant de cases que la figure : le reflet se valide de lui-même.
    if (next.every((c) => puzzle.answer.includes(c))) {
      fx.good();
      showMark('good');
      setCorrect(correct + 1);
    } else {
      fx.bad();
      showMark('bad');
      setErrors(errors + 1);
    }
    setPicked([]);
    setIndex(index + 1);
  };

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={MIROIR_DURATION_MS} />
      </GameHud>
      <div className="game__stage miroir">
        <p className="anagram__found">
          <strong>{correct}</strong> / {config.target}
        </p>
        <MiroirGrid key={index} puzzle={puzzle} picked={picked} onTap={tap} disabled={over} />
        <p className="lettre__ask" aria-live="polite">
          {puzzle.axis === 'p'
            ? tr(`Demi-tour · ${picked.length} / ${puzzle.shape.length}`, `Half turn · ${picked.length} / ${puzzle.shape.length}`)
            : tr(`Reflet · ${picked.length} / ${puzzle.shape.length}`, `Reflection · ${picked.length} / ${puzzle.shape.length}`)}
        </p>
        <FeedbackMark mark={mark} />
      </div>
    </div>
  );
}
