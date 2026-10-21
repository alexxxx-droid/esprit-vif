import { tr } from '../../core/lang';
import { Icon } from '../components/Icon';
import { useLoop, useReducedMotion } from '../hooks';

/** Quelques images en boucle ; une seule image fixe avec « moins d'animations ». */
function useDemoFrame(frames: number, intervalMs: number, still: number): number {
  const reduced = useReducedMotion();
  const frame = useLoop(frames, intervalMs, !reduced);
  return reduced ? still : frame;
}

interface Frame {
  tiles: readonly number[];
  selected: number | null;
  sign: string | null;
  caption: () => string;
  tick: boolean;
}

/** Démo de l'intro : cible 14 avec 3, 5 et 9 ; on touche 5, puis +, puis 9. */
const FRAMES: readonly Frame[] = [
  { tiles: [3, 5, 9], selected: null, sign: null, tick: false, caption: () => tr('Atteins la cible', 'Hit the target') },
  { tiles: [3, 5, 9], selected: 1, sign: null, tick: false, caption: () => tr('Une plaque…', 'A tile…') },
  { tiles: [3, 5, 9], selected: 1, sign: '+', tick: false, caption: () => tr('… un signe…', '… a sign…') },
  { tiles: [3, 14], selected: 1, sign: null, tick: true, caption: () => tr('… une plaque : 5 + 9 = 14 !', '… a tile: 5 + 9 = 14!') },
];

export function CompteDemo() {
  const frame = FRAMES[useDemoFrame(FRAMES.length, 950, 3)];
  return (
    <div className="demo">
      <div className="compte compte--demo" aria-hidden="true">
        <div className="compte__target">
          <span className="compte__target-label">{tr('Cible', 'Target')}</span>
          <strong>14</strong>
        </div>
        <div className="compte__tiles">
          {frame.tiles.map((v, i) => (
            <span key={`${v}-${i}`} className={`compte__tile${i === frame.selected ? ' is-selected' : ''}`}>
              {v}
            </span>
          ))}
        </div>
        <div className="compte__signs">
          {['+', '−'].map((s) => (
            <span key={s} className={`compte__sign${s === frame.sign ? ' is-active' : ''}`}>
              {s}
            </span>
          ))}
        </div>
      </div>
      <p className="demo__caption">
        {frame.caption()}
        <span className={`demo__tick${frame.tick ? ' is-on' : ''}`}>
          <Icon name="check" size={20} strokeWidth={3} />
        </span>
      </p>
    </div>
  );
}
