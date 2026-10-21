import { useEffect, useMemo, useRef, useState } from 'react';
import { tr } from '../../core/lang';
import { byCount, formatSeconds } from '../../core/format';
import { balanceLevel, generateBalance, scoreBalance, type BalanceClue } from '../../core/games/balance';
import { countShapes, SHAPE_NAMES, theShape, type ShapeKind } from '../../core/games/shapes';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { Shape, ShapeGlyph } from '../components/Shape';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, Stopwatch } from '../game/Hud';
import { useKeyDown } from '../hooks';
import { rich } from '../rich';
import { BALANCE_LOOKS, BALANCE_LOOKS_XL } from './balance-looks';

const W = 160;
const PIVOT = { x: 80, y: 26 };
const ARM = 52;
const TILT = (12 * Math.PI) / 180;
const GLYPH = 21;
/** Largeur du « ×3 » écrit à droite d'un objet présent en plusieurs exemplaires. */
const COUNT_W = 17;

/** Les objets d'un plateau, regroupés : plusieurs exemplaires d'un même objet font un seul groupe. */
function groupsOf(items: readonly number[]): { item: number; count: number }[] {
  const out: { item: number; count: number }[] = [];
  for (const item of items) {
    const group = out.find((g) => g.item === item);
    if (group) group.count++;
    else out.push({ item, count: 1 });
  }
  return out;
}

/** « 3 triangles » (« 3 triangles », « 2 crosses ») : plusieurs exemplaires, pour les lecteurs d'écran. */
function countName(shape: ShapeKind, count: number): string {
  return countShapes(shape, count);
}

/** Une balance dessinée : le plateau le plus lourd descend. */
export function ScaleView({ clue, look }: { clue: BalanceClue; look: (item: number) => { shape: ShapeKind; color: string } }) {
  const down = clue.heavier === 'left' ? 1 : -1;
  const dx = ARM * Math.cos(TILT);
  const dy = ARM * Math.sin(TILT) * down;
  const ends = [
    { x: PIVOT.x - dx, y: PIVOT.y + dy, items: clue.left },
    { x: PIVOT.x + dx, y: PIVOT.y - dy, items: clue.right },
  ];
  const describe = (items: number[]) =>
    groupsOf(items)
      .map((g) => (g.count > 1 ? countName(look(g.item).shape, g.count) : theShape(look(g.item).shape)))
      .join(tr(' et ', ' and '));
  const heavy = clue.heavier === 'left' ? clue.left : clue.right;
  const light = clue.heavier === 'left' ? clue.right : clue.left;
  return (
    <svg className="scale" viewBox={`0 0 ${W} 92`} role="img" aria-label={tr(
        byCount(heavy.length, `${describe(heavy)} pèse plus que ${describe(light)}`, `${describe(heavy)} pèsent plus que ${describe(light)}`),
        byCount(heavy.length, `${describe(heavy)} weighs more than ${describe(light)}`, `${describe(heavy)} weigh more than ${describe(light)}`),
      )}>
      <rect className="scale__post" x={PIVOT.x - 2} y={PIVOT.y} width={4} height={60} rx={2} />
      <rect className="scale__post" x={PIVOT.x - 22} y={86} width={44} height={5} rx={2.5} />
      <line className="scale__beam" x1={ends[0].x} y1={ends[0].y} x2={ends[1].x} y2={ends[1].y} />
      <circle className="scale__pivot" cx={PIVOT.x} cy={PIVOT.y} r={4} />
      {ends.map((end, side) => {
        const panY = end.y + 30;
        const groups = groupsOf(end.items);
        const width = (g: { count: number }) => GLYPH + (g.count > 1 ? COUNT_W : 0);
        const total = groups.reduce((sum, g) => sum + width(g), 0) + (groups.length - 1) * 2;
        let x = end.x - total / 2;
        return (
          <g key={side}>
            <path className="scale__string" d={`M ${end.x - 21} ${panY} L ${end.x} ${end.y} L ${end.x + 21} ${panY}`} />
            {groups.map((g) => {
              const at = x;
              x += width(g) + 2;
              return (
                <g key={g.item}>
                  <ShapeGlyph shape={look(g.item).shape} color={look(g.item).color} x={at} y={panY - GLYPH - 1} size={GLYPH} />
                  {g.count > 1 && (
                    <text className="scale__count" x={at + GLYPH + 0.5} y={panY - 5}>
                      ×{g.count}
                    </text>
                  )}
                </g>
              );
            })}
            <path className="scale__pan" d={`M ${end.x - 25} ${panY} L ${end.x + 25} ${panY} Q ${end.x} ${panY + 11} ${end.x - 25} ${panY} Z`} />
          </g>
        );
      })}
    </svg>
  );
}

export function BalanceGame({ seed, level, onFinish }: GameProps) {
  const config = balanceLevel(level);
  const puzzles = useMemo(() => generateBalance(createRng(seed), level), [seed, level]);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [locked, setLocked] = useState(false);
  const [mark, showMark] = useFeedback();
  const timer = useRef(0);
  const done = index >= puzzles.length;
  const puzzle = puzzles[Math.min(index, puzzles.length - 1)];
  // Les objets changent d'allure d'une question à l'autre (dix allures au-delà de sept objets).
  const looks = config.items > BALANCE_LOOKS.length ? BALANCE_LOOKS_XL : BALANCE_LOOKS;
  const look = (item: number) => looks[(item + index * 3) % looks.length];
  const many = config.items > 7;

  useEffect(() => {
    clock.start();
    return () => {
      clock.stop();
      window.clearTimeout(timer.current);
    };
  }, [clock]);

  const choose = (item: number) => {
    if (locked || done) return;
    const ok = item === puzzle.answer;
    const total = correct + (ok ? 1 : 0);
    if (ok) {
      fx.good();
      showMark('good');
    } else {
      fx.bad();
      showMark('bad', tr(`C’était ${theShape(look(puzzle.answer).shape)}`, `It was ${theShape(look(puzzle.answer).shape)}`));
    }
    setCorrect(total);
    setLocked(true);
    timer.current = window.setTimeout(
      () => {
        const next = index + 1;
        if (next >= puzzles.length) {
          clock.stop();
          const ms = clock.elapsed();
          onFinish({
            score: scoreBalance(total, ms, level),
            stats: { correct: total, timeMs: Math.round(ms) },
            headline: tr(`${total}/${puzzles.length} justes · ${formatSeconds(ms)}`, `${total}/${puzzles.length} correct · ${formatSeconds(ms)}`),
            lines: [
              { label: tr('Bonnes déductions', 'Correct deductions'), value: `${total} / ${puzzles.length}` },
              { label: tr('Temps', 'Time'), value: formatSeconds(ms) },
            ],
          });
        }
        setIndex(next);
        setLocked(false);
      },
      ok ? 450 : 1100,
    );
  };

  useKeyDown((e) => {
    const n = Number(e.key);
    if (n >= 1 && n <= config.items) choose(n - 1);
  }, !done);

  return (
    <div className="game">
      <GameHud progress={index / puzzles.length}>
        <Stopwatch clock={clock} />
      </GameHud>
      <div className="game__stage balance">
        <p className="balance__ask">
          {puzzle.ask === 'heaviest'
            ? rich(tr('Lequel est {which}\u00a0?', 'Which one is {which}?'), { which: <strong>{tr('le plus lourd', 'the heaviest')}</strong> })
            : rich(tr('Lequel est {which}\u00a0?', 'Which one is {which}?'), { which: <strong>{tr('le plus léger', 'the lightest')}</strong> })}
        </p>
        <div key={index} className={`balance__clues${puzzle.clues.length > 6 ? ' balance__clues--3' : ''}`}>
          {puzzle.clues.map((clue, i) => (
            <ScaleView key={i} clue={clue} look={look} />
          ))}
        </div>
        <FeedbackMark mark={mark} />
      </div>
      <div className={`game__controls balance__items${many ? ' balance__items--many' : ''}`}>
        {Array.from({ length: config.items }, (_, item) => (
          <TapButton
            key={`${index}-${item}`}
            className="balance__item"
            onTap={() => choose(item)}
            disabled={locked}
            aria-label={SHAPE_NAMES[look(item).shape]}
            aria-keyshortcuts={String(item + 1)}
            style={{ color: look(item).color }}
          >
            <Shape card={{ shape: look(item).shape, filled: true, rotation: 0 }} size={many ? 32 : 38} />
          </TapButton>
        ))}
      </div>
    </div>
  );
}
