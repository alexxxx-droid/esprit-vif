import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { tr } from '../../core/lang';
import { plural } from '../../core/format';
import {
  dayPart,
  formatClock,
  formatDayTime,
  formatDuration,
  generateHorloges,
  handAngles,
  HORLOGES_DURATION_MS,
  horlogesLevel,
  romanNumeral,
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
  roman: [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  romanQuarters: [12, 3, 6, 9],
};

const polar = (angle: number, radius: number) => {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
};

/**
 * Horloge à aiguilles : petite aiguille épaisse pour les heures, grande et fine pour les minutes.
 * `mirror` : l'horloge telle qu'on la voit dans un miroir (tout est retourné, chiffres compris).
 */
export function ClockFace({ time, numerals, size = 200, mirror = false }: { time: number; numerals: Numerals; size?: number; mirror?: boolean }) {
  const { hour, minute } = handAngles(time);
  const h = polar(hour, 50);
  const m = polar(minute, 76);
  const roman = numerals === 'roman' || numerals === 'romanQuarters';
  return (
    <svg className={`clock${mirror ? ' clock--mirror' : ''}`} width={size} height={size} viewBox="-100 -100 200 200" aria-hidden="true">
      <g transform={mirror ? 'scale(-1 1)' : undefined}>
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
          <text key={n} className={`clock__numeral${numerals === 'roman' ? ' clock__numeral--roman' : ''}`} x={p.x} y={p.y} dy="0.35em" textAnchor="middle">
            {roman ? romanNumeral(n) : n}
          </text>
        );
      })}
      <line className="clock__hand clock__hand--hour" x1={0} y1={0} x2={h.x} y2={h.y} />
      <line className="clock__hand clock__hand--minute" x1={0} y1={0} x2={m.x} y2={m.y} />
      <circle className="clock__center" r={6} />
      </g>
    </svg>
  );
}

/** Horloge d'une durée sur 24 heures : le moment de la journée est écrit dessous. */
export function DayClock({ time, numerals, mirror = false, size = 136 }: { time: number; numerals: Numerals; mirror?: boolean; size?: number }) {
  const part = dayPart(time);
  return (
    <div className="horloges__day">
      <ClockFace time={time} numerals={numerals} size={size} mirror={mirror} />
      <span className="horloges__daypart">
        <Icon name={part.night ? 'moon' : 'sun'} size={16} />
        {part.label}
      </span>
    </div>
  );
}

function askOf(q: HorlogeQuestion): string {
  if (q.mode === 'read' && q.mirror) return tr('Quelle heure est-il vraiment\u00a0?', 'What time is it really?');
  if (q.mode === 'read') return tr('Quelle heure est-il ?', 'What time is it?');
  if (q.mode === 'later') return tr(`Quelle heure sera-t-il dans ${formatDuration(q.delta)} ?`, `What time will it be in ${formatDuration(q.delta)}?`);
  if (q.mode === 'earlier') return tr(`Quelle heure était-il il y a ${formatDuration(q.delta)}\u00a0?`, `What time was it ${formatDuration(q.delta)} ago?`);
  return tr('Combien de temps s’est écoulé d’une horloge à l’autre ?', 'How much time passed from one clock to the other?');
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
      headline: tr(
        `${plural(correct, 'bonne réponse', 'bonnes réponses')} · ${plural(errors, 'erreur')}`,
        `${plural(correct, 'correct answer')} · ${plural(errors, 'error')}`,
      ),
      lines: [
        { label: tr('Bonnes réponses', 'Correct answers'), value: String(correct) },
        { label: tr('Erreurs', 'Errors'), value: errors ? String(errors) : tr('Aucune', 'None') },
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: String(config.target) },
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
      showMark('bad', tr(`C’était ${q.options[q.answer]}`, `It was ${q.options[q.answer]}`));
      setErrors(errors + 1);
    }
    setIndex(index + 1);
  };

  useKeyDown((e) => {
    const n = Number(e.key);
    if (n >= 1 && n <= 4) choose(n - 1);
  }, !over);

  const label =
    q.mode === 'overnight'
      ? tr(`De ${formatDayTime(q.clock)} à ${formatDayTime(q.clock2 ?? 0)}`, `From ${formatDayTime(q.clock)} to ${formatDayTime(q.clock2 ?? 0)}`)
      : q.mode === 'elapsed'
        ? tr(`De ${formatClock(q.clock)} à ${formatClock(q.clock2 ?? 0)}`, `From ${formatClock(q.clock)} to ${formatClock(q.clock2 ?? 0)}`)
        : tr(`Horloge : ${formatClock(q.clock)}`, `Clock: ${formatClock(q.clock)}`);
  const mirror = Boolean(q.mirror);
  const two = q.mode === 'elapsed' || q.mode === 'overnight';

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={HORLOGES_DURATION_MS} />
      </GameHud>
      <div className="game__stage horloges">
        <p className="anagram__found">
          <strong>{correct}</strong> / {config.target}
        </p>
        {mirror && (
          <p key={`m${index}`} className="chip horloges__mirror">
            {tr('Vue dans un miroir', 'Seen in a mirror')}
          </p>
        )}
        <div key={index} className={`horloges__clocks${two ? ' horloges__clocks--two' : ''}`}>
          {q.mode === 'overnight' ? (
            <>
              <DayClock time={q.clock} numerals={config.numerals} mirror={mirror} />
              <Icon name="arrow" size={26} />
              <DayClock time={q.clock2 ?? 0} numerals={config.numerals} mirror={mirror} />
            </>
          ) : (
            <>
              <ClockFace time={q.clock} numerals={config.numerals} size={two ? 148 : 210} mirror={mirror} />
              {two && (
                <>
                  <Icon name="arrow" size={26} />
                  <ClockFace time={q.clock2 ?? 0} numerals={config.numerals} size={148} mirror={mirror} />
                </>
              )}
            </>
          )}
        </div>
        {/* Les lecteurs d'écran ne voient pas les aiguilles : on leur lit l'heure sans la donner aux autres. */}
        <p className="sr-only">{q.mode === 'read' ? tr('Horloge à lire : choisis parmi les propositions.', 'Clock to read: pick one of the choices.') : label}</p>
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
