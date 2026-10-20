import { useEffect, useEffectEvent, useMemo, useState, type CSSProperties } from 'react';
import { lang, tr } from '../../core/lang';
import { plural } from '../../core/format';
import { BOUTIQUE_ROUNDS, boutiqueLevel, generateBoutiqueRound, scoreBoutique, type BoutiqueEvent, type BoutiqueRound } from '../../core/games/boutique';
import { createRng, deriveSeed } from '../../core/rng';
import { NumPad } from '../components/bits';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameHud } from '../game/Hud';
import { useKeyDown, useReducedMotion } from '../hooks';
import { slow } from '../tempo';

type Phase = 'start' | 'events' | 'answer' | 'feedback';

const HUES = [12, 210, 140, 280, 35, 330, 190];

/** Un client stylisé (tête + corps), coloré pour le plaisir des yeux. */
function Walker({ kind, index, duration, hue }: { kind: 'in' | 'out' | 'bakery-in' | 'bakery-out'; index: number; duration: number; hue: number }) {
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

function Shoppers({ count, offset = 0 }: { count: number; offset?: number }) {
  return Array.from({ length: count }, (_, i) => (
    <span key={i} className="shop__shopper" style={{ '--hue': HUES[(i + offset) % HUES.length] } as CSSProperties} />
  ));
}

/** La question de fin de manche. */
function questionText(round: BoutiqueRound): string {
  switch (round.question) {
    case 'entered':
      return tr('Combien de clients sont ENTRÉS dans la boutique ?', 'How many customers WENT INTO the shop?');
    case 'left':
      return tr('Combien de clients sont SORTIS de la boutique ?', 'How many customers CAME OUT of the shop?');
    case 'bakery':
      return tr('Combien de clients dans la BOULANGERIE ?', 'How many customers are in the BAKERY?');
    default:
      return tr('Combien de clients dans la boutique ?', 'How many customers are in the shop?');
  }
}

/** La bonne réponse, dite après une erreur. */
function correction(round: BoutiqueRound): string {
  const n = round.expected;
  switch (round.question) {
    case 'entered':
      return tr(`Il en est entré ${n}`, `${n} went in`);
    case 'left':
      return tr(`Il en est sorti ${n}`, `${n} came out`);
    case 'bakery':
      return tr(`Il y en avait ${n} à la boulangerie`, `There were ${n} in the bakery`);
    default:
      return tr(`Il y en avait ${n}`, `There were ${n}`);
  }
}

/** Les mouvements d'un instant, pour les lecteurs d'écran. */
function describeEvent(event: BoutiqueEvent): string {
  if (lang() === 'en') {
    return [
      event.enter && `${plural(event.enter, 'customer')} ${event.enter === 1 ? 'comes' : 'come'} in`,
      event.leave && `${plural(event.leave, 'customer')} ${event.leave === 1 ? 'leaves' : 'leave'}`,
      event.bakeryIn && `${plural(event.bakeryIn, 'customer')} ${event.bakeryIn === 1 ? 'goes' : 'go'} into the bakery`,
      event.bakeryOut && `${plural(event.bakeryOut, 'customer')} ${event.bakeryOut === 1 ? 'leaves' : 'leave'} the bakery`,
    ]
      .filter(Boolean)
      .join(', ');
  }
  return [
    event.enter && `${plural(event.enter, 'client')} entre${event.enter > 1 ? 'nt' : ''}`,
    event.leave && `${plural(event.leave, 'client')} sor${event.leave > 1 ? 'tent' : 't'}`,
    event.bakeryIn && `${plural(event.bakeryIn, 'client')} entre${event.bakeryIn > 1 ? 'nt' : ''} à la boulangerie`,
    event.bakeryOut && `${plural(event.bakeryOut, 'client')} sor${event.bakeryOut > 1 ? 'tent' : 't'} de la boulangerie`,
  ]
    .filter(Boolean)
    .join(', ');
}

export function BoutiqueGame({ seed, level, onFinish }: GameProps) {
  const config = boutiqueLevel(level);
  const stepMs = slow(config.stepMs);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('start');
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState('');
  const [correct, setCorrect] = useState(0);
  const [mark, showMark] = useFeedback();
  const reduced = useReducedMotion();
  const current = useMemo(() => generateBoutiqueRound(createRng(deriveSeed(seed, round)), level), [seed, round, level]);
  const event = current.events[Math.min(step, current.events.length - 1)];
  const duo = config.bakery;

  const finish = useEffectEvent((total: number) => {
    onFinish({
      score: scoreBoutique(total),
      stats: { correct: total, events: config.events },
      headline: tr(`${total}/${BOUTIQUE_ROUNDS} manches`, `${total}/${BOUTIQUE_ROUNDS} rounds`),
      lines: [
        { label: tr('Manches réussies', 'Rounds won'), value: `${total} / ${BOUTIQUE_ROUNDS}` },
        { label: tr('Mouvements par manche', 'Moves per round'), value: String(config.events) },
      ],
    });
  });

  useEffect(() => {
    if (phase === 'start') {
      const id = window.setTimeout(
        () => {
          setStep(0);
          setPhase('events');
        },
        config.askBakery > 0 ? 2800 : 2000,
      );
      return () => window.clearTimeout(id);
    }
    if (phase === 'events') {
      const id = window.setTimeout(() => {
        if (step + 1 < current.events.length) {
          setStep(step + 1);
          fx.tick();
        } else setPhase('answer');
      }, stepMs + 250);
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
  }, [phase, step, round, correct, current, stepMs, config.askBakery]);

  const submit = () => {
    if (phase !== 'answer' || !typed) return;
    if (Number(typed) === current.expected) {
      fx.good();
      showMark('good');
      setCorrect(correct + 1);
    } else {
      fx.bad();
      showMark('bad', correction(current));
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

  const duration = stepMs;
  const en = lang() === 'en';
  const badge = (n: number, out: boolean) =>
    out ? (en ? `${n} out` : `${n} sor${n > 1 ? 'tent' : 't'}`) : en ? `+${n} in` : `+${n} entre${n > 1 ? 'nt' : ''}`;

  return (
    <div className="game">
      <GameHud progress={round / BOUTIQUE_ROUNDS}>
        <span className="chip">
          {tr('Manche', 'Round')} {round + 1}/{BOUTIQUE_ROUNDS}
        </span>
      </GameHud>
      <div className="game__stage boutique">
        <p className="boutique__prompt" aria-live="polite">
          {phase === 'start' && (
            <>
              {en ? 'In the shop: ' : 'Dans la boutique : '}
              <strong>{en ? plural(current.start, 'customer') : plural(current.start, 'client')}</strong>
              {config.askBakery > 0 && current.bakeryStart !== null && (
                <>
                  {en ? ' · bakery: ' : ' · boulangerie : '}
                  <strong>{current.bakeryStart}</strong>
                </>
              )}
            </>
          )}
          {phase === 'events' && tr('Compte bien…', 'Keep counting…')}
          {phase !== 'start' && phase !== 'events' && questionText(current)}
        </p>
        <div className={`shop${duo ? ' shop--duo' : ''}`}>
          <div className="shop__roof" />
          <div className="shop__sign">{tr('BOUTIQUE', 'SHOP')}</div>
          {duo ? (
            <>
              <div className="shop__sign shop__sign--bakery">{tr('BOULANGERIE', 'BAKERY')}</div>
              <div className="shop__wall" />
              <div className={`shop__door shop__door--bakery${phase === 'start' ? ' is-open' : ''}`}>
                {phase === 'start' && <Shoppers count={current.bakeryStart ?? 0} offset={3} />}
              </div>
              <div className={`shop__door${phase === 'start' ? ' is-open' : ''}`}>{phase === 'start' && <Shoppers count={current.start} />}</div>
            </>
          ) : (
            <>
              <div className={`shop__window${phase === 'start' ? ' is-open' : ''}`}>{phase === 'start' && <Shoppers count={current.start} />}</div>
              <div className="shop__door" />
            </>
          )}
          <div className="shop__street" key={`${round}-${step}-${phase}`}>
            {phase === 'events' && (
              <>
                {Array.from({ length: event.enter }, (_, i) => (
                  <Walker key={`in-${i}`} kind="in" index={i} duration={duration} hue={HUES[(i + step) % HUES.length]} />
                ))}
                {Array.from({ length: event.leave }, (_, i) => (
                  <Walker key={`out-${i}`} kind="out" index={i} duration={duration} hue={HUES[(i + step + 3) % HUES.length]} />
                ))}
                {Array.from({ length: event.bakeryIn }, (_, i) => (
                  <Walker key={`bin-${i}`} kind="bakery-in" index={i} duration={duration} hue={HUES[(i + step + 1) % HUES.length]} />
                ))}
                {Array.from({ length: event.bakeryOut }, (_, i) => (
                  <Walker key={`bout-${i}`} kind="bakery-out" index={i} duration={duration} hue={HUES[(i + step + 5) % HUES.length]} />
                ))}
                {Array.from({ length: event.cats }, (_, i) => (
                  <Cat key={`cat-${i}`} index={i} duration={duration} />
                ))}
                {/* Sans animation, les passages s'affichent en étiquettes à côté de la porte. */}
                {reduced && event.enter > 0 && <span className="shop__badge shop__badge--in">{badge(event.enter, false)}</span>}
                {reduced && event.leave > 0 && <span className="shop__badge shop__badge--out">{badge(event.leave, true)}</span>}
                {reduced && event.bakeryIn > 0 && <span className="shop__badge shop__badge--in shop__badge--bakery">{badge(event.bakeryIn, false)}</span>}
                {reduced && event.bakeryOut > 0 && <span className="shop__badge shop__badge--out shop__badge--bakery">{badge(event.bakeryOut, true)}</span>}
              </>
            )}
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {phase === 'events' ? describeEvent(event) : ''}
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
