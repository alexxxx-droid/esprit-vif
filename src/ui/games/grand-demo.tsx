import { tr } from '../../core/lang';
import { Icon } from '../components/Icon';
import { useLoop, useReducedMotion } from '../hooks';

/** Quelques images en boucle ; une seule image fixe avec « moins d'animations ». */
function useDemoFrame(frames: number, intervalMs: number, still: number): number {
  const reduced = useReducedMotion();
  const frame = useLoop(frames, intervalMs, !reduced);
  return reduced ? still : frame;
}

/** Démo de l'intro : 18 + 9 contre 13 + 11 ; on touche le premier (27 contre 24). */
export function GrandDemo() {
  const frame = useDemoFrame(2, 1200, 1);
  return (
    <div className="demo">
      <div className="grand grand--demo" aria-hidden="true">
        <div className="grand__calcs grand__calcs--2">
          <span className={`grand__calc${frame === 1 ? ' is-pressed' : ''}`}>18 + 9</span>
          <span className="grand__calc">13 + 11</span>
        </div>
      </div>
      <p className="demo__caption">
        {frame === 0 ? tr('Lequel donne le plus ?', 'Which gives more?') : tr('27, plus que 24', '27, more than 24')}
        <span className={`demo__tick${frame === 1 ? ' is-on' : ''}`}>
          <Icon name="check" size={20} strokeWidth={3} />
        </span>
      </p>
    </div>
  );
}
