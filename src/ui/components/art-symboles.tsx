import type { ReactNode } from 'react';

/**
 * Vignette de Symboles (mêmes classes que GameArt : k encre pleine, ks trait d'encre, s voile clair) :
 * une table de deux symboles et leurs chiffres.
 */
export const SYMBOLES_ART: ReactNode = (
  <>
    <rect className="s" x="5" y="6" width="38" height="16" rx="4" />
    <circle className="k" cx="13" cy="14" r="4.2" />
    <path className="k" d="M29 9.5 34 18h-10z" />
    <text className="t" x="13" y="38" fontSize="12" textAnchor="middle">
      1
    </text>
    <text className="t" x="29" y="38" fontSize="12" textAnchor="middle">
      2
    </text>
    <path className="ks" d="M5 27h38" />
  </>
);
