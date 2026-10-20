import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { byCount } from '../../core/format';
import { tr } from '../../core/lang';
import {
  CORRESPONDANCE_DURATION_MS,
  correspondanceByValue,
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

/** Points d'une face de dé (1 à 6), dans un carré de 100 × 100. */
const PIPS: Record<number, readonly (readonly [number, number])[]> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [28, 26],
    [72, 26],
    [28, 50],
    [72, 50],
    [28, 74],
    [72, 74],
  ],
};

export function DiceFace({ value, size = 110 }: { value: number; size?: number }) {
  return (
    <svg className="match-card__dice" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <rect x="5" y="5" width="90" height="90" rx="18" fill="none" stroke="currentColor" strokeWidth="5" />
      {(PIPS[value] ?? []).map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="9" fill="currentColor" />
      ))}
    </svg>
  );
}

export function CardFace({ card }: { card: MatchCard }) {
  if (card.kind === 'shape') return <Shape card={card.shape} size={110} className="match-card__shape" />;
  if (card.look === 'pips') return <DiceFace value={Number(card.text)} />;
  return <span className="match-card__text">{card.look === 'lower' ? card.text.toLowerCase() : card.text}</span>;
}

const describe = (card: MatchCard) => {
  if (card.kind === 'shape') return describeShape(card.shape);
  if (card.look === 'pips') return tr(`dé : ${card.text}`, `die: ${card.text}`);
  return card.look === 'lower' ? card.text.toLowerCase() : card.text;
};

/** La question, selon l'écart : la carte d'avant, il y a deux cartes, il y a trois cartes. */
function askText(back: number): string {
  if (back === 1) return tr('Pareille que la carte d’avant ?', 'Same as the card before?');
  return back === 2 ? tr('Pareille qu’il y a deux cartes ?', 'Same as two cards ago?') : tr('Pareille qu’il y a trois cartes ?', 'Same as three cards ago?');
}

/** Rappel quand seule la valeur compte (A = a, ⚂ = 3). */
function valueHint(kind: ReturnType<typeof correspondanceByValue>): string | null {
  if (kind === 'letters') return tr('Même lettre, en majuscule ou en minuscule : A = a', 'Same letter, upper or lower case: A = a');
  if (kind === 'dice') return tr('Même valeur, en chiffre ou en dé : 3 = ⚂', 'Same value, digit or die: 3 = ⚂');
  if (kind === 'both') return tr('Seule la valeur compte : A = a, 3 = ⚂', 'Only the value counts: A = a, 3 = ⚂');
  return null;
}

export function CorrespondanceGame({ seed, level, onFinish }: GameProps) {
  const { back, target, set } = correspondanceLevel(level);
  const hint = valueHint(correspondanceByValue(set));
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
      headline: tr(
        byCount(errors, `${correct} bonnes réponses · ${errors} erreur`, `${correct} bonnes réponses · ${errors} erreurs`),
        byCount(errors, `${correct} correct · ${errors} error`, `${correct} correct · ${errors} errors`),
      ),
      lines: [
        { label: tr('Bonnes réponses', 'Correct answers'), value: String(correct) },
        { label: tr('Erreurs', 'Errors'), value: errors ? String(errors) : tr('Aucune', 'None') },
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: String(target) },
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
      showMark('bad', deck.same[index] ? tr('C’était pareil', 'It was the same') : tr('C’était différent', 'It was different'));
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
              ? tr('Retiens cette carte.', 'Remember this card.')
              : tr(`Retiens les ${back} premières cartes.`, `Remember the first ${back} cards.`)
            : askText(back)}
          {hint && <span className="correspondance__hint">{hint}</span>}
        </p>
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls yes-no">
        {memorizing ? (
          <TapButton className="big-answer" onTap={next}>
            {tr('Carte suivante', 'Next card')}
            <Icon name="arrow" />
          </TapButton>
        ) : (
          <>
            <TapButton className="big-answer big-answer--no" onTap={() => answer(false)} aria-keyshortcuts="ArrowLeft">
              <Icon name="close" />
              {tr('Non', 'No')}
            </TapButton>
            <TapButton className="big-answer big-answer--yes" onTap={() => answer(true)} aria-keyshortcuts="ArrowRight">
              <Icon name="check" />
              {tr('Oui', 'Yes')}
            </TapButton>
          </>
        )}
      </div>
    </div>
  );
}
