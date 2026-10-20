import { useMemo, type CSSProperties } from 'react';
import { balanceLevel } from '../../core/games/balance';
import { demoViews, solidFrame, type Solid } from '../../core/games/cubes';
import { formatClock, formatDuration, horlogesLevel } from '../../core/games/horloges';
import { itiLevel } from '../../core/games/itineraire';
import { denominationLabel, formatEuros } from '../../core/games/monnaie';
import { nbackLevel } from '../../core/games/nback';
import { mirror, rotate, rotationLevel, type Piece } from '../../core/games/rotation';
import type { ShapeKind } from '../../core/games/shapes';
import { lang, tr } from '../../core/lang';
import { Icon } from '../components/Icon';
import { Shape } from '../components/Shape';
import { ScaleView } from './BalanceGame';
import { BALANCE_LOOKS } from './balance-looks';
import { COUP_GROUPS } from './coup-groups';
import { DotField } from './CoupGame';
import { Arrow } from './FlechesGame';
import { ClockFace, DayClock } from './HorlogesGame';
import { ItiGrid, MoveChip } from './ItiGame';
import { WordTiles } from './LettreGame';
import { PairCard } from './PairesGame';
import { PersonFace } from './QuiGame';
import { PieceView, SolidView } from './RotationGame';
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

/** Le mot affiché porte le nom d'une couleur (`word`), écrit dans une autre encre (`ink`). */
const STROOP_SCRIPT = [
  { word: 'bleu', ink: 'rouge', press: '', ok: false },
  { word: 'bleu', ink: 'rouge', press: 'rouge', ok: false },
  { word: 'bleu', ink: 'rouge', press: 'rouge', ok: true },
  { word: 'vert', ink: 'jaune', press: '', ok: false },
  { word: 'vert', ink: 'jaune', press: 'jaune', ok: false },
  { word: 'vert', ink: 'jaune', press: 'jaune', ok: true },
] as const;

/** Les quatre couleurs de la démo : nom en français et en anglais, choisi à l'affichage. */
const STROOP_BUTTONS = [
  ['rouge', 'Rouge', 'Red'],
  ['bleu', 'Bleu', 'Blue'],
  ['vert', 'Vert', 'Green'],
  ['jaune', 'Jaune', 'Yellow'],
] as const;

function stroopName(color: (typeof STROOP_BUTTONS)[number][0]): string {
  const [, fr, en] = STROOP_BUTTONS.find(([c]) => c === color)!;
  return tr(fr, en);
}

/** Niveaux Expert et plus : un cadre coloré autour du mot, et la consigne qui dit quoi regarder. */
const STROOP_FRAME_SCRIPT = [
  { word: 'bleu', ink: 'rouge', frame: 'vert', ask: 'frame', press: '', ok: false },
  { word: 'bleu', ink: 'rouge', frame: 'vert', ask: 'frame', press: 'vert', ok: false },
  { word: 'bleu', ink: 'rouge', frame: 'vert', ask: 'frame', press: 'vert', ok: true },
  { word: 'jaune', ink: 'bleu', frame: 'rouge', ask: 'word', press: '', ok: false },
  { word: 'jaune', ink: 'bleu', frame: 'rouge', ask: 'word', press: 'jaune', ok: false },
  { word: 'jaune', ink: 'bleu', frame: 'rouge', ask: 'word', press: 'jaune', ok: true },
] as const;

export function StroopDemo({ level }: { level: number }) {
  const frame = useDemoFrame(STROOP_SCRIPT.length, 800, 2);
  const framed = level > 20 ? STROOP_FRAME_SCRIPT[frame] : null;
  const step = framed ?? STROOP_SCRIPT[frame];
  return (
    <div className="demo demo--stroop">
      <div className="demo__stage">
        {framed && (
          <span className="demo__ask">{framed.ask === 'frame' ? tr('Couleur du cadre', 'Frame color') : tr('Lis le mot', 'Read the word')}</span>
        )}
        <span
          className={`demo__word ink--${step.ink}${framed ? ' demo__word--framed' : ''}`}
          style={framed ? ({ '--frame': `var(--ink-${framed.frame})` } as CSSProperties) : undefined}
        >
          {stroopName(step.word).toUpperCase()}
        </span>
        <Tick show={step.ok} />
      </div>
      <div className="demo__answers">
        {STROOP_BUTTONS.map(([color, fr, en]) => (
          <span key={color} className={`demo__answer${step.press === color ? ' is-pressed' : ''}`}>
            <span className={`swatch swatch--${color}`} />
            {tr(fr, en)}
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
        {frame < 3 ? tr('Regarde…', 'Watch…') : frame === 3 ? tr('À toi !', 'Your turn!') : frame < 7 ? tr('Même ordre…', 'Same order…') : tr('Bravo !', 'Well done!')}
        <Tick show={frame >= 7} />
      </p>
    </div>
  );
}

export function NBackDemo({ level }: { level: number }) {
  // Le N du niveau (3 au plus : au-delà, la démo resterait illisible).
  const n = Math.min(3, nbackLevel(level).n);
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
        {tr('Identique', 'Same')}
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

/** Niveaux avancés : un symbole tête en bas, puis deux familles mêlées (le seul « d » parmi les « b » et les « p »). */
function intrusAdvancedDemo(level: number) {
  const flipped = { cells: Array<string>(9).fill('F'), at: 7, caption: tr('Un « F » tête en bas', 'An upside-down “F”') };
  if (level <= 30) return [{ cells: Array.from({ length: 9 }, (_, i) => (i === 5 ? 'd' : 'b')), at: 5, caption: '' }, flipped];
  const mixed = ['b', 'p', 'b', 'p', 'd', 'b', 'p', 'p', 'b'];
  return [{ cells: mixed, at: 4, caption: tr('Le seul « d » parmi les « b » et les « p »', 'The only “d” among the “b”s and “p”s') }, flipped];
}

export function IntrusDemo({ level }: { level: number }) {
  const frame = useDemoFrame(6, 700, 1);
  const pressed = frame % 3 >= 1;
  if (level > 20) {
    const advanced = intrusAdvancedDemo(level)[frame < 3 ? 0 : 1];
    const flip = advanced.cells[advanced.at] === 'F';
    return (
      <div className="demo demo--intrus">
        <div className="demo__grid">
          {advanced.cells.map((symbol, cell) => (
            <span key={cell} className={`demo__cell${cell === advanced.at && pressed ? ' is-pressed' : ''}`}>
              <span className="intrus__symbol" style={flip && cell === advanced.at ? { transform: 'scaleY(-1)' } : undefined}>
                {symbol}
              </span>
            </span>
          ))}
        </div>
        <p className="demo__caption">
          {advanced.caption || tr('Le « d » se cache parmi les « b »', 'The “d” is hiding among the “b”s')}
          <Tick show={frame % 3 === 2} />
        </p>
      </div>
    );
  }
  const board = INTRUS_DEMO[frame < 3 ? 0 : 1];
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
        {lang() === 'en' ? (
          <>
            The “{board.odd}” is hiding among the “{board.base}”s
          </>
        ) : (
          <>
            Le « {board.odd} » se cache parmi les « {board.base} »
          </>
        )}
        <Tick show={frame % 3 === 2} />
      </p>
    </div>
  );
}

/** Un mot de cinq lettres par langue : les lettres mélangées, puis l'ordre où on les touche. */
const ANAGRAM_DEMO = {
  fr: { tiles: ['H', 'C', 'I', 'N', 'E'], order: [1, 0, 2, 4, 3] }, // C H I E N
  en: { tiles: ['G', 'T', 'I', 'R', 'E'], order: [1, 2, 0, 4, 3] }, // T I G E R
};

export function AnagrammesDemo() {
  const { tiles: ANAGRAM_TILES, order: ANAGRAM_ORDER } = ANAGRAM_DEMO[lang()];
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

function boutiqueScript(level: number) {
  // Niveaux avancés : la question peut aussi porter sur les entrées ou les sorties.
  const end = level > 20 ? tr('Entrés : 1 · sortis : 2 · reste : 1', 'In: 1 · out: 2 · left: 1') : tr('Il en reste 1', '1 left');
  return [
    { text: tr('Dans la boutique : 2', 'In the shop: 2'), delta: '' },
    { text: tr('Dans la boutique : ?', 'In the shop: ?'), delta: tr('+1 entre', '+1 in') },
    { text: tr('Dans la boutique : ?', 'In the shop: ?'), delta: tr('−2 sortent', '−2 out') },
    { text: end, delta: '' },
  ];
}

export function BoutiqueDemo({ level }: { level: number }) {
  const BOUTIQUE_SCRIPT = boutiqueScript(level);
  const frame = useDemoFrame(BOUTIQUE_SCRIPT.length + 1, 900, 3);
  const step = BOUTIQUE_SCRIPT[Math.min(frame, BOUTIQUE_SCRIPT.length - 1)];
  return (
    <div className="demo">
      <div className="demo-shop">
        <span className="demo-shop__house">{tr('BOUTIQUE', 'SHOP')}</span>
        {step.delta && (
          <span key={frame} className={`demo-shop__delta${step.delta.startsWith('+') ? ' is-in' : ' is-out'}`}>
            {step.delta}
          </span>
        )}
      </div>
      <p className="demo__caption">
        {step.text}
        <Tick show={frame >= 3} />
      </p>
    </div>
  );
}

function diableScript() {
  const before = tr('Résultat d’avant ?', 'Previous answer?');
  return [
    { card: '3 + 4', ask: tr('Retiens…', 'Remember…'), answer: '' },
    { card: '5 × 2', ask: before, answer: '' },
    { card: '5 × 2', ask: before, answer: '7' },
    { card: '9 − 6', ask: before, answer: '10' },
  ];
}

export function DiableDemo() {
  const DIABLE_SCRIPT = diableScript();
  const frame = useDemoFrame(DIABLE_SCRIPT.length + 1, 1000, 2);
  const step = DIABLE_SCRIPT[Math.min(frame, DIABLE_SCRIPT.length - 1)];
  return (
    <div className="demo">
      <div className="demo__screen">
        <span key={step.card} className="demo__big">
          {step.card}
        </span>
      </div>
      <p className="demo__caption">
        {step.ask} {step.answer && <strong>{step.answer}</strong>}
        <Tick show={Boolean(step.answer)} />
      </p>
    </div>
  );
}

const ORDRE_DEMO = [
  { cell: 0, value: 7 },
  { cell: 4, value: 2 },
  { cell: 8, value: 5 },
];

export function OrdreDemo() {
  // 0 : nombres visibles ; 1 : cachés ; 2-4 : on les touche du plus petit au plus grand.
  const frame = useDemoFrame(6, 800, 4);
  const revealed = [2, 5, 7].slice(0, Math.max(0, frame - 1));
  return (
    <div className="demo">
      <div className="demo__grid">
        {Array.from({ length: 9 }, (_, cell) => {
          const item = ORDRE_DEMO.find((d) => d.cell === cell);
          const visible = item && (frame === 0 || revealed.includes(item.value));
          return (
            <span key={cell} className={`demo__cell${item ? '' : ' is-blank'}${item && revealed.includes(item.value) ? ' is-pressed' : ''}`}>
              {visible ? item.value : ''}
            </span>
          );
        })}
      </div>
      <p className="demo__caption">
        {frame === 0 ? tr('Retiens…', 'Remember…') : tr('Du plus petit au plus grand', 'Smallest to largest')}
        <Tick show={frame >= 4} />
      </p>
    </div>
  );
}

export function MonnaieDemo() {
  const frame = useDemoFrame(4, 900, 3);
  return (
    <div className="demo">
      <div className="money-tray money-tray--demo">
        <span className="money money--coin money--v200">
          <span className="money__label">{tr('2 €', denominationLabel(200))}</span>
        </span>
        <span className="money money--coin money--v100">
          <span className="money__label">{tr('1 €', denominationLabel(100))}</span>
        </span>
        <span className="money money--note money--v500">
          <span className="money__label">{tr('5 €', denominationLabel(500))}</span>
        </span>
      </div>
      <p className="demo__caption">
        {frame >= 2 ? tr('= 8 €', `= ${formatEuros(800)}`) : tr('Combien en tout ?', 'How much in total?')}
        <Tick show={frame >= 3} />
      </p>
    </div>
  );
}

export function PluieDemo() {
  const frame = useDemoFrame(5, 750, 3);
  return (
    <div className="demo">
      <div className="demo-rain">
        {frame < 3 && (
          <span className="demo-rain__drop" style={{ top: `${8 + frame * 22}%` }}>
            3 + 4
          </span>
        )}
        {frame >= 3 && <span className="demo-rain__pop" />}
        <span className="demo-rain__water" />
      </div>
      <p className="demo__caption">
        {frame < 2
          ? tr('Tape le résultat avant l’eau', 'Type the answer before it hits the water')
          : frame === 2
            ? '7…'
            : tr('Plouf, résolue !', 'Splash, solved!')}
        <Tick show={frame >= 3} />
      </p>
    </div>
  );
}

const MATCH_SCRIPT: { shape: ShapeKind; answer: '' | 'yes' | 'no' }[] = [
  { shape: 'circle', answer: '' },
  { shape: 'circle', answer: 'yes' },
  { shape: 'square', answer: 'no' },
  { shape: 'square', answer: 'yes' },
];

export function CorrespondanceDemo() {
  const frame = useDemoFrame(MATCH_SCRIPT.length, 1000, 1);
  const step = MATCH_SCRIPT[frame];
  return (
    <div className="demo">
      <div key={frame} className="match-card match-card--demo">
        <Shape card={{ shape: step.shape, filled: true, rotation: 0 }} size={64} />
      </div>
      <p className="demo__caption">
        {step.answer
          ? tr(`Pareille qu’avant ? ${step.answer === 'yes' ? 'Oui' : 'Non'}`, `Same as before? ${step.answer === 'yes' ? 'Yes' : 'No'}`)
          : tr('Retiens la carte', 'Remember the card')}
        <Tick show={Boolean(step.answer)} />
      </p>
    </div>
  );
}

type DemoDir = 'left' | 'right';

/** Démo des niveaux avancés de Flèches : deux images par règle (la rangée, puis la réponse). */
function flechesDemoScript(level: number): { center: DemoDir; flank: DemoDir; cue: string; caption: string }[] {
  if (level > 40) {
    return [
      { center: 'right', flank: 'left', cue: 'nogo', caption: tr('Barrées : ne touche rien', 'Crossed out: don’t tap') },
      { center: 'left', flank: 'right', cue: 'reverse', caption: tr('Encadrées : à l’envers, droite', 'Framed: opposite way, right') },
    ];
  }
  if (level > 30) {
    return [
      { center: 'left', flank: 'left', cue: 'reverse', caption: tr('Encadrées : à l’envers, droite', 'Framed: opposite way, right') },
      { center: 'left', flank: 'right', cue: '', caption: tr('Celle du milieu : à gauche', 'The middle one: left') },
    ];
  }
  return [
    { center: 'left', flank: 'right', cue: 'cue-center', caption: tr('Bleues : celle du milieu, gauche', 'Blue: the middle one, left') },
    { center: 'left', flank: 'right', cue: 'cue-flank', caption: tr('Orange : les voisines, droite', 'Orange: the outer ones, right') },
  ];
}

export function FlechesDemo({ level }: { level: number }) {
  const frame = useDemoFrame(4, 900, 2);
  if (level > 20) {
    const step = flechesDemoScript(level)[frame < 2 ? 0 : 1];
    return (
      <div className="demo">
        <div className={`demo-arrows${step.cue ? ` demo-arrows--${step.cue}` : ''}`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={i === 2 ? 'is-center' : undefined}>
              <Arrow dir={i === 2 ? step.center : step.flank} size={28} />
            </span>
          ))}
        </div>
        <p className="demo__caption">
          {step.caption}
          <Tick show={frame % 2 === 1} />
        </p>
      </div>
    );
  }
  const row: DemoDir[] = frame < 2 ? ['left', 'left', 'right', 'left', 'left'] : ['right', 'right', 'right', 'right', 'right'];
  return (
    <div className="demo">
      <div className="demo-arrows">
        {row.map((dir, i) => (
          <span key={i} className={i === 2 ? 'is-center' : undefined}>
            <Arrow dir={dir} size={28} />
          </span>
        ))}
      </div>
      <p className="demo__caption">
        {tr('Celle du milieu : à droite', 'The middle one: right')}
        <Tick show={frame % 2 === 1} />
      </p>
    </div>
  );
}

export function ReflexeDemo() {
  const frame = useDemoFrame(4, 900, 1);
  const shape: ShapeKind = frame < 2 ? 'circle' : 'square';
  return (
    <div className="demo">
      <div className={`demo-reflex${frame % 2 === 1 && shape === 'circle' ? ' is-tapped' : ''}`}>
        <Shape card={{ shape, filled: true, rotation: 0 }} size={60} />
      </div>
      <p className="demo__caption">
        {shape === 'circle'
          ? frame % 2 === 1
            ? tr('Rond : je touche !', 'Circle: tap!')
            : tr('Un rond…', 'A circle…')
          : frame % 2 === 1
            ? tr('Carré : je me retiens', 'Square: hold back')
            : tr('Un carré…', 'A square…')}
        <Tick show={frame % 2 === 1} />
      </p>
    </div>
  );
}

const DEMO_PIECE: Piece = [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 2],
];

/** Pièce en relief de la démonstration (niveaux 31 et plus) : six cubes, trois coudes. */
const DEMO_SOLID: Solid = [
  [0, 0, 0],
  [1, 0, 0],
  [2, 0, 0],
  [2, 1, 0],
  [2, 1, 1],
  [2, 2, 1],
];

export function RotationDemo({ level }: { level: number }) {
  const frame = useDemoFrame(3, 1000, 2);
  const c = rotationLevel(level);
  // Pièces penchées (niveaux 25 à 30) : les propositions ne sont plus droites.
  const tilts = c.tilt ? [35, -50] : [0, 0];
  const views = useMemo(() => (c.solid ? demoViews(DEMO_SOLID) : null), [c.solid]);
  if (views) {
    const frameSide = solidFrame([views.model, views.same, views.mirror]);
    return (
      <div className="demo">
        <div className="demo-rotation">
          <span className="demo-rotation__model">
            <SolidView solid={views.model} frame={frameSide} size={58} />
          </span>
          <span className={`demo-rotation__option${frame === 2 ? ' is-picked' : ''}`}>
            <SolidView solid={views.same} frame={frameSide} size={50} />
          </span>
          <span className="demo-rotation__option">
            <SolidView solid={views.mirror} frame={frameSide} size={50} />
          </span>
        </div>
        <p className="demo__caption">
          {frame < 2 ? tr('Tournée dans l’espace…', 'Turned in space…') : tr('Celle-ci : l’autre est un reflet', 'This one: the other is a mirror image')}
          <Tick show={frame === 2} />
        </p>
      </div>
    );
  }
  return (
    <div className="demo">
      <div className="demo-rotation">
        <span className="demo-rotation__model">
          <PieceView piece={DEMO_PIECE} span={4} size={58} />
        </span>
        <span className={`demo-rotation__option${frame === 2 ? ' is-picked' : ''}`}>
          <PieceView piece={rotate(DEMO_PIECE, 1)} span={4} size={50} tilt={tilts[0]} />
        </span>
        <span className="demo-rotation__option">
          <PieceView piece={rotate(mirror(DEMO_PIECE), 1)} span={4} size={50} tilt={tilts[1]} />
        </span>
      </div>
      <p className="demo__caption">
        {frame < 2
          ? c.tilt
            ? tr('Penchée, pas retournée…', 'Tilted, not flipped…')
            : tr('Tournée, pas retournée…', 'Rotated, not flipped…')
          : tr('Celle-ci : l’autre est un reflet', 'This one: the other is a mirror image')}
        <Tick show={frame === 2} />
      </p>
    </div>
  );
}

const SUDOKU_DEMO = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1];

export function SudokuDemo() {
  const frame = useDemoFrame(3, 900, 2);
  return (
    <div className="demo">
      <div className="demo-sudoku">
        {SUDOKU_DEMO.map((v, i) => (
          <span
            key={i}
            className={[
              'demo-sudoku__cell',
              i === 15 && frame >= 1 && 'is-selected',
              i % 4 === 1 && 'is-box-right',
              Math.floor(i / 4) === 1 && 'is-box-bottom',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {i === 15 && frame < 2 ? '' : v}
          </span>
        ))}
      </div>
      <p className="demo__caption">
        {frame < 2 ? tr('Il ne manque que…', 'All that’s missing is…') : tr('le 1 !', 'the 1!')}
        <Tick show={frame === 2} />
      </p>
    </div>
  );
}

export function BalanceDemo({ level }: { level: number }) {
  const frame = useDemoFrame(2, 1300, 1);
  const c = balanceLevel(level);
  const look = (i: number) => BALANCE_LOOKS[i];
  // Niveaux 31 et plus : plusieurs exemplaires (0 = rond, 1 = carré). Niveaux 21 à 30 : la balance qui n'apprend rien.
  const scene = c.counts
    ? {
        clue: { left: [1, 1], right: [0, 0, 0], heavier: 'left' as const },
        first: tr('Deux carrés battent trois ronds…', 'Two squares beat three circles…'),
        then: tr('…le carré est plus lourd', '…so the square is heavier'),
      }
    : c.trap
      ? {
          clue: { left: [1, 2], right: [0], heavier: 'left' as const },
          first: tr('Deux objets battent un seul…', 'Two items beat a single one…'),
          then: tr('…ça n’apprend rien', '…that tells you nothing'),
        }
      : {
          clue: { left: [0], right: [1], heavier: 'left' as const },
          first: tr('Le côté qui descend…', 'The side that goes down…'),
          then: tr('…porte le plus lourd', '…holds the heavier one'),
        };
  return (
    <div className="demo">
      <div className="demo-balance">
        <ScaleView clue={scene.clue} look={look} />
      </div>
      <p className="demo__caption">
        {frame === 0 ? scene.first : scene.then}
        <Tick show={frame === 1} />
      </p>
    </div>
  );
}

export function HorlogesDemo({ level }: { level: number }) {
  const frame = useDemoFrame(2, 1300, 1);
  const c = horlogesLevel(level);
  if (c.modes.includes('overnight')) {
    // De 22 h 00 à 1 h 30 : 3 h 30, en passant minuit.
    return (
      <div className="demo">
        <div className="demo-horloges">
          <DayClock time={1320} numerals="quarters" size={70} />
          <Icon name="arrow" size={20} />
          <DayClock time={90} numerals="quarters" size={70} />
        </div>
        <p className="demo__caption">
          {frame === 0 ? tr('Du soir au matin…', 'From PM to AM…') : formatDuration(210)}
          <Tick show={frame === 1} />
        </p>
      </div>
    );
  }
  const roman = c.numerals === 'roman' || c.numerals === 'romanQuarters';
  return (
    <div className="demo">
      <ClockFace time={135} numerals={roman ? c.numerals : 'all'} size={104} mirror={Boolean(c.mirror)} />
      <p className="demo__caption">
        {frame === 0
          ? c.mirror
            ? tr('Dans un miroir…', 'In a mirror…')
            : tr('Quelle heure est-il ?', 'What time is it?')
          : c.mirror
            ? tr(`il est ${formatClock(135)}`, `it’s ${formatClock(135)}`)
            : tr('2 h 15', formatClock(135))}
        <Tick show={frame === 1} />
      </p>
    </div>
  );
}

/** La liste à retenir et les deux mots montrés ensuite (le premier était dans la liste), par langue. */
const MOTS_DEMO = {
  fr: { words: ['vélo', 'pomme', 'violon'], seen: 'pomme', unseen: 'lion' },
  en: { words: ['bike', 'apple', 'violin'], seen: 'apple', unseen: 'lion' },
};

function motsScript() {
  const { seen, unseen } = MOTS_DEMO[lang()];
  return [
    { probe: null, caption: tr('Retiens la liste…', 'Remember the list…') },
    { probe: seen, caption: tr(`${seen} ? Vu !`, `${seen}? Seen!`) },
    { probe: unseen, caption: tr(`${unseen} ? Pas vu !`, `${unseen}? Not seen!`) },
  ];
}

export function MotsDemo() {
  const MOTS_SCRIPT = motsScript();
  const frame = useDemoFrame(MOTS_SCRIPT.length, 1200, 1);
  const step = MOTS_SCRIPT[frame];
  return (
    <div className="demo">
      {step.probe ? (
        <span key={frame} className="demo-probe">
          {step.probe}
        </span>
      ) : (
        <span className="demo-words">
          {MOTS_DEMO[lang()].words.map((word) => (
            <span key={word}>{word}</span>
          ))}
        </span>
      )}
      <p className="demo__caption">
        {step.caption}
        <Tick show={frame > 0} />
      </p>
    </div>
  );
}

/** Un mot à trou par langue : l'indice, le mot, la lettre qui manque, les lettres hésitées. */
const LETTRE_DEMO = {
  fr: { hint: 'Animal de la ferme', word: 'CHEVAL', position: 3, letter: 'V', guess: 'B, V ou R…', answer: 'V : CHEVAL' },
  en: { hint: 'Farm animal', word: 'HORSE', position: 2, letter: 'R', guess: 'R, N or T…', answer: 'R: HORSE' },
};

export function LettreDemo() {
  const demo = LETTRE_DEMO[lang()];
  const frame = useDemoFrame(3, 1000, 2);
  return (
    <div className="demo">
      <span className="demo-hint">{demo.hint}</span>
      <WordTiles question={{ word: demo.word, positions: [demo.position] }} filled={frame === 2 ? demo.letter : undefined} />
      <p className="demo__caption">
        {frame === 0 ? tr('Quelle lettre manque ?', 'Which letter is missing?') : frame === 1 ? demo.guess : demo.answer}
        <Tick show={frame === 2} />
      </p>
    </div>
  );
}

/** Trois fruits et un intrus (le troisième mot), par langue. */
const CATEGORIES_DEMO = {
  fr: ['pomme', 'poire', 'violon', 'cerise'],
  en: ['apple', 'pear', 'violin', 'cherry'],
};

export function CategoriesDemo() {
  const words = CATEGORIES_DEMO[lang()];
  const frame = useDemoFrame(2, 1300, 1);
  return (
    <div className="demo">
      <div className="demo-cats">
        {words.map((word, i) => (
          <span key={word} className={frame === 1 && i === 2 ? 'is-picked' : undefined}>
            {word}
          </span>
        ))}
      </div>
      <p className="demo__caption">
        {frame === 0 ? tr('Trois fruits et…', 'Three fruits and…') : tr('un intrus : le violon !', 'an odd one out: the violin!')}
        <Tick show={frame === 1} />
      </p>
    </div>
  );
}

const PAIRS_DEMO = [0, 1, 0, 1];
const PAIRS_FACES = [
  { shape: 'star' as const, filled: true, color: 3 },
  { shape: 'heart' as const, filled: true, color: 4 },
];
const PAIRS_COLORS = ['var(--d-vitesse)', 'var(--d-langage)'];

export function PairesDemo() {
  const frame = useDemoFrame(5, 750, 4);
  // 0 : tout caché · 1-2 : deux étoiles · 3-4 : la paire reste visible, puis les cœurs.
  const up = [[], [0], [0, 2], [0, 2, 1], [0, 2, 1, 3]][frame];
  return (
    <div className="demo">
      <div className="demo-pairs">
        {PAIRS_DEMO.map((face, card) => (
          <PairCard
            key={card}
            face={PAIRS_FACES[face]}
            up={up.includes(card)}
            found={false}
            color={PAIRS_COLORS[face]}
            label=""
          />
        ))}
      </div>
      <p className="demo__caption">
        {frame < 2 ? tr('Retourne deux cartes…', 'Turn over two cards…') : tr('Deux pareilles : une paire !', 'Two alike: a pair!')}
        <Tick show={frame === 2 || frame === 4} />
      </p>
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
      <p className="demo__caption">{tr('1, 2, 3… jusqu’au bout\u00a0!', '1, 2, 3… all the way!')}</p>
    </div>
  );
}

const COUP_DEMO = [
  [
    { x: 22, y: 20, r: 6 },
    { x: 70, y: 16, r: 5 },
    { x: 46, y: 42, r: 6 },
    { x: 15, y: 62, r: 5 },
    { x: 80, y: 55, r: 6 },
    { x: 58, y: 80, r: 5 },
    { x: 30, y: 86, r: 6 },
  ],
  [
    { x: 45, y: 14, r: 8 },
    { x: 20, y: 40, r: 7 },
    { x: 72, y: 34, r: 8 },
    { x: 82, y: 82, r: 7 },
  ],
];

export function CoupDemo() {
  const frame = useDemoFrame(3, 1100, 2);
  return (
    <div className="demo">
      <div className="demo-coup">
        <DotField groups={COUP_DEMO} hidden={frame > 0} />
      </div>
      <div className="demo-coup__options">
        {COUP_GROUPS.map((g, i) => (
          <span key={g.name} className={frame === 2 && i === 0 ? 'is-picked' : undefined}>
            <i style={{ background: g.color }} />
            {tr(g.more.fr, g.more.en)}
          </span>
        ))}
      </div>
      <p className="demo__caption">
        {frame === 0
          ? tr('Regarde, sans compter…', 'Look, don’t count…')
          : frame === 1
            ? tr('Bleus ou orange ?', 'Blue or orange?')
            : tr('7 bleus contre 4 orange', '7 blue vs 4 orange')}
        <Tick show={frame === 2} />
      </p>
    </div>
  );
}

/** Trois visages ; les prénoms suivent la langue (le premier est celui qu'on cherche). */
const QUI_DEMO = [
  { character: 'pomme' as const, color: 1, names: { fr: 'Léa', en: 'Lucy' } },
  { character: 'citron' as const, color: 0, names: { fr: 'Hugo', en: 'Jack' } },
  { character: 'raisin' as const, color: 2, names: { fr: 'Nina', en: 'Nina' } },
];

export function QuiDemo() {
  const people = QUI_DEMO.map((p) => ({ ...p, name: p.names[lang()] }));
  const frame = useDemoFrame(3, 1300, 2);
  return (
    <div className="demo">
      <div className="demo-qui">
        {people.map((p, i) => (
          <div key={p.name} className={`qui-person${frame === 2 && i === 0 ? ' is-picked' : ''}`}>
            <PersonFace person={p} size={54} />
            <span className="qui-person__name">{frame === 0 ? p.name : ' '}</span>
          </div>
        ))}
      </div>
      <p className="demo__caption">
        {frame === 0
          ? tr('Retiens les prénoms…', 'Remember the names…')
          : frame === 1
            ? tr('Qui est Léa ?', `Who is ${people[0].name}?`)
            : tr('La pomme sur fond orange !', 'The apple on orange!')}
        <Tick show={frame === 2} />
      </p>
    </div>
  );
}

const LECTURE_DEMO = [
  { sentence: { fr: 'Un chat a quatre pattes.', en: 'A cat has four legs.' }, truth: true },
  { sentence: { fr: 'La mer est sucrée.', en: 'The sea is sweet.' }, truth: false },
];

export function LectureDemo() {
  const frame = useDemoFrame(4, 1100, 1);
  const q = LECTURE_DEMO[frame >> 1];
  const answered = frame % 2 === 1;
  return (
    <div className="demo">
      <p className="demo-lecture">{q.sentence[lang()]}</p>
      <div className="demo-lecture__options">
        <span className={answered && q.truth ? 'is-picked' : undefined}>
          <Icon name="check" size={16} strokeWidth={3} />
          {tr('Vrai', 'True')}
        </span>
        <span className={answered && !q.truth ? 'is-picked' : undefined}>
          <Icon name="close" size={16} strokeWidth={3} />
          {tr('Faux', 'False')}
        </span>
      </div>
      <p className="demo__caption">
        {answered
          ? q.truth
            ? tr('Vrai, bien sûr', 'True, of course')
            : tr('Faux : elle est salée', 'False: it’s salty')
          : tr('Vrai ou faux ?', 'True or false?')}
        <Tick show={answered} />
      </p>
    </div>
  );
}

const ITI_DEMO = {
  size: 4,
  start: { col: 0, row: 3 },
  moves: [
    { dir: 'right' as const, steps: 2 },
    { dir: 'up' as const, steps: 1 },
  ],
  path: [
    { col: 0, row: 3 },
    { col: 1, row: 3 },
    { col: 2, row: 3 },
    { col: 2, row: 2 },
  ],
  end: { col: 2, row: 2 },
};

/** Rochers (niveaux 21 à 30 et 41 à 50) : « → 3 », mais un rocher arrête la course après deux cases. */
const ITI_ROCK_DEMO = {
  size: 4,
  start: { col: 0, row: 3 },
  rocks: [{ col: 3, row: 3 }],
  moves: [
    { dir: 'right' as const, steps: 3 },
    { dir: 'up' as const, steps: 1 },
  ],
  path: [
    { col: 0, row: 3 },
    { col: 1, row: 3 },
    { col: 2, row: 3 },
    { col: 2, row: 2 },
  ],
  end: { col: 2, row: 2 },
};

/** Diagonales (niveaux 31 à 40) : « ↗ 2 », puis une case à droite. */
const ITI_DIAGONAL_DEMO = {
  size: 4,
  start: { col: 0, row: 3 },
  moves: [
    { dir: 'upRight' as const, steps: 2 },
    { dir: 'right' as const, steps: 1 },
  ],
  path: [
    { col: 0, row: 3 },
    { col: 1, row: 2 },
    { col: 2, row: 1 },
    { col: 3, row: 1 },
  ],
  end: { col: 3, row: 1 },
};

export function ItiDemo({ level }: { level: number }) {
  const frame = useDemoFrame(3, 1300, 2);
  const c = itiLevel(level);
  const demo = c.rocks ? ITI_ROCK_DEMO : c.diagonal ? ITI_DIAGONAL_DEMO : ITI_DEMO;
  const first = c.rocks
    ? tr('Trois à droite… un rocher\u00a0!', 'Three right… a rock!')
    : c.diagonal
      ? tr('Deux en diagonale, un à droite…', 'Two diagonally, one right…')
      : tr('Deux à droite, un en haut…', 'Two right, one up…');
  return (
    <div className="demo demo-iti">
      <div className="iti__moves">
        {frame === 1 ? <span className="demo__caption">{tr('Où arrive-t-on ?', 'Where do we end up?')}</span> : demo.moves.map((m, i) => <MoveChip key={i} move={m} />)}
      </div>
      <ItiGrid trial={demo} picked={frame === 2 ? demo.end : null} showPath={false} />
      <p className="demo__caption">
        {frame === 0
          ? first
          : frame === 1
            ? c.rocks
              ? tr('On s’arrête devant, puis un en haut', 'Stop in front of it, then one up')
              : tr('Les flèches ont disparu', 'The arrows are gone')
            : tr('Ici !', 'Here!')}
        <Tick show={frame === 2} />
      </p>
    </div>
  );
}
