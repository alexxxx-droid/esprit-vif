import { tr } from '../../core/lang';
import { useLoop, useReducedMotion } from '../hooks';
import { Pegs } from './HanoiGame';

/** Quelques images en boucle ; une seule image fixe avec « moins d'animations ». */
function useDemoFrame(frames: number, intervalMs: number, still: number): number {
  const reduced = useReducedMotion();
  const frame = useLoop(frames, intervalMs, !reduced);
  return reduced ? still : frame;
}

/** Démo de l'intro : deux disques passent à droite en trois coups. */
const STEPS = [
  [0, 0],
  [1, 0],
  [1, 2],
  [2, 2],
];

export function HanoiDemo() {
  const frame = useDemoFrame(STEPS.length, 900, 3);
  return (
    <div className="demo">
      <div className="hanoi hanoi--demo" aria-hidden="true">
        <Pegs position={STEPS[frame]} disks={2} small />
      </div>
      <p className="demo__caption">{frame < 3 ? tr('Un disque à la fois, jamais un grand sur un petit', 'One disk at a time, never big on small') : tr('Toute la pile à droite !', 'The whole stack on the right!')}</p>
    </div>
  );
}
