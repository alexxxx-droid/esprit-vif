import { tr } from '../../core/lang';
import { Icon } from '../components/Icon';
import { useLoop, useReducedMotion } from '../hooks';
import { PileView } from './CombienGame';

/** Quelques images en boucle ; une seule image fixe avec « moins d'animations ». */
function useDemoFrame(frames: number, intervalMs: number, still: number): number {
  const reduced = useReducedMotion();
  const frame = useLoop(frames, intervalMs, !reduced);
  return reduced ? still : frame;
}

/** Démo de l'intro : un petit tas de 5 cubes, dont un caché sous une pile de deux. */
const PILE = { cols: 2, rows: 2, heights: [[1, 2], [0, 2]] };

export function CombienDemo() {
  const frame = useDemoFrame(3, 1100, 2);
  return (
    <div className="demo">
      <div className="combien combien--demo" aria-hidden="true">
        <PileView pile={PILE} maxHeight={2} size={96} />
      </div>
      <p className="demo__caption">
        {frame === 0 ? tr('Compte aussi les cubes du dessous', 'Count the cubes underneath too') : tr('5 cubes', '5 cubes')}
        <span className={`demo__tick${frame === 2 ? ' is-on' : ''}`}>
          <Icon name="check" size={20} strokeWidth={3} />
        </span>
      </p>
    </div>
  );
}
