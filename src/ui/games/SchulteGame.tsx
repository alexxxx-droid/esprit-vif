import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { lang, tr } from '../../core/lang';
import { pickLevel } from '../../core/levels';
import {
  generateSchulte,
  SCHULTE_LEVELS,
  SCHULTE_PENALTY_MS,
  schulteSpoken,
  schulteText,
  schulteTone,
  schulteTwoTone,
  scoreSchulte,
} from '../../core/games/schulte';
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
  const twoTone = schulteTwoTone(level);
  const cellProps = useGridFocus(board.size, board.cells.length);
  const done = next >= total;
  const found = new Set(sequence.slice(0, next));
  const target = sequence[Math.min(next, total - 1)];
  const toneClass = (id: string) => (twoTone ? (schulteTone(id) ? ' is-orange' : ' is-blue') : '');
  // Grilles à deux couleurs : la consigne dit aussi la couleur (« Touche le 7 bleu », « Tap blue 7 »).
  const toneWord = schulteTone(target) ? tr('orange', 'orange') : tr('bleu', 'blue');

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
          {tr('Touche le', 'Tap')} {twoTone && lang() === 'en' && <span className={`schulte__tone${toneClass(target)}`}>{toneWord}</span>}
          <strong className={twoTone ? `schulte__tone${toneClass(target)}` : undefined}>{schulteText(target)}</strong>
          {twoTone && lang() === 'fr' && <span className={`schulte__tone${toneClass(target)}`}> {toneWord}</span>}
        </p>
        <div
          key={moved}
          className={`schulte${board.size >= 7 ? ' schulte--dense' : ''}${moved ? ' schulte--moved' : ''}`}
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
                className={`schulte__cell${toneClass(label)}${isFound && config.mark ? ' is-found' : ''}`}
                onTap={() => tap(cell)}
                aria-label={
                  isFound && config.mark ? tr(`${schulteSpoken(label, twoTone)}, trouvé`, `${schulteSpoken(label, twoTone)}, found`) : schulteSpoken(label, twoTone)
                }
              >
                <span key={shaking ? wrong.id : 0} className={shaking ? 'shake' : undefined}>
                  <span
                    className="schulte__num"
                    style={{ transform: `rotate(${board.tilts[cell]}deg) scale(${board.scales[cell]})` }}
                  >
                    {schulteText(label)}
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
