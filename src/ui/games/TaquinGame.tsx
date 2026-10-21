import { useEffect, useEffectEvent, useState } from 'react';
import { byCount, plural } from '../../core/format';
import { tr } from '../../core/lang';
import { allowedMoves, generateTaquin, isSolved, scoreTaquin, slide, TAQUIN_DURATION_MS, taquinLevel, type Board } from '../../core/games/taquin';
import { createRng, deriveSeed } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';

/** La grille : chaque tuile à sa place, la case vide en creux. */
export function TaquinBoard({ board, size, onTap, disabled }: { board: Board; size: number; onTap?: (cell: number) => void; disabled?: boolean }) {
  return (
    <div className={`taquin__board taquin__board--${size}`} role="group" aria-label={tr('La grille', 'The grid')}>
      {board.map((v, cell) =>
        v === 0 ? (
          <span key={`e${cell}`} className="taquin__empty" />
        ) : onTap ? (
          <TapButton key={v} className={`taquin__tile${v === cell + 1 ? ' is-home' : ''}`} onTap={() => onTap(cell)} disabled={disabled}>
            {v}
          </TapButton>
        ) : (
          <span key={v} className={`taquin__tile${v === cell + 1 ? ' is-home' : ''}`}>
            {v}
          </span>
        ),
      )}
    </div>
  );
}

export function TaquinGame({ seed, level, onFinish }: GameProps) {
  const c = taquinLevel(level);
  const allowed = allowedMoves(c);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [board, setBoard] = useState<Board>(() => generateTaquin(createRng(deriveSeed(seed, 0)), level));
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(0);
  const [lost, setLost] = useState(0);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreTaquin(solved, level),
      stats: { solved, lost },
      headline: tr(byCount(solved, `${solved} grille finie`, `${solved} grilles finies`), plural(solved, 'grid solved', 'grids solved')),
      lines: [
        { label: tr('Grilles finies', 'Grids solved'), value: String(solved) },
        ...(allowed ? [{ label: tr('Grilles perdues', 'Grids lost'), value: lost ? String(lost) : tr('Aucune', 'None') }] : []),
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: String(c.target) },
      ],
    });
  });

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= TAQUIN_DURATION_MS) {
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

  const nextGrid = () => {
    const i = index + 1;
    setIndex(i);
    setBoard(generateTaquin(createRng(deriveSeed(seed, i)), level));
    setMoves(0);
  };

  const tap = (cell: number) => {
    if (over) return;
    const next = slide(board, c.size, cell);
    if (!next) return;
    fx.tap();
    const count = moves + 1;
    if (isSolved(next)) {
      fx.good();
      showMark('good');
      setSolved(solved + 1);
      nextGrid();
      return;
    }
    if (allowed && count >= allowed) {
      fx.bad();
      showMark('bad', tr('Trop de coups', 'Too many moves'));
      setLost(lost + 1);
      nextGrid();
      return;
    }
    setBoard(next);
    setMoves(count);
  };

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={TAQUIN_DURATION_MS} />
      </GameHud>
      <div className="game__stage taquin">
        <p className="anagram__found">
          <strong>{solved}</strong> / {c.target}
          {allowed ? ` · ${tr(`coups ${moves} / ${allowed}`, `moves ${moves} / ${allowed}`)}` : ''}
        </p>
        <TaquinBoard board={board} size={c.size} onTap={tap} disabled={over} />
        <FeedbackMark mark={mark} />
      </div>
    </div>
  );
}
