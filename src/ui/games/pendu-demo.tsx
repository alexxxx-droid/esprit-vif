import { tr } from '../../core/lang';
import { Icon } from '../components/Icon';
import { useLoop, useReducedMotion } from '../hooks';
import { PenduSlots } from './PenduGame';

/** Quelques images en boucle ; une seule image fixe avec « moins d'animations ». */
function useDemoFrame(frames: number, intervalMs: number, still: number): number {
  const reduced = useReducedMotion();
  const frame = useLoop(frames, intervalMs, !reduced);
  return reduced ? still : frame;
}

/** Démo de l'intro : un fruit, P…E donnés ; O, puis M, et le mot est trouvé. */
export function PenduDemo() {
  const word = tr('POMME', 'APPLE');
  const steps = [tr('PE', 'AE'), tr('PEO', 'AEP'), tr('PEOM', 'AEPL')];
  const frame = useDemoFrame(steps.length, 900, 2);
  return (
    <div className="demo">
      <div className="pendu pendu--demo" aria-hidden="true">
        <p className="pendu__hint">{tr('Famille : fruit', 'Family: fruit')}</p>
        <PenduSlots letters={word} known={[...steps[frame]]} />
      </div>
      <p className="demo__caption">
        {frame < 2 ? tr('Une lettre, puis une autre…', 'One letter, then another…') : tr('Mot trouvé !', 'Word found!')}
        <span className={`demo__tick${frame === 2 ? ' is-on' : ''}`}>
          <Icon name="check" size={20} strokeWidth={3} />
        </span>
      </p>
    </div>
  );
}
