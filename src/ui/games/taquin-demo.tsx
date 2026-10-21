import { tr } from '../../core/lang';
import { Icon } from '../components/Icon';
import { useLoop, useReducedMotion } from '../hooks';
import { TaquinBoard } from './TaquinGame';

/** Quelques images en boucle ; une seule image fixe avec « moins d'animations ». */
function useDemoFrame(frames: number, intervalMs: number, still: number): number {
  const reduced = useReducedMotion();
  const frame = useLoop(frames, intervalMs, !reduced);
  return reduced ? still : frame;
}

/** Démo de l'intro : deux coups pour ranger la grille. */
const STEPS = [
  [1, 2, 3, 4, 5, 6, 0, 7, 8],
  [1, 2, 3, 4, 5, 6, 7, 0, 8],
  [1, 2, 3, 4, 5, 6, 7, 8, 0],
];

export function TaquinDemo() {
  const frame = useDemoFrame(STEPS.length, 900, 2);
  return (
    <div className="demo">
      <div className="taquin taquin--demo" aria-hidden="true">
        <TaquinBoard board={STEPS[frame]} size={3} />
      </div>
      <p className="demo__caption">
        {frame < 2 ? tr('Fais glisser les tuiles…', 'Slide the tiles…') : tr('Dans l’ordre !', 'In order!')}
        <span className={`demo__tick${frame === 2 ? ' is-on' : ''}`}>
          <Icon name="check" size={20} strokeWidth={3} />
        </span>
      </p>
    </div>
  );
}
