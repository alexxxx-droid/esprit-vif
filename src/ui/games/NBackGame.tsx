import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { generateNBack, balancedAccuracy, NBACK_SHOW_MS, NBACK_STEP_MS, NBACK_TARGETS, NBACK_TRIALS, scoreNBack, tallyNBack } from '../../core/games/nback';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameHud } from '../game/Hud';
import { useKeyDown } from '../hooks';

export function NBackGame({ seed, level, onFinish }: GameProps) {
  const sequence = useMemo(() => generateNBack(createRng(seed), level), [seed, level]);
  const { n, letters, targets } = sequence;
  const total = letters.length;
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [responses, setResponses] = useState<boolean[]>([]);
  const [mark, showMark] = useFeedback();
  const done = index >= total;
  const scoredIndex = index - n;

  // Fin d'essai : une cible non signalée est montrée, pour apprendre sans punir.
  const endTrial = useEffectEvent((trial: number) => {
    if (targets[trial] && !responses[trial]) showMark('bad', 'C’était identique');
  });

  const finish = useEffectEvent(() => {
    const tally = tallyNBack(sequence, responses);
    const accuracy = Math.round(balancedAccuracy(tally) * 100);
    onFinish({
      score: scoreNBack(tally, n),
      stats: { n, ...tally, accuracy },
      headline: `${accuracy} % de précision · N = ${n}`,
      lines: [
        { label: 'Bonnes réponses', value: `${tally.hits} / ${NBACK_TARGETS}` },
        { label: 'Bonnes abstentions', value: `${tally.correctRejections} / ${NBACK_TRIALS - NBACK_TARGETS}` },
        { label: 'Fausses alertes', value: String(tally.falseAlarms) },
        { label: 'Précision', value: `${accuracy} %` },
      ],
    });
  });

  useEffect(() => {
    if (index >= total) {
      finish();
      return;
    }
    const hide = window.setTimeout(() => setVisible(false), NBACK_SHOW_MS);
    const next = window.setTimeout(() => {
      endTrial(index);
      setIndex(index + 1);
      setVisible(true);
    }, NBACK_STEP_MS);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(next);
    };
  }, [index, total]);

  const canAnswer = !done && index >= n && responses[index] === undefined;

  const press = () => {
    if (!canAnswer) return;
    const next = [...responses];
    next[index] = true;
    setResponses(next);
    if (targets[index]) {
      fx.good();
      showMark('good');
    } else {
      fx.bad();
      showMark('bad', 'Pas identique');
    }
  };

  useKeyDown((event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      press();
    }
  }, !done);

  return (
    <div className="game">
      <GameHud progress={Math.max(0, scoredIndex) / NBACK_TRIALS}>
        <span className="chip">N = {n}</span>
      </GameHud>
      <div className="game__stage nback">
        <p className="nback__count">
          {index < n ? 'Mémorise…' : `Essai ${Math.min(scoredIndex + 1, NBACK_TRIALS)} / ${NBACK_TRIALS}`}
        </p>
        <div className="nback__card" aria-live="polite">
          {visible && !done && (
            <span key={index} className="nback__letter">
              {letters[index]}
            </span>
          )}
        </div>
        <p className="nback__hint">
          {n === 1 ? 'Même lettre que la précédente ?' : `Même lettre qu’il y a ${n} lettres ?`}
        </p>
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls">
        <TapButton className="big-answer" onTap={press} disabled={!canAnswer} aria-keyshortcuts="Space">
          {index < n ? 'Mémorise…' : 'Identique'}
        </TapButton>
      </div>
    </div>
  );
}
