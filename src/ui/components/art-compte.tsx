import type { ReactNode } from 'react';

/**
 * Vignette de Le compte est bon (mêmes classes que GameArt : k encre pleine, ks trait d'encre, s voile clair) :
 * une cible ronde et deux plaques reliées par un signe.
 */
export const COMPTE_ART: ReactNode = (
  <>
    <circle className="ks" cx="34" cy="14" r="9" />
    <circle className="k" cx="34" cy="14" r="3.6" />
    <rect className="s" x="5" y="28" width="14" height="14" rx="3.5" />
    <rect className="s" x="27" y="28" width="14" height="14" rx="3.5" />
    <path className="ks" d="M23 31.5v7M19.5 35h7" />
  </>
);
