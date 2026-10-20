import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { tr } from '../../core/lang';
import { plural } from '../../core/format';
import { ISO_X, paintOrder, solidBounds, solidFrame, type Cube, type Solid } from '../../core/games/cubes';
import {
  generateRotation,
  pieceSize,
  pieceSpan,
  ROTATION_DURATION_MS,
  rotationLevel,
  scoreRotation,
  type FlatPuzzle,
  type Piece,
} from '../../core/games/rotation';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';
import { useKeyDown } from '../hooks';

/** Une pièce dessinée carré par carré, centrée dans un cadre commun à toute la question (et penchée de `tilt` degrés). */
export function PieceView({ piece, span, size, tilt = 0 }: { piece: Piece; span: number; size: number; tilt?: number }) {
  const { width, height } = pieceSize(piece);
  const ox = (span - width) / 2;
  const oy = (span - height) / 2;
  return (
    <svg className="piece" width={size} height={size} viewBox={`0 0 ${span} ${span}`} aria-hidden="true">
      <g transform={tilt ? `rotate(${tilt} ${span / 2} ${span / 2})` : undefined}>
        {piece.map(([x, y]) => (
          <rect key={`${x},${y}`} x={ox + x + 0.05} y={oy + y + 0.05} width={0.9} height={0.9} rx={0.16} />
        ))}
      </g>
    </svg>
  );
}

/** Cadre commun d'une question aux pièces penchées : assez grand pour la plus encombrante, une fois tournée. */
function tiltFrame(puzzle: FlatPuzzle, span: number): number {
  if (!puzzle.tilts) return span;
  const extent = (piece: Piece, deg: number) => {
    const { width, height } = pieceSize(piece);
    const a = (deg * Math.PI) / 180;
    const c = Math.abs(Math.cos(a));
    const s = Math.abs(Math.sin(a));
    return Math.max(width * c + height * s, width * s + height * c);
  };
  const largest = Math.max(extent(puzzle.model, 0), ...puzzle.options.map((p, i) => extent(p, puzzle.tilts?.[i] ?? 0)));
  return Math.max(span, Math.ceil(largest * 10) / 10 + 0.2);
}

/** Perspective isométrique : x vers la droite et le bas, y vers la gauche et le bas, z vers le haut. */
const point = (u: number, v: number) => `${(u * ISO_X).toFixed(3)},${(v / 2).toFixed(3)}`;

function cubeFaces([x, y, z]: Cube) {
  const u = x - y;
  const v = x + y - 2 * z;
  return {
    top: [point(u, v - 2), point(u + 1, v - 1), point(u, v), point(u - 1, v - 1)].join(' '),
    right: [point(u, v), point(u + 1, v - 1), point(u + 1, v + 1), point(u, v + 2)].join(' '),
    left: [point(u, v), point(u, v + 2), point(u - 1, v + 1), point(u - 1, v - 1)].join(' '),
  };
}

/** Une pièce en relief : chaque cube montre son dessus (clair) et ses deux flancs (plus sombres). */
export function SolidView({ solid, frame, size }: { solid: Solid; frame: number; size: number }) {
  const b = solidBounds(solid);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  return (
    <svg className="solid" width={size} height={size} viewBox={`${cx - frame / 2} ${cy - frame / 2} ${frame} ${frame}`} aria-hidden="true">
      {paintOrder(solid).map((cube) => {
        const faces = cubeFaces(cube);
        return (
          <g key={cube.join(',')}>
            <polygon className="solid__top" points={faces.top} />
            <polygon className="solid__left" points={faces.left} />
            <polygon className="solid__right" points={faces.right} />
          </g>
        );
      })}
    </svg>
  );
}

export function RotationGame({ seed, level, onFinish }: GameProps) {
  const config = rotationLevel(level);
  const span = pieceSpan(config.size);
  const puzzles = useMemo(() => generateRotation(createRng(seed), level), [seed, level]);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const puzzle = puzzles[index % puzzles.length];
  const optionSize = config.options === 3 || config.options >= 5 ? 84 : 104;

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreRotation(correct, errors, level),
      stats: { correct, errors },
      headline: `${tr(plural(correct, 'pièce trouvée', 'pièces trouvées'), `${plural(correct, 'piece')} found`)} · ${tr(plural(errors, 'erreur'), plural(errors, 'error'))}`,
      lines: [
        { label: tr('Pièces trouvées', 'Pieces found'), value: String(correct) },
        { label: tr('Erreurs', 'Errors'), value: errors ? String(errors) : tr('Aucune', 'None') },
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: String(config.target) },
      ],
    });
  });

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= ROTATION_DURATION_MS) {
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

  const choose = (option: number) => {
    if (over) return;
    if (option === puzzle.answer) {
      fx.good();
      showMark('good');
      setCorrect(correct + 1);
    } else {
      fx.bad();
      showMark(
        'bad',
        puzzle.kinds[option] === 'mirror' ? tr('C’était son reflet', 'That was its mirror image') : tr('Ce n’est pas la même pièce', 'That’s not the same piece'),
      );
      setErrors(errors + 1);
    }
    setIndex(index + 1);
  };

  useKeyDown((e) => {
    const n = Number(e.key);
    if (n >= 1 && n <= config.options) choose(n - 1);
  }, !over);

  const frame = puzzle.solid ? solidFrame([puzzle.model, ...puzzle.options]) : tiltFrame(puzzle, span);
  const draw = (i: number | null, size: number) => {
    if (puzzle.solid) return <SolidView solid={i === null ? puzzle.model : puzzle.options[i]} frame={frame} size={size} />;
    return <PieceView piece={i === null ? puzzle.model : puzzle.options[i]} span={frame} size={size} tilt={i === null ? 0 : puzzle.tilts?.[i]} />;
  };

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={ROTATION_DURATION_MS} />
      </GameHud>
      <div className="game__stage rotation">
        <p className="anagram__found">
          <strong>{correct}</strong> / {config.target}
        </p>
        <figure key={index} className="rotation__model">
          {draw(null, 128)}
          <figcaption>{tr('Modèle', 'Model')}</figcaption>
        </figure>
        <p className="rotation__ask">
          {puzzle.solid
            ? tr('Laquelle est la même pièce, tournée dans l’espace ?', 'Which one is the same piece, turned in space?')
            : tr('Laquelle est la même pièce, simplement tournée ?', 'Which one is the same piece, just rotated?')}
        </p>
        <FeedbackMark mark={mark} />
      </div>
      <div className={`game__controls rotation__options rotation__options--${config.options}`}>
        {puzzle.options.map((_, i) => (
          <TapButton key={`${index}-${i}`} className="rotation__option" onTap={() => choose(i)} aria-label={tr(`Pièce ${i + 1}`, `Piece ${i + 1}`)} aria-keyshortcuts={String(i + 1)}>
            {draw(i, optionSize)}
          </TapButton>
        ))}
      </div>
    </div>
  );
}
