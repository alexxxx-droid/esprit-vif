import { aiguillagesLevel } from '../../core/games/aiguillages';
import { tr } from '../../core/lang';
import { useLoop, useReducedMotion } from '../hooks';
import { layout } from './aiguillages-layout';
import { Network } from './AiguillagesGame';

/** Quelques images en boucle ; une seule image fixe avec « moins d'animations ». */
function useDemoFrame(frames: number, intervalMs: number, still: number): number {
  const reduced = useReducedMotion();
  const frame = useLoop(frames, intervalMs, !reduced);
  return reduced ? still : frame;
}

/** Démo de l'intro : un train rouge arrive, on bascule l'aiguillage vers la gare rouge, il y entre. */
export function AiguillagesDemo({ level }: { level: number }) {
  const c = { ...aiguillagesLevel(level), depth: 1 as const };
  const { entry, pos } = layout(c);
  const frame = useDemoFrame(4, 800, 2);
  const at = [entry, pos(0), [(pos(0)[0] + pos(2)[0]) / 2, (pos(0)[1] + pos(2)[1]) / 2] as const, pos(2)][frame];
  return (
    <div className="demo">
      <div className="aig aig--demo" aria-hidden="true">
        <Network c={c} stations={[0, 1]} switches={[frame >= 1 ? 1 : 0]} trains={[{ key: 0, color: 1, express: false, at }]} flash={frame === 3 ? { station: 1, ok: true } : null} />
      </div>
      <p className="demo__caption">{frame === 0 ? tr('Un train rouge arrive…', 'A red train is coming…') : tr('… bascule l’aiguillage vers la gare rouge', '… flip the switch to the red station')}</p>
    </div>
  );
}
