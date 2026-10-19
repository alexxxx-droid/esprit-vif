import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { plural } from '../../core/format';
import {
  formatStep,
  generateTotalRound,
  nextTotalLength,
  scoreTotal,
  totalLevel,
  totalPerfectPoints,
  TOTAL_ROUNDS,
} from '../../core/games/total';
import { createRng, deriveSeed } from '../../core/rng';
import { NumPad } from '../components/bits';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameHud } from '../game/Hud';
import { useKeyDown } from '../hooks';
import { slow } from '../tempo';

type Phase = 'show' | 'answer' | 'feedback';

interface Tally {
  points: number;
  won: number;
  longest: number;
}

export function TotalGame({ seed, level, onFinish }: GameProps) {
  const { stepMs: baseStepMs, start } = totalLevel(level);
  const stepMs = slow(baseStepMs);
  const [round, setRound] = useState(0);
  const [length, setLength] = useState(start);
  const [phase, setPhase] = useState<Phase>('show');
  const [step, setStep] = useState(-1);
  const [typed, setTyped] = useState('');
  const [tally, setTally] = useState<Tally>({ points: 0, won: 0, longest: 0 });
  const [lastWon, setLastWon] = useState(false);
  const [mark, showMark] = useFeedback();
  const current = useMemo(
    () => generateTotalRound(createRng(deriveSeed(seed, round)), length, level),
    [seed, round, length, level],
  );

  // Défilement : « Prêt ? », puis un nombre à la fois.
  useEffect(() => {
    if (phase !== 'show') return;
    if (step >= current.steps.length) {
      const id = window.setTimeout(() => setPhase('answer'), 200);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => {
      setStep(step + 1);
      if (step + 1 < current.steps.length) fx.tick();
    }, step === -1 ? 900 : stepMs);
    return () => window.clearTimeout(id);
  }, [phase, step, current, stepMs]);

  const finish = useEffectEvent((final: Tally) => {
    onFinish({
      score: scoreTotal(final.points, level),
      stats: { ...final },
      headline: `${final.won}/${TOTAL_ROUNDS} manches · suite de ${final.longest}`,
      lines: [
        { label: 'Manches réussies', value: `${final.won} / ${TOTAL_ROUNDS}` },
        { label: 'Plus longue suite réussie', value: final.longest ? plural(final.longest, 'nombre') : '—' },
        { label: 'Points', value: `${final.points} / ${totalPerfectPoints(level)}` },
      ],
    });
  });

  // Après le verdict : manche suivante, plus longue ou plus courte selon la réussite.
  useEffect(() => {
    if (phase !== 'feedback') return;
    const id = window.setTimeout(() => {
      if (round + 1 >= TOTAL_ROUNDS) {
        finish(tally);
        return;
      }
      setLength(nextTotalLength(length, lastWon));
      setRound(round + 1);
      setTyped('');
      setStep(-1);
      setPhase('show');
    }, 1300);
    return () => window.clearTimeout(id);
  }, [phase, round, length, lastWon, tally]);

  const submit = () => {
    if (phase !== 'answer' || !typed) return;
    const won = Number(typed) === current.total;
    setLastWon(won);
    if (won) {
      fx.good();
      showMark('good');
      setTally({ points: tally.points + length, won: tally.won + 1, longest: Math.max(tally.longest, length) });
    } else {
      fx.bad();
      showMark('bad', `Le total était ${current.total}`);
    }
    setPhase('feedback');
  };

  const press = (digit: string) => {
    if (phase !== 'answer' || typed.length >= 2) return;
    fx.tap();
    setTyped(typed === '0' ? digit : typed + digit);
  };

  const erase = () => {
    if (phase !== 'answer' || !typed) return;
    fx.tap();
    setTyped(typed.slice(0, -1));
  };

  useKeyDown((event) => {
    if (/^[0-9]$/.test(event.key)) press(event.key);
    else if (event.key === 'Backspace') {
      event.preventDefault();
      erase();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  }, phase === 'answer');

  const showing = phase === 'show' && step >= 0 && step < current.steps.length;

  return (
    <div className="game">
      <GameHud progress={round / TOTAL_ROUNDS}>
        <span className="chip">
          Manche {round + 1}/{TOTAL_ROUNDS}
        </span>
      </GameHud>
      <div className="game__stage total">
        <p className="total__info">{plural(length, 'nombre')} à additionner</p>
        <div className="total__screen" aria-live="polite">
          {phase === 'show' && step === -1 && <span className="total__ready">Prêt&nbsp;?</span>}
          {showing && (
            <span key={step} className={`total__step${current.steps[step] < 0 ? ' is-minus' : ''}`}>
              {formatStep(current.steps[step])}
            </span>
          )}
          {phase !== 'show' && (
            <span className="total__answer">
              <span className="total__equals">=</span>
              <span className={`slot slot--wide${typed ? ' slot--filled' : ''}`}>{typed || '?'}</span>
            </span>
          )}
        </div>
        <div className="total__dots" aria-hidden="true">
          {current.steps.map((_, i) => (
            <span key={i} className={phase !== 'show' || i <= step ? 'is-on' : undefined} />
          ))}
        </div>
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls">
        <NumPad onDigit={press} onErase={erase} onSubmit={submit} disabled={phase !== 'answer'} />
      </div>
    </div>
  );
}
