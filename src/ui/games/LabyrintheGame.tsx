import { useEffect, useEffectEvent, useRef, useState, type PointerEvent } from 'react';
import { byCount, plural } from '../../core/format';
import { tr } from '../../core/lang';
import { FOG_RADIUS, generateMaze, LABY_DURATION_MS, labyLevel, open, scoreLaby, type Maze } from '../../core/games/labyrinthe';
import { createRng, deriveSeed } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';
import { slow } from '../tempo';

const center = (m: Maze, cell: number) => [(cell % m.size) + 0.5, Math.floor(cell / m.size) + 0.5] as const;

/** Le labyrinthe : les murs, le chemin tracé, l'entrée, la sortie, la clé ; le brouillard au besoin. */
export function MazeView({
  maze,
  path,
  walls = true,
  fog = false,
  hasKey = false,
  onPointer,
}: {
  maze: Maze;
  path: readonly number[];
  walls?: boolean;
  fog?: boolean;
  hasKey?: boolean;
  onPointer?: (e: PointerEvent<SVGSVGElement>) => void;
}) {
  const n = maze.size;
  const head = path[path.length - 1];
  const hidden = (cell: number) => fog && Math.max(Math.abs((cell % n) - (head % n)), Math.abs(Math.floor(cell / n) - Math.floor(head / n))) > FOG_RADIUS;
  const lines: string[] = [];
  if (walls) {
    for (let cell = 0; cell < n * n; cell++) {
      const x = cell % n;
      const y = Math.floor(cell / n);
      if (x < n - 1 && !maze.right[cell] && !(hidden(cell) && hidden(cell + 1))) lines.push(`M${x + 1} ${y}v1`);
      if (y < n - 1 && !maze.down[cell] && !(hidden(cell) && hidden(cell + n))) lines.push(`M${x} ${y + 1}h1`);
    }
  }
  const [ex, ey] = center(maze, maze.exit);
  const key = maze.key === null ? null : center(maze, maze.key);
  return (
    <svg
      className={`laby__maze${onPointer ? '' : ' is-static'}`}
      viewBox={`-0.1 -0.1 ${n + 0.2} ${n + 0.2}`}
      onPointerDown={onPointer}
      onPointerMove={(e) => e.buttons && onPointer?.(e)}
      role={onPointer ? 'application' : undefined}
      aria-label={onPointer ? tr('Le labyrinthe : trace le chemin du doigt', 'The maze: trace the way with your finger') : undefined}
    >
      <rect className="laby__floor" x="0" y="0" width={n} height={n} rx="0.25" />
      {Array.from({ length: n * n }, (_, cell) => (hidden(cell) ? <rect key={cell} className="laby__fog" x={cell % n} y={Math.floor(cell / n)} width="1.02" height="1.02" /> : null))}
      <rect className="laby__exit" x={ex - 0.4} y={ey - 0.4} width="0.8" height="0.8" rx="0.2" />
      {key && !hasKey && (
        <g className="laby__key" transform={`translate(${key[0]} ${key[1]})`}>
          <circle r="0.22" cx="-0.12" />
          <path d="M0.05 0h0.3M0.25 0v0.15" />
        </g>
      )}
      <path className="laby__walls" d={lines.join('')} />
      <rect className="laby__frame" x="0" y="0" width={n} height={n} rx="0.25" />
      <polyline className="laby__path" points={path.map((cell) => center(maze, cell).join(',')).join(' ')} />
      <circle className="laby__head" cx={center(maze, head)[0]} cy={center(maze, head)[1]} r="0.3" />
    </svg>
  );
}

export function LabyrintheGame({ seed, level, onFinish }: GameProps) {
  const c = labyLevel(level);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [maze, setMaze] = useState<Maze>(() => generateMaze(createRng(deriveSeed(seed, 0)), level));
  const [path, setPath] = useState<number[]>([0]);
  const [hasKey, setHasKey] = useState(false);
  const [walls, setWalls] = useState(true);
  const [solved, setSolved] = useState(0);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const bumped = useRef(-1);

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreLaby(solved, level),
      stats: { solved },
      headline: tr(byCount(solved, `${solved} labyrinthe fini`, `${solved} labyrinthes finis`), plural(solved, 'maze solved', 'mazes solved')),
      lines: [
        { label: tr('Labyrinthes finis', 'Mazes solved'), value: String(solved) },
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: String(c.target) },
      ],
    });
  });

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= LABY_DURATION_MS) {
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

  // Les murs s'effacent au bout de quelques secondes (palier Légende).
  useEffect(() => {
    if (!c.wallsMs) return;
    const id = window.setTimeout(() => setWalls(false), slow(c.wallsMs));
    return () => window.clearTimeout(id);
  }, [index, c.wallsMs]);

  const move = (cell: number) => {
    const head = path[path.length - 1];
    if (cell === head) return;
    // Revenir sur la case d'avant efface le dernier pas.
    if (cell === path[path.length - 2]) {
      setPath(path.slice(0, -1));
      return;
    }
    const near = Math.abs(cell - head) === maze.size || (Math.abs(cell - head) === 1 && Math.floor(cell / maze.size) === Math.floor(head / maze.size));
    if (!near) return;
    if (!open(maze, head, cell)) {
      if (bumped.current !== cell) fx.tap();
      bumped.current = cell;
      return;
    }
    if (path.includes(cell)) return;
    const next = [...path, cell];
    const key = hasKey || cell === maze.key;
    if (key !== hasKey) fx.good();
    setHasKey(key);
    setPath(next);
    if (cell === maze.exit && (maze.key === null || key)) {
      fx.good();
      showMark('good');
      setSolved(solved + 1);
      const i = index + 1;
      setIndex(i);
      setMaze(generateMaze(createRng(deriveSeed(seed, i)), level));
      setPath([0]);
      setHasKey(false);
      setWalls(true);
    }
  };

  const onPointer = (e: PointerEvent<SVGSVGElement>) => {
    if (over) return;
    e.preventDefault();
    const box = e.currentTarget.getBoundingClientRect();
    const scale = (maze.size + 0.2) / box.width;
    const x = Math.floor((e.clientX - box.left) * scale - 0.1);
    const y = Math.floor((e.clientY - box.top) * scale - 0.1);
    if (x < 0 || y < 0 || x >= maze.size || y >= maze.size) return;
    move(y * maze.size + x);
  };

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={LABY_DURATION_MS} />
      </GameHud>
      <div className="game__stage laby">
        <p className="anagram__found">
          <strong>{solved}</strong> / {c.target}
          {maze.key !== null && ` · ${hasKey ? tr('clé prise', 'key found') : tr('trouve la clé', 'find the key')}`}
        </p>
        <MazeView key={index} maze={maze} path={path} walls={walls} fog={c.fog} hasKey={hasKey} onPointer={onPointer} />
        <FeedbackMark mark={mark} />
      </div>
    </div>
  );
}
