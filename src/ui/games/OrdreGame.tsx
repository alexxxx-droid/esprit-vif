import { useEffect, useEffectEvent, useMemo, useState, type CSSProperties } from 'react';
import { plural } from '../../core/format';
import { initialMatrice, MATRICE_MAX_FAILURES, nextMatrice, type MatriceState } from '../../core/games/matrice';
import { generateOrdreRound, ordreLevel, ordreMaxSpan, scoreOrdre } from '../../core/games/ordre';
import { createRng, deriveSeed } from '../../core/rng';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameHud } from '../game/Hud';
import { useGridFocus } from '../hooks';

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
  const valueOf = (cell: number) => round.values[round.cells.indexOf(cell)];

  // Présentation : tous les nombres ensemble, ou un par un.
  useEffect(() => {
    if (phase !== 'show') return;
    if (config.sequential) {
      if (step >= round.cells.length) {
        const id = window.setTimeout(() => setPhase('input'), 200);
        return () => window.clearTimeout(id);
      }
      const id = window.setTimeout(() => setStep(step + 1), config.showMs);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setPhase('input'), 500 + config.showMs * round.cells.length);
    return () => window.clearTimeout(id);
  }, [phase, step, round, config.sequential, config.showMs]);

  const finish = useEffectEvent((final: MatriceState) => {
    onFinish({
      score: scoreOrdre(final.best),
      stats: { best: final.best, rounds: final.rounds },
      headline: final.best ? `${plural(final.best, 'nombre')} retenus` : 'Aucune série retenue',
      lines: [
        { label: 'Plus longue série', value: final.best ? plural(final.best, 'nombre') : '—' },
        { label: 'Séries réussies', value: String(final.rounds - final.failures) },
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
    if (phase !== 'input' || entered.includes(cell) || !round.cells.includes(cell)) return;
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
  const visibleCell = config.sequential ? round.cells[step] : null;

  return (
    <div className="game">
      <GameHud>
        <span className="chip">{plural(round.cells.length, 'nombre')}</span>
      </GameHud>
      <div className="game__stage matrice-stage">
        <p className={`matrice__status matrice__status--${phase}`} aria-live="polite">
          {phase === 'show' && 'Retiens où sont les nombres…'}
          {phase === 'input' && (config.descending ? 'Du plus grand au plus petit !' : 'Du plus petit au plus grand !')}
          {phase === 'success' && 'Bravo, un nombre de plus !'}
          {phase === 'fail' && 'Raté : voici les nombres.'}
        </p>
        <div className="matrice ordre" style={{ '--size': config.size } as CSSProperties} role="group" aria-label="Cases à toucher">
          {Array.from({ length: cellCount }, (_, cell) => {
            const holds = round.cells.includes(cell);
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
                aria-label={visible ? `Case ${value}` : holds ? 'Case cachée' : 'Case vide'}
                aria-disabled={phase !== 'input' || !holds}
              >
                {visible && <span className="ordre__value">{value}</span>}
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
