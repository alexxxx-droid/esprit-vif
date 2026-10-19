import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { denominationLabel, formatEuros, generateMonnaie, MONNAIE_DURATION_MS, monnaieLevel, scoreMonnaie } from '../../core/games/monnaie';
import { createRng, deriveSeed } from '../../core/rng';
import { NumPad } from '../components/bits';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';
import { useKeyDown } from '../hooks';

/** Pièce ou billet stylisé : la valeur est toujours écrite dessus. */
export function Money({ cents, hidden = false }: { cents: number; hidden?: boolean }) {
  const kind = cents >= 500 ? 'note' : 'coin';
  return (
    <span className={`money money--${kind} money--v${cents}${hidden ? ' is-hidden' : ''}`} aria-label={hidden ? 'cachée' : denominationLabel(cents)}>
      {!hidden && <span className="money__label">{denominationLabel(cents)}</span>}
    </span>
  );
}

export function MonnaieGame({ seed, level, onFinish }: GameProps) {
  const config = monnaieLevel(level);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const question = useMemo(() => generateMonnaie(createRng(deriveSeed(seed, index)), level), [seed, index, level]);

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreMonnaie(correct, level),
      stats: { correct, errors },
      headline: `${correct} bonnes réponses`,
      lines: [
        { label: 'Bonnes réponses', value: String(correct) },
        { label: 'Erreurs', value: errors ? String(errors) : 'Aucune' },
        { label: 'Objectif pour 100 pts', value: String(config.target) },
      ],
    });
  });

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= MONNAIE_DURATION_MS) {
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

  // Mode mémoire : les pièces se retournent au bout de quelques secondes.
  useEffect(() => {
    if (!config.hideMs) return;
    const id = window.setTimeout(() => setHidden(true), config.hideMs);
    return () => window.clearTimeout(id);
  }, [index, config.hideMs]);

  const submit = () => {
    if (over || !typed) return;
    if (Number(typed) === question.answer) {
      fx.good();
      showMark('good');
      setCorrect(correct + 1);
    } else {
      fx.bad();
      showMark('bad', `C’était ${formatEuros(question.answer)}`);
      setErrors(errors + 1);
    }
    setTyped('');
    setHidden(false);
    setIndex(index + 1);
  };

  const press = (digit: string) => {
    if (over || typed.length >= 5) return;
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
        <TimeLeft clock={clock} durationMs={MONNAIE_DURATION_MS} />
      </GameHud>
      <div className="game__stage monnaie">
        <p className="anagram__found">
          <strong>{correct}</strong> / {config.target}
        </p>
        {question.mode === 'total' ? (
          <div key={index} className="money-tray" aria-label="Pièces et billets à compter">
            {question.items.map((cents, i) => (
              <Money key={i} cents={cents} hidden={hidden} />
            ))}
          </div>
        ) : (
          <div key={index} className="change">
            <p className="change__tag">
              Prix <strong>{formatEuros(question.price)}</strong>
            </p>
            <p className="change__paid">
              Payé avec <Money cents={question.paid} />
            </p>
          </div>
        )}
        <p className="monnaie__ask">{question.mode === 'total' ? 'Combien en tout ?' : 'Combien faut-il rendre ?'}</p>
        <p className={`money-entry${typed ? ' is-filled' : ''}`} aria-live="polite">
          {formatEuros(Number(typed || 0))}
        </p>
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls">
        <NumPad onDigit={press} onErase={erase} onSubmit={submit} />
      </div>
    </div>
  );
}
