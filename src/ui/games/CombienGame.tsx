import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { byCount, plural } from '../../core/format';
import { tr } from '../../core/lang';
import { COMBIEN_DURATION_MS, combienLevel, generateCombien, pileSolid, scoreCombien, type CombienAsk, type Pile } from '../../core/games/combien';
import { paintOrder, solidBounds, type Cube } from '../../core/games/cubes';
import { createRng, deriveSeed } from '../../core/rng';
import { NumPad } from '../components/bits';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';
import { useKeyDown } from '../hooks';
import { cubeFaces } from './iso';

/** Le sol quadrillé et le tas, à l'échelle du plus grand tas possible du niveau (`cols` × `rows` × `maxHeight`). */
export function PileView({ pile, maxHeight, size }: { pile: Pile; maxHeight: number; size: number }) {
  const floor: Cube[] = [];
  const box: Cube[] = [];
  for (let y = 0; y < pile.rows; y++) {
    for (let x = 0; x < pile.cols; x++) {
      floor.push([x, y, -1]);
      for (let z = -1; z < maxHeight; z++) box.push([x, y, z]);
    }
  }
  const b = solidBounds(box);
  const w = b.maxX - b.minX + 0.4;
  const h = b.maxY - b.minY + 0.4;
  const side = Math.max(w, h);
  return (
    <svg className="solid combien__pile" width={size} height={size} viewBox={`${(b.minX + b.maxX - side) / 2} ${(b.minY + b.maxY - side) / 2} ${side} ${side}`} aria-hidden="true">
      {floor.map((cube) => (
        <polygon key={cube.join(',')} className="combien__floor" points={cubeFaces(cube).top} />
      ))}
      {paintOrder(pileSolid(pile)).map((cube) => {
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

const QUESTIONS: Record<CombienAsk, () => string> = {
  total: () => tr('Combien de cubes ?', 'How many cubes?'),
  missing: () => tr('Combien en manque-t-il pour remplir le pavé ?', 'How many are missing to fill the box?'),
  diff: () => tr('Combien de cubes de plus à gauche ?', 'How many more cubes on the left?'),
  hidden: () => tr('Combien de cubes sont tout à fait cachés ?', 'How many cubes are completely hidden?'),
};

export function CombienGame({ seed, level, onFinish }: GameProps) {
  const config = combienLevel(level);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const question = useMemo(() => generateCombien(createRng(deriveSeed(seed, index)), level), [seed, index, level]);

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreCombien(correct, level),
      stats: { correct, errors },
      headline: tr(byCount(correct, `${correct} bonne réponse`, `${correct} bonnes réponses`), plural(correct, 'correct answer')),
      lines: [
        { label: tr('Bonnes réponses', 'Correct answers'), value: String(correct) },
        { label: tr('Erreurs', 'Errors'), value: errors ? String(errors) : tr('Aucune', 'None') },
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: String(config.target) },
      ],
    });
  });

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= COMBIEN_DURATION_MS) {
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

  const submit = () => {
    if (over || !typed) return;
    if (Number(typed) === question.answer) {
      fx.good();
      showMark('good');
      setCorrect(correct + 1);
    } else {
      fx.bad();
      showMark('bad', tr(`C’était ${question.answer}`, `It was ${question.answer}`));
      setErrors(errors + 1);
    }
    setTyped('');
    setIndex(index + 1);
  };

  const press = (digit: string) => {
    if (over || typed.length >= 2) return;
    fx.tap();
    setTyped(typed === '0' ? digit : typed + digit);
  };

  const erase = () => {
    if (!typed) return;
    setTyped(typed.slice(0, -1));
  };

  useKeyDown((e) => {
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') erase();
    else if (e.key === 'Enter') submit();
  }, !over);

  const two = question.piles.length === 2;
  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={COMBIEN_DURATION_MS} />
      </GameHud>
      <div className="game__stage combien">
        <p className="anagram__found">
          <strong>{correct}</strong> / {config.target}
        </p>
        <div key={index} className={`combien__piles${two ? ' combien__piles--two' : ''}`}>
          {question.piles.map((pile, i) => (
            <PileView key={i} pile={pile} maxHeight={config.maxHeight} size={two ? 150 : 196} />
          ))}
        </div>
        <p className="combien__ask">
          {QUESTIONS[question.ask]()} <span className={`combien__answer${typed ? ' is-typed' : ''}`}>{typed || '?'}</span>
        </p>
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls">
        <NumPad onDigit={press} onErase={erase} onSubmit={submit} disabled={over} />
      </div>
    </div>
  );
}
