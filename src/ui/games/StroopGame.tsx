import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { pickLevel } from '../../core/levels';
import {
  generateStroop,
  matchSpokenColor,
  scoreStroop,
  STROOP_KEYS,
  STROOP_LABELS,
  STROOP_LEVELS,
  STROOP_PENALTY_MS,
  stroopAnswer,
  type StroopColor,
} from '../../core/games/stroop';
import { timedOutcome } from '../../core/outcome';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { Icon } from '../components/Icon';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import { listen, voiceSupported } from '../fx/voice';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, Stopwatch } from '../game/Hud';
import { useKeyDown } from '../hooks';
import { useProgress } from '../progress-context';

export function StroopGame({ seed, level, onFinish }: GameProps) {
  const items = useMemo(() => generateStroop(createRng(seed), level), [seed, level]);
  const switching = pickLevel(STROOP_LEVELS, level).switchRatio > 0;
  const { settings } = useProgress();
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [errors, setErrors] = useState(0);
  const [voiceFailed, setVoiceFailed] = useState(false);
  const [mark, showMark] = useFeedback();
  const done = index >= items.length;
  const item = items[Math.min(index, items.length - 1)];
  const voiceOn = settings.voice && voiceSupported();

  useEffect(() => {
    clock.start();
    return () => clock.stop();
  }, [clock]);

  const answer = (color: StroopColor) => {
    if (done) return;
    const expected = stroopAnswer(item);
    const correct = color === expected;
    const totalErrors = errors + (correct ? 0 : 1);
    if (correct) {
      fx.good();
      showMark('good');
    } else {
      fx.bad();
      showMark('bad', `${item.ask === 'ink' ? 'L’encre' : 'Le mot'} : ${STROOP_LABELS[expected].toLowerCase()}`);
      setErrors(totalErrors);
    }
    setIndex(index + 1);
    if (index + 1 === items.length) {
      clock.stop();
      const elapsedMs = clock.elapsed();
      onFinish(
        timedOutcome({
          score: scoreStroop(elapsedMs, totalErrors, level),
          elapsedMs,
          errors: totalErrors,
          penaltyPerError: STROOP_PENALTY_MS,
          extraStats: { voice: voiceOn ? 1 : 0 },
        }),
      );
    }
  };

  const onColorSpoken = useEffectEvent((color: StroopColor) => answer(color));

  useEffect(() => {
    if (!voiceOn || done) return;
    const handled = new Set<string>();
    const session = listen(
      (text, key) => {
        if (handled.has(key)) return;
        const color = matchSpokenColor(text);
        if (!color) return;
        handled.add(key);
        onColorSpoken(color);
      },
      () => setVoiceFailed(true),
    );
    return () => session.stop();
  }, [voiceOn, done]);

  useKeyDown((event) => {
    const key = event.key.toLowerCase();
    const byPosition = Number(key);
    if (STROOP_KEYS[key] && item.buttons.includes(STROOP_KEYS[key])) answer(STROOP_KEYS[key]);
    else if (byPosition >= 1 && byPosition <= item.buttons.length) answer(item.buttons[byPosition - 1]);
  }, !done);

  return (
    <div className="game">
      <GameHud progress={index / items.length}>
        <Stopwatch clock={clock} />
      </GameHud>
      <div className="game__stage stroop">
        <div className="stroop__stage">
          <p className="stroop__count">
            {Math.min(index + 1, items.length)} / {items.length}
          </p>
          {switching && (
            <p key={index} className={`stroop__ask stroop__ask--${item.ask}`}>
              {item.ask === 'ink' ? 'Couleur de l’encre' : 'Lis le mot'}
            </p>
          )}
          <p
            className={`stroop__word ink--${item.ink}`}
            aria-live="polite"
            aria-label={`${item.ask === 'word' ? 'Lis le mot. ' : ''}Le mot ${STROOP_LABELS[item.word]}, écrit en ${STROOP_LABELS[item.ink].toLowerCase()}`}
          >
            {STROOP_LABELS[item.word].toUpperCase()}
          </p>
          {voiceOn && (
            <p className="stroop__voice">
              <Icon name="mic" size={18} />
              {voiceFailed ? 'Micro indisponible : réponds avec les boutons.' : 'Dis la couleur, ou touche-la.'}
            </p>
          )}
          <FeedbackMark mark={mark} />
        </div>
      </div>
      <div
        className={`game__controls stroop__answers${item.buttons.length > 4 ? ' stroop__answers--wide' : ''}`}
        role="group"
        aria-label="Couleur à répondre"
      >
        {item.buttons.map((color, i) => (
          <TapButton key={color} className="stroop__answer" onTap={() => answer(color)} aria-label={STROOP_LABELS[color]}>
            {!item.buttonInks && <span className={`swatch swatch--${color}`} aria-hidden="true" />}
            <span className={item.buttonInks ? `ink--${item.buttonInks[i]}` : undefined} aria-hidden="true">
              {STROOP_LABELS[color]}
            </span>
          </TapButton>
        ))}
      </div>
    </div>
  );
}
