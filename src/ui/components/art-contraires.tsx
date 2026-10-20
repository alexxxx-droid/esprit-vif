import type { ReactNode } from 'react';

/** Vignette de Contraires : deux cartes, sombre et claire, une flèche qui monte et une qui descend (mêmes classes que GameArt). */
export const CONTRAIRES_ART: ReactNode = (
  <>
    <rect className="k" x="5" y="9" width="17" height="30" rx="6" />
    <path className="ss" d="M13.5 31V17.5M8.5 22.5l5-5 5 5" strokeWidth={2.8} />
    <rect className="s" x="26" y="9" width="17" height="30" rx="6" />
    <path className="ks" d="M34.5 17v13.5M29.5 25.5l5 5 5-5" strokeWidth={2.8} />
  </>
);
