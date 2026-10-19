import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { plural } from '../../core/format';
import {
  generateSequence,
  initialMatrice,
  MATRICE_CELLS,
  MATRICE_MAX_FAILURES,
  MATRICE_SIZE,
  matriceFlashMs,
  nextMatrice,
  scoreMatrice,
  type MatriceState,
} from '../../core/games/matrice';
import { createRng, deriveSeed } from '../../core/rng';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameHud } from '../game/Hud';
import { useGridFocus, useKeyDown } from '../hooks';

type Phase = 'show' | 'input' | 'success' | 'fail';

/** Touches physiques (quelle que soit la disposition du clavier) qui reproduisent la grille 4 × 4. */
const KEY_CODES = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyZ', 'KeyX', 'KeyC', 'KeyV'];

export function MatriceGame({ seed, level, onFinish }: GameProps) {
  const flashMs = matriceFlashMs(level);
  const [game, setGame] = useState<MatriceState>(initialMatrice);
  const [phase, setPhase] = useState<Phase>('show');
  const [step, setStep] = useState(0);
  const [lit, setLit] = useState<number | null>(null);
  const [entered, setEntered] = useState<number[]>([]);
  const [wrongCell, setWrongCell] = useState<number | null>(null);
  const sequence = useMemo(
    () => generateSequence(createRng(deriveSeed(seed, game.rounds)), game.span),
    [seed, game.rounds, game.span],
  );
  const cellProps = useGridFocus(MATRICE_SIZE, MATRICE_CELLS);

  // Présentation : les cases s'allument une à une.
  useEffect(() => {
    if (phase !== 'show') return;
    if (step >= sequence.length) {
      const id = window.setTimeout(() => setPhase('input'), 250);
      return () => window.clearTimeout(id);
    }
    const lead = step === 0 ? 700 : 170;
    const on = window.setTimeout(() => {
      setLit(sequence[step]);
      fx.note(sequence[step]);
    }, lead);
    const off = window.setTimeout(() => {
      setLit(null);
      setStep(step + 1);
    }, lead + flashMs);
    return () => {
      window.clearTimeout(on);
      window.clearTimeout(off);
    };
  }, [phase, step, sequence, flashMs]);

  const finish = useEffectEvent((final: MatriceState) => {
    const best = final.best;
    onFinish({
      score: scoreMatrice(best),
      stats: { best, rounds: final.rounds, failures: final.failures, flashMs },
      headline: best ? `${plural(best, 'case')} retenues` : 'Aucune séquence retenue',
      lines: [
        { label: 'Plus longue séquence', value: best ? plural(best, 'case') : '—' },
        { label: 'Séquences réussies', value: String(final.rounds - final.failures) },
        { label: 'Rythme', value: `${(flashMs / 1000).toLocaleString('fr-FR')} s par case` },
      ],
    });
  });

  // Fin de manche : on souffle, puis séquence suivante (ou fin de partie).
  useEffect(() => {
    if (phase !== 'success' && phase !== 'fail') return;
    const id = window.setTimeout(
      () => {
        const next = nextMatrice(game, phase === 'success');
        if (next.done) {
          finish(next);
          return;
        }
        setGame(next);
        setEntered([]);
        setWrongCell(null);
        setStep(0);
        setPhase('show');
      },
      phase === 'success' ? 800 : 1800,
    );
    return () => window.clearTimeout(id);
  }, [phase, game]);

  const tap = (cell: number) => {
    if (phase !== 'input' || entered.includes(cell)) return;
    if (cell !== sequence[entered.length]) {
      fx.bad();
      setWrongCell(cell);
      setPhase('fail');
      return;
    }
    fx.note(cell);
    const next = [...entered, cell];
    setEntered(next);
    if (next.length === sequence.length) {
      fx.good();
      setPhase('success');
    }
  };

  useKeyDown((event) => {
    const cell = KEY_CODES.indexOf(event.code);
    if (cell >= 0) {
      event.preventDefault();
      tap(cell);
    }
  }, phase === 'input');

  const triesLeft = MATRICE_MAX_FAILURES - game.failures - (phase === 'fail' ? 1 : 0);
  const status: Record<Phase, string> = {
    show: 'Regarde bien…',
    input: `À toi ! ${entered.length} / ${sequence.length}`,
    success: 'Bravo, une case de plus !',
    fail: 'Raté : voici le bon ordre.',
  };

  return (
    <div className="game">
      <GameHud>
        <span className="chip">{plural(game.span, 'case')}</span>
      </GameHud>
      <div className="game__stage matrice-stage">
        <p className={`matrice__status matrice__status--${phase}`} aria-live="polite">
          {status[phase]}
        </p>
        <div className={`matrice matrice--${phase}`} role="group" aria-label="Grille de 16 cases">
          {Array.from({ length: MATRICE_CELLS }, (_, cell) => {
            const order = sequence.indexOf(cell);
            const classes = [
              'matrice__cell',
              lit === cell && 'is-lit',
              entered.includes(cell) && 'is-entered',
              wrongCell === cell && 'is-wrong',
              phase === 'fail' && order >= 0 && 'is-answer',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <TapButton
                key={cell}
                {...cellProps(cell)}
                className={classes}
                onTap={() => tap(cell)}
                aria-label={`Case ${cell + 1}`}
                aria-disabled={phase !== 'input'}
              >
                {phase === 'fail' && order >= 0 && <span className="matrice__order">{order + 1}</span>}
              </TapButton>
            );
          })}
        </div>
        <p className="tries" aria-label={`${plural(Math.max(0, triesLeft), 'essai')} restant${triesLeft > 1 ? 's' : ''}`}>
          {Array.from({ length: MATRICE_MAX_FAILURES }, (_, i) => (
            <span key={i} className={i < triesLeft ? 'is-left' : undefined} aria-hidden="true" />
          ))}
          <span aria-hidden="true">{triesLeft > 1 ? '2 essais' : triesLeft === 1 ? 'Dernier essai' : 'Fin de partie'}</span>
        </p>
      </div>
    </div>
  );
}
