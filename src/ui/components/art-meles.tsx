import type { ReactNode } from 'react';

/**
 * Vignette de Mots mêlés (mêmes classes que GameArt : k encre pleine, ks trait d'encre, s voile clair) :
 * une grille de lettres et un mot entouré en diagonale.
 */
export const MELES_ART: ReactNode = (
  <>
    {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} className="s" x={7 + c * 12} y={7 + r * 12} width="10" height="10" rx="2.5" />))}
    <rect className="ks" x="4" y="18" width="40" height="12" rx="6" transform="rotate(45 24 24)" />
    <text className="t" x="12" y="15.5" fontSize="8" textAnchor="middle">
      M
    </text>
    <text className="t" x="36" y="39.5" fontSize="8" textAnchor="middle">
      T
    </text>
  </>
);
