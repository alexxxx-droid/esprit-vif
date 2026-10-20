import { luciolesLevel, type LucioleKind } from '../../core/games/lucioles';
import { tr } from '../../core/lang';
import { Icon } from '../components/Icon';
import { useLoop, useReducedMotion } from '../hooks';

/** Quelques images en boucle ; une seule image fixe avec « moins d'animations ». */
function useDemoFrame(frames: number, intervalMs: number, still: number): number {
  const reduced = useReducedMotion();
  const frame = useLoop(frames, intervalMs, !reduced);
  return reduced ? still : frame;
}

function Tick({ show }: { show: boolean }) {
  return (
    <span className={`demo__tick${show ? ' is-on' : ''}`}>
      <Icon name="check" size={20} strokeWidth={3} />
    </span>
  );
}

interface Frame {
  cell: number;
  kind: LucioleKind;
  pressed: boolean;
  caption: () => string;
  tick: boolean;
}

/** Démo de l'intro : une luciole s'allume, on la touche ; aux paliers avancés, une rouge ou une dorée. */
export function LuciolesDemo({ level }: { level: number }) {
  const c = luciolesLevel(level);
  const frames: Frame[] = [
    { cell: 2, kind: 'normal', pressed: false, tick: false, caption: () => tr('Une luciole s’allume…', 'A firefly lights up…') },
    { cell: 2, kind: 'normal', pressed: true, tick: true, caption: () => tr('Touche-la vite !', 'Tap it fast!') },
  ];
  if (c.reds) frames.push({ cell: 6, kind: 'red', pressed: false, tick: true, caption: () => tr('Une rouge : laisse-la s’éteindre', 'A red one: let it go out') });
  if (c.golds) frames.push({ cell: 4, kind: 'gold', pressed: true, tick: false, caption: () => tr('Une dorée : deux appuis', 'A gold one: two taps') });
  const frame = frames[useDemoFrame(frames.length, 1100, 1)];
  return (
    <div className="demo">
      <div className="demo-lucioles" aria-hidden="true">
        {Array.from({ length: 9 }, (_, cell) => {
          const lit = frame.cell === cell && !(frame.kind === 'normal' && frame.pressed);
          return (
            <span key={cell} className={`demo-lucioles__cell${frame.cell === cell && frame.pressed ? ' is-pressed' : ''}${lit ? ` is-${frame.kind}` : ''}`}>
              {lit && (
                <span className="lucioles__fly">
                  {frame.kind === 'red' && <span className="lucioles__cross" />}
                  {frame.kind === 'gold' && <span className="lucioles__two">2</span>}
                </span>
              )}
            </span>
          );
        })}
      </div>
      <p className="demo__caption">
        {frame.caption()}
        <Tick show={frame.tick} />
      </p>
    </div>
  );
}
