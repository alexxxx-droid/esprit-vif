import type { ReactNode } from 'react';

/**
 * Vignette de Suites logiques (mêmes classes que GameArt : k encre pleine, ks trait d'encre, s voile clair) :
 * trois marches qui montent, et la quatrième à deviner.
 */
export const SUITES_ART: ReactNode = (
  <>
    <rect className="s" x="5" y="30" width="8" height="12" rx="2.5" />
    <rect className="s" x="15" y="22" width="8" height="20" rx="2.5" />
    <rect className="k" x="25" y="14" width="8" height="28" rx="2.5" />
    <rect className="ks" x="35.5" y="6.5" width="7" height="35" rx="2.5" strokeDasharray="3 2.5" />
    <text className="t" x="39" y="29" fontSize="11" textAnchor="middle">
      ?
    </text>
  </>
);
