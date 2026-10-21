import type { ReactNode } from 'react';

/**
 * Vignette de Changement de règle (mêmes classes que GameArt : k encre pleine, ks trait d'encre, s voile clair) :
 * deux cartes, l'une pleine, l'autre au trait, et la flèche qui passe de l'une à l'autre.
 */
export const REGLE_ART: ReactNode = (
  <>
    <rect className="s" x="5" y="12" width="16" height="22" rx="4" />
    <rect className="ks" x="27" y="12" width="16" height="22" rx="4" />
    <path className="ks" d="M15 6h16l-3-3M33 42H17l3 3" />
    <text className="t" x="13" y="28" fontSize="11" textAnchor="middle">
      7
    </text>
  </>
);
