import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { byCount, plural } from '../../core/format';
import { tr } from '../../core/lang';
import { generateSuite, scoreSuites, SUITES_DURATION_MS, suitesLevel } from '../../core/games/suites';
import { createRng, deriveSeed } from '../../core/rng';
import { NumPad } from '../components/bits';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';
import { useKeyDown } from '../hooks';

export function SuitesGame({ seed, level, onFinish }: GameProps) {
  const config = suitesLevel(level);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const suite = useMemo(() => generateSuite(createRng(deriveSeed(seed, index)), level), [seed, index, level]);
  const answer = suite.terms[suite.missing];

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreSuites(correct, level),
      stats: { correct, errors },
      headline: tr(byCount(correct, `${correct} suite trouvée`, `${correct} suites trouvées`), plural(correct, 'series solved', 'series solved')),
      lines: [
        { label: tr('Suites trouvées', 'Series solved'), value: String(correct) },
        { label: tr('Erreurs', 'Errors'), value: errors ? String(errors) : tr('Aucune', 'None') },
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: String(config.target) },
      ],
    });
  });

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= SUITES_DURATION_MS) {
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

  const submit = () => {
    if (over || !typed) return;
    if (Number(typed) === answer) {
      fx.good();
      showMark('good');
      setCorrect(correct + 1);
    } else {
      fx.bad();
      showMark('bad', tr(`C’était ${answer}`, `It was ${answer}`));
      setErrors(errors + 1);
    }
    setTyped('');
    setIndex(index + 1);
  };

  const press = (digit: string) => {
    if (over || typed.length >= 3) return;
    fx.tap();
    setTyped(typed === '0' ? digit : typed + digit);
  };

  const erase = () => {
    if (!typed) return;
    setTyped(typed.slice(0, -1));
  };

  useKeyDown((e) => {
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') erase();
    else if (e.key === 'Enter') submit();
  }, !over);

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={SUITES_DURATION_MS} />
      </GameHud>
      <div className="game__stage suites">
        <p className="anagram__found">
          <strong>{correct}</strong> / {config.target}
        </p>
        <ol key={index} className={`suites__row${suite.terms.length >= 7 ? ' suites__row--xlong' : suite.terms.length === 6 ? ' suites__row--long' : ''}`} aria-label={tr('La suite', 'The series')}>
          {suite.terms.map((term, i) =>
            i === suite.missing ? (
              <li key={i} className={`suites__term suites__term--missing${typed ? ' is-typed' : ''}`} aria-label={typed ? tr(`Ta réponse : ${typed}`, `Your answer: ${typed}`) : tr('Nombre manquant', 'Missing number')}>
                {typed || '?'}
              </li>
            ) : (
              <li key={i} className="suites__term">
                {term}
              </li>
            ),
          )}
        </ol>
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls">
        <NumPad onDigit={press} onErase={erase} onSubmit={submit} disabled={over} />
      </div>
    </div>
  );
}
