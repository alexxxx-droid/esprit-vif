import type { ReactNode } from 'react';

/**
 * Vignette de Lucioles (mêmes classes que GameArt : k encre pleine, ks trait d'encre, s voile clair) :
 * une grille de cases, deux lucioles allumées et leurs rayons.
 */
export const LUCIOLES_ART: ReactNode = (
  <>
    {[0, 1, 2].flatMap((r) =>
      [0, 1, 2].map((c) => <rect key={`${r}${c}`} className="s" x={7 + c * 12} y={7 + r * 12} width="10" height="10" rx="3" />),
    )}
    <circle className="k" cx="24" cy="12" r="4.2" />
    <path className="ks" d="M24 3.5v2M31.5 12h2M16.5 12h-2M29.5 6.5l1.4-1.4M18.5 6.5l-1.4-1.4" />
    <circle className="k" cx="12" cy="36" r="3.4" />
    <path className="ks" d="M5.5 36h1.5M12 42.5V44M17 41l1.1 1.1" />
  </>
);
