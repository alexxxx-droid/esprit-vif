import type { ReactNode } from 'react';

/**
 * Vignette de Taquin express (mêmes classes que GameArt : k encre pleine, ks trait d'encre, s voile clair) :
 * une grille de tuiles, une case vide et une tuile qui glisse.
 */
export const TAQUIN_ART: ReactNode = (
  <>
    {[0, 1, 2].flatMap((r) =>
      [0, 1, 2].map((c) =>
        r === 2 && c === 2 ? null : <rect key={`${r}${c}`} className={r === 2 && c === 1 ? 'k' : 's'} x={6 + c * 12.5} y={6 + r * 12.5} width="11" height="11" rx="2.5" />,
      ),
    )}
    <path className="ks" d="M33 37.5h7m-2.5-2.5 2.5 2.5-2.5 2.5" />
  </>
);
