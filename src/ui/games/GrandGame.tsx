import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { plural } from '../../core/format';
import { tr } from '../../core/lang';
import { formatCalc, generateGrand, GRAND_DURATION_MS, grandLevel, scoreGrand } from '../../core/games/grand';
import { createRng, deriveSeed } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';

export function GrandGame({ seed, level, onFinish }: GameProps) {
  const c = grandLevel(level);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const question = useMemo(() => generateGrand(createRng(deriveSeed(seed, index)), level), [seed, index, level]);

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreGrand(correct, errors, level),
      stats: { correct, errors },
      headline: `${tr(`${correct} bonnes réponses`, `${correct} correct`)} · ${tr(plural(errors, 'erreur'), plural(errors, 'error'))}`,
      lines: [
        { label: tr('Bonnes réponses', 'Correct answers'), value: String(correct) },
        { label: tr('Erreurs', 'Errors'), value: errors ? String(errors) : tr('Aucune', 'None') },
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: String(c.target) },
      ],
    });
  });

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= GRAND_DURATION_MS) {
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

  const answer = (choice: number) => {
    if (over) return;
    if (choice === question.answer) {
      fx.good();
      setCorrect(correct + 1);
    } else {
      fx.bad();
      const values = question.calcs.map((k) => k.value).join(question.calcs.length === 2 && question.answer === -1 ? ' = ' : ' · ');
      showMark('bad', values);
      setErrors(errors + 1);
    }
    setIndex(index + 1);
  };

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={GRAND_DURATION_MS} />
      </GameHud>
      <div className="game__stage grand">
        <p className="anagram__found">
          <strong>{Math.max(0, correct - errors)}</strong> / {c.target}
        </p>
        <p className={`grand__ask${question.smallest ? ' is-smallest' : ''}`} aria-live="polite">
          {question.smallest ? tr('Le plus petit ?', 'The smallest?') : tr('Le plus grand ?', 'The biggest?')}
        </p>
        <div key={index} className={`grand__calcs grand__calcs--${question.calcs.length}`}>
          {question.calcs.map((k, i) => (
            <TapButton key={i} className="grand__calc" onTap={() => answer(i)} disabled={over}>
              {formatCalc(k)}
            </TapButton>
          ))}
        </div>
        {c.equal > 0 && (
          <TapButton className="grand__equal" onTap={() => answer(-1)} disabled={over} aria-label={tr('Ils sont égaux', 'They are equal')}>
            =
          </TapButton>
        )}
        <FeedbackMark mark={mark} />
      </div>
    </div>
  );
}
