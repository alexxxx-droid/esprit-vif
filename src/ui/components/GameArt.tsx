import type { ReactNode } from 'react';
import { GAMES } from '../../core/games/registry';
import type { GameId } from '../../core/types';
import { CONTRAIRES_ART } from './art-contraires';
import { FILATURE_ART } from './art-filature';
import { LUCIOLES_ART } from './art-lucioles';
import { REGLE_ART } from './art-regle';
import { SYMBOLES_ART } from './art-symboles';
import { AIGUILLAGES_ART } from './art-aiguillages';
import { MELES_ART } from './art-meles';
import { COMBIEN_ART } from './art-combien';
import { CODE_ART } from './art-code';
import { MIROIR_ART } from './art-miroir';
import { ECHO_ART } from './art-echo';
import { COMPTE_ART } from './art-compte';
import { SUITES_ART } from './art-suites';

/*
 * Une vignette par jeu, sur la couleur de son domaine : on reconnaît le jeu d'un coup d'œil.
 * Classes : k = encre pleine, ks = trait d'encre, s = voile clair, ss = trait clair,
 * bg = couleur du domaine (pour « percer » une forme), t = lettres et chiffres.
 */
const ART: Record<GameId, ReactNode> = {
  filature: FILATURE_ART,
  lucioles: LUCIOLES_ART,
  contraires: CONTRAIRES_ART,
  regle: REGLE_ART,
  symboles: SYMBOLES_ART,
  aiguillages: AIGUILLAGES_ART,
  motsmeles: MELES_ART,
  combien: COMBIEN_ART,
  code: CODE_ART,
  miroir: MIROIR_ART,
  echo: ECHO_ART,
  compte: COMPTE_ART,
  suites: SUITES_ART,
  calcul: (
    <>
      <rect className="s" x="7" y="15" width="22" height="5.5" rx="2.75" />
      <rect className="s" x="7" y="27.5" width="22" height="5.5" rx="2.75" />
      <path className="k" d="M30 5 17.5 26h8.5l-4 17 14.5-22h-9l4.5-16z" />
    </>
  ),
  total: (
    <>
      <path className="ks" d="M11 19v10M6 24h10" />
      <rect className="s" x="21" y="8" width="19" height="6" rx="3" />
      <rect className="s" x="25" y="17.5" width="15" height="6" rx="3" />
      <rect className="s" x="18" y="27" width="22" height="6" rx="3" />
      <path className="ks" d="M18 38.5h22" />
    </>
  ),
  diable: (
    <>
      <path className="k" d="M14.5 17c-2.6-3.6-2.4-8.4.6-11 .2 3.2 1.8 6.2 4.9 8.2zM33.5 17c2.6-3.6 2.4-8.4-.6-11-.2 3.2-1.8 6.2-4.9 8.2z" />
      <rect className="s" x="10" y="14" width="28" height="28" rx="7" />
      <path className="ks" d="M19.5 24a4.5 4.5 0 1 1 6.6 4c-1.4.8-2.1 1.7-2.1 3.3" />
      <circle className="k" cx="24" cy="36.5" r="2" />
    </>
  ),
  monnaie: (
    <>
      <circle className="k" cx="31" cy="18" r="11" />
      <circle className="bg" cx="19" cy="29" r="12.5" />
      <circle className="s" cx="19" cy="29" r="12.5" />
      <circle className="ks" cx="19" cy="29" r="11" />
      <text className="t" x="19" y="34" fontSize="14" textAnchor="middle">
        €
      </text>
    </>
  ),
  pluie: (
    <>
      <path className="s" d="M11 9c2.6 3.6 4.5 6.2 4.5 8.5a4.5 4.5 0 0 1-9 0C6.5 15.2 8.4 12.6 11 9zM38 13c2.2 3 3.8 5.2 3.8 7.2a3.8 3.8 0 0 1-7.6 0c0-2 1.6-4.2 3.8-7.2z" />
      <path className="k" d="M24 7c4.4 6 7.5 10.2 7.5 14a7.5 7.5 0 0 1-15 0c0-3.8 3.1-8 7.5-14z" />
      <path className="ss" d="M5 39c3-3 5.5-3 8.5 0s5.5 3 8.5 0 5.5-3 8.5 0 5.5 3 8.5 0" />
    </>
  ),
  matrice: (
    <>
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) => {
          const lit = (r === 0 && c === 2) || (r === 1 && c === 0) || (r === 2 && c === 1);
          return <rect key={`${r}${c}`} className={lit ? 'k' : 's'} x={8 + c * 11} y={8 + r * 11} width="9" height="9" rx="2.5" />;
        }),
      )}
    </>
  ),
  nback: (
    <>
      <rect className="s" x="6" y="18" width="15" height="21" rx="4" />
      <rect className="k" x="27" y="18" width="15" height="21" rx="4" />
      <text className="t bgt" x="34.5" y="33" fontSize="12" textAnchor="middle">
        B
      </text>
      <text className="t" x="13.5" y="33" fontSize="12" textAnchor="middle">
        B
      </text>
      <path className="ks" d="M34.5 13c-2.5-6-18-6-21 0M13.5 13l-.8-4.6M13.5 13l4.5-1.4" />
    </>
  ),
  ordre: (
    <>
      <rect className="s" x="7" y="29" width="9" height="11" rx="2.5" />
      <rect className="s" x="19.5" y="20" width="9" height="20" rx="2.5" />
      <rect className="k" x="32" y="9" width="9" height="31" rx="2.5" />
      <path className="ks" d="M8 22 22 12M22 12h-4.5M22 12v4.5" strokeWidth={2.5} />
    </>
  ),
  mots: (
    <>
      <rect className="s" x="8" y="6" width="26" height="34" rx="5" />
      <path className="ks" d="M14 15h14M14 22h14M14 29h8" />
      <circle className="k" cx="34" cy="35" r="8" />
      <path className="bgs" d="M30 35.2l2.8 2.8 4.8-5.4" />
    </>
  ),
  paires: (
    <>
      <g transform="rotate(-9 15 25)">
        <rect className="s" x="5" y="11" width="19" height="27" rx="4.5" />
        <path className="k" d="M14.5 18.5l2 4 4.4.6-3.2 3.1.8 4.4-4-2.1-4 2.1.8-4.4-3.2-3.1 4.4-.6z" />
      </g>
      <g transform="rotate(9 33 25)">
        <rect className="k" x="24" y="11" width="19" height="27" rx="4.5" />
        <path className="bg" d="M33.5 18.5l2 4 4.4.6-3.2 3.1.8 4.4-4-2.1-4 2.1.8-4.4-3.2-3.1 4.4-.6z" />
      </g>
    </>
  ),
  stroop: (
    <>
      <path className="s" d="M8 8h22a4 4 0 0 1 4 4v13a4 4 0 0 1-4 4H17l-6.5 5.5V29H8a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z" />
      <path className="ks" d="M10 15.5h15M10 22h9" />
      <path className="k" d="M36.5 19c3.8 5.2 6.5 8.8 6.5 12.2a6.5 6.5 0 0 1-13 0c0-3.4 2.7-7 6.5-12.2z" />
    </>
  ),
  intrus: (
    <>
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) =>
          r === 1 && c === 2 ? (
            <path key="odd" className="k" d="M36 18.5l6.2 10.5H29.8z" />
          ) : (
            <circle key={`${r}${c}`} className="s" cx={12 + c * 12} cy={12 + r * 12} r="4.6" />
          ),
        ),
      )}
    </>
  ),
  boutique: (
    <>
      <rect className="s" x="10" y="20" width="28" height="21" rx="2.5" />
      <rect className="bg" x="20" y="28" width="8" height="13" rx="1.5" />
      <path className="k" d="M7 20.5 11 9h26l4 11.5c0 2.5-2 4-4.4 4-2.2 0-3.6-1.3-4.3-3-.7 1.7-2.4 3-4.6 3s-3.9-1.3-4.7-3c-.8 1.7-2.5 3-4.7 3s-3.9-1.3-4.6-3c-.7 1.7-2.1 3-4.3 3C9 24.5 7 23 7 20.5z" />
    </>
  ),
  fleches: (
    <>
      <path className="ss" d="M9 19l-4.5 5 4.5 5M17 19l-4.5 5 4.5 5M35 19l-4.5 5 4.5 5M43 19l-4.5 5 4.5 5" />
      <path className="ks" d="M19 24h10.5M25 18.5l5.5 5.5-5.5 5.5" strokeWidth={3.5} />
    </>
  ),
  schulte: (
    <>
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) => <rect key={`${r}${c}`} className="s" x={7.5 + c * 11.5} y={7.5 + r * 11.5} width="10" height="10" rx="2.5" />),
      )}
      <path className="ks" d="M12.5 12.5h23L12.5 24 35.5 35.5" />
      <circle className="k" cx="12.5" cy="12.5" r="3.8" />
    </>
  ),
  correspondance: (
    <>
      <rect className="s" x="4" y="12" width="16" height="24" rx="4" />
      <rect className="s" x="28" y="12" width="16" height="24" rx="4" />
      <circle className="k" cx="12" cy="24" r="5" />
      <circle className="k" cx="36" cy="24" r="5" />
      <path className="ks" d="M21.5 21h5M21.5 27h5" strokeWidth={2.5} />
    </>
  ),
  reflexe: (
    <>
      <circle className="s" cx="21" cy="27" r="14" />
      <circle className="ks" cx="21" cy="27" r="8" />
      <circle className="k" cx="21" cy="27" r="3.2" />
      <path className="ks" d="M34.5 13.5l4.5-4.5M37.5 20h5.5M28 8.5V3" />
    </>
  ),
  anagrammes: (
    <>
      <g transform="rotate(-12 13 17)">
        <rect className="s" x="5" y="9" width="16" height="16" rx="4" />
        <text className="t" x="13" y="22" fontSize="12" textAnchor="middle">
          T
        </text>
      </g>
      <g transform="rotate(8 34 18)">
        <rect className="s" x="26" y="10" width="16" height="16" rx="4" />
        <text className="t" x="34" y="23" fontSize="12" textAnchor="middle">
          O
        </text>
      </g>
      <g transform="rotate(-4 22 34)">
        <rect className="k" x="14" y="26" width="16" height="16" rx="4" />
        <text className="t bgt" x="22" y="39" fontSize="12" textAnchor="middle">
          M
        </text>
      </g>
    </>
  ),
  lettre: (
    <>
      <rect className="s" x="4" y="15" width="12" height="18" rx="3.5" />
      <text className="t" x="10" y="29" fontSize="12" textAnchor="middle">
        C
      </text>
      <rect className="k" x="18" y="15" width="12" height="18" rx="3.5" />
      <text className="t bgt" x="24" y="29" fontSize="12" textAnchor="middle">
        ?
      </text>
      <rect className="s" x="32" y="15" width="12" height="18" rx="3.5" />
      <text className="t" x="38" y="29" fontSize="12" textAnchor="middle">
        T
      </text>
    </>
  ),
  categories: (
    <>
      <rect className="s" x="22" y="6" width="19" height="14" rx="3.5" />
      <rect className="s" x="27" y="27" width="16" height="14" rx="3.5" />
      <path className="k" d="M6 13.5A3.5 3.5 0 0 1 9.5 10H21l12.5 12.5L20 36 6 22z" />
      <circle className="bg" cx="12.5" cy="16.5" r="2.6" />
    </>
  ),
  quiestqui: (
    <>
      <circle className="s" cx="16" cy="18" r="9.5" />
      <circle className="k" cx="13" cy="17" r="1.6" />
      <circle className="k" cx="19" cy="17" r="1.6" />
      <circle className="k" cx="32" cy="21" r="9.5" />
      <circle className="bg" cx="29" cy="20" r="1.6" />
      <circle className="bg" cx="35" cy="20" r="1.6" />
      <rect className="s" x="9" y="33.5" width="30" height="8.5" rx="4.25" />
      <text className="t" x="24" y="40.6" fontSize="8" textAnchor="middle">
        ?
      </text>
    </>
  ),
  itineraire: (
    <>
      {[6, 18, 30].flatMap((y) =>
        [6, 18, 30].map((x) => <rect key={`${x}-${y}`} className="s" x={x} y={y} width="11" height="11" rx="3" />),
      )}
      <path className="ks" d="M11.5 35.5h24V11.5" strokeWidth={3} />
      <path className="ks" d="M31 16l4.5-4.5L40 16" strokeWidth={3} />
      <circle className="k" cx="11.5" cy="35.5" r="4" />
    </>
  ),
  lecture: (
    <>
      <rect className="s" x="5" y="9" width="38" height="5" rx="2.5" />
      <rect className="s" x="5" y="18" width="30" height="5" rx="2.5" />
      <rect className="s" x="5" y="27" width="20" height="5" rx="2.5" />
      <circle className="k" cx="35.5" cy="34.5" r="8.5" />
      <path className="ss" d="M31.5 34.8l2.8 2.8 5.2-5.6" strokeWidth={2.6} />
    </>
  ),
  coupdoeil: (
    <>
      <circle className="k" cx="13" cy="12" r="4.2" />
      <circle className="k" cx="31" cy="9" r="3.6" />
      <circle className="k" cx="22" cy="23" r="4.2" />
      <circle className="k" cx="9" cy="31" r="3.6" />
      <circle className="k" cx="36" cy="27" r="4.2" />
      <circle className="k" cx="27" cy="38" r="3.6" />
      <circle className="s" cx="40" cy="14" r="5" />
      <circle className="s" cx="14" cy="41" r="5" />
      <circle className="s" cx="40" cy="40" r="4.4" />
    </>
  ),
  rotation: (
    <>
      {[
        [7, 7],
        [7, 15],
        [7, 23],
        [15, 23],
      ].map(([x, y]) => (
        <rect key={`a${x}${y}`} className="k" x={x} y={y} width="7" height="7" rx="1.8" />
      ))}
      {[
        [24, 31],
        [32, 31],
        [40, 31],
        [24, 39],
      ].map(([x, y]) => (
        <rect key={`b${x}${y}`} className="s" x={x - 1} y={y - 1} width="7" height="7" rx="1.8" />
      ))}
      <path className="ks" d="M21 9c8.5 0 15 5 16.5 13M37.5 22l-4.3-1.3M37.5 22l1.2-4.4" strokeWidth={2.5} />
    </>
  ),
  balance: (
    <>
      <path className="ss" d="M9 17.5 3.5 28M9 17.5 14.5 28M39 10.5 33.5 21M39 10.5 44.5 21" strokeWidth={1.6} />
      <path className="s" d="M2.5 28h13a6.5 6.5 0 0 1-13 0zM32.5 21h13a6.5 6.5 0 0 1-13 0z" />
      <rect className="k" x="22.5" y="13" width="3" height="25" rx="1.5" />
      <rect className="k" x="15" y="37" width="18" height="4" rx="2" />
      <path className="ks" d="M8 18 40 10" />
      <rect className="k" x="5.5" y="21" width="7" height="7" rx="1.8" />
    </>
  ),
  horloges: (
    <>
      <circle className="s" cx="24" cy="24" r="17" />
      <circle className="ks" cx="24" cy="24" r="17" />
      <path className="ks" d="M24 9.5v3M38.5 24h-3M24 38.5v-3M9.5 24h3" strokeWidth={2.5} />
      <path className="ks" d="M24 24V13.5M24 24l7 4.5" strokeWidth={3.2} />
      <circle className="k" cx="24" cy="24" r="2.6" />
    </>
  ),
  sudoku: (
    <>
      <rect className="s" x="6" y="6" width="36" height="36" rx="6" />
      <rect className="k" x="27" y="27" width="12" height="12" rx="3" />
      <path className="ks" d="M24 6v36M6 24h36" strokeWidth={2.6} />
      <text className="t" x="15" y="20" fontSize="12" textAnchor="middle">
        4
      </text>
      <text className="t" x="33" y="20" fontSize="12" textAnchor="middle">
        1
      </text>
      <text className="t" x="15" y="37.5" fontSize="12" textAnchor="middle">
        2
      </text>
      <text className="t bgt" x="33" y="37.5" fontSize="12" textAnchor="middle">
        3
      </text>
    </>
  ),
};

/** Vignette d'un jeu : décorative, le nom du jeu est toujours écrit à côté. */
export function GameArt({ gameId, size = 48, className }: { gameId: GameId; size?: number; className?: string }) {
  return (
    <span className={`game-art game-art--${GAMES[gameId].domain}${className ? ` ${className}` : ''}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 48 48" width={size * 0.8} height={size * 0.8}>
        {ART[gameId]}
      </svg>
    </span>
  );
}
