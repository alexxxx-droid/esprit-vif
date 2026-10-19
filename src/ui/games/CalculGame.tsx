import { useEffect, useMemo, useState } from 'react';
import { tr } from '../../core/lang';
import { answerLength, CALCUL_PENALTY_MS, formatCalc, generateCalcul, scoreCalcul } from '../../core/games/calcul';
import { timedOutcome } from '../../core/outcome';
import { createRng } from '../../core/rng';
import { NumPad } from '../components/bits';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, Stopwatch } from '../game/Hud';
import { useKeyDown } from '../hooks';

export function CalculGame({ seed, level, onFinish }: GameProps) {
  const questions = useMemo(() => generateCalcul(createRng(seed), level), [seed, level]);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [errors, setErrors] = useState(0);
  const [mark, showMark] = useFeedback();
  const done = index >= questions.length;
  const question = questions[Math.min(index, questions.length - 1)];
  const length = answerLength(question.answer);

  useEffect(() => {
    clock.start();
    return () => clock.stop();
  }, [clock]);

  const press = (digit: string) => {
    if (done) return;
    const entry = typed + digit;
    // La réponse se valide toute seule dès qu'elle a le bon nombre de chiffres.
    if (entry.length < length) {
      setTyped(entry);
      fx.tap();
      return;
    }
    const correct = Number(entry) === question.answer;
    const totalErrors = errors + (correct ? 0 : 1);
    if (correct) {
      fx.good();
      showMark('good');
    } else {
      fx.bad();
      showMark('bad', `${formatCalc(question)} = ${question.answer}`);
      setErrors(totalErrors);
    }
    setTyped('');
    setIndex(index + 1);
    if (index + 1 === questions.length) {
      clock.stop();
      const elapsedMs = clock.elapsed();
      onFinish(
        timedOutcome({
          score: scoreCalcul(elapsedMs, totalErrors, level),
          elapsedMs,
          errors: totalErrors,
          penaltyPerError: CALCUL_PENALTY_MS,
          extraStats: { questions: questions.length },
        }),
      );
    }
  };

  const erase = () => {
    if (!typed) return;
    setTyped(typed.slice(0, -1));
    fx.tap();
  };

  useKeyDown((event) => {
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      press(event.key);
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      erase();
    }
  }, !done);

  return (
    <div className="game">
      <GameHud progress={index / questions.length}>
        <Stopwatch clock={clock} />
      </GameHud>
      <div className="game__stage calc">
        <p className="calc__count">
          {Math.min(index + 1, questions.length)} / {questions.length}
        </p>
        <p className="calc__question" aria-live="polite">
          {formatCalc(question)}
        </p>
        <div className="calc__answer" aria-label={tr(`Ta réponse : ${typed || 'vide'}`, `Your answer: ${typed || 'empty'}`)}>
          {Array.from({ length }, (_, i) => (
            <span key={i} className={`slot${typed[i] ? ' slot--filled' : ''}`}>
              {typed[i] ?? ''}
            </span>
          ))}
        </div>
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls">
        <NumPad onDigit={press} onErase={erase} />
      </div>
    </div>
  );
}
