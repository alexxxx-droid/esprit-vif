import type { RegleCard } from '../../core/games/regle';
import { tr } from '../../core/lang';
import { useLoop, useReducedMotion } from '../hooks';
import { RegleCardView } from './RegleGame';

/** Quelques images en boucle ; une seule image fixe avec « moins d'animations ». */
function useDemoFrame(frames: number, intervalMs: number, still: number): number {
  const reduced = useReducedMotion();
  const frame = useLoop(frames, intervalMs, !reduced);
  return reduced ? still : frame;
}

const FRAMES: readonly { card: RegleCard; caption: () => string }[] = [
  { card: { rule: 'parite', number: 7, top: true, inverse: false }, caption: () => tr('Bleu : 7 est impair → à gauche', 'Blue: 7 is odd → left') },
  { card: { rule: 'taille', number: 7, top: true, inverse: false }, caption: () => tr('Orange : 7, plus de 5 → à droite', 'Orange: 7 is over 5 → right') },
];

/** Démo de l'intro : le même nombre, deux règles, deux réponses. */
export function RegleDemo() {
  const frame = FRAMES[useDemoFrame(FRAMES.length, 1600, 0)];
  return (
    <div className="demo">
      <div className="regle regle--demo" aria-hidden="true">
        <RegleCardView card={frame.card} placed={false} />
      </div>
      <p className="demo__caption">{frame.caption()}</p>
    </div>
  );
}
