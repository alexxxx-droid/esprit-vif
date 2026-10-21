import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { byCount, formatDecimal, plural } from '../../core/format';
import { tr } from '../../core/lang';
import { allowedFor, generateHanoi, HANOI_DURATION_MS, hanoiLevel, move, PEGS, roundPoints, scoreHanoi, topOf, type Position } from '../../core/games/hanoi';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';

/** Les trois piquets et leurs disques ; le disque du dessus du piquet choisi se soulève. */
export function Pegs({ position, disks, selected, onPeg, small = false }: { position: Position; disks: number; selected?: number | null; onPeg?: (peg: number) => void; small?: boolean }) {
  return (
    <div className={`hanoi__pegs${small ? ' hanoi__pegs--small' : ''}`}>
      {Array.from({ length: PEGS }, (_, peg) => {
        const stack = position
          .map((at, disk) => ({ at, disk }))
          .filter((d) => d.at === peg)
          .sort((a, b) => b.disk - a.disk);
        const content = (
          <>
            <span className="hanoi__rod" />
            {stack.map(({ disk }, k) => (
              <span
                key={disk}
                className={`hanoi__disk hanoi__disk--${disk}${selected === peg && k === stack.length - 1 ? ' is-lifted' : ''}`}
                style={{ width: `${30 + (70 * (disk + 1)) / disks}%`, bottom: `${k * (small ? 8 : 22) + (small ? 3 : 8)}px` }}
              />
            ))}
          </>
        );
        return onPeg ? (
          <TapButton key={peg} className={`hanoi__peg${selected === peg ? ' is-selected' : ''}`} onTap={() => onPeg(peg)} aria-label={tr(`Piquet ${peg + 1}`, `Peg ${peg + 1}`)}>
            {content}
          </TapButton>
        ) : (
          <span key={peg} className="hanoi__peg">
            {content}
          </span>
        );
      })}
    </div>
  );
}

export function HanoiGame({ seed, level, onFinish }: GameProps) {
  const c = hanoiLevel(level);
  const rounds = useMemo(() => generateHanoi(createRng(seed), level), [seed, level]);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const round = rounds[index % rounds.length];
  const [position, setPosition] = useState<Position>(round.start);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [points, setPoints] = useState(0);
  const [solved, setSolved] = useState(0);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const allowed = allowedFor(c, round);

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreHanoi(points, level),
      stats: { solved, points },
      headline: tr(byCount(solved, `${solved} tour fini`, `${solved} tours finis`), plural(solved, 'round done', 'rounds done')),
      lines: [
        { label: tr('Tours finis', 'Rounds done'), value: String(solved) },
        { label: tr('Points (1 par tour au meilleur nombre de coups)', 'Points (1 per round in the fewest moves)'), value: formatDecimal(Math.round(points * 10) / 10) },
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: String(c.target) },
      ],
    });
  });

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= HANOI_DURATION_MS) {
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

  const nextRound = () => {
    const i = index + 1;
    setIndex(i);
    setPosition(rounds[i % rounds.length].start);
    setSelected(null);
    setMoves(0);
  };

  const tapPeg = (peg: number) => {
    if (over) return;
    if (selected === null) {
      if (topOf(position, peg) < 0) return;
      fx.tap();
      setSelected(peg);
      return;
    }
    if (selected === peg) {
      setSelected(null);
      return;
    }
    const next = move(position, selected, peg);
    setSelected(null);
    if (!next) {
      fx.bad();
      showMark('bad', tr('Pas un grand sur un petit', 'Not a big one on a small one'));
      return;
    }
    fx.tap();
    const used = moves + 1;
    if (next.join() === round.goal.join()) {
      fx.good();
      showMark('good');
      setPoints(points + roundPoints(round, used));
      setSolved(solved + 1);
      nextRound();
      return;
    }
    if (allowed && used >= allowed) {
      fx.bad();
      showMark('bad', tr('Trop de coups', 'Too many moves'));
      nextRound();
      return;
    }
    setPosition(next);
    setMoves(used);
  };

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={HANOI_DURATION_MS} />
      </GameHud>
      <div className="game__stage hanoi">
        <p className="anagram__found">
          {tr('Points', 'Points')} <strong>{formatDecimal(Math.round(points * 10) / 10)}</strong> / {c.target} · {tr(`coups ${moves}`, `moves ${moves}`)}
          {allowed ? ` / ${allowed}` : tr(` (meilleur : ${round.best})`, ` (best: ${round.best})`)}
        </p>
        {c.modelGoal && (
          <div className="hanoi__model">
            <span>{tr('Modèle', 'Model')}</span>
            <Pegs position={round.goal} disks={c.disks} small />
          </div>
        )}
        <Pegs key={index} position={position} disks={c.disks} selected={selected} onPeg={tapPeg} />
        <FeedbackMark mark={mark} />
      </div>
    </div>
  );
}
