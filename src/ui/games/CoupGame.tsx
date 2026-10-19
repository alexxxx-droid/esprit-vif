import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { tr } from '../../core/lang';
import { plural } from '../../core/format';
import { COUP_DURATION_MS, coupLevel, generateCoupTrial, scoreCoup, type Dot } from '../../core/games/coupdoeil';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';
import { useKeyDown } from '../hooks';
import { slow } from '../tempo';
import { COUP_GROUPS } from './coup-groups';

/** Le temps de fixer le centre entre deux nuées. */
const FIXATION_MS = 450;

export function DotField({ groups, hidden }: { groups: readonly (readonly Dot[])[]; hidden?: boolean }) {
  return (
    <svg className="coup__field" viewBox="0 0 100 100" aria-hidden="true">
      {hidden ? (
        <text className="coup__mask" x="50" y="50" textAnchor="middle" dominantBaseline="central">
          ?
        </text>
      ) : (
        groups.map((dots, g) => dots.map((d, i) => <circle key={`${g}-${i}`} cx={d.x} cy={d.y} r={d.r} fill={COUP_GROUPS[g].color} />))
      )}
    </svg>
  );
}

type Phase = 'fix' | 'show' | 'ask';

export function CoupGame({ seed, level, onFinish }: GameProps) {
  const config = coupLevel(level);
  const trials = useMemo(() => {
    const rng = createRng(seed);
    return Array.from({ length: 80 }, () => generateCoupTrial(rng, level));
  }, [seed, level]);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('fix');
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const trial = trials[index % trials.length];

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreCoup(correct, errors, level),
      stats: { correct, errors },
      headline: tr(
        `${plural(correct, 'bonne réponse', 'bonnes réponses')} · ${plural(errors, 'erreur')}`,
        `${plural(correct, 'correct answer')} · ${plural(errors, 'error')}`,
      ),
      lines: [
        { label: tr('Bonnes réponses', 'Correct answers'), value: String(correct) },
        { label: tr('Erreurs', 'Errors'), value: errors ? String(errors) : tr('Aucune', 'None') },
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: tr(`${config.target} (erreurs déduites)`, `${config.target} (minus errors)`) },
      ],
    });
  });

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= COUP_DURATION_MS) {
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

  // Croix de fixation, puis les points un instant, puis la question.
  useEffect(() => {
    if (over || phase === 'ask') return;
    const id = window.setTimeout(() => setPhase(phase === 'fix' ? 'show' : 'ask'), phase === 'fix' ? FIXATION_MS : slow(config.showMs));
    return () => window.clearTimeout(id);
  }, [phase, index, over, config.showMs]);

  const choose = (group: 0 | 1) => {
    if (over || phase === 'fix') return;
    const [a, b] = trial.groups;
    if (group === trial.answer) {
      fx.good();
      showMark('good');
      setCorrect(correct + 1);
    } else {
      fx.bad();
      showMark(
        'bad',
        b.length > a.length
          ? tr(`${b.length} orange contre ${a.length} bleus`, `${b.length} orange vs ${a.length} blue`)
          : tr(`${a.length} bleus contre ${b.length} orange`, `${a.length} blue vs ${b.length} orange`),
      );
      setErrors(errors + 1);
    }
    setIndex(index + 1);
    setPhase('fix');
  };

  useKeyDown((e) => {
    if (e.key === 'ArrowLeft' || e.key === '1') choose(0);
    else if (e.key === 'ArrowRight' || e.key === '2') choose(1);
  }, !over);

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={COUP_DURATION_MS} />
      </GameHud>
      <div className="game__stage coup">
        <p className="anagram__found">
          <strong>{correct}</strong> / {config.target}
        </p>
        <div className={`coup__frame is-${phase}`}>
          {phase === 'fix' ? <span className="coup__cross" aria-hidden="true" /> : <DotField key={index} groups={trial.groups} hidden={phase === 'ask'} />}
        </div>
        <p className="lettre__ask" aria-live="polite">
          {phase === 'ask' ? tr('Quelle couleur était la plus nombreuse ?', 'Which color had more dots?') : phase === 'show' ? tr('Regarde bien…', 'Look closely…') : ' '}
        </p>
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls coup__options">
        {COUP_GROUPS.map((g, i) => (
          <TapButton key={g.name} className="coup__option" onTap={() => choose(i as 0 | 1)} disabled={phase === 'fix'} aria-keyshortcuts={i ? 'ArrowRight' : 'ArrowLeft'}>
            <span className="coup__swatch" style={{ background: g.color }} aria-hidden="true" />
            {tr(g.more.fr, g.more.en)}
          </TapButton>
        ))}
      </div>
    </div>
  );
}
