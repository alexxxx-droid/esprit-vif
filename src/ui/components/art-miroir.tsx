import type { ReactNode } from 'react';

/**
 * Vignette de Miroir (mêmes classes que GameArt : k encre pleine, ks trait d'encre, s voile clair) :
 * une figure, le trait du miroir, et son reflet.
 */
export const MIROIR_ART: ReactNode = (
  <>
    <rect className="k" x="8" y="9" width="9" height="9" rx="2" />
    <rect className="k" x="14" y="20" width="9" height="9" rx="2" />
    <rect className="k" x="8" y="31" width="9" height="9" rx="2" />
    <rect className="s" x="31" y="9" width="9" height="9" rx="2" />
    <rect className="s" x="25" y="20" width="9" height="9" rx="2" />
    <rect className="s" x="31" y="31" width="9" height="9" rx="2" />
    <path className="ks" d="M24 5v38" strokeDasharray="3 3" />
  </>
);
