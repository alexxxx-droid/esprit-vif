import { useEffect, useEffectEvent, useMemo, useState, type CSSProperties } from 'react';
import { byCount } from '../../core/format';
import { tr } from '../../core/lang';
import { generateIti, heading, ITI_TRIALS, itiLevel, scoreIti, type Cell, type ItiTrial, type Move } from '../../core/games/itineraire';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { Icon } from '../components/Icon';
import { Mascot } from '../components/Mascot';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameHud } from '../game/Hud';
import { slow } from '../tempo';

const ROTATION = { right: 0, down: 90, left: 180, up: -90, downRight: 45, downLeft: 135, upLeft: -135, upRight: -45 } as const;

/** Un déplacement : la flèche, et le nombre de cases s'il y en a plusieurs. */
export function MoveChip({ move, big }: { move: Move; big?: boolean }) {
  return (
    <span className={`iti-move${big ? ' iti-move--big' : ''}`} aria-label={tr(
        byCount(move.steps, `${move.steps} case ${heading(move.dir).label}`, `${move.steps} cases ${heading(move.dir).label}`),
        byCount(move.steps, `${move.steps} square ${heading(move.dir).label}`, `${move.steps} squares ${heading(move.dir).label}`),
      )}>
      <span style={{ transform: `rotate(${ROTATION[move.dir]}deg)` }} aria-hidden="true">
        <Icon name="arrow" size={big ? 44 : 24} strokeWidth={big ? 3 : 2.6} />
      </span>
      {move.steps > 1 && <b aria-hidden="true">{move.steps}</b>}
    </span>
  );
}

const same = (a: Cell | null, b: Cell) => a !== null && a.col === b.col && a.row === b.row;

interface GridProps {
  trial: Pick<ItiTrial, 'size' | 'start' | 'path' | 'end' | 'rows' | 'rocks'>;
  picked: Cell | null;
  showPath: boolean;
  disabled?: boolean;
  onPick?: (cell: Cell) => void;
}

export function ItiGrid({ trial, picked, showPath, disabled, onPick }: GridProps) {
  // Grille plus haute que large aux niveaux avancés (7 colonnes au plus : des cases d'au moins 40 px).
  const cols = trial.size;
  const rows = trial.rows ?? trial.size;
  const cells = Array.from({ length: cols * rows }, (_, i) => ({ col: i % cols, row: Math.floor(i / cols) }));
  const tall = rows !== cols;
  return (
    <div
      className={`iti-grid${tall ? ' iti-grid--tall' : ''}`}
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, ...(tall ? { '--iti-cols': cols, '--iti-rows': rows } : {}) } as CSSProperties}
    >
      {cells.map((cell) => {
        const start = same(trial.start, cell);
        const rock = trial.rocks?.some((r) => same(r, cell)) ?? false;
        const state = picked ? (same(picked, cell) ? (same(trial.end, cell) ? ' is-right' : ' is-wrong') : showPath && same(trial.end, cell) ? ' is-answer' : '') : '';
        return (
          <TapButton
            key={`${cell.col}-${cell.row}`}
            className={`iti-cell${start ? ' is-start' : ''}${rock ? ' is-rock' : ''}${state}`}
            onTap={() => onPick?.(cell)}
            disabled={disabled || !onPick || rock}
            aria-label={
              tr(`Ligne ${cell.row + 1}, colonne ${cell.col + 1}`, `Row ${cell.row + 1}, column ${cell.col + 1}`) +
              (start ? tr(', départ', ', start') : '') +
              (rock ? tr(', rocher', ', rock') : '')
            }
          >
            {start && <Mascot mood="happy" size={30} still />}
          </TapButton>
        );
      })}
      {showPath && (
        <svg className="iti-path" viewBox={`0 0 ${cols} ${rows}`} aria-hidden="true">
          <polyline points={trial.path.map((c) => `${c.col + 0.5},${c.row + 0.5}`).join(' ')} />
          <circle cx={trial.end.col + 0.5} cy={trial.end.row + 0.5} r={0.14} />
        </svg>
      )}
    </div>
  );
}

type Phase = 'show' | 'answer' | 'reveal';

export function ItiGame({ seed, level, onFinish }: GameProps) {
  const config = itiLevel(level);
  const trials = useMemo(() => generateIti(createRng(seed), level), [seed, level]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('show');
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<Cell | null>(null);
  const [correct, setCorrect] = useState(0);
  const [mark, showMark] = useFeedback();
  const trial = trials[index];
  const right = picked !== null && same(picked, trial.end);

  const finish = useEffectEvent(() => {
    onFinish({
      score: scoreIti(correct),
      stats: { correct, trials: ITI_TRIALS },
      headline: tr(byCount(correct, `${correct} trajet sur ${ITI_TRIALS}`, `${correct} trajets sur ${ITI_TRIALS}`), `${correct} of ${ITI_TRIALS} routes`),
      lines: [
        { label: tr('Trajets retrouvés', 'Routes found'), value: `${correct} / ${ITI_TRIALS}` },
        { label: tr('Déplacements par trajet', 'Moves per route'), value: String(config.moves) },
      ],
    });
  });

  // Les flèches : toutes ensemble un moment, ou une par une ; puis on cherche l'arrivée de tête.
  useEffect(() => {
    if (phase !== 'show') return;
    if (!config.oneByOne) {
      const id = window.setTimeout(() => setPhase('answer'), slow(config.showMs));
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => {
      if (step + 1 < trial.moves.length) setStep(step + 1);
      else setPhase('answer');
    }, slow(config.showMs));
    return () => window.clearTimeout(id);
  }, [phase, step, config.oneByOne, config.showMs, trial.moves.length]);

  // Révélation, puis trajet suivant.
  useEffect(() => {
    if (phase !== 'reveal') return;
    const id = window.setTimeout(
      () => {
        if (index + 1 >= trials.length) {
          finish();
          return;
        }
        setIndex(index + 1);
        setStep(0);
        setPicked(null);
        setPhase('show');
      },
      right ? 900 : 1900,
    );
    return () => window.clearTimeout(id);
  }, [phase, index, trials.length, right]);

  const pick = (cell: Cell) => {
    if (phase === 'reveal' || (phase === 'show' && config.oneByOne)) return;
    setPicked(cell);
    setPhase('reveal');
    if (same(cell, trial.end)) {
      fx.good();
      showMark('good');
      setCorrect(correct + 1);
    } else {
      fx.bad();
      showMark('bad', tr('Voici le trajet', 'Here’s the route'));
    }
  };

  return (
    <div className="game">
      <GameHud progress={(index + (phase === 'reveal' ? 1 : 0)) / trials.length} />
      <div className="game__stage iti">
        <div className={`iti__moves${phase === 'show' && config.oneByOne ? ' iti__moves--one' : ''}${config.moves > 9 ? ' iti__moves--many' : ''}`} aria-live="polite">
          {phase === 'show' ? (
            config.oneByOne ? (
              <>
                <MoveChip key={step} move={trial.moves[step]} big />
                <span className="iti__count">
                  {step + 1} / {trial.moves.length}
                </span>
              </>
            ) : (
              trial.moves.map((move, i) => <MoveChip key={i} move={move} />)
            )
          ) : phase === 'answer' ? (
            <p className="lettre__ask">{tr('Où arrives-tu\u00a0? Touche la case.', 'Where do you end up? Tap the square.')}</p>
          ) : (
            trial.moves.map((move, i) => <MoveChip key={i} move={move} />)
          )}
        </div>
        <ItiGrid trial={trial} picked={picked} showPath={phase === 'reveal' && !right} disabled={phase === 'reveal' || (phase === 'show' && config.oneByOne)} onPick={pick} />
        <p className="qui__round">
          {tr('Trajet', 'Route')} {index + 1}/{trials.length}
        </p>
        <FeedbackMark mark={mark} />
      </div>
    </div>
  );
}
