import type { ReactNode } from 'react';

/**
 * Vignette d'Écho (mêmes classes que GameArt : k encre pleine, ks trait d'encre, s voile clair) :
 * quatre touches, l'une allumée, et l'onde de sa note.
 */
export const ECHO_ART: ReactNode = (
  <>
    <rect className="s" x="6" y="6" width="16" height="16" rx="5" />
    <rect className="k" x="26" y="6" width="16" height="16" rx="5" />
    <rect className="s" x="6" y="26" width="16" height="16" rx="5" />
    <rect className="s" x="26" y="26" width="16" height="16" rx="5" />
    <path className="ks" d="M30 33.5c1.5-1.6 3.5-1.6 5 0M28 30.5c2.8-3 6.2-3 9 0" />
  </>
);
