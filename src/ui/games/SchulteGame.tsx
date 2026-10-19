import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { generateSchulte, SCHULTE_PENALTY_MS, scoreSchulte } from '../../core/games/schulte';
import { timedOutcome } from '../../core/outcome';
import { createRng } from '../../core/rng';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, Stopwatch } from '../game/Hud';
import { useGridFocus } from '../hooks';

export function SchulteGame({ seed, level, onFinish }: GameProps) {
  const board = useMemo(() => generateSchulte(createRng(seed), level), [seed, level]);
  const total = board.numbers.length;
  const [clock] = useState(() => new GameClock());
  const [next, setNext] = useState(1);
  const [errors, setErrors] = useState(0);
  const [wrong, setWrong] = useState<{ cell: number; id: number } | null>(null);
  const cellProps = useGridFocus(board.size, total);
  const done = next > total;

  useEffect(() => {
    clock.start();
    return () => clock.stop();
  }, [clock]);

  const tap = (cell: number) => {
    if (done) return;
    const value = board.numbers[cell];
    if (value < next) return; // déjà trouvé
    if (value !== next) {
      fx.bad();
      clock.addPenalty(SCHULTE_PENALTY_MS);
      setErrors(errors + 1);
      setWrong({ cell, id: (wrong?.id ?? 0) + 1 });
      return;
    }
    fx.tap();
    setNext(next + 1);
    if (next === total) {
      clock.stop();
      const elapsedMs = clock.elapsed();
      onFinish(
        timedOutcome({
          score: scoreSchulte(elapsedMs, errors, level),
          elapsedMs,
          errors,
          penaltyPerError: SCHULTE_PENALTY_MS,
          extraStats: { size: board.size },
        }),
      );
    }
  };

  return (
    <div className="game">
      <GameHud progress={(next - 1) / total}>
        <Stopwatch clock={clock} />
      </GameHud>
      <div className="game__stage schulte-stage">
        <p className="schulte__target" aria-live="polite">
          Touche le <strong>{Math.min(next, total)}</strong>
        </p>
        <div className="schulte" style={{ '--size': board.size } as CSSProperties} role="group" aria-label="Grille de nombres">
          {board.numbers.map((value, cell) => {
            const found = value < next;
            const shaking = wrong?.cell === cell;
            return (
              <TapButton
                key={cell}
                {...cellProps(cell)}
                className={`schulte__cell${found ? ' is-found' : ''}`}
                onTap={() => tap(cell)}
                aria-label={found ? `${value}, trouvé` : String(value)}
              >
                <span key={shaking ? wrong.id : 0} className={shaking ? 'shake' : undefined}>
                  <span
                    className="schulte__num"
                    style={{ transform: `rotate(${board.tilts[cell]}deg) scale(${board.scales[cell]})` }}
                  >
                    {value}
                  </span>
                </span>
              </TapButton>
            );
          })}
        </div>
      </div>
    </div>
  );
}
