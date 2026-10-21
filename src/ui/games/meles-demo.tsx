import { tr } from '../../core/lang';
import { Icon } from '../components/Icon';
import { useLoop, useReducedMotion } from '../hooks';

/** Quelques images en boucle ; une seule image fixe avec « moins d'animations ». */
function useDemoFrame(frames: number, intervalMs: number, still: number): number {
  const reduced = useReducedMotion();
  const frame = useLoop(frames, intervalMs, !reduced);
  return reduced ? still : frame;
}

/** Démo de l'intro : un mot de quatre lettres sur la deuxième ligne ; la première lettre, puis la dernière. */
export function MelesDemo() {
  const word = tr('LUNE', 'MOON');
  const letters = ['R', 'A', 'B', 'T', ...word, 'S', 'O', 'K', 'E', 'P', 'I', 'V', 'D'];
  const frame = useDemoFrame(3, 900, 2);
  return (
    <div className="demo">
      <div className="meles__grid meles__grid--4 meles__grid--demo" aria-hidden="true">
        {letters.map((l, cell) => {
          const inWord = cell >= 4 && cell < 8;
          const state = frame === 2 && inWord ? ' is-found meles__cell--f0' : (frame >= 0 && cell === 4) || (frame === 1 && cell === 7) ? ' is-first' : '';
          return (
            <span key={cell} className={`meles__cell${state}`}>
              {l}
            </span>
          );
        })}
      </div>
      <p className="demo__caption">
        {frame < 2 ? tr('La première lettre, puis la dernière', 'The first letter, then the last') : tr('Mot trouvé !', 'Word found!')}
        <span className={`demo__tick${frame === 2 ? ' is-on' : ''}`}>
          <Icon name="check" size={20} strokeWidth={3} />
        </span>
      </p>
    </div>
  );
}
