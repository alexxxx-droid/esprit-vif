import type { ReactNode } from 'react';

/**
 * Vignette de Labyrinthe éclair (mêmes classes que GameArt : k encre pleine, ks trait d'encre, s voile clair) :
 * des murs et un chemin tracé jusqu'à la sortie.
 */
export const LABYRINTHE_ART: ReactNode = (
  <>
    <rect className="s" x="5" y="5" width="38" height="38" rx="5" />
    <path className="ks" d="M17 5v14M29 17v14M5 31h12M31 43V31h12" />
    <path className="ks" d="M11 11v26h12V23h12v14" />
  </>
);
