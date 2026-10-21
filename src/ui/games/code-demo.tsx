import { codeLevel, type CodeLevel } from '../../core/games/code';
import { tr } from '../../core/lang';
import { useLoop, useReducedMotion } from '../hooks';
import { CodeRow } from './CodeGame';

/** Quelques images en boucle ; une seule image fixe avec « moins d'animations ». */
function useDemoFrame(frames: number, intervalMs: number, still: number): number {
  const reduced = useReducedMotion();
  const frame = useLoop(frames, intervalMs, !reduced);
  return reduced ? still : frame;
}

/** Démo de l'intro : code bleu, vert, rouge ; un premier essai et ses indices, puis le bon. */
export function CodeDemo({ level }: { level: number }) {
  const real = codeLevel(level);
  const c: CodeLevel = { ...real, pegs: 3 };
  const secret = [0, 2, 1];
  const frame = useDemoFrame(3, 1300, 2);
  return (
    <div className="demo">
      <ol className="code__board code__board--3 code__board--demo" aria-hidden="true">
        <CodeRow c={c} secret={secret} guess={[0, 1, 3]} done />
        {frame >= 1 && <CodeRow c={c} secret={secret} guess={[0, 2, 1]} done={frame >= 2} />}
      </ol>
      <p className="demo__caption">
        {frame < 2
          ? c.hints === 'pegs'
            ? tr('✓ bien placé · • présent ailleurs', '✓ right place · • elsewhere')
            : tr('● bien placés · ○ mal placés', '● right place · ○ wrong place')
          : tr('Code trouvé en 2 essais !', 'Cracked in 2 tries!')}
      </p>
    </div>
  );
}
