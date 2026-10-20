import { useEffect, useEffectEvent, useMemo, useState, type CSSProperties } from 'react';
import { tr } from '../../core/lang';
import { plural } from '../../core/format';
import { initialMatrice, MATRICE_MAX_FAILURES, nextMatrice, type MatriceState } from '../../core/games/matrice';
import { generateOrdreRound, ordreLevel, ordreMaxSpan, scoreOrdre } from '../../core/games/ordre';
import { createRng, deriveSeed } from '../../core/rng';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameHud } from '../game/Hud';
import { useGridFocus } from '../hooks';
import { slow } from '../tempo';

type Phase = 'show' | 'input' | 'success' | 'fail';

export function OrdreGame({ seed, level, onFinish }: GameProps) {
  const config = ordreLevel(level);
  const maxSpan = ordreMaxSpan(level);
  const cellCount = config.size * config.size;
  const [game, setGame] = useState<MatriceState>(initialMatrice);
  const [phase, setPhase] = useState<Phase>('show');
  const [step, setStep] = useState(0);
  const [entered, setEntered] = useState<number[]>([]);
  const [wrongCell, setWrongCell] = useState<number | null>(null);
  const round = useMemo(
    () => generateOrdreRound(createRng(deriveSeed(seed, game.rounds)), game.span, level),
    [seed, game.rounds, game.span, level],
  );
  const cellProps = useGridFocus(config.size, cellCount);
  const decoyCells = round.decoys.map((d) => d.cell);
  const valueOf = (cell: number) => (round.cells.includes(cell) ? round.values[round.cells.indexOf(cell)] : round.decoys.find((d) => d.cell === cell)?.value);

  // Présentation : tous les nombres ensemble, ou un par un.
  useEffect(() => {
    if (phase !== 'show') return;
    if (config.sequential) {
      if (step >= round.show.length) {
        const id = window.setTimeout(() => setPhase('input'), 200);
        return () => window.clearTimeout(id);
      }
      const id = window.setTimeout(() => setStep(step + 1), slow(config.showMs));
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setPhase('input'), 500 + slow(config.showMs) * round.show.length);
    return () => window.clearTimeout(id);
  }, [phase, step, round, config.sequential, config.showMs]);

  const finish = useEffectEvent((final: MatriceState) => {
    onFinish({
      score: scoreOrdre(final.best, level),
      stats: { best: final.best, rounds: final.rounds },
      headline: final.best
        ? tr(`${plural(final.best, 'nombre')} retenus`, `${plural(final.best, 'number')} remembered`)
        : tr('Aucune série retenue', 'No series remembered'),
      lines: [
        { label: tr('Plus longue série', 'Longest series'), value: final.best ? tr(plural(final.best, 'nombre'), plural(final.best, 'number')) : '—' },
        { label: tr('Séries réussies', 'Series completed'), value: String(final.rounds - final.failures) },
      ],
    });
  });

  useEffect(() => {
    if (phase !== 'success' && phase !== 'fail') return;
    const id = window.setTimeout(
      () => {
        let next = nextMatrice(game, phase === 'success');
        if (phase === 'success' && game.span >= maxSpan) next = { ...next, done: true };
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
      phase === 'success' ? 800 : 2000,
    );
    return () => window.clearTimeout(id);
  }, [phase, game, maxSpan]);

  const tap = (cell: number) => {
    if (phase !== 'input' || entered.includes(cell) || !(round.cells.includes(cell) || decoyCells.includes(cell))) return;
    // Toucher un nombre barré est une erreur, comme se tromper d'ordre.
    if (cell !== round.order[entered.length]) {
      fx.bad();
      setWrongCell(cell);
      setPhase('fail');
      return;
    }
    fx.note(entered.length);
    const next = [...entered, cell];
    setEntered(next);
    if (next.length === round.order.length) {
      fx.good();
      setPhase('success');
    }
  };

  const triesLeft = MATRICE_MAX_FAILURES - game.failures - (phase === 'fail' ? 1 : 0);
  const visibleCell = config.sequential ? round.show[step] : null;

  return (
    <div className="game">
      <GameHud>
        <span className="chip">{tr(plural(round.cells.length, 'nombre'), plural(round.cells.length, 'number'))}</span>
      </GameHud>
      <div className="game__stage matrice-stage">
        <p className={`matrice__status matrice__status--${phase}`} aria-live="polite">
          {phase === 'show' &&
            (round.decoys.length
              ? tr('Retiens les nombres, sauf les barrés…', 'Remember the numbers, not the crossed-out ones…')
              : tr('Retiens où sont les nombres…', 'Remember where the numbers are…'))}
          {phase === 'input' &&
            (config.descending ? tr('Du plus grand au plus petit !', 'Largest to smallest!') : tr('Du plus petit au plus grand !', 'Smallest to largest!'))}
          {phase === 'success' && tr('Bravo, un nombre de plus !', 'Well done, one more number!')}
          {phase === 'fail' && tr('Raté : voici les nombres.', 'Missed: here are the numbers.')}
        </p>
        <div className={`matrice ordre${config.size >= 6 ? ' matrice--dense' : ''}`} style={{ '--size': config.size } as CSSProperties} role="group" aria-label={tr('Cases à toucher', 'Squares to tap')}>
          {Array.from({ length: cellCount }, (_, cell) => {
            const decoy = decoyCells.includes(cell);
            const holds = round.cells.includes(cell) || decoy;
            const value = holds ? valueOf(cell) : null;
            const visible =
              holds && ((phase === 'show' && (!config.sequential || cell === visibleCell)) || entered.includes(cell) || phase === 'fail');
            const classes = [
              'matrice__cell',
              'ordre__cell',
              !holds && 'is-empty',
              entered.includes(cell) && 'is-entered',
              wrongCell === cell && 'is-wrong',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <TapButton
                key={cell}
                {...cellProps(cell)}
                className={classes}
                onTap={() => tap(cell)}
                aria-label={
                  visible
                    ? decoy
                      ? tr(`Case ${value}, barrée`, `Square ${value}, crossed out`)
                      : tr(`Case ${value}`, `Square ${value}`)
                    : holds
                      ? tr('Case cachée', 'Hidden square')
                      : tr('Case vide', 'Empty square')
                }
                aria-disabled={phase !== 'input' || !holds}
              >
                {visible && <span className={`ordre__value${decoy ? ' is-decoy' : ''}`}>{value}</span>}
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
