import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { tr } from '../../core/lang';
import { ECHO_LEAD_MS, ECHO_MAX_FAILURES, ECHO_MAX_LENGTH, ECHO_MAX_MS, echoLength, echoLevel, echoShown, generateEcho, scoreEcho } from '../../core/games/echo';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';
import { slow } from '../tempo';

type Phase = 'lead' | 'show' | 'input' | 'pause' | 'over';

/** Nom de chaque couleur, pour les lecteurs d'écran (la forme aide aussi les daltoniens). */
const COLOR_NAMES = [
  () => tr('bleu', 'blue'),
  () => tr('rouge', 'red'),
  () => tr('vert', 'green'),
  () => tr('jaune', 'yellow'),
  () => tr('violet', 'purple'),
  () => tr('orange', 'orange'),
];

/** Une forme par couleur : rond, triangle, carré, étoile, losange, goutte. */
const SHAPES = [
  <circle key="0" cx="12" cy="12" r="7" />,
  <path key="1" d="M12 4.5 20 19H4z" />,
  <rect key="2" x="5" y="5" width="14" height="14" rx="2" />,
  <path key="3" d="m12 3.5 2.5 5.4 5.9.6-4.4 4 1.3 5.8L12 16.4l-5.3 2.9L8 13.5l-4.4-4 5.9-.6z" />,
  <path key="4" d="M12 3.5 20.5 12 12 20.5 3.5 12z" />,
  <path key="5" d="M12 3.5c3.5 4.6 6.5 8.1 6.5 11a6.5 6.5 0 0 1-13 0c0-2.9 3-6.4 6.5-11z" />,
];

export function EchoShape({ color }: { color: number }) {
  return (
    <svg className="echo__shape" viewBox="0 0 24 24" aria-hidden="true">
      {SHAPES[color]}
    </svg>
  );
}

export function EchoGame({ seed, level, onFinish }: GameProps) {
  const c = echoLevel(level);
  const game = useMemo(() => generateEcho(createRng(seed), level), [seed, level]);
  const [clock] = useState(() => new GameClock());
  const [turn, setTurn] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [retry, setRetry] = useState(false);
  const [phase, setPhase] = useState<Phase>('lead');
  const [active, setActive] = useState<number | null>(null);
  const [typed, setTyped] = useState(0);
  const [failures, setFailures] = useState(0);
  const [best, setBest] = useState(0);
  const [mark, showMark] = useFeedback();
  const over = useRef(false);
  const length = echoLength(c, turn);
  const layout = game.layouts[attempt % game.layouts.length];
  // La couleur posée à chaque place.
  const colorAt = Array.from({ length: c.pads }, (_, place) => layout.indexOf(place));

  const finish = (finalBest: number, finalFailures: number) => {
    if (over.current) return;
    over.current = true;
    setPhase('over');
    clock.stop();
    onFinish({
      score: scoreEcho(finalBest, level),
      stats: { best: finalBest, failures: finalFailures },
      headline: tr(`Suite de ${finalBest} notes`, `${finalBest}-note sequence`),
      lines: [
        { label: tr('Plus longue suite', 'Longest sequence'), value: String(finalBest) },
        { label: tr('Erreurs', 'Mistakes'), value: finalFailures ? String(finalFailures) : tr('Aucune', 'None') },
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: tr(`${c.full} notes`, `${c.full} notes`) },
      ],
    });
  };

  const timeUp = useEffectEvent(() => finish(best, failures));

  // Une minute au plus.
  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= ECHO_MAX_MS) {
        window.clearInterval(id);
        timeUp();
      }
    }, 100);
    return () => {
      window.clearInterval(id);
      clock.stop();
    };
  }, [clock]);

  // L'écho : une courte pause, puis les notes une à une.
  useEffect(() => {
    if (phase === 'lead') {
      const id = window.setTimeout(() => setPhase('show'), slow(ECHO_LEAD_MS));
      return () => window.clearTimeout(id);
    }
    if (phase !== 'show') return;
    const { from, to } = echoShown(c, turn, retry);
    const light = slow(c.lightMs);
    const beat = light + slow(c.gapMs);
    const timers: number[] = [];
    for (let i = from; i < to; i++) {
      const at = (i - from) * beat;
      timers.push(
        window.setTimeout(() => {
          setActive(game.sequence[i]);
          fx.note(game.sequence[i]);
        }, at),
        window.setTimeout(() => setActive(null), at + light),
      );
    }
    timers.push(
      window.setTimeout(() => {
        setTyped(0);
        setPhase('input');
      }, (to - from) * beat),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [phase, turn, retry, c, game]);

  const next = (again: boolean) => {
    setPhase('pause');
    window.setTimeout(() => {
      if (over.current) return;
      setAttempt((a) => a + 1);
      setRetry(again);
      if (!again) setTurn((t) => t + 1);
      setPhase('lead');
    }, slow(600));
  };

  const tap = (color: number) => {
    if (phase !== 'input') return;
    fx.note(color);
    setActive(color);
    window.setTimeout(() => setActive((a) => (a === color ? null : a)), 180);
    if (color !== game.sequence[typed]) {
      fx.bad();
      showMark('bad');
      const total = failures + 1;
      setFailures(total);
      if (total >= ECHO_MAX_FAILURES) finish(best, total);
      else next(true);
      return;
    }
    if (typed + 1 < length) {
      setTyped(typed + 1);
      return;
    }
    fx.good();
    showMark('good');
    setBest(length);
    if (echoLength(c, turn + 1) > ECHO_MAX_LENGTH || length >= ECHO_MAX_LENGTH) finish(length, failures);
    else next(false);
  };

  const prompt =
    phase === 'input'
      ? tr(`À toi : ${typed} / ${length}`, `Your turn: ${typed} / ${length}`)
      : phase === 'show' || phase === 'lead'
        ? tr('Écoute l’écho…', 'Listen to the echo…')
        : '';

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={ECHO_MAX_MS} />
      </GameHud>
      <div className="game__stage echo">
        <p className="anagram__found">
          {tr('Suite de', 'Sequence of')} <strong>{length}</strong>
          {failures > 0 && <span className="echo__failures"> · {tr('1 erreur', '1 mistake')}</span>}
        </p>
        <div className={`echo__pads echo__pads--${c.pads}`} role="group" aria-label={tr('Les touches de l’écho', 'The echo pads')}>
          {colorAt.map((color, place) => (
            <TapButton
              key={place}
              className={`echo__pad echo__pad--${color}${active === color ? ' is-lit' : ''}`}
              onTap={() => tap(color)}
              disabled={phase !== 'input'}
              aria-label={COLOR_NAMES[color]()}
            >
              <EchoShape color={color} />
            </TapButton>
          ))}
        </div>
        <p className="lettre__ask echo__prompt" aria-live="polite">
          {prompt}
        </p>
        <FeedbackMark mark={mark} />
      </div>
    </div>
  );
}
