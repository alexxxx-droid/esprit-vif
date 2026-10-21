import type { ReactNode } from 'react';

/**
 * Vignette de Combien de cubes ? (mêmes classes que GameArt : k encre pleine, ks trait d'encre, s voile clair) :
 * deux cubes en relief, l'un sur l'autre.
 */
export const COMBIEN_ART: ReactNode = (
  <>
    <path className="s" d="M24 6 35 12 24 18 13 12z" />
    <path className="k" d="M13 12v11l11 6V18z" />
    <path className="ks" d="M35 12v11l-11 6V18z" />
    <path className="k" d="M13 25v11l11 6V31z" />
    <path className="ks" d="M35 25v11l-11 6V31zM13 25l11-6 11 6" />
  </>
);
