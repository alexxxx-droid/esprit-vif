import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { plural } from '../../core/format';
import {
  formatClock,
  formatDuration,
  generateHorloges,
  handAngles,
  HORLOGES_DURATION_MS,
  horlogesLevel,
  scoreHorloges,
  type HorlogeQuestion,
  type Numerals,
} from '../../core/games/horloges';
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

const NUMERALS: Record<Numerals, number[]> = {
  all: [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  quarters: [12, 3, 6, 9],
  none: [],
};

const polar = (angle: number, radius: number) => {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
};

/** Horloge à aiguilles : petite aiguille épaisse pour les heures, grande et fine pour les minutes. */
export function ClockFace({ time, numerals, size = 200 }: { time: number; numerals: Numerals; size?: number }) {
  const { hour, minute } = handAngles(time);
  const h = polar(hour, 50);
  const m = polar(minute, 76);
  return (
    <svg className="clock" width={size} height={size} viewBox="-100 -100 200 200" aria-hidden="true">
      <circle className="clock__face" r={96} />
      {Array.from({ length: 60 }, (_, i) => {
        const big = i % 5 === 0;
        const a = polar(i * 6, 90);
        const b = polar(i * 6, big ? 80 : 86);
        return <line key={i} className={big ? 'clock__tick clock__tick--hour' : 'clock__tick'} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
      })}
      {NUMERALS[numerals].map((n) => {
        const p = polar((n % 12) * 30, 64);
        return (
          <text key={n} className="clock__numeral" x={p.x} y={p.y} dy="0.35em" textAnchor="middle">
            {n}
          </text>
        );
      })}
      <line className="clock__hand clock__hand--hour" x1={0} y1={0} x2={h.x} y2={h.y} />
      <line className="clock__hand clock__hand--minute" x1={0} y1={0} x2={m.x} y2={m.y} />
      <circle className="clock__center" r={6} />
    </svg>
  );
}

function askOf(q: HorlogeQuestion): string {
  if (q.mode === 'read') return 'Quelle heure est-il ?';
  if (q.mode === 'later') return `Quelle heure sera-t-il dans ${formatDuration(q.delta)} ?`;
  return 'Combien de temps s’est écoulé d’une horloge à l’autre ?';
}

export function HorlogesGame({ seed, level, onFinish }: GameProps) {
  const config = horlogesLevel(level);
  const questions = useMemo(() => generateHorloges(createRng(seed), level), [seed, level]);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const q = questions[index % questions.length];

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreHorloges(correct, errors, level),
      stats: { correct, errors },
      headline: `${plural(correct, 'bonne réponse', 'bonnes réponses')} · ${plural(errors, 'erreur')}`,
      lines: [
        { label: 'Bonnes réponses', value: String(correct) },
        { label: 'Erreurs', value: errors ? String(errors) : 'Aucune' },
        { label: 'Objectif pour 100 pts', value: String(config.target) },
      ],
    });
  });

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= HORLOGES_DURATION_MS) {
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

  const choose = (option: number) => {
    if (over) return;
    if (option === q.answer) {
      fx.good();
      showMark('good');
      setCorrect(correct + 1);
    } else {
      fx.bad();
      showMark('bad', `C’était ${q.options[q.answer]}`);
      setErrors(errors + 1);
    }
    setIndex(index + 1);
  };

  useKeyDown((e) => {
    const n = Number(e.key);
    if (n >= 1 && n <= 4) choose(n - 1);
  }, !over);

  const label = q.mode === 'elapsed' ? `De ${formatClock(q.clock)} à ${formatClock(q.clock2 ?? 0)}` : `Horloge : ${formatClock(q.clock)}`;

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={HORLOGES_DURATION_MS} />
      </GameHud>
      <div className="game__stage horloges">
        <p className="anagram__found">
          <strong>{correct}</strong> / {config.target}
        </p>
        <div key={index} className={`horloges__clocks${q.mode === 'elapsed' ? ' horloges__clocks--two' : ''}`}>
          <ClockFace time={q.clock} numerals={config.numerals} size={q.mode === 'elapsed' ? 148 : 210} />
          {q.mode === 'elapsed' && (
            <>
              <Icon name="arrow" size={26} />
              <ClockFace time={q.clock2 ?? 0} numerals={config.numerals} size={148} />
            </>
          )}
        </div>
        {/* Les lecteurs d'écran ne voient pas les aiguilles : on leur lit l'heure sans la donner aux autres. */}
        <p className="sr-only">{q.mode === 'read' ? 'Horloge à lire : choisis parmi les propositions.' : label}</p>
        <p className="horloges__ask">{askOf(q)}</p>
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls horloges__options">
        {q.options.map((option, i) => (
          <TapButton key={`${index}-${i}`} className="horloges__option" onTap={() => choose(i)} aria-keyshortcuts={String(i + 1)}>
            {option}
          </TapButton>
        ))}
      </div>
    </div>
  );
}
