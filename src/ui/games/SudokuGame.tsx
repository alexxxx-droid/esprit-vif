import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { tr } from '../../core/lang';
import { formatSeconds, plural } from '../../core/format';
import { boxShape, generateSudoku, peers, scoreSudoku, SUDOKU_PENALTY_S, sudokuLevel } from '../../core/games/sudoku';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { Icon } from '../components/Icon';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, Stopwatch } from '../game/Hud';
import { useKeyDown } from '../hooks';

const startGrid = (solution: number[], given: boolean[]) => solution.map((v, i) => (given[i] ? v : 0));

export function SudokuGame({ seed, level, onFinish }: GameProps) {
  const config = sudokuLevel(level);
  const { size } = config;
  const box = boxShape(size);
  const puzzles = useMemo(() => generateSudoku(createRng(seed), level), [seed, level]);
  const [clock] = useState(() => new GameClock());
  const [current, setCurrent] = useState(0);
  const puzzle = puzzles[Math.min(current, puzzles.length - 1)];
  const [grid, setGrid] = useState(() => startGrid(puzzles[0].solution, puzzles[0].given));
  const [selected, setSelected] = useState(() => puzzles[0].given.indexOf(false));
  const [errors, setErrors] = useState(0);
  const [wrong, setWrong] = useState<{ cell: number; id: number } | null>(null);
  const [mark, showMark] = useFeedback();
  const done = current >= puzzles.length;
  const solved = grid.every((v) => v !== 0);
  const selectedPeers = useMemo(() => new Set(selected >= 0 ? peers(size, selected) : []), [selected, size]);

  useEffect(() => {
    clock.start();
    return () => clock.stop();
  }, [clock]);

  const advance = useEffectEvent(() => {
    const next = current + 1;
    if (next < puzzles.length) {
      setGrid(startGrid(puzzles[next].solution, puzzles[next].given));
      setSelected(puzzles[next].given.indexOf(false));
    } else {
      clock.stop();
      const ms = clock.elapsed();
      onFinish({
        score: scoreSudoku(ms, errors, level),
        stats: { timeMs: Math.round(ms), errors, puzzles: puzzles.length },
        headline: `${formatSeconds(ms)} · ${tr(plural(errors, 'erreur'), plural(errors, 'error'))}`,
        lines: [
          { label: tr('Temps', 'Time'), value: formatSeconds(ms) },
          { label: tr('Chiffres refusés', 'Digits rejected'), value: errors ? `${errors} (+${errors * SUDOKU_PENALTY_S} s)` : tr('Aucun', 'None') },
          { label: tr('Grilles', 'Grids'), value: `${puzzles.length} × ${size} × ${size}` },
        ],
      });
    }
    setCurrent(next);
  });

  // Grille terminée : courte pause pour savourer, puis la suivante ou la fin de partie.
  useEffect(() => {
    if (!solved || done) return;
    const id = window.setTimeout(() => advance(), 900);
    return () => window.clearTimeout(id);
  }, [solved, done, current]);

  const place = (digit: number) => {
    if (done || solved || selected < 0 || grid[selected] !== 0) return;
    if (puzzle.solution[selected] === digit) {
      const next = grid.map((v, i) => (i === selected ? digit : v));
      setGrid(next);
      if (next.every((v) => v !== 0)) {
        fx.good();
        showMark('good', puzzles.length > 1 ? tr(`Grille ${current + 1}/${puzzles.length}`, `Grid ${current + 1}/${puzzles.length}`) : undefined);
      } else fx.tap();
    } else {
      fx.bad();
      clock.addPenalty(SUDOKU_PENALTY_S * 1000);
      setErrors(errors + 1);
      setWrong({ cell: selected, id: Date.now() });
      showMark('bad', tr(`Pas de ${digit} ici · +${SUDOKU_PENALTY_S} s`, `No ${digit} here · +${SUDOKU_PENALTY_S} s`));
    }
  };

  const move = (delta: number) => {
    const from = Math.max(0, selected);
    const r = Math.floor(from / size);
    const c = from % size;
    if (delta === -1 || delta === 1) setSelected(r * size + ((c + delta + size) % size));
    else setSelected((((r + Math.sign(delta) + size) % size) * size) + c);
  };

  useKeyDown((e) => {
    const n = Number(e.key);
    if (n >= 1 && n <= size) place(n);
    const arrows: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -size, ArrowDown: size };
    if (e.key in arrows) {
      e.preventDefault();
      move(arrows[e.key]);
    }
  }, !done);

  const remaining = (digit: number) => size - grid.filter((v) => v === digit).length;
  const selectedValue = selected >= 0 ? grid[selected] : 0;

  return (
    <div className="game">
      <GameHud progress={current / puzzles.length}>
        <Stopwatch clock={clock} />
      </GameHud>
      <div className="game__stage sudoku-stage">
        {puzzles.length > 1 && (
          <p className="chip sudoku__count">
            {tr('Grille', 'Grid')} {Math.min(current + 1, puzzles.length)}/{puzzles.length}
          </p>
        )}
        <div
          key={current}
          className={`sudoku sudoku--${size}${solved ? ' is-solved' : ''}`}
          role="grid"
          aria-label={tr(`Grille de ${size} sur ${size}`, `${size} by ${size} grid`)}
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        >
          {grid.map((value, i) => {
            const r = Math.floor(i / size);
            const c = i % size;
            const classes = [
              'sudoku__cell',
              puzzle.given[i] && 'is-given',
              i === selected && 'is-selected',
              selectedPeers.has(i) && 'is-peer',
              value !== 0 && value === selectedValue && 'is-same',
              c % box.cols === box.cols - 1 && c < size - 1 && 'is-box-right',
              r % box.rows === box.rows - 1 && r < size - 1 && 'is-box-bottom',
              wrong?.cell === i && 'is-wrong',
            ];
            return (
              <TapButton
                key={wrong?.cell === i ? `${i}-${wrong.id}` : i}
                className={classes.filter(Boolean).join(' ')}
                onTap={() => setSelected(i)}
                aria-label={
                  value
                    ? tr(`Ligne ${r + 1}, colonne ${c + 1} : ${value}`, `Row ${r + 1}, column ${c + 1}: ${value}`)
                    : tr(`Ligne ${r + 1}, colonne ${c + 1} : vide`, `Row ${r + 1}, column ${c + 1}: empty`)
                }
                aria-selected={i === selected}
                role="gridcell"
              >
                {value || ''}
              </TapButton>
            );
          })}
        </div>
        <FeedbackMark mark={mark} />
      </div>
      <div className={`game__controls sudoku__pad sudoku__pad--${size}`}>
        {Array.from({ length: size }, (_, d) => d + 1).map((digit) => (
          <TapButton key={digit} className="sudoku__digit" onTap={() => place(digit)} disabled={remaining(digit) === 0} aria-label={tr(`Placer ${digit}`, `Place ${digit}`)}>
            {digit}
            <span className="sudoku__left" aria-hidden="true">
              {remaining(digit) || <Icon name="check" size={12} strokeWidth={3} />}
            </span>
          </TapButton>
        ))}
      </div>
    </div>
  );
}
