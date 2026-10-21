import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { plural } from '../../core/format';
import { tr } from '../../core/lang';
import { generateRegle, REGLE_DURATION_MS, regleAnswer, regleLevel, ruleSides, scoreRegle, type RegleCard, type RegleRule } from '../../core/games/regle';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { Icon } from '../components/Icon';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';
import { useKeyDown } from '../hooks';

/** La carte : le nombre dans le cadre de la couleur de sa règle ; en haut ou en bas de la scène. */
export function RegleCardView({ card, placed }: { card: RegleCard; placed: boolean }) {
  return (
    <div className={`regle__slot${placed ? (card.top ? ' is-top' : ' is-bottom') : ''}`}>
      <div className={`regle__card regle__card--${card.rule}${card.inverse ? ' is-inverse' : ''}`}>{card.number}</div>
    </div>
  );
}

/** La légende des règles : chaque couleur, ce qui va à gauche et ce qui va à droite. */
export function RegleLegend({ rules, current }: { rules: readonly RegleRule[]; current?: RegleRule }) {
  return (
    <ul className="regle__legend">
      {rules.map((r) => {
        const [left, right] = ruleSides(r);
        return (
          <li key={r} className={`regle__rule regle__rule--${r}${r === current ? ' is-current' : ''}`}>
            ◀ {left} · {right} ▶
          </li>
        );
      })}
    </ul>
  );
}

export function RegleGame({ seed, level, onFinish }: GameProps) {
  const c = regleLevel(level);
  const cards = useMemo(() => generateRegle(createRng(seed), level), [seed, level]);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const card = cards[index % cards.length];
  const [left, right] = ruleSides(card.rule);

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreRegle(correct, errors, level),
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
      if (clock.total() >= REGLE_DURATION_MS) {
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

  const answer = (side: 0 | 1) => {
    if (over) return;
    if (side === regleAnswer(card)) {
      fx.good();
      setCorrect(correct + 1);
    } else {
      fx.bad();
      showMark('bad');
      setErrors(errors + 1);
    }
    setIndex(index + 1);
  };

  useKeyDown((e) => {
    if (e.key === 'ArrowLeft') answer(0);
    else if (e.key === 'ArrowRight') answer(1);
  }, !over);

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={REGLE_DURATION_MS} />
      </GameHud>
      <div className="game__stage regle">
        <p className="anagram__found">
          <strong>{Math.max(0, correct - errors)}</strong> / {c.target}
        </p>
        <RegleLegend rules={c.rules} current={c.labels ? undefined : card.rule} />
        <div className="regle__stage" key={index}>
          <RegleCardView card={card} placed={c.rules.includes('place')} />
        </div>
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls regle__buttons">
        <TapButton className={`regle__answer regle__answer--${card.rule}`} onTap={() => answer(0)} disabled={over} aria-label={c.labels ? left : tr('Gauche', 'Left')}>
          <Icon name="back" size={22} />
          {c.labels && <span>{left}</span>}
        </TapButton>
        <TapButton className={`regle__answer regle__answer--${card.rule}`} onTap={() => answer(1)} disabled={over} aria-label={c.labels ? right : tr('Droite', 'Right')}>
          {c.labels && <span>{right}</span>}
          <Icon name="arrow" size={22} />
        </TapButton>
      </div>
    </div>
  );
}
