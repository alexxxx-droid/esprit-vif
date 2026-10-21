import type { ReactNode } from 'react';

/**
 * Vignette de Tours de Hanoï (mêmes classes que GameArt : k encre pleine, ks trait d'encre, s voile clair) :
 * trois piquets et une pile de disques.
 */
export const HANOI_ART: ReactNode = (
  <>
    <path className="ks" d="M10 14v26M24 14v26M38 14v26M4 40h40" />
    <rect className="k" x="3" y="33" width="14" height="5" rx="2.5" />
    <rect className="k" x="5" y="27" width="10" height="5" rx="2.5" />
    <rect className="s" x="33" y="33" width="10" height="5" rx="2.5" />
  </>
);
