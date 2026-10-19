import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { tr } from '../../core/lang';
import { pickLevel } from '../../core/levels';
import { generateSchulte, SCHULTE_LEVELS, SCHULTE_PENALTY_MS, scoreSchulte } from '../../core/games/schulte';
import { timedOutcome } from '../../core/outcome';
import { createRng, deriveSeed } from '../../core/rng';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, Stopwatch } from '../game/Hud';
import { useGridFocus } from '../hooks';

export function SchulteGame({ seed, level, onFinish }: GameProps) {
  const config = pickLevel(SCHULTE_LEVELS, level);
  const board = useMemo(() => generateSchulte(createRng(seed), level), [seed, level]);
  const { sequence } = board;
  const total = sequence.length;
  const [clock] = useState(() => new GameClock());
  const [cells, setCells] = useState(board.cells);
  const [next, setNext] = useState(0);
  const [errors, setErrors] = useState(0);
  const [wrong, setWrong] = useState<{ cell: number; id: number } | null>(null);
  const [moved, setMoved] = useState(0);
  const cellProps = useGridFocus(board.size, total);
  const done = next >= total;
  const found = new Set(sequence.slice(0, next));

  useEffect(() => {
    clock.start();
    return () => clock.stop();
  }, [clock]);

  const tap = (cell: number) => {
    if (done) return;
    const label = cells[cell];
    if (found.has(label)) return;
    if (label !== sequence[next]) {
      fx.bad();
      clock.addPenalty(SCHULTE_PENALTY_MS);
      setErrors(errors + 1);
      setWrong({ cell, id: (wrong?.id ?? 0) + 1 });
      return;
    }
    fx.tap();
    const count = next + 1;
    setNext(count);
    setWrong(null);
    // Grille mouvante : tout se mélange à nouveau toutes les N trouvailles.
    if (config.reshuffleEvery && count < total && count % config.reshuffleEvery === 0) {
      setCells(createRng(deriveSeed(seed, count)).shuffle(cells));
      setMoved(moved + 1);
    }
    if (count === total) {
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
      <GameHud progress={next / total}>
        <Stopwatch clock={clock} />
      </GameHud>
      <div className="game__stage schulte-stage">
        <p className="schulte__target" aria-live="polite">
          {tr('Touche le', 'Tap')} <strong>{sequence[Math.min(next, total - 1)]}</strong>
        </p>
        <div
          key={moved}
          className={`schulte${moved ? ' schulte--moved' : ''}`}
          style={{ '--size': board.size } as CSSProperties}
          role="group"
          aria-label={tr('Grille de symboles', 'Symbol grid')}
        >
          {cells.map((label, cell) => {
            const isFound = found.has(label);
            const shaking = wrong?.cell === cell;
            return (
              <TapButton
                key={cell}
                {...cellProps(cell)}
                className={`schulte__cell${isFound && config.mark ? ' is-found' : ''}`}
                onTap={() => tap(cell)}
                aria-label={isFound && config.mark ? tr(`${label}, trouvé`, `${label}, found`) : label}
              >
                <span key={shaking ? wrong.id : 0} className={shaking ? 'shake' : undefined}>
                  <span
                    className="schulte__num"
                    style={{ transform: `rotate(${board.tilts[cell]}deg) scale(${board.scales[cell]})` }}
                  >
                    {label}
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
