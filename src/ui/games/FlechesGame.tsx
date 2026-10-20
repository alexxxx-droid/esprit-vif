import { useEffect, useEffectEvent, useMemo, useRef, useState, type CSSProperties } from 'react';
import { tr } from '../../core/lang';
import {
  flechesCount,
  flechesLevel,
  flechesResponse,
  FLECHES_TRIALS,
  generateFleches,
  scoreFleches,
  type Dir,
  type FlechesLevel,
  type FlechesTrial,
} from '../../core/games/fleches';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { Icon } from '../components/Icon';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameHud } from '../game/Hud';
import { useKeyDown } from '../hooks';
import { slow } from '../tempo';

type Phase = 'fix' | 'stim' | 'fb';

const ROTATION: Record<Dir, number> = { right: 0, down: 90, left: 180, up: -90 };
const DIR_NAMES: Record<Dir, { fr: string; en: string }> = {
  left: { fr: 'gauche', en: 'left' },
  right: { fr: 'droite', en: 'right' },
  up: { fr: 'haut', en: 'up' },
  down: { fr: 'bas', en: 'down' },
};
/** Nom d'une direction dans la langue en cours. */
const dirName = (dir: Dir) => tr(DIR_NAMES[dir].fr, DIR_NAMES[dir].en);
const KEYS: Record<string, Dir> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

export function Arrow({ dir, size = 44, className }: { dir: Dir; size?: number; className?: string }) {
  return (
    <span className={className ? `arrow ${className}` : 'arrow'} style={{ transform: `rotate(${ROTATION[dir]}deg)` }}>
      <Icon name="arrow" size={size} strokeWidth={2.8} />
    </span>
  );
}

/** La rangée (ou colonne, ou carré) de flèches d'un essai, avec ses indices : couleur, cadre, barre. */
export function ArrowSet({ trial, config, shown = true }: { trial: FlechesTrial; config: FlechesLevel; shown?: boolean }) {
  const count = flechesCount(trial.layout, config.flankers);
  const middle = (count - 1) / 2;
  const colorCue = config.rule === 'switch' && config.cue === 'color';
  const classes = [
    'fleches__row',
    `fleches__row--${trial.layout}`,
    config.jitter && 'fleches__row--jitter',
    shown && config.motion && 'fleches__row--motion',
    shown && colorCue && `fleches__row--cue-${trial.ask}`,
    shown && trial.kind !== 'go' && `fleches__row--${trial.kind}`,
  ];
  return (
    <div
      className={classes.filter(Boolean).join(' ')}
      aria-live="polite"
      style={{ translate: `${trial.offset}% 0`, '--n': count } as CSSProperties}
    >
      {shown ? (
        Array.from({ length: count }, (_, i) => (
          <Arrow key={i} dir={i === middle ? trial.center : trial.flank} className={i === middle ? 'is-center' : i < middle ? 'is-before' : 'is-after'} />
        ))
      ) : (
        <span className="fleches__fix" aria-hidden="true">
          +
        </span>
      )}
    </div>
  );
}

/** Légende des indices du niveau : couleurs de la consigne, flèches encadrées, flèches barrées. */
function CueLegend({ config }: { config: FlechesLevel }) {
  const colorCue = config.rule === 'switch' && config.cue === 'color';
  if (!colorCue && !config.reverse && !config.nogo) return null;
  return (
    <ul className="fleches__legend">
      {colorCue && (
        <>
          <li className="fleches__key fleches__key--center">
            <Arrow dir="right" size={18} />
            {tr('celle du milieu', 'middle one')}
          </li>
          <li className="fleches__key fleches__key--flank">
            <Arrow dir="right" size={18} />
            {tr('les voisines', 'outer ones')}
          </li>
        </>
      )}
      {config.reverse > 0 && (
        <li className="fleches__key">
          <span className="fleches__mini fleches__mini--reverse">
            <Arrow dir="right" size={16} />
          </span>
          {tr('sens inverse', 'opposite way')}
        </li>
      )}
      {config.nogo > 0 && (
        <li className="fleches__key">
          <span className="fleches__mini fleches__mini--nogo">
            <Arrow dir="right" size={16} />
          </span>
          {tr('ne touche rien', 'don’t tap')}
        </li>
      )}
    </ul>
  );
}

/** Ce que voit un lecteur d'écran. */
function describeTrial(trial: FlechesTrial, colorCue: boolean): string {
  const base = tr(`Milieu : ${dirName(trial.center)}, voisines : ${dirName(trial.flank)}`, `Middle: ${dirName(trial.center)}, outer: ${dirName(trial.flank)}`);
  const cue = colorCue ? (trial.ask === 'center' ? tr(', en bleu', ', in blue') : tr(', en orange', ', in orange')) : '';
  const kind = trial.kind === 'reverse' ? tr(', encadrées', ', framed') : trial.kind === 'nogo' ? tr(', barrées', ', crossed out') : '';
  return `${base}${cue}${kind}`;
}

export function FlechesGame({ seed, level, onFinish }: GameProps) {
  const config = flechesLevel(level);
  const trials = useMemo(() => generateFleches(createRng(seed), level), [seed, level]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('fix');
  const [correct, setCorrect] = useState(0);
  const [rts, setRts] = useState<number[]>([]);
  const [mark, showMark] = useFeedback();
  const shownAt = useRef(0);
  const trial = trials[Math.min(index, trials.length - 1)];
  const done = index >= trials.length;
  const colorCue = config.rule === 'switch' && config.cue === 'color';

  const finish = useEffectEvent((total: number, times: number[]) => {
    const mean = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;
    onFinish({
      score: scoreFleches(total, mean, level),
      stats: { correct: total, meanRt: mean === null ? 0 : Math.round(mean) },
      headline: `${total}/${FLECHES_TRIALS} ${tr('justes', 'correct')}${mean ? ` · ${Math.round(mean)} ms` : ''}`,
      lines: [
        { label: tr('Bonnes réponses', 'Correct answers'), value: `${total} / ${FLECHES_TRIALS}` },
        { label: tr('Temps de réaction moyen', 'Average reaction time'), value: mean ? `${Math.round(mean)} ms` : '—' },
      ],
    });
  });

  const record = (ok: boolean, rt: number | null) => {
    const total = correct + (ok ? 1 : 0);
    const times = ok && rt !== null ? [...rts, rt] : rts;
    setCorrect(total);
    setRts(times);
    setPhase('fb');
    return { total, times };
  };

  const timeout = useEffectEvent(() => {
    // Flèches barrées : ne rien toucher, c'était la bonne réponse.
    if (trial.kind === 'nogo') {
      fx.good();
      record(true, null);
      return;
    }
    fx.bad();
    showMark('bad', tr('Trop tard !', 'Too late!'));
    record(false, null);
  });

  useEffect(() => {
    if (done) return;
    if (phase === 'fix') {
      const id = window.setTimeout(() => {
        shownAt.current = performance.now();
        setPhase('stim');
      }, 450);
      return () => window.clearTimeout(id);
    }
    if (phase === 'stim') {
      const id = window.setTimeout(() => timeout(), slow(config.windowMs));
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => {
      if (index + 1 >= trials.length) finish(correct, rts);
      setIndex(index + 1);
      setPhase('fix');
    }, 280);
    return () => window.clearTimeout(id);
  }, [phase, index, done, trials.length, config.windowMs, correct, rts]);

  const answer = (dir: Dir) => {
    if (phase !== 'stim') return;
    const expected = flechesResponse(trial);
    const ok = dir === expected;
    if (ok) fx.good();
    else {
      fx.bad();
      showMark(
        'bad',
        expected === null
          ? tr('Barrées : ne touche rien', 'Crossed out: don’t tap')
          : trial.kind === 'reverse'
            ? tr(`À l’envers : ${dirName(expected)}`, `Opposite way: ${dirName(expected)}`)
            : tr(`C’était ${dirName(expected)}`, `It was ${dirName(expected)}`),
      );
    }
    record(ok, performance.now() - shownAt.current);
  };

  useKeyDown((e) => {
    const dir = KEYS[e.key];
    if (dir && (config.dirs === 4 || dir === 'left' || dir === 'right')) {
      e.preventDefault();
      answer(dir);
    }
  }, !done);

  return (
    <div className="game">
      <GameHud progress={index / FLECHES_TRIALS}>
        <span className="chip">
          {Math.min(index + 1, FLECHES_TRIALS)}/{FLECHES_TRIALS}
        </span>
      </GameHud>
      <div className="game__stage fleches">
        {config.rule === 'switch' && !colorCue && phase !== 'fix' && (
          <p key={index} className={`fleches__ask fleches__ask--${trial.ask}`}>
            {trial.ask === 'center' ? tr('Celle du milieu', 'The middle one') : tr('Les voisines', 'The outer ones')}
          </p>
        )}
        <ArrowSet trial={trial} config={config} shown={phase !== 'fix'} />
        <p className="sr-only">{phase !== 'fix' && describeTrial(trial, colorCue)}</p>
        <p className="fleches__hint">
          {config.rule === 'flank'
            ? tr('Sens des flèches voisines ?', 'Which way do the outer arrows point?')
            : config.rule === 'center'
              ? tr('Sens de la flèche du milieu ?', 'Which way does the middle arrow point?')
              : colorCue
                ? tr('La couleur donne la consigne :', 'The color tells you which:')
                : tr('Suis la consigne !', 'Follow the instruction!')}
        </p>
        <CueLegend config={config} />
        <FeedbackMark mark={mark} />
      </div>
      <div className={`game__controls fleches__pad fleches__pad--${config.dirs}`}>
        {(config.dirs === 2 ? (['left', 'right'] as Dir[]) : (['up', 'left', 'right', 'down'] as Dir[])).map((dir) => (
          <TapButton key={dir} className={`dir-btn dir-btn--${dir}`} onTap={() => answer(dir)} aria-label={dirName(dir)}>
            <Arrow dir={dir} size={34} />
          </TapButton>
        ))}
      </div>
    </div>
  );
}
