import { suitesLevel } from '../../core/games/suites';
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
  typed: string;
  tick: boolean;
}

const FRAMES: readonly Frame[] = [
  { typed: '', tick: false },
  { typed: '1', tick: false },
  { typed: '14', tick: false },
  { typed: '14', tick: true },
];

/** Démo de l'intro : une suite, le nombre manquant tapé puis validé ; deux suites mêlées dès le palier Expert. */
export function SuitesDemo({ level }: { level: number }) {
  const mixed = suitesLevel(level).rules.includes('alt');
  // 2, 5, 8, 11, ? (+3) ; ou deux suites mêlées : 3, 20, 6, 18, 9, 16, ? (+3 et −2).
  const terms = mixed ? [3, 20, 6, 18, 9, 16, 12] : [2, 5, 8, 11, 14];
  const answer = String(terms[terms.length - 1]);
  const step = FRAMES[useDemoFrame(FRAMES.length, 750, 3)];
  const typed = mixed ? { '': '', '1': '1', '14': '12' }[step.typed] : step.typed;
  return (
    <div className="demo">
      <ol className="suites__row suites__row--demo" aria-hidden="true">
        {terms.slice(0, -1).map((t, i) => (
          <li key={i} className="suites__term">
            {t}
          </li>
        ))}
        <li className={`suites__term suites__term--missing${typed ? ' is-typed' : ''}`}>{typed || '?'}</li>
      </ol>
      <p className="demo__caption">
        {mixed ? tr('Un nombre sur deux : deux suites mêlées', 'Every other number: two mixed series') : tr('Trouve le nombre qui manque', 'Find the missing number')}
        <span className={`demo__tick${step.tick && typed === answer ? ' is-on' : ''}`}>
          <Icon name="check" size={20} strokeWidth={3} />
        </span>
      </p>
    </div>
  );
}
