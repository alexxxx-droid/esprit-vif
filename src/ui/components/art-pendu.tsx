import type { ReactNode } from 'react';

/**
 * Vignette de Pendu express (mêmes classes que GameArt : k encre pleine, ks trait d'encre, s voile clair) :
 * un mot à trous, une lettre trouvée, et le clavier.
 */
export const PENDU_ART: ReactNode = (
  <>
    <path className="ks" d="M6 22h8M18 22h8M30 22h8" />
    <text className="t" x="22" y="19" fontSize="12" textAnchor="middle">
      A
    </text>
    {[0, 1, 2, 3].map((k) => (
      <rect key={k} className={k === 1 ? 'k' : 's'} x={5 + k * 10} y="30" width="8" height="8" rx="2" />
    ))}
  </>
);
