import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { byCount, plural } from '../../core/format';
import { tr } from '../../core/lang';
import { generateMeles, MELES_DURATION_MS, melesLevel, scoreMeles, segment, type MelesGrid } from '../../core/games/motsmeles';
import { createRng, deriveSeed } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';

interface RoundProps {
  grid: MelesGrid;
  hiddenList: boolean;
  disabled: boolean;
  onFound: () => void;
  onMiss: () => void;
  onComplete: () => void;
}

/** Une grille : les lettres, la case touchée en premier, et les mots trouvés (chacun sa couleur). */
function Round({ grid, hiddenList, disabled, onFound, onMiss, onComplete }: RoundProps) {
  const [found, setFound] = useState<number[]>([]);
  const [first, setFirst] = useState<number | null>(null);
  const owner = new Map<number, number>();
  found.forEach((w, k) => grid.words[w].cells.forEach((cell) => owner.set(cell, k)));

  const tap = (cell: number) => {
    if (disabled) return;
    if (first === null || first === cell) {
      fx.tap();
      setFirst(first === cell ? null : cell);
      return;
    }
    const line = segment(grid.size, first, cell);
    setFirst(null);
    const key = line?.join();
    const back = line ? [...line].reverse().join() : undefined;
    const w = grid.words.findIndex((word, i) => !found.includes(i) && (word.cells.join() === key || word.cells.join() === back));
    if (w < 0) {
      onMiss();
      return;
    }
    const next = [...found, w];
    setFound(next);
    onFound();
    if (next.length === grid.words.length) onComplete();
  };

  return (
    <>
      <div className={`meles__grid meles__grid--${grid.size}`} role="group" aria-label={tr('La grille de lettres', 'The letter grid')}>
        {grid.letters.map((letter, cell) => (
          <TapButton
            key={cell}
            className={`meles__cell${owner.has(cell) ? ` is-found meles__cell--f${owner.get(cell)! % 5}` : ''}${first === cell ? ' is-first' : ''}`}
            onTap={() => tap(cell)}
            disabled={disabled}
            aria-pressed={first === cell}
          >
            {letter}
          </TapButton>
        ))}
      </div>
      {hiddenList ? (
        <p className="meles__family">
          {tr(byCount(grid.words.length, `${grid.words.length} mot caché :`, `${grid.words.length} mots cachés :`), `${plural(grid.words.length, 'hidden word')}:`)} <strong>{grid.family}</strong>
        </p>
      ) : null}
      <ul className="meles__list" aria-label={tr('Les mots', 'The words')}>
        {grid.words.map((w, i) =>
          hiddenList && !found.includes(i) ? null : (
            <li key={i} className={`meles__word${found.includes(i) ? ` is-found meles__word--f${found.indexOf(i) % 5}` : ''}`}>
              {w.word}
            </li>
          ),
        )}
      </ul>
    </>
  );
}

export function MelesGame({ seed, level, onFinish }: GameProps) {
  const config = melesLevel(level);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [found, setFound] = useState(0);
  const [errors, setErrors] = useState(0);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const grid = useMemo(() => generateMeles(createRng(deriveSeed(seed, index)), level), [seed, index, level]);

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreMeles(found, level),
      stats: { found, errors },
      headline: tr(byCount(found, `${found} mot trouvé`, `${found} mots trouvés`), plural(found, 'word found', 'words found')),
      lines: [
        { label: tr('Mots trouvés', 'Words found'), value: String(found) },
        { label: tr('Grilles finies', 'Grids completed'), value: String(index) },
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: String(config.target) },
      ],
    });
  });

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= MELES_DURATION_MS) {
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

  const onFound = () => {
    fx.good();
    setFound((n) => n + 1);
  };

  const onMiss = () => {
    fx.bad();
    showMark('bad');
    setErrors((n) => n + 1);
  };

  const onComplete = () => {
    showMark('good');
    window.setTimeout(() => setIndex((i) => i + 1), 450);
  };

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={MELES_DURATION_MS} />
      </GameHud>
      <div className="game__stage meles">
        <p className="anagram__found">
          <strong>{found}</strong> / {config.target}
        </p>
        <Round key={index} grid={grid} hiddenList={config.hiddenList} disabled={over} onFound={onFound} onMiss={onMiss} onComplete={onComplete} />
        <FeedbackMark mark={mark} />
      </div>
    </div>
  );
}
