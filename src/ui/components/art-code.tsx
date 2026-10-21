import type { ReactNode } from 'react';

/**
 * Vignette de Code secret (mêmes classes que GameArt : k encre pleine, ks trait d'encre, s voile clair) :
 * deux lignes d'essais, des pions et leurs indices.
 */
export const CODE_ART: ReactNode = (
  <>
    <circle className="s" cx="10" cy="14" r="5" />
    <circle className="s" cx="22" cy="14" r="5" />
    <circle className="s" cx="34" cy="14" r="5" />
    <circle className="k" cx="10" cy="33" r="5" />
    <circle className="k" cx="22" cy="33" r="5" />
    <circle className="ks" cx="34" cy="33" r="4.4" />
    <path className="ks" d="M41 12.5h3M41 31.5l1.5 1.5 3-3.5" />
  </>
);
