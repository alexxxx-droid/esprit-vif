import { echoLevel } from '../../core/games/echo';
import { tr } from '../../core/lang';
import { useLoop, useReducedMotion } from '../hooks';
import { EchoShape } from './EchoGame';

/** Quelques images en boucle ; une seule image fixe avec « moins d'animations ». */
function useDemoFrame(frames: number, intervalMs: number, still: number): number {
  const reduced = useReducedMotion();
  const frame = useLoop(frames, intervalMs, !reduced);
  return reduced ? still : frame;
}

/** Démo de l'intro : l'écho joue bleu puis vert, on rejoue bleu puis vert ; il joue ensuite une note de plus. */
const FRAMES: readonly { lit: number | null; you: boolean; caption: () => string }[] = [
  { lit: 0, you: false, caption: () => tr('L’écho joue…', 'The echo plays…') },
  { lit: 2, you: false, caption: () => tr('L’écho joue…', 'The echo plays…') },
  { lit: 0, you: true, caption: () => tr('… tu rejoues', '… you play it back') },
  { lit: 2, you: true, caption: () => tr('… tu rejoues', '… you play it back') },
  { lit: 3, you: false, caption: () => tr('Puis une note de plus !', 'Then one more note!') },
];

export function EchoDemo({ level }: { level: number }) {
  const pads = echoLevel(level).pads;
  const frame = FRAMES[useDemoFrame(FRAMES.length, 800, 2)];
  return (
    <div className="demo">
      <div className={`echo__pads echo__pads--${pads} echo__pads--demo`} aria-hidden="true">
        {Array.from({ length: pads }, (_, color) => (
          <span key={color} className={`echo__pad echo__pad--${color}${frame.lit === color ? ' is-lit' : ''}${frame.lit === color && frame.you ? ' is-pressed' : ''}`}>
            <EchoShape color={color} />
          </span>
        ))}
      </div>
      <p className="demo__caption">{frame.caption()}</p>
    </div>
  );
}
