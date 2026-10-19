import { useEffect, useEffectEvent, useMemo, useState, type CSSProperties } from 'react';
import { plural } from '../../core/format';
import { BOUTIQUE_ROUNDS, boutiqueLevel, generateBoutiqueRound, scoreBoutique } from '../../core/games/boutique';
import { createRng, deriveSeed } from '../../core/rng';
import { NumPad } from '../components/bits';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameHud } from '../game/Hud';
import { useKeyDown, useReducedMotion } from '../hooks';

type Phase = 'start' | 'events' | 'answer' | 'feedback';

const HUES = [12, 210, 140, 280, 35, 330, 190];

/** Un client stylisé (tête + corps), coloré pour le plaisir des yeux. */
function Walker({ kind, index, duration, hue }: { kind: 'in' | 'out'; index: number; duration: number; hue: number }) {
  return (
    <span
      className={`walker walker--${kind}`}
      style={{ animationDuration: `${duration}ms`, animationDelay: `${index * 150}ms`, '--hue': hue } as CSSProperties}
      aria-hidden="true"
    />
  );
}

function Cat({ index, duration }: { index: number; duration: number }) {
  return (
    <svg
      className="walker walker--cat"
      style={{ animationDuration: `${duration}ms`, animationDelay: `${index * 220}ms` }}
      viewBox="0 0 40 28"
      aria-hidden="true"
    >
      <path d="M6 20c0-6 5-9 12-9h8l3-5 2 6c3 1 5 4 5 8v4h-4v-4H12v4H8v-4c-3 0-5-2-5-4 0-3 3-4 5-3" fill="currentColor" />
      <path d="M3 17c-2-3-1-8 3-9" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function BoutiqueGame({ seed, level, onFinish }: GameProps) {
  const config = boutiqueLevel(level);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('start');
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState('');
  const [correct, setCorrect] = useState(0);
  const [mark, showMark] = useFeedback();
  const reduced = useReducedMotion();
  const current = useMemo(() => generateBoutiqueRound(createRng(deriveSeed(seed, round)), level), [seed, round, level]);
  const event = current.events[Math.min(step, current.events.length - 1)];

  const finish = useEffectEvent((total: number) => {
    onFinish({
      score: scoreBoutique(total),
      stats: { correct: total, events: config.events },
      headline: `${total}/${BOUTIQUE_ROUNDS} manches`,
      lines: [
        { label: 'Manches réussies', value: `${total} / ${BOUTIQUE_ROUNDS}` },
        { label: 'Mouvements par manche', value: String(config.events) },
      ],
    });
  });

  useEffect(() => {
    if (phase === 'start') {
      const id = window.setTimeout(() => {
        setStep(0);
        setPhase('events');
      }, 2000);
      return () => window.clearTimeout(id);
    }
    if (phase === 'events') {
      const id = window.setTimeout(() => {
        if (step + 1 < current.events.length) {
          setStep(step + 1);
          fx.tick();
        } else setPhase('answer');
      }, config.stepMs + 250);
      return () => window.clearTimeout(id);
    }
    if (phase === 'feedback') {
      const id = window.setTimeout(() => {
        if (round + 1 >= BOUTIQUE_ROUNDS) {
          finish(correct);
          return;
        }
        setRound(round + 1);
        setTyped('');
        setPhase('start');
      }, 1500);
      return () => window.clearTimeout(id);
    }
  }, [phase, step, round, correct, current, config.stepMs]);

  const submit = () => {
    if (phase !== 'answer' || !typed) return;
    if (Number(typed) === current.answer) {
      fx.good();
      showMark('good');
      setCorrect(correct + 1);
    } else {
      fx.bad();
      showMark('bad', `Il y en avait ${current.answer}`);
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
    setTyped(typed.slice(0, -1));
  };

  useKeyDown((e) => {
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') erase();
    else if (e.key === 'Enter') submit();
  }, phase === 'answer');

  const duration = config.stepMs;
  const describe =
    phase === 'events'
      ? [event.enter && `${plural(event.enter, 'client')} entre${event.enter > 1 ? 'nt' : ''}`, event.leave && `${plural(event.leave, 'client')} sor${event.leave > 1 ? 'tent' : 't'}`]
          .filter(Boolean)
          .join(', ')
      : '';

  return (
    <div className="game">
      <GameHud progress={round / BOUTIQUE_ROUNDS}>
        <span className="chip">
          Manche {round + 1}/{BOUTIQUE_ROUNDS}
        </span>
      </GameHud>
      <div className="game__stage boutique">
        <p className="boutique__prompt" aria-live="polite">
          {phase === 'start' && (
            <>
              Dans la boutique : <strong>{plural(current.start, 'client')}</strong>
            </>
          )}
          {phase === 'events' && 'Compte bien…'}
          {phase !== 'start' && phase !== 'events' && 'Combien de clients dans la boutique ?'}
        </p>
        <div className="shop">
          <div className="shop__roof" />
          <div className="shop__sign">BOUTIQUE</div>
          <div className={`shop__window${phase === 'start' ? ' is-open' : ''}`}>
            {phase === 'start' &&
              Array.from({ length: current.start }, (_, i) => (
                <span key={i} className="shop__shopper" style={{ '--hue': HUES[i % HUES.length] } as CSSProperties} />
              ))}
          </div>
          <div className="shop__door" />
          <div className="shop__street" key={`${round}-${step}-${phase}`}>
            {phase === 'events' && (
              <>
                {Array.from({ length: event.enter }, (_, i) => (
                  <Walker key={`in-${i}`} kind="in" index={i} duration={duration} hue={HUES[(i + step) % HUES.length]} />
                ))}
                {Array.from({ length: event.leave }, (_, i) => (
                  <Walker key={`out-${i}`} kind="out" index={i} duration={duration} hue={HUES[(i + step + 3) % HUES.length]} />
                ))}
                {Array.from({ length: event.cats }, (_, i) => (
                  <Cat key={`cat-${i}`} index={i} duration={duration} />
                ))}
                {/* Sans animation, les passages s'affichent en étiquettes à côté de la porte. */}
                {reduced && event.enter > 0 && (
                  <span className="shop__badge shop__badge--in">
                    +{event.enter} entre{event.enter > 1 ? 'nt' : ''}
                  </span>
                )}
                {reduced && event.leave > 0 && (
                  <span className="shop__badge shop__badge--out">
                    {event.leave} sor{event.leave > 1 ? 'tent' : 't'}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {describe}
        </p>
        {phase !== 'start' && phase !== 'events' && (
          <span className={`slot slot--wide${typed ? ' slot--filled' : ''}`}>{typed || '?'}</span>
        )}
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls">
        <NumPad onDigit={press} onErase={erase} onSubmit={submit} disabled={phase !== 'answer'} />
      </div>
    </div>
  );
}
