import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { tr } from '../../core/lang';
import { describeRule, generateReflexe, reflexeLevel, REFLEXE_TRIALS, scoreReflexe } from '../../core/games/reflexe';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { Shape } from '../components/Shape';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameHud } from '../game/Hud';
import { useKeyDown } from '../hooks';
import { slow } from '../tempo';

type Phase = 'gap' | 'stim' | 'fb';

interface Tally {
  hits: number;
  misses: number;
  falseAlarms: number;
  rejections: number;
  rts: number[];
}

export function ReflexeGame({ seed, level, onFinish }: GameProps) {
  const config = reflexeLevel(level);
  const trials = useMemo(() => generateReflexe(createRng(seed), level), [seed, level]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('gap');
  const [tally, setTally] = useState<Tally>({ hits: 0, misses: 0, falseAlarms: 0, rejections: 0, rts: [] });
  const [mark, showMark] = useFeedback();
  const shownAt = useRef(0);
  const done = index >= trials.length;
  const trial = trials[Math.min(index, trials.length - 1)];
  const rule = config.rules[trial.ruleIndex];
  const ruleChanged = index > 0 && trials[index - 1].ruleIndex !== trial.ruleIndex;

  const finish = useEffectEvent((t: Tally) => {
    const mean = t.rts.length ? t.rts.reduce((a, b) => a + b, 0) / t.rts.length : null;
    onFinish({
      score: scoreReflexe(t.hits, t.misses, t.falseAlarms, t.rejections, mean, level),
      stats: { hits: t.hits, misses: t.misses, falseAlarms: t.falseAlarms, rejections: t.rejections, meanRt: mean ? Math.round(mean) : 0 },
      headline: `${t.hits + t.rejections}/${REFLEXE_TRIALS} ${tr('justes', 'correct')}${mean ? ` · ${Math.round(mean)} ms` : ''}`,
      lines: [
        { label: tr('Bonnes touches', 'Correct taps'), value: `${t.hits} / ${t.hits + t.misses}` },
        { label: tr('Retenues réussies', 'Correct holds'), value: `${t.rejections} / ${t.rejections + t.falseAlarms}` },
        { label: tr('Temps de réaction moyen', 'Average reaction time'), value: mean ? `${Math.round(mean)} ms` : '—' },
      ],
    });
  });

  const expire = useEffectEvent(() => {
    // Pas de réaction : bien joué si la forme était à éviter, raté sinon.
    if (trial.go) {
      fx.bad();
      showMark('bad', tr('Il fallait toucher', 'You should have tapped'));
      setTally({ ...tally, misses: tally.misses + 1 });
    } else setTally({ ...tally, rejections: tally.rejections + 1 });
    setPhase('fb');
  });

  useEffect(() => {
    if (done) return;
    if (phase === 'gap') {
      const id = window.setTimeout(() => {
        shownAt.current = performance.now();
        setPhase('stim');
      }, trial.gapMs + (ruleChanged ? 1200 : 0));
      return () => window.clearTimeout(id);
    }
    if (phase === 'stim') {
      const id = window.setTimeout(() => expire(), slow(config.windowMs));
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => {
      if (index + 1 >= trials.length) finish(tally);
      setIndex(index + 1);
      setPhase('gap');
    }, 220);
    return () => window.clearTimeout(id);
  }, [phase, index, done, trial.gapMs, ruleChanged, config.windowMs, trials.length, tally]);

  const tap = () => {
    if (phase !== 'stim') return;
    if (trial.go) {
      fx.good();
      setTally({ ...tally, hits: tally.hits + 1, rts: [...tally.rts, performance.now() - shownAt.current] });
    } else {
      fx.bad();
      showMark('bad', tr('Pas celle-là !', 'Not that one!'));
      setTally({ ...tally, falseAlarms: tally.falseAlarms + 1 });
    }
    setPhase('fb');
  };

  useKeyDown((e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      tap();
    }
  }, !done);

  return (
    <div className="game">
      <GameHud progress={index / REFLEXE_TRIALS}>
        <span className="chip">
          {Math.min(index + 1, REFLEXE_TRIALS)}/{REFLEXE_TRIALS}
        </span>
      </GameHud>
      <p key={trial.ruleIndex} className={`reflexe__rule${ruleChanged && phase === 'gap' ? ' is-new' : ''}`} aria-live="polite">
        {ruleChanged && phase === 'gap' && <strong>{tr('Nouvelle règle ! ', 'New rule! ')}</strong>}
        {describeRule(rule)}
        <span className="reflexe__rule-shapes" aria-hidden="true">
          {rule.go.map((shape) => (
            <Shape key={shape} card={{ shape, filled: true, rotation: 0 }} size={22} />
          ))}
        </span>
      </p>
      <div className="game__stage reflexe-stage">
        <TapButton className="reflexe" onTap={tap} aria-label={tr('Toucher', 'Tap')} aria-keyshortcuts="Space">
          {phase === 'stim' && (
            <span key={index} className="reflexe__shape">
              <Shape card={trial.card} size={150} />
            </span>
          )}
        </TapButton>
        <FeedbackMark mark={mark} />
      </div>
    </div>
  );
}
