import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import {
  balancedAccuracy,
  generateNBack,
  NBACK_GAP_MS,
  NBACK_TARGETS,
  NBACK_TRIALS,
  nbackLevel,
  scoreNBack,
  tallyStream,
  usefulAccuracy,
  type NBackTally,
} from '../../core/games/nback';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameHud } from '../game/Hud';
import { useKeyDown } from '../hooks';
import { slow } from '../tempo';

type Channel = 'letter' | 'position';

const CHANNEL_LABELS: Record<Channel, { button: string; miss: string; wrong: string; stat: string }> = {
  letter: { button: 'Même lettre', miss: 'C’était la même lettre', wrong: 'Pas la même lettre', stat: 'Lettres' },
  position: { button: 'Même place', miss: 'C’était la même place', wrong: 'Pas la même place', stat: 'Positions' },
};

function describe(t: NBackTally): string {
  return `${t.hits} / ${NBACK_TARGETS} · ${t.falseAlarms} fausse${t.falseAlarms > 1 ? 's' : ''} alerte${t.falseAlarms > 1 ? 's' : ''}`;
}

export function NBackGame({ seed, level, onFinish }: GameProps) {
  const sequence = useMemo(() => generateNBack(createRng(seed), level), [seed, level]);
  const stepMs = slow(nbackLevel(level).stepMs);
  const { n, length } = sequence;
  const channels = (['letter', 'position'] as const).filter((c) => sequence[c] !== null);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [responses, setResponses] = useState<Record<Channel, boolean[]>>({ letter: [], position: [] });
  const [mark, showMark] = useFeedback();
  const done = index >= length;
  const scoredIndex = index - n;

  // Fin d'essai : une cible non signalée est montrée, pour apprendre sans punir.
  const endTrial = useEffectEvent((trial: number) => {
    const missed = channels.find((c) => sequence[c]!.targets[trial] && !responses[c][trial]);
    if (missed) showMark('bad', CHANNEL_LABELS[missed].miss);
  });

  const finish = useEffectEvent(() => {
    const tallies = channels.map((c) => tallyStream(sequence[c]!, n, responses[c]));
    const accuracy = Math.round((tallies.reduce((sum, t) => sum + balancedAccuracy(t), 0) / tallies.length) * 100);
    onFinish({
      score: scoreNBack(tallies, level),
      stats: { n, accuracy, useful: Math.round(usefulAccuracy(tallies) * 100) },
      headline: `${accuracy} % de précision · ${n} en arrière`,
      lines: [
        ...channels.map((c, i) => ({ label: CHANNEL_LABELS[c].stat, value: describe(tallies[i]) })),
        { label: 'Précision', value: `${accuracy} %` },
      ],
    });
  });

  useEffect(() => {
    if (index >= length) {
      finish();
      return;
    }
    const hide = window.setTimeout(() => setVisible(false), stepMs - NBACK_GAP_MS);
    const next = window.setTimeout(() => {
      endTrial(index);
      setIndex(index + 1);
      setVisible(true);
    }, stepMs);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(next);
    };
  }, [index, length, stepMs]);

  const canAnswer = (c: Channel) => !done && index >= n && responses[c][index] === undefined;

  const press = (c: Channel) => {
    if (!canAnswer(c)) return;
    const next = [...responses[c]];
    next[index] = true;
    setResponses({ ...responses, [c]: next });
    if (sequence[c]!.targets[index]) {
      fx.good();
      showMark('good');
    } else {
      fx.bad();
      showMark('bad', CHANNEL_LABELS[c].wrong);
    }
  };

  useKeyDown((event) => {
    const key = event.key.toLowerCase();
    if (channels.length === 1) {
      if (key === ' ' || key === 'enter') {
        event.preventDefault();
        press(channels[0]);
      }
    } else if (key === 'a' || key === 'arrowleft') press('letter');
    else if (key === 'l' || key === 'arrowright') press('position');
  }, !done);

  const letter = sequence.letter?.values[index];
  const position = sequence.position?.values[index];

  return (
    <div className="game">
      <GameHud progress={Math.max(0, scoredIndex) / NBACK_TRIALS}>
        <span className="chip">{n} en arrière</span>
      </GameHud>
      <div className="game__stage nback">
        <p className="nback__count">
          {index < n ? 'Mémorise…' : `Essai ${Math.min(scoredIndex + 1, NBACK_TRIALS)} / ${NBACK_TRIALS}`}
        </p>
        {sequence.position ? (
          <div className="nback__grid" aria-live="polite">
            {Array.from({ length: 9 }, (_, cell) => (
              <span key={cell} className={`nback__cell${visible && !done && cell === position ? ' is-lit' : ''}`}>
                {visible && !done && cell === position && letter !== undefined && (
                  <span key={index} className="nback__small-letter">
                    {letter}
                  </span>
                )}
              </span>
            ))}
          </div>
        ) : (
          <div className="nback__card" aria-live="polite">
            {visible && !done && (
              <span key={index} className="nback__letter">
                {letter}
              </span>
            )}
          </div>
        )}
        <p className="nback__hint">
          {n === 1 ? 'Pareil qu’au coup précédent ?' : `Pareil qu’il y a ${n} coups ?`}
        </p>
        <FeedbackMark mark={mark} />
      </div>
      <div className={`game__controls nback__buttons${channels.length > 1 ? ' nback__buttons--dual' : ''}`}>
        {channels.map((c) => (
          <TapButton
            key={c}
            className="big-answer"
            onTap={() => press(c)}
            disabled={!canAnswer(c)}
            aria-keyshortcuts={channels.length > 1 ? (c === 'letter' ? 'A' : 'L') : 'Space'}
          >
            {index < n ? 'Mémorise…' : CHANNEL_LABELS[c].button}
          </TapButton>
        ))}
      </div>
    </div>
  );
}
