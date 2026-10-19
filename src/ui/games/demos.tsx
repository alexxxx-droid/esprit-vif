import { Icon } from '../components/Icon';
import { useLoop, useReducedMotion } from '../hooks';

/**
 * Mini-démonstrations de l'écran d'intro : quelques images en boucle qui montrent le geste.
 * Avec « moins d'animations », une seule image fixe, la plus parlante.
 */
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

const CALC_SCRIPT = [
  { q: '3 + 4', slots: 1, typed: '', key: '', ok: false },
  { q: '3 + 4', slots: 1, typed: '7', key: '7', ok: false },
  { q: '3 + 4', slots: 1, typed: '7', key: '', ok: true },
  { q: '6 × 2', slots: 2, typed: '', key: '', ok: false },
  { q: '6 × 2', slots: 2, typed: '1', key: '1', ok: false },
  { q: '6 × 2', slots: 2, typed: '12', key: '2', ok: false },
  { q: '6 × 2', slots: 2, typed: '12', key: '', ok: true },
];

export function CalculDemo() {
  const step = CALC_SCRIPT[useDemoFrame(CALC_SCRIPT.length, 650, 2)];
  return (
    <div className="demo demo--calc">
      <div className="demo__screen">
        <span className="demo__question">{step.q}</span>
        <span className="demo__slots">
          {Array.from({ length: step.slots }, (_, i) => (
            <span key={i} className="demo__slot">
              {step.typed[i] ?? ''}
            </span>
          ))}
        </span>
        <Tick show={step.ok} />
      </div>
      <div className="demo__pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) => (
          <span key={i} className={`demo__key${k && k === step.key ? ' is-pressed' : ''}${k ? '' : ' is-empty'}`}>
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

const STROOP_SCRIPT = [
  { word: 'BLEU', ink: 'rouge', press: '', ok: false },
  { word: 'BLEU', ink: 'rouge', press: 'rouge', ok: false },
  { word: 'BLEU', ink: 'rouge', press: 'rouge', ok: true },
  { word: 'VERT', ink: 'jaune', press: '', ok: false },
  { word: 'VERT', ink: 'jaune', press: 'jaune', ok: false },
  { word: 'VERT', ink: 'jaune', press: 'jaune', ok: true },
];

const STROOP_BUTTONS = [
  ['rouge', 'Rouge'],
  ['bleu', 'Bleu'],
  ['vert', 'Vert'],
  ['jaune', 'Jaune'],
] as const;

export function StroopDemo() {
  const step = STROOP_SCRIPT[useDemoFrame(STROOP_SCRIPT.length, 800, 2)];
  return (
    <div className="demo demo--stroop">
      <div className="demo__stage">
        <span className={`demo__word ink--${step.ink}`}>{step.word}</span>
        <Tick show={step.ok} />
      </div>
      <div className="demo__answers">
        {STROOP_BUTTONS.map(([color, label]) => (
          <span key={color} className={`demo__answer${step.press === color ? ' is-pressed' : ''}`}>
            <span className={`swatch swatch--${color}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

const SCHULTE_DEMO = [5, 1, 8, 3, 9, 2, 7, 4, 6];

export function SchulteDemo() {
  const found = useDemoFrame(11, 420, 4);
  return (
    <div className="demo demo--schulte">
      <div className="demo__grid">
        {SCHULTE_DEMO.map((n) => (
          <span key={n} className={`demo__cell${n <= found ? ' is-found' : ''}${n === found ? ' is-pressed' : ''}`}>
            {n}
          </span>
        ))}
      </div>
      <p className="demo__caption">1, 2, 3… jusqu’au bout&nbsp;!</p>
    </div>
  );
}
