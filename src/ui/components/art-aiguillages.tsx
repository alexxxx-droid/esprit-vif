import type { ReactNode } from 'react';

/**
 * Vignette d'Aiguillages (mêmes classes que GameArt : k encre pleine, ks trait d'encre, s voile clair) :
 * une voie qui se sépare en deux vers deux gares, un train sur la branche choisie.
 */
export const AIGUILLAGES_ART: ReactNode = (
  <>
    <path className="ks" d="M24 4v12l-12 14M24 16l12 14" />
    <rect className="s" x="5" y="33" width="14" height="10" rx="2.5" />
    <rect className="k" x="29" y="33" width="14" height="10" rx="2.5" />
    <circle className="k" cx="30" cy="23" r="4.5" />
  </>
);
