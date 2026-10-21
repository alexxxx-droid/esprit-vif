import { tr } from '../../core/lang';
import { Icon } from '../components/Icon';
import { useLoop, useReducedMotion } from '../hooks';
import { Glyph } from './SymbolesGame';

/** Quelques images en boucle ; une seule image fixe avec « moins d'animations ». */
function useDemoFrame(frames: number, intervalMs: number, still: number): number {
  const reduced = useReducedMotion();
  const frame = useLoop(frames, intervalMs, !reduced);
  return reduced ? still : frame;
}

/** Démo de l'intro : la table (rond 1, triangle 2, carré 3, étoile 4), un triangle, on touche 2. */
export function SymbolesDemo() {
  const frame = useDemoFrame(3, 900, 2);
  return (
    <div className="demo">
      <div className="sym sym--demo" aria-hidden="true">
        <div className="sym__table sym__table--4">
          {[0, 1, 2, 3].map((s) => (
            <span key={s} className="sym__pair">
              <Glyph shape={s} size={16} />
              <strong>{s + 1}</strong>
            </span>
          ))}
        </div>
        <Glyph shape={1} size={40} />
        <div className="sym__pad sym__pad--4">
          {[1, 2, 3, 4].map((d) => (
            <span key={d} className={`numpad__key${frame >= 1 && d === 2 ? ' is-pressed' : ''}`}>
              {d}
            </span>
          ))}
        </div>
      </div>
      <p className="demo__caption">
        {tr('Le triangle, c’est 2', 'The triangle is 2')}
        <span className={`demo__tick${frame === 2 ? ' is-on' : ''}`}>
          <Icon name="check" size={20} strokeWidth={3} />
        </span>
      </p>
    </div>
  );
}
