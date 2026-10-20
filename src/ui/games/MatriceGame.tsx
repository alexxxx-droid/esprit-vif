import { useEffect, useEffectEvent, useMemo, useState, type CSSProperties } from 'react';
import { tr } from '../../core/lang';
import { plural } from '../../core/format';
import {
  generateMatriceRound,
  initialMatrice,
  MATRICE_MAX_FAILURES,
  matriceLevel,
  nextMatrice,
  scoreMatrice,
  type MatriceFlash,
  type MatriceState,
} from '../../core/games/matrice';
import { secondsLabel } from '../../core/levels';
import { createRng, deriveSeed } from '../../core/rng';
import { Icon } from '../components/Icon';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameHud } from '../game/Hud';
import { useGridFocus, useKeyDown } from '../hooks';
import { slow } from '../tempo';

type Phase = 'show' | 'input' | 'success' | 'fail';

/** Touches physiques (quelle que soit la disposition du clavier) qui reproduisent la grille 4 × 4. */
const KEY_CODES = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyZ', 'KeyX', 'KeyC', 'KeyV'];

export function MatriceGame({ seed, level, onFinish }: GameProps) {
  const { size, flashMs: baseFlashMs, mixed, lureEvery } = matriceLevel(level);
  const flashMs = slow(baseFlashMs);
  const cellCount = size * size;
  const [game, setGame] = useState<MatriceState>(initialMatrice);
  const [phase, setPhase] = useState<Phase>('show');
  const [step, setStep] = useState(0);
  const [lit, setLit] = useState<MatriceFlash | null>(null);
  const [entered, setEntered] = useState<number[]>([]);
  const [wrongCell, setWrongCell] = useState<number | null>(null);
  const round = useMemo(
    () => generateMatriceRound(createRng(deriveSeed(seed, game.rounds)), game.span, level),
    [seed, game.rounds, game.span, level],
  );
  const { sequence, flashes, reverse } = round;
  // À l'envers : on retouche la séquence en partant de la dernière case.
  const expected = useMemo(() => (reverse ? [...sequence].reverse() : sequence), [sequence, reverse]);
  const cellProps = useGridFocus(size, cellCount);

  // Présentation : les cases s'allument une à une.
  useEffect(() => {
    if (phase !== 'show') return;
    if (step >= flashes.length) {
      const id = window.setTimeout(() => setPhase('input'), 250);
      return () => window.clearTimeout(id);
    }
    const lead = step === 0 ? 700 : 170;
    const on = window.setTimeout(() => {
      const flash = flashes[step];
      setLit(flash);
      // Les pièges s'allument en silence : seules les cases à retenir chantent.
      if (!flash.lure) fx.note(flash.cell);
    }, lead);
    const off = window.setTimeout(() => {
      setLit(null);
      setStep(step + 1);
    }, lead + flashMs);
    return () => {
      window.clearTimeout(on);
      window.clearTimeout(off);
    };
  }, [phase, step, flashes, flashMs]);

  const finish = useEffectEvent((final: MatriceState) => {
    const best = final.best;
    onFinish({
      score: scoreMatrice(best, level),
      stats: { best, rounds: final.rounds, failures: final.failures, flashMs },
      headline: best
        ? tr(`${plural(best, 'case')} retenues`, `${plural(best, 'square')} remembered`)
        : tr('Aucune séquence retenue', 'No sequence remembered'),
      lines: [
        { label: tr('Plus longue séquence', 'Longest sequence'), value: best ? tr(plural(best, 'case'), plural(best, 'square')) : '—' },
        { label: tr('Séquences réussies', 'Sequences completed'), value: String(final.rounds - final.failures) },
        { label: tr('Rythme', 'Pace'), value: tr(`${secondsLabel(flashMs)} par case`, `${secondsLabel(flashMs)} per square`) },
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
    if (cell !== expected[entered.length]) {
      fx.bad();
      setWrongCell(cell);
      setPhase('fail');
      return;
    }
    fx.note(cell);
    const next = [...entered, cell];
    setEntered(next);
    if (next.length === expected.length) {
      fx.good();
      setPhase('success');
    }
  };

  useKeyDown((event) => {
    const cell = KEY_CODES.indexOf(event.code);
    if (size === 4 && cell >= 0) {
      event.preventDefault();
      tap(cell);
    }
  }, phase === 'input');

  const triesLeft = MATRICE_MAX_FAILURES - game.failures - (phase === 'fail' ? 1 : 0);
  // Au niveau « sens donné après », la consigne tombe au moment de répondre.
  const cue = mixed ? (reverse ? tr('À l’envers ! ', 'Backwards! ') : tr('Même ordre ! ', 'Same order! ')) : null;
  const status: Record<Phase, string> = {
    show: mixed
      ? tr('Regarde… le sens viendra après', 'Watch… direction comes later')
      : lureEvery
        ? tr('Regarde… sauf les cases barrées', 'Watch… skip crossed-out squares')
        : tr('Regarde bien…', 'Watch closely…'),
    input: `${cue ?? (reverse ? tr('À l’envers ! ', 'Backwards! ') : tr('À toi ! ', 'Your turn! '))}${entered.length} / ${sequence.length}`,
    success: tr('Bravo, une case de plus !', 'Well done, one more square!'),
    fail: tr('Raté : voici le bon ordre.', 'Missed: here’s the right order.'),
  };

  return (
    <div className="game">
      <GameHud>
        <span className="chip">{tr(plural(game.span, 'case'), plural(game.span, 'square'))}</span>
      </GameHud>
      <div className="game__stage matrice-stage">
        <p
          key={cue && phase === 'input' ? 'cue' : 'status'}
          className={`matrice__status matrice__status--${phase}${cue && phase === 'input' ? ' matrice__status--cue' : ''}`}
          aria-live="polite"
        >
          {status[phase]}
        </p>
        <div
          className={`matrice matrice--${phase}${size >= 6 ? ' matrice--dense' : ''}`}
          style={{ '--size': size } as CSSProperties}
          role="group"
          aria-label={tr(`Grille de ${cellCount} cases`, `Grid of ${cellCount} squares`)}
        >
          {Array.from({ length: cellCount }, (_, cell) => {
            const order = expected.indexOf(cell);
            const classes = [
              'matrice__cell',
              lit?.cell === cell && (lit.lure ? 'is-lure' : 'is-lit'),
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
                aria-label={tr(`Case ${cell + 1}`, `Square ${cell + 1}`)}
                aria-disabled={phase !== 'input'}
              >
                {phase === 'fail' && order >= 0 && <span className="matrice__order">{order + 1}</span>}
                {lit?.cell === cell && lit.lure && <Icon name="close" size={22} strokeWidth={3} />}
              </TapButton>
            );
          })}
        </div>
        <p
          className="tries"
          aria-label={tr(
            `${plural(Math.max(0, triesLeft), 'essai')} restant${triesLeft > 1 ? 's' : ''}`,
            `${plural(Math.max(0, triesLeft), 'try', 'tries')} left`,
          )}
        >
          {Array.from({ length: MATRICE_MAX_FAILURES }, (_, i) => (
            <span key={i} className={i < triesLeft ? 'is-left' : undefined} aria-hidden="true" />
          ))}
          <span aria-hidden="true">
            {triesLeft > 1 ? tr('2 essais', '2 tries') : triesLeft === 1 ? tr('Dernier essai', 'Last try') : tr('Fin de partie', 'Game over')}
          </span>
        </p>
      </div>
    </div>
  );
}
