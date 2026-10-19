import { useEffect, useMemo, useState } from 'react';
import { formatSeconds } from '../../core/format';
import { answerLength, formatCalc } from '../../core/games/calcul';
import { diableLevel, generateDiable, scoreDiable } from '../../core/games/diable';
import { createRng } from '../../core/rng';
import { NumPad } from '../components/bits';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { Icon } from '../components/Icon';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, Stopwatch } from '../game/Hud';
import { useKeyDown } from '../hooks';

export function DiableGame({ seed, level, onFinish }: GameProps) {
  const { n, count } = diableLevel(level);
  const questions = useMemo(() => generateDiable(createRng(seed), level), [seed, level]);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [correct, setCorrect] = useState(0);
  const [mark, showMark] = useFeedback();
  const total = count + n;
  const done = index >= total;
  const memorizing = index < n;
  const target = questions[index - n];
  const shown = index < count ? questions[index] : null;

  useEffect(() => {
    clock.start();
    return () => clock.stop();
  }, [clock]);

  const advance = (score: number) => {
    const next = index + 1;
    setIndex(next);
    setTyped('');
    if (next === total) {
      clock.stop();
      const elapsedMs = clock.elapsed();
      onFinish({
        score: scoreDiable(score, elapsedMs, level),
        stats: { correct: score, count, n, timeMs: Math.round(elapsedMs) },
        headline: `${score}/${count} justes · ${formatSeconds(elapsedMs)}`,
        lines: [
          { label: 'Bonnes réponses', value: `${score} / ${count}` },
          { label: 'Temps', value: formatSeconds(elapsedMs) },
          { label: 'En arrière', value: `${n} calcul${n > 1 ? 's' : ''}` },
        ],
      });
    }
  };

  const remember = () => {
    if (!memorizing || done) return;
    fx.tap();
    advance(correct);
  };

  const press = (digit: string) => {
    if (memorizing || done || !target) return;
    const entry = typed + digit;
    if (entry.length < answerLength(target.answer)) {
      setTyped(entry);
      fx.tap();
      return;
    }
    const ok = Number(entry) === target.answer;
    if (ok) {
      fx.good();
      showMark('good');
    } else {
      fx.bad();
      showMark('bad', `${formatCalc(target)} = ${target.answer}`);
    }
    const score = correct + (ok ? 1 : 0);
    setCorrect(score);
    advance(score);
  };

  const erase = () => {
    if (!typed) return;
    setTyped(typed.slice(0, -1));
  };

  useKeyDown((e) => {
    if (memorizing && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      remember();
    } else if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') erase();
  }, !done);

  return (
    <div className="game">
      <GameHud progress={Math.max(0, index - n) / count}>
        <Stopwatch clock={clock} />
      </GameHud>
      <div className="game__stage diable">
        <div className="diable__memory" aria-hidden="true">
          {Array.from({ length: n }, (_, i) => (
            <span key={i} className={`diable__ghost${index - 1 - i >= 0 && index - 1 - i < count ? ' is-full' : ''}`}>
              ?
            </span>
          ))}
          <span className="diable__now">maintenant</span>
        </div>
        <div key={index} className="diable__card" aria-live="polite">
          {shown ? formatCalc(shown) : '…'}
        </div>
        <p className="diable__ask">
          {memorizing
            ? 'Retiens ce calcul, puis touche « Retenu ».'
            : `Résultat du calcul d’il y a ${n === 1 ? '1 coup' : `${n} coups`} ?`}
        </p>
        {!memorizing && target && (
          <div className="calc__answer" aria-label={`Ta réponse : ${typed || 'vide'}`}>
            {Array.from({ length: answerLength(target.answer) }, (_, i) => (
              <span key={i} className={`slot${typed[i] ? ' slot--filled' : ''}`}>
                {typed[i] ?? ''}
              </span>
            ))}
          </div>
        )}
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls">
        {memorizing ? (
          <TapButton className="big-answer" onTap={remember} aria-keyshortcuts="Enter">
            Retenu
            <Icon name="arrow" />
          </TapButton>
        ) : (
          <NumPad onDigit={press} onErase={erase} />
        )}
      </div>
    </div>
  );
}
