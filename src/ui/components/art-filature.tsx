import type { ReactNode } from 'react';

/** Vignette de Filature : un disque suivi (entouré) parmi d'autres, et sa traînée de mouvement. */
export const FILATURE_ART: ReactNode = (
  <>
    <path className="ss" d="M5 40c4-1 8-4 11-9M8 44c5-2 9-6 12-11" />
    <circle className="s" cx="35" cy="12" r="6" />
    <circle className="s" cx="12" cy="17" r="5" />
    <circle className="s" cx="38" cy="38" r="5" />
    <circle className="k" cx="25" cy="28" r="6.5" />
    <circle className="ks" cx="25" cy="28" r="10.5" />
  </>
);
