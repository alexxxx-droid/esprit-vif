import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import {
  CORRESPONDANCE_DURATION_MS,
  correspondanceLevel,
  generateCorrespondance,
  scoreCorrespondance,
  type MatchCard,
} from '../../core/games/correspondance';
import { describeShape } from '../../core/games/shapes';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { Icon } from '../components/Icon';
import { Shape } from '../components/Shape';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';
import { useKeyDown } from '../hooks';

export function CardFace({ card }: { card: MatchCard }) {
  return card.kind === 'shape' ? (
    <Shape card={card.shape} size={110} className="match-card__shape" />
  ) : (
    <span className="match-card__text">{card.text}</span>
  );
}

const describe = (card: MatchCard) => (card.kind === 'shape' ? describeShape(card.shape) : card.text);

export function CorrespondanceGame({ seed, level, onFinish }: GameProps) {
  const { back, target } = correspondanceLevel(level);
  const deck = useMemo(() => generateCorrespondance(createRng(seed), level), [seed, level]);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const memorizing = index < back;
  const card = deck.cards[Math.min(index, deck.cards.length - 1)];

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreCorrespondance(correct, errors, level),
      stats: { correct, errors },
      headline: `${correct} bonnes réponses · ${errors} erreur${errors > 1 ? 's' : ''}`,
      lines: [
        { label: 'Bonnes réponses', value: String(correct) },
        { label: 'Erreurs', value: errors ? String(errors) : 'Aucune' },
        { label: 'Objectif pour 100 pts', value: String(target) },
      ],
    });
  });

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= CORRESPONDANCE_DURATION_MS) {
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

  const next = () => {
    if (over || !memorizing) return;
    fx.tap();
    setIndex(index + 1);
  };

  const answer = (same: boolean) => {
    if (over || memorizing) return;
    if (same === deck.same[index]) {
      fx.good();
      showMark('good');
      setCorrect(correct + 1);
    } else {
      fx.bad();
      showMark('bad', deck.same[index] ? 'C’était pareil' : 'C’était différent');
      setErrors(errors + 1);
    }
    setIndex(index + 1);
  };

  useKeyDown((e) => {
    const key = e.key.toLowerCase();
    if (memorizing && (key === 'enter' || key === ' ')) {
      e.preventDefault();
      next();
    } else if (key === 'arrowleft' || key === 'n') answer(false);
    else if (key === 'arrowright' || key === 'o') answer(true);
  }, !over);

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={CORRESPONDANCE_DURATION_MS} />
      </GameHud>
      <div className="game__stage correspondance">
        <p className="anagram__found">
          <strong>{correct}</strong> / {target}
        </p>
        <div key={index} className="match-card" aria-live="polite" aria-label={describe(card)}>
          <CardFace card={card} />
        </div>
        <p className="correspondance__ask">
          {memorizing
            ? back === 1
              ? 'Retiens cette carte.'
              : `Retiens les ${back} premières cartes.`
            : back === 1
              ? 'Pareille que la carte d’avant ?'
              : 'Pareille qu’il y a deux cartes ?'}
        </p>
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls yes-no">
        {memorizing ? (
          <TapButton className="big-answer" onTap={next}>
            Carte suivante
            <Icon name="arrow" />
          </TapButton>
        ) : (
          <>
            <TapButton className="big-answer big-answer--no" onTap={() => answer(false)} aria-keyshortcuts="ArrowLeft">
              <Icon name="close" />
              Non
            </TapButton>
            <TapButton className="big-answer big-answer--yes" onTap={() => answer(true)} aria-keyshortcuts="ArrowRight">
              <Icon name="check" />
              Oui
            </TapButton>
          </>
        )}
      </div>
    </div>
  );
}
