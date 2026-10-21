import type { Maze } from '../../core/games/labyrinthe';
import { tr } from '../../core/lang';
import { useLoop, useReducedMotion } from '../hooks';
import { MazeView } from './LabyrintheGame';

/** Quelques images en boucle ; une seule image fixe avec « moins d'animations ». */
function useDemoFrame(frames: number, intervalMs: number, still: number): number {
  const reduced = useReducedMotion();
  const frame = useLoop(frames, intervalMs, !reduced);
  return reduced ? still : frame;
}

/** Un petit labyrinthe de 3 × 3 : on descend, on traverse, on remonte… jusqu'à la sortie. */
const MAZE: Maze = {
  size: 3,
  right: [false, true, false, true, false, false, true, true, false],
  down: [true, false, true, true, false, true, false, false, false],
  start: 0,
  exit: 8,
  key: null,
};
const ROUTE = [0, 3, 6, 7, 8];

export function LabyrintheDemo() {
  const frame = useDemoFrame(ROUTE.length, 600, ROUTE.length - 1);
  return (
    <div className="demo">
      <div className="laby laby--demo" aria-hidden="true">
        <MazeView maze={MAZE} path={ROUTE.slice(0, frame + 1)} />
      </div>
      <p className="demo__caption">{frame < ROUTE.length - 1 ? tr('Trace le chemin du doigt…', 'Trace the way with your finger…') : tr('Sortie !', 'Out!')}</p>
    </div>
  );
}
