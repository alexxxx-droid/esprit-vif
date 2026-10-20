import { tr } from '../../core/lang';
import { Icon } from '../components/Icon';
import { useLoop, useReducedMotion } from '../hooks';

/** Cinq disques, quatre images : deux sont signalés, tout bouge, puis on retrouve les deux. */
const FRAMES: readonly (readonly [number, number][])[] = [
  [
    [20, 16],
    [50, 34],
    [80, 18],
    [30, 46],
    [72, 46],
  ],
  [
    [36, 22],
    [64, 44],
    [58, 14],
    [18, 34],
    [84, 34],
  ],
  [
    [62, 30],
    [76, 16],
    [34, 18],
    [26, 46],
    [56, 46],
  ],
  [
    [62, 30],
    [76, 16],
    [34, 18],
    [26, 46],
    [56, 46],
  ],
];
/** Les deux disques à suivre. */
const TARGETS = [0, 3];

export function FilatureDemo() {
  const reduced = useReducedMotion();
  const loop = useLoop(FRAMES.length, 1100, !reduced);
  // Avec moins d'animations, l'image la plus parlante : le signalement.
  const frame = reduced ? 0 : loop;
  return (
    <div className="demo">
      <svg className="demo-filature" viewBox="0 0 100 60" aria-hidden="true">
        {FRAMES[frame].map(([x, y], disc) => {
          const target = TARGETS.includes(disc);
          const state = frame === 0 && target ? ' is-cued' : frame === 3 && target ? ' is-hit' : '';
          return (
            <g key={disc} className={`filature__disc${state}`} style={{ transform: `translate(${x}px, ${y}px)` }}>
              <circle className="filature__ring" r="8.6" />
              <circle className="filature__body" r="6.2" />
            </g>
          );
        })}
      </svg>
      <p className="demo__caption">
        {frame === 0 ? tr('Retiens les disques entourés…', 'Remember the circled discs…') : frame === 3 ? tr('Touche-les !', 'Tap them!') : tr('Suis-les des yeux…', 'Follow them with your eyes…')}
        <span className={`demo__tick${frame === 3 ? ' is-on' : ''}`}>
          <Icon name="check" size={20} strokeWidth={3} />
        </span>
      </p>
    </div>
  );
}
