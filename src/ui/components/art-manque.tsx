import type { ReactNode } from 'react';

/**
 * Vignette de Qui manque ? (mêmes classes que GameArt : k encre pleine, ks trait d'encre, s voile clair) :
 * trois formes et une place vide en pointillés.
 */
export const MANQUE_ART: ReactNode = (
  <>
    <circle className="k" cx="14" cy="14" r="7" />
    <path className="k" d="M34 6 42 21H26z" />
    <rect className="k" x="7" y="27" width="14" height="14" rx="2.5" />
    <rect className="ks" x="27" y="27" width="14" height="14" rx="3" strokeDasharray="3 2.5" />
  </>
);
