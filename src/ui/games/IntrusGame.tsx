import { useEffect, useEffectEvent, useState, type CSSProperties } from 'react';
import { plural } from '../../core/format';
import {
  generateIntrus,
  INTRUS_DURATION_MS,
  INTRUS_PENALTY_MS,
  intrusSize,
  scoreIntrus,
  type IntrusBoard,
} from '../../core/games/intrus';
import { createRng, deriveSeed } from '../../core/rng';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';
import { useGridFocus } from '../hooks';

export function IntrusGame({ seed, level, onFinish }: GameProps) {
  const [clock] = useState(() => new GameClock());
  const [found, setFound] = useState(0);
  const [errors, setErrors] = useState(0);
  const [board, setBoard] = useState<IntrusBoard>(() =>
    generateIntrus(createRng(deriveSeed(seed, 0)), intrusSize(0, level), level),
  );
  const [wrong, setWrong] = useState<{ cell: number; id: number } | null>(null);
  const [over, setOver] = useState(false);
  const count = board.size * board.size;
  const cellProps = useGridFocus(board.size, count);

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreIntrus(found, level),
      stats: { found, errors, size: board.size },
      headline: `${plural(found, 'intrus')} · ${plural(errors, 'erreur')}`,
      lines: [
        { label: 'Intrus trouvés', value: String(found) },
        { label: 'Erreurs', value: errors ? `${errors} (−${(errors * INTRUS_PENALTY_MS) / 1000} s)` : 'Aucune' },
        { label: 'Grille finale', value: `${board.size} × ${board.size}` },
      ],
    });
  });

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= INTRUS_DURATION_MS) {
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

  const tap = (cell: number) => {
    if (over) return;
    if (cell !== board.oddIndex) {
      fx.bad();
      clock.addPenalty(INTRUS_PENALTY_MS);
      setErrors(errors + 1);
      setWrong({ cell, id: (wrong?.id ?? 0) + 1 });
      return;
    }
    fx.good();
    const next = found + 1;
    setFound(next);
    setWrong(null);
    setBoard(generateIntrus(createRng(deriveSeed(seed, next)), intrusSize(next, level), level, board));
  };

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={INTRUS_DURATION_MS} />
      </GameHud>
      <div className="game__stage intrus-stage">
        <p className="intrus__found" aria-live="polite">
          <strong>{found}</strong> {found < 2 ? 'trouvé' : 'trouvés'}
          {wrong && (
            <span key={wrong.id} className="penalty">
              −2&nbsp;s
            </span>
          )}
        </p>
        <div
          key={found}
          className="intrus"
          style={{ '--size': board.size } as CSSProperties}
          role="group"
          aria-label="Trouve le symbole différent"
        >
          {Array.from({ length: count }, (_, cell) => {
            const isOdd = cell === board.oddIndex;
            const symbol = isOdd ? board.odd : board.base;
            const flipped = isOdd && board.mirrored;
            const shaking = wrong?.cell === cell;
            return (
              <TapButton
                key={cell}
                {...cellProps(cell)}
                className="intrus__cell"
                onTap={() => tap(cell)}
                aria-label={flipped ? `${symbol} retourné` : symbol}
              >
                <span key={shaking ? wrong.id : 0} className={shaking ? 'shake' : undefined}>
                  <span
                    className="intrus__symbol"
                    style={{ transform: `rotate(${board.tilts[cell]}deg)${flipped ? ' scaleX(-1)' : ''}` }}
                  >
                    {symbol}
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
