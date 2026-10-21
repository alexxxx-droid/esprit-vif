import type { ReactNode } from 'react';

/**
 * Vignette de Le plus grand ? (mêmes classes que GameArt : k encre pleine, ks trait d'encre, s voile clair) :
 * deux cartes et le signe « plus grand que » entre elles.
 */
export const GRAND_ART: ReactNode = (
  <>
    <rect className="k" x="4" y="12" width="15" height="24" rx="4" />
    <rect className="s" x="29" y="16" width="15" height="16" rx="4" />
    <path className="ks" d="m21 18 6 6-6 6" />
  </>
);
