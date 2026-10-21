import { tr } from '../../core/lang';
import { Icon } from '../components/Icon';
import { useLoop, useReducedMotion } from '../hooks';
import { ItemView } from './ManqueGame';

/** Quelques images en boucle ; une seule image fixe avec « moins d'animations ». */
function useDemoFrame(frames: number, intervalMs: number, still: number): number {
  const reduced = useReducedMotion();
  const frame = useLoop(frames, intervalMs, !reduced);
  return reduced ? still : frame;
}

const SET = [
  { shape: 0, color: 0 },
  { shape: 1, color: 1 },
  { shape: 3, color: 3 },
];

/** Démo de l'intro : trois formes, puis deux ; l'étoile jaune a disparu. */
export function ManqueDemo() {
  const frame = useDemoFrame(3, 1100, 2);
  const shown = frame === 0 ? SET : [SET[0], SET[1], null];
  return (
    <div className="demo">
      <div className="manque manque--demo" aria-hidden="true">
        <div className="manque__set">
          {shown.map((item, k) => (
            <ItemView key={k} item={item} size={34} />
          ))}
        </div>
      </div>
      <p className="demo__caption">
        {frame === 0 ? tr('Retiens-les…', 'Remember them…') : tr('L’étoile a disparu !', 'The star is gone!')}
        <span className={`demo__tick${frame === 2 ? ' is-on' : ''}`}>
          <Icon name="check" size={20} strokeWidth={3} />
        </span>
      </p>
    </div>
  );
}
