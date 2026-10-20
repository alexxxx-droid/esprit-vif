import { useEffect, useEffectEvent, useState, type CSSProperties } from 'react';
import { tr } from '../../core/lang';
import { plural } from '../../core/format';
import {
  generateIntrus,
  INTRUS_DURATION_MS,
  INTRUS_PENALTY_MS,
  intrusCell,
  intrusShape,
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

/** Une grille, à la taille prévue pour ce nombre de trouvailles. */
function boardFor(seed: number, found: number, level: number, previous?: IntrusBoard): IntrusBoard {
  const { cols, rows } = intrusShape(found, level);
  return generateIntrus(createRng(deriveSeed(seed, found)), cols, level, previous, rows);
}

/** Le symbole d'une case, avec ses leurres : inclinaison, taille, couleur, rotation continue. */
function CellSymbol({ board, cell }: { board: IntrusBoard; cell: number }) {
  const { symbol, mirrored, flipped } = intrusCell(board, cell);
  const scale = board.scales?.[cell];
  const hue = board.hues?.[cell];
  const spin = board.spins?.[cell];
  const transform = `rotate(${board.tilts[cell]}deg)${scale ? ` scale(${scale})` : ''}${mirrored ? ' scaleX(-1)' : ''}${flipped ? ' scaleY(-1)' : ''}`;
  const glyph = (
    <span
      className={`intrus__symbol${hue === undefined ? '' : ' intrus__symbol--hued'}`}
      style={{ transform, ...(hue === undefined ? {} : { '--hue': hue }) } as CSSProperties}
    >
      {symbol}
    </span>
  );
  if (!spin) return glyph;
  const turn = Math.abs(spin);
  return (
    <span
      className="intrus__spin"
      style={{ animationDuration: `${turn}s`, animationDirection: spin < 0 ? 'reverse' : 'normal', animationDelay: `${-((cell * 0.618) % 1) * turn}s` }}
    >
      {glyph}
    </span>
  );
}

export function IntrusGame({ seed, level, onFinish }: GameProps) {
  const [clock] = useState(() => new GameClock());
  const [found, setFound] = useState(0);
  const [errors, setErrors] = useState(0);
  const [board, setBoard] = useState<IntrusBoard>(() => boardFor(seed, 0, level));
  const [wrong, setWrong] = useState<{ cell: number; id: number } | null>(null);
  const [over, setOver] = useState(false);
  const count = board.size * board.rows;
  const cellProps = useGridFocus(board.size, count);

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreIntrus(found, level),
      stats: { found, errors, size: board.size },
      headline: tr(`${plural(found, 'intrus')} · ${plural(errors, 'erreur')}`, `${found} found · ${plural(errors, 'error')}`),
      lines: [
        { label: tr('Intrus trouvés', 'Odd ones found'), value: String(found) },
        { label: tr('Erreurs', 'Errors'), value: errors ? `${errors} (−${(errors * INTRUS_PENALTY_MS) / 1000} s)` : tr('Aucune', 'None') },
        { label: tr('Grille finale', 'Final grid'), value: `${board.size} × ${board.rows}` },
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
    setBoard(boardFor(seed, next, level, board));
  };

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={INTRUS_DURATION_MS} />
      </GameHud>
      <div className="game__stage intrus-stage">
        <p className="intrus__found" aria-live="polite">
          <strong>{found}</strong> {tr(found < 2 ? 'trouvé' : 'trouvés', 'found')}
          {wrong && (
            <span key={wrong.id} className="penalty">
              −2&nbsp;s
            </span>
          )}
        </p>
        <div
          key={found}
          className="intrus"
          style={{ '--size': board.size, '--rows': board.rows } as CSSProperties}
          role="group"
          aria-label={tr('Trouve le symbole différent', 'Find the symbol that’s different')}
        >
          {Array.from({ length: count }, (_, cell) => {
            const { symbol, mirrored, flipped } = intrusCell(board, cell);
            const shaking = wrong?.cell === cell;
            return (
              <TapButton
                key={cell}
                {...cellProps(cell)}
                className="intrus__cell"
                onTap={() => tap(cell)}
                aria-label={
                  mirrored ? tr(`${symbol} retourné`, `${symbol} flipped`) : flipped ? tr(`${symbol} tête en bas`, `${symbol} upside down`) : symbol
                }
              >
                <span key={shaking ? wrong.id : 0} className={shaking ? 'shake' : undefined}>
                  <CellSymbol board={board} cell={cell} />
                </span>
              </TapButton>
            );
          })}
        </div>
      </div>
    </div>
  );
}
