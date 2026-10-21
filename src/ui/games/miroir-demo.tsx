import { miroirLevel, reflect, type MiroirAxis, type MiroirPuzzle } from '../../core/games/miroir';
import { tr } from '../../core/lang';
import { useLoop, useReducedMotion } from '../hooks';
import { MiroirGrid } from './MiroirGame';

/** Quelques images en boucle ; une seule image fixe avec « moins d'animations ». */
function useDemoFrame(frames: number, intervalMs: number, still: number): number {
  const reduced = useReducedMotion();
  const frame = useLoop(frames, intervalMs, !reduced);
  return reduced ? still : frame;
}

/** Démo de l'intro : une petite figure, et son reflet qui se remplit case par case. */
export function MiroirDemo({ level }: { level: number }) {
  const axes = miroirLevel(level).axes;
  const axis: MiroirAxis = axes.includes('p') ? 'p' : axes.includes('d') ? 'd' : 'v';
  // Des cases du côté de la figure, pour chaque sorte de miroir (grille de 4 × 4).
  const shape = axis === 'd' ? [4, 8, 9] : [0, 5, 9];
  const puzzle: MiroirPuzzle = { axis, size: 4, shape, answer: shape.map((c) => reflect(axis, 4, c)) };
  const shown = useDemoFrame(shape.length + 2, 700, shape.length);
  return (
    <div className="demo">
      <div className="miroir miroir--demo" aria-hidden="true">
        <MiroirGrid puzzle={puzzle} picked={puzzle.answer.slice(0, Math.min(shown, shape.length))} />
      </div>
      <p className="demo__caption">
        {axis === 'p' ? tr('Demi-tour : la figure tourne', 'Half turn: the shape spins') : axis === 'd' ? tr('La diagonale fait miroir', 'The diagonal is the mirror') : tr('Touche le reflet', 'Tap the reflection')}
      </p>
    </div>
  );
}
