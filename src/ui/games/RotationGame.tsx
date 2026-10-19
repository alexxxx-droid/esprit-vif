import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { tr } from '../../core/lang';
import { plural } from '../../core/format';
import {
  generateRotation,
  pieceSize,
  pieceSpan,
  ROTATION_DURATION_MS,
  rotationLevel,
  scoreRotation,
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

/** Une pièce dessinée carré par carré, centrée dans un cadre commun à toute la question. */
export function PieceView({ piece, span, size }: { piece: Piece; span: number; size: number }) {
  const { width, height } = pieceSize(piece);
  const ox = (span - width) / 2;
  const oy = (span - height) / 2;
  return (
    <svg className="piece" width={size} height={size} viewBox={`0 0 ${span} ${span}`} aria-hidden="true">
      {piece.map(([x, y]) => (
        <rect key={`${x},${y}`} x={ox + x + 0.05} y={oy + y + 0.05} width={0.9} height={0.9} rx={0.16} />
      ))}
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

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreRotation(correct, errors, level),
      stats: { correct, errors },
      headline: tr(
        `${plural(correct, 'pièce trouvée', 'pièces trouvées')} · ${plural(errors, 'erreur')}`,
        `${plural(correct, 'piece')} found · ${plural(errors, 'error')}`,
      ),
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
          <PieceView piece={puzzle.model} span={span} size={128} />
          <figcaption>{tr('Modèle', 'Model')}</figcaption>
        </figure>
        <p className="rotation__ask">{tr('Laquelle est la même pièce, simplement tournée\u00a0?', 'Which one is the same piece, just rotated?')}</p>
        <FeedbackMark mark={mark} />
      </div>
      <div className={`game__controls rotation__options rotation__options--${config.options}`}>
        {puzzle.options.map((piece, i) => (
          <TapButton key={`${index}-${i}`} className="rotation__option" onTap={() => choose(i)} aria-label={tr(`Pièce ${i + 1}`, `Piece ${i + 1}`)} aria-keyshortcuts={String(i + 1)}>
            <PieceView piece={piece} span={span} size={config.options === 3 ? 84 : 104} />
          </TapButton>
        ))}
      </div>
    </div>
  );
}
