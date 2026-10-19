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

const MATRICE_DEMO = [5, 10, 3];

export function MatriceDemo() {
  // 0-2 : les cases s'allument ; 3 : pause ; 4-6 : le joueur les retouche ; 7 : réussi.
  const frame = useDemoFrame(9, 600, 7);
  const lit = frame < 3 ? MATRICE_DEMO[frame] : -1;
  const entered = frame >= 4 ? MATRICE_DEMO.slice(0, Math.min(3, frame - 3)) : [];
  return (
    <div className="demo demo--matrice">
      <div className="demo__matrix">
        {Array.from({ length: 16 }, (_, cell) => (
          <span
            key={cell}
            className={`demo__mcell${lit === cell ? ' is-lit' : ''}${entered.includes(cell) ? ' is-entered' : ''}`}
          />
        ))}
      </div>
      <p className="demo__caption">
        {frame < 3 ? 'Regarde…' : frame === 3 ? 'À toi !' : frame < 7 ? 'Même ordre…' : 'Bravo !'}
        <Tick show={frame >= 7} />
      </p>
    </div>
  );
}

export function NBackDemo({ level }: { level: number }) {
  const n = Math.min(3, Math.max(1, level));
  const stream = n === 1 ? ['K', 'R', 'R'] : n === 2 ? ['K', 'R', 'K'] : ['K', 'R', 'T', 'K'];
  const frame = useDemoFrame(stream.length + 2, 800, stream.length);
  const shown = Math.min(frame + 1, stream.length);
  const match = frame >= stream.length - 1;
  return (
    <div className="demo demo--nback">
      <div className="demo__stream">
        {stream.slice(0, shown).map((letter, i) => (
          <span
            key={i}
            className={`demo__letter${i === shown - 1 ? ' is-current' : ''}${match && (i === stream.length - 1 || i === stream.length - 1 - n) ? ' is-match' : ''}`}
          >
            {letter}
          </span>
        ))}
      </div>
      <span className={`demo__button${frame >= stream.length ? ' is-pressed' : ''}`}>
        Identique
        <Tick show={frame >= stream.length} />
      </span>
    </div>
  );
}

const TOTAL_SCRIPT = ['+5', '+3', '−2', '= ?', '= 6'];

export function TotalDemo() {
  const frame = useDemoFrame(TOTAL_SCRIPT.length + 1, 800, 4);
  const shown = TOTAL_SCRIPT[Math.min(frame, TOTAL_SCRIPT.length - 1)];
  return (
    <div className="demo demo--total">
      <div className="demo__screen">
        <span key={frame} className="demo__big">
          {shown}
        </span>
        <Tick show={frame >= 4} />
      </div>
      <p className="demo__caption">5 + 3 − 2 = 6</p>
    </div>
  );
}

const INTRUS_DEMO = [
  { base: 'b', odd: 'd', at: 5 },
  { base: 'O', odd: 'Q', at: 1 },
];

export function IntrusDemo() {
  const frame = useDemoFrame(6, 700, 1);
  const board = INTRUS_DEMO[frame < 3 ? 0 : 1];
  const pressed = frame % 3 >= 1;
  return (
    <div className="demo demo--intrus">
      <div className="demo__grid">
        {Array.from({ length: 9 }, (_, cell) => (
          <span key={cell} className={`demo__cell${cell === board.at && pressed ? ' is-pressed' : ''}`}>
            {cell === board.at ? board.odd : board.base}
          </span>
        ))}
      </div>
      <p className="demo__caption">
        Le « {board.odd} » se cache parmi les « {board.base} »
        <Tick show={frame % 3 === 2} />
      </p>
    </div>
  );
}

const ANAGRAM_TILES = ['H', 'C', 'I', 'N', 'E'];
const ANAGRAM_ORDER = [1, 0, 2, 4, 3]; // C H I E N

export function AnagrammesDemo() {
  const frame = useDemoFrame(8, 550, 6);
  const count = Math.min(5, Math.max(0, frame - 1));
  const picked = ANAGRAM_ORDER.slice(0, count);
  return (
    <div className="demo demo--anagram">
      <div className="demo__slots">
        {ANAGRAM_ORDER.map((tile, i) => (
          <span key={i} className="demo__slot">
            {i < count ? ANAGRAM_TILES[tile] : ''}
          </span>
        ))}
        <Tick show={count === 5} />
      </div>
      <div className="demo__tiles">
        {ANAGRAM_TILES.map((letter, i) => (
          <span key={i} className={`demo__tile${picked.includes(i) ? ' is-used' : ''}`}>
            {letter}
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
