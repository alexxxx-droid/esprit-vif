import type { ReactNode } from 'react';
import type { HatId } from '../../core/wardrobe';

/*
 * Les chapeaux du vestiaire, dessinés dans le repère 120 × 120 des compagnons : le haut de la
 * tête est vers y = 26-36, les yeux vers y = 50-68. Aplats sans contour, comme Vif.
 */

const INK = '#1d1838';
const GOLD = '#ffd34d';

/** Petite étoile à quatre branches centrée en (x, y). */
const sparkle = (x: number, y: number, r: number, fill = GOLD) => (
  <path d={`M${x} ${y - r}l${r * 0.32} ${r * 0.68} ${r * 0.68} ${r * 0.32}-${r * 0.68} ${r * 0.32}L${x} ${y + r}l-${r * 0.32}-${r * 0.68}-${r * 0.68}-${r * 0.32} ${r * 0.68}-${r * 0.32}z`} fill={fill} />
);

/** Une feuille de laurier, posée en (x, y) et tournée de `angle` degrés. */
const leaf = (x: number, y: number, angle: number, key: number) => (
  <path key={key} d="M0 0c3-4 9-4 13 0-4 4-10 4-13 0z" fill="#d4a017" transform={`translate(${x} ${y}) rotate(${angle})`} />
);

export const HAT_ART: Record<HatId, ReactNode> = {
  casquette: (
    <>
      <path d="M30 37c0-15 13-25 30-25s30 10 30 25z" fill="#2f6fd6" />
      <path d="M72 33h27c7 0 8 7 1 8-9 1-19 1-28 0z" fill="#1f4ea0" />
      <path d="M60 12v25" stroke="#1f4ea0" strokeWidth="2" />
      <circle cx="60" cy="12.5" r="3" fill="#1f4ea0" />
    </>
  ),
  fleur: (
    <g transform="translate(38 30)">
      <path d="M2 4c6 2 10 8 10 14" stroke="#3fae49" strokeWidth="3" fill="none" strokeLinecap="round" />
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={6.5 * Math.cos((a * Math.PI) / 180)} cy={6.5 * Math.sin((a * Math.PI) / 180)} r="5.2" fill="#ff8fb8" />
      ))}
      <circle r="4" fill={GOLD} />
    </g>
  ),
  noeud: (
    <>
      <path d="M60 26c-9-10-21-10-21 0s12 10 21 0z" fill="#e8414f" />
      <path d="M60 26c9-10 21-10 21 0s-12 10-21 0z" fill="#e8414f" />
      <path d="M52 26c-4-2-8-2-10 0M68 26c4-2 8-2 10 0" stroke="#b8233a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="60" cy="26" r="4.5" fill="#b8233a" />
    </>
  ),
  bonnet: (
    <>
      <path d="M28 38c0-18 14-28 32-28s32 10 32 28z" fill="#e8603c" />
      <path d="M40 18v16M50 13v21M60 11v23M70 13v21M80 18v16" stroke="#c2452a" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="24" y="33" width="72" height="11" rx="5" fill="#c2452a" />
      <circle cx="60" cy="9" r="7" fill="#fff3e0" />
    </>
  ),
  bob: (
    <>
      <path d="M38 35c2-13 10-21 22-21s20 8 22 21z" fill="#7fb069" />
      <rect x="38" y="29" width="44" height="5" fill="#4d7a40" />
      <path d="M24 37c7-4 21-6 36-6s29 2 36 6c2 2 0 6-3 5-10-1-21-2-33-2s-23 1-33 2c-3 1-5-3-3-5z" fill="#5f9150" />
    </>
  ),
  lunettes: (
    <>
      <circle cx="47" cy="59" r="11.5" fill="#ffffff" fillOpacity="0.18" stroke={INK} strokeWidth="3" />
      <circle cx="73" cy="59" r="11.5" fill="#ffffff" fillOpacity="0.18" stroke={INK} strokeWidth="3" />
      <path d="M58.5 57q1.5-2.5 3 0M35.5 57l-9-3M84.5 57l9-3" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  paille: (
    <>
      <path d="M38 34c1-13 9-20 22-20s21 7 22 20c-14 2-30 2-44 0z" fill="#f2d589" />
      <path d="M38 29c14 2 30 2 44 0v5c-14 2-30 2-44 0z" fill="#e76f51" />
      <path d="M12 39c10-6 29-9 48-9s38 3 48 9c3 2 1 6-3 5-14-1-29-2-45-2s-31 1-45 2c-4 1-6-3-3-5z" fill="#e9c46a" />
      <path d="M22 40c12-3 24-4 38-4s26 1 38 4" stroke="#d4a94a" strokeWidth="1.6" fill="none" />
    </>
  ),
  bandana: (
    <>
      <path d="M26 37c8-13 20-19 34-19s26 6 34 19c-10-3-22-4-34-4s-24 1-34 4z" fill="#d62839" />
      <path d="M92 33l12-5-2 10zM92 35l9 8-10 1z" fill="#b51f2e" />
      {[
        [44, 28],
        [56, 24],
        [68, 24],
        [80, 28],
        [50, 31],
        [72, 31],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" fill="#ffffff" />
      ))}
    </>
  ),
  fete: (
    <>
      <path d="M45 35 60 2l15 33z" fill="#8e55c9" />
      <circle cx="58" cy="16" r="2.6" fill={GOLD} />
      <circle cx="65" cy="25" r="2.6" fill="#7fd3ff" />
      <circle cx="53" cy="29" r="2.6" fill="#ff8fb8" />
      <path d="M44 34q16 4 32 0" stroke="#6c3aa5" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="60" cy="3.5" r="4.2" fill="#ff8fb8" />
    </>
  ),
  chantier: (
    <>
      <path d="M30 38c0-16 13-26 30-26s30 10 30 26z" fill="#f4b400" />
      <path d="M55 13h10v24H55z" fill="#ffcf33" />
      <rect x="22" y="35" width="76" height="6" rx="3" fill="#d99a00" />
    </>
  ),
  chat: (
    <>
      <path className="vif__body" d="M31 42 29 10l24 18z" />
      <path className="vif__body" d="M89 42l2-32-24 18z" />
      <path d="M34 34l-1-16 12 9zM86 34l1-16-12 9z" fill="#ff8fa3" />
    </>
  ),
  antennes: (
    <>
      <path d="M50 30 42 9M70 30l8-21" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <circle cx="42" cy="8" r="5" fill={GOLD} />
      <circle cx="78" cy="8" r="5" fill={GOLD} />
      <circle cx="40.5" cy="6.5" r="1.6" fill="#ffffff" />
      <circle cx="76.5" cy="6.5" r="1.6" fill="#ffffff" />
    </>
  ),
  'couronne-fleurs': (
    <>
      <path d="M27 37c10-6 21-9 33-9s23 3 33 9" stroke="#3fae49" strokeWidth="4" fill="none" strokeLinecap="round" />
      {(
        [
          [33, 34, '#ff8fb8'],
          [46, 29.5, GOLD],
          [60, 28, '#9ad1ff'],
          [74, 29.5, '#ff8fb8'],
          [87, 34, GOLD],
        ] as const
      ).map(([x, y, color]) => (
        <g key={x}>
          <circle cx={x} cy={y} r="5.6" fill={color} />
          <circle cx={x} cy={y} r="2" fill="#ffffff" />
        </g>
      ))}
    </>
  ),
  melon: (
    <>
      <path d="M38 33c0-13 10-21 22-21s22 8 22 21z" fill="#4a4a5c" />
      <rect x="38" y="28" width="44" height="5" fill="#6b4f3a" />
      <path d="M28 35c6-3 18-4 32-4s26 1 32 4c2 2 0 6-3 5-9-1-19-2-29-2s-20 1-29 2c-3 1-5-3-3-5z" fill="#3a3a4a" />
      <path d="M44 17c4-3 8-4 12-4" stroke="#6e6e84" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </>
  ),
  fez: (
    <>
      <path d="M44 35l4-25h24l4 25z" fill="#c1272d" />
      <ellipse cx="60" cy="10" rx="12" ry="2.6" fill="#a51f25" />
      <path d="M60 10c7 2 11 9 11 17" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M68 26h6l-1 8h-4z" fill={GOLD} />
    </>
  ),
  cowboy: (
    <>
      <path d="M40 34c-2-10 2-22 8-24 4 4 8 4 12 0 4 4 8 4 12 0 6 2 10 14 8 24z" fill="#b5653a" />
      <rect x="40" y="29" width="40" height="5" fill="#5a2e17" />
      <path d="M10 28c8 10 26 10 50 10s42 0 50-10c3 7-4 15-14 15H24C14 43 7 35 10 28z" fill="#a0522d" />
    </>
  ),
  pirate: (
    <>
      <path d="M36 29c4-12 14-18 24-18s20 6 24 18z" fill="#4a4a5c" />
      <path d="M20 29c10 3 22-6 40-6s30 9 40 6c-4 10-17 14-40 14S24 39 20 29z" fill="#3a3a4a" />
      <circle cx="60" cy="25" r="4" fill="#ffffff" />
      <path d="M53 31l14-3M53 28l14 3" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 30c12 3 24-4 38-4s26 7 38 4" stroke={GOLD} strokeWidth="1.6" fill="none" />
    </>
  ),
  'casque-audio': (
    <>
      <path d="M27 54c0-25 14-40 33-40s33 15 33 40" stroke="#4a4a5c" strokeWidth="6" fill="none" strokeLinecap="round" />
      <rect x="17" y="46" width="14" height="22" rx="6" fill="#e8414f" />
      <rect x="89" y="46" width="14" height="22" rx="6" fill="#e8414f" />
      <rect x="21" y="50" width="6" height="14" rx="3" fill="#b8233a" />
      <rect x="93" y="50" width="6" height="14" rx="3" fill="#b8233a" />
    </>
  ),
  sombrero: (
    <>
      <path d="M42 35c0-15 6-25 18-25s18 10 18 25z" fill="#f0c560" />
      <path d="M42 28l4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4" stroke="#d62839" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <path d="M4 40c10-8 31-10 56-10s46 2 56 10c-8 5-31 7-56 7S12 45 4 40z" fill="#e9b44c" />
      <path d="M9 41c12 3 31 4 51 4s39-1 51-4" stroke="#2a9d8f" strokeWidth="2.5" fill="none" />
    </>
  ),
  viking: (
    <>
      <path d="M33 31c-11-2-17-10-17-23 6 6 13 8 21 10z" fill="#f4ead5" />
      <path d="M87 31c11-2 17-10 17-23-6 6-13 8-21 10z" fill="#f4ead5" />
      <path d="M32 38c0-16 12-26 28-26s28 10 28 26z" fill="#9aa5b1" />
      <path d="M57 12h6v24h-6z" fill="#6c7a89" />
      <rect x="29" y="33" width="62" height="7" rx="3" fill="#6c7a89" />
      {[36, 48, 72, 84].map((x) => (
        <circle key={x} cx={x} cy="36.5" r="1.6" fill="#dfe6f0" />
      ))}
    </>
  ),
  beret: (
    <>
      <path d="M26 33c-1-11 14-19 34-19s37 7 35 15c-1 5-7 7-13 7H36c-6 0-10-1-10-3z" fill="#c1121f" />
      <path d="M60 15l2-7" stroke="#c1121f" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M32 34c10 1 20 2 30 2s18-1 26-3" stroke="#8f0d17" strokeWidth="2" fill="none" />
    </>
  ),
  magicien: (
    <>
      <path d="M36 36c9-10 15-22 20-35 4 11 13 23 27 35z" fill="#3a4fbf" />
      {sparkle(55, 18, 5)}
      {sparkle(66, 28, 3.6)}
      {sparkle(48, 30, 3)}
      <path d="M23 36c10-3 23-4 37-4s27 1 37 4c2 2 0 6-3 6H26c-3 0-5-4-3-6z" fill="#2d3c94" />
    </>
  ),
  couronne: (
    <>
      <path d="M33 37l-4-23 15 10 16-16 16 16 15-10-4 23z" fill="#f5c518" />
      <rect x="33" y="31" width="54" height="7" rx="2" fill="#e0a800" />
      <circle cx="60" cy="34.5" r="3.2" fill="#e63946" />
      <circle cx="45" cy="34.5" r="2.4" fill="#2a9d8f" />
      <circle cx="75" cy="34.5" r="2.4" fill="#2a9d8f" />
      <circle cx="29" cy="13.5" r="3" fill="#fff3b0" />
      <circle cx="60" cy="7.5" r="3" fill="#fff3b0" />
      <circle cx="91" cy="13.5" r="3" fill="#fff3b0" />
    </>
  ),
  laurier: (
    <>
      <path d="M30 48c0-12 10-22 26-25M90 48c0-12-10-22-26-25" stroke="#b8860b" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {[
        leaf(30, 46, -100, 1),
        leaf(31, 38, -75, 2),
        leaf(35, 31, -55, 3),
        leaf(42, 26, -30, 4),
        leaf(50, 23.5, -10, 5),
        leaf(90, 46, -80, 6),
        leaf(89, 38, -105, 7),
        leaf(85, 31, -125, 8),
        leaf(78, 26, -150, 9),
        leaf(70, 23.5, -170, 10),
      ]}
    </>
  ),
  diademe: (
    <>
      <path d="M44 31l4-11 4 9zM68 29l4-9 4 11z" fill="#dfe6f0" />
      <path d="M55 28l5-16 5 16z" fill="#eef2f8" />
      <path d="M29 37c10-6 20-9 31-9s21 3 31 9" stroke="#c0c8d6" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M60 16l5 6-5 6-5-6z" fill="#7fd3ff" />
      <circle cx="48" cy="25" r="1.8" fill="#ff8fb8" />
      <circle cx="72" cy="25" r="1.8" fill="#ff8fb8" />
    </>
  ),
  'bonnet-nuit': (
    <>
      <path d="M28 38c2-17 16-28 34-26 16 2 27 14 37 30-8-2-14-8-18-12 0 4 0 6-2 8z" fill="#1f2a6b" />
      {sparkle(46, 25, 3.4)}
      {sparkle(64, 19, 4)}
      {sparkle(78, 29, 3)}
      <rect x="25" y="33" width="66" height="9" rx="4.5" fill="#f4ead5" />
      <circle cx="99" cy="43" r="6" fill="#f4ead5" />
    </>
  ),
  aviateur: (
    <>
      <path d="M28 47c0-22 14-35 32-35s32 13 32 35v8c-4 2-8 0-8-4v-6H36v6c0 4-4 6-8 4z" fill="#8b5a2b" />
      <rect x="29" y="30" width="62" height="6" fill="#5a3a1c" />
      <circle cx="48" cy="31" r="8" fill="#9ad1ff" stroke="#caa472" strokeWidth="3" />
      <circle cx="72" cy="31" r="8" fill="#9ad1ff" stroke="#caa472" strokeWidth="3" />
      <path d="M44 28l3-3M68 28l3-3" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  toque: (
    <>
      <path d="M37 35V26c-8-2-10-14-2-18 4-6 12-6 16-2 4-6 14-6 18 0 4-4 12-4 16 2 8 4 6 16-2 18v9z" fill="#ffffff" stroke="#d8d4e0" strokeWidth="2" />
      <rect x="37" y="28" width="46" height="8" fill="#f1eef6" stroke="#d8d4e0" strokeWidth="2" />
    </>
  ),
  'haut-de-forme': (
    <>
      <path d="M42 34V8h36v26z" fill="#4a4a5c" />
      <path d="M47 11v12" stroke="#6e6e84" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="42" y="25" width="36" height="6" fill="#8e1b2e" />
      <path d="M28 35c8-2 20-3 32-3s24 1 32 3c2 2 0 6-3 6H31c-3 0-5-4-3-6z" fill="#3a3a4a" />
    </>
  ),
  mortier: (
    <>
      <path d="M40 22v11c6 4 34 4 40 0V22l-20 6z" fill="#3a3a4a" />
      <path d="M60 4l40 12-40 12-40-12z" fill="#4a4a5c" />
      <path d="M60 16l26 6v14" stroke="#f5c518" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M83 35h6l-1 8h-4z" fill="#f5c518" />
      <circle cx="60" cy="16" r="2.4" fill="#f5c518" />
    </>
  ),
  aureole: (
    <>
      <ellipse cx="60" cy="11" rx="23" ry="6.5" fill="none" stroke={GOLD} strokeOpacity="0.35" strokeWidth="9" />
      <ellipse cx="60" cy="11" rx="23" ry="6.5" fill="none" stroke={GOLD} strokeWidth="4.5" />
    </>
  ),
  /* ---------- Collection Premium : plus riches, et quelques étincelles qui scintillent ---------- */
  astronaute: (
    <>
      <circle cx="60" cy="61" r="45" fill="#cfe6ff" fillOpacity="0.22" stroke="#e8f1fb" strokeWidth="4" />
      <path d="M32 34c6-9 15-14 26-15" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M24 92c10 9 22 13 36 13s26-4 36-13l4 6c-11 10-25 15-40 15s-29-5-40-15z" fill="#e8f1fb" />
      <rect x="54" y="105" width="12" height="6" rx="2" fill="#ff8a3d" />
      <path d="M60 16V6" stroke="#e8f1fb" strokeWidth="3" strokeLinecap="round" />
      <circle className="hat__blink" cx="60" cy="5" r="3.4" fill="#ff5a52" />
    </>
  ),
  licorne: (
    <>
      <path d="M34 30l-3-13 11 8zM86 30l3-13-11 8z" fill="#ffd6e5" />
      <path d="M27 37c10-6 21-9 33-9s23 3 33 9" stroke="#b38cf0" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M53 31 60 1l7 30z" fill="#ffd34d" />
      <path d="M55 24l9-3M56 17l7-2.5M57.5 10l5-2" stroke="#e0a800" strokeWidth="2" strokeLinecap="round" />
      <circle cx="40" cy="31.5" r="4" fill="#ff8fb8" />
      <circle cx="80" cy="31.5" r="4" fill="#9ad1ff" />
      <g className="hat__twinkle">{sparkle(76, 12, 4.5, '#ffffff')}</g>
    </>
  ),
  mousquetaire: (
    <>
      <path d="M38 33c0-12 9-19 22-19s22 7 22 19z" fill="#3d2a6b" />
      <path d="M68 18c10-12 26-14 36-8-6 1-12 4-16 8 7-2 14-1 18 3-9 0-17 3-24 9z" fill="#ff8fb8" />
      <path d="M70 22c8-5 18-8 28-8" stroke="#ffffff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <rect x="38" y="28" width="44" height="5" fill="#ffd34d" />
      <path d="M12 36c10-5 28-8 48-8s38 3 48 8c3 2 1 6-3 6-14-1-29-2-45-2s-31 1-45 2c-4 0-6-4-3-6z" fill="#2d1f52" />
    </>
  ),
  'couronne-etoilee': (
    <>
      <path d="M31 37l-2-20 9 7 6-14 7 12 9-18 9 18 7-12 6 14 9-7-2 20z" fill="#ffd34d" />
      <path d="M31 31h58v7H31z" fill="#7b4fd6" />
      <circle cx="45" cy="34.5" r="2.4" fill="#ffffff" />
      <circle cx="60" cy="34.5" r="2.8" fill="#7fd3ff" />
      <circle cx="75" cy="34.5" r="2.4" fill="#ffffff" />
      <g className="hat__twinkle">{sparkle(60, 9, 5, '#ffffff')}</g>
      <g className="hat__twinkle hat__twinkle--late">
        {sparkle(36, 14, 3.4, '#fff3b0')}
        {sparkle(86, 14, 3.4, '#fff3b0')}
      </g>
    </>
  ),
  lapin: (
    <>
      <path d="M44 34C38 22 36 8 42 2c6 4 9 18 8 32z" fill="#ffffff" />
      <path d="M44 30c-3-9-4-18-1-23 3 3 5 13 4 23z" fill="#ffc2d6" />
      <path d="M72 34c4-10 12-18 22-20 3 6-4 16-14 22z" fill="#ffffff" />
      <path d="M75 31c4-6 9-11 15-13 1 4-4 10-11 14z" fill="#ffc2d6" />
      <path d="M30 38c9-6 19-9 30-9s21 3 30 9" stroke="#ff8fb8" strokeWidth="4" fill="none" strokeLinecap="round" />
    </>
  ),
  dragon: (
    <>
      <path d="M26 50c0-24 15-38 34-38s34 14 34 38c-6-6-14-9-20-9H46c-6 0-14 3-20 9z" fill="#3fae49" />
      <path d="M40 16l-6-12 12 7zM80 16l6-12-12 7z" fill="#f4ead5" />
      <path d="M52 13l4-8 4 7 4-7 4 8" fill="#ffd34d" stroke="#ffd34d" strokeWidth="2" strokeLinejoin="round" />
      <path d="M30 44c8-4 18-6 30-6s22 2 30 6" stroke="#2b7a35" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="44" cy="27" r="2.2" fill="#2b7a35" />
      <circle cx="76" cy="27" r="2.2" fill="#2b7a35" />
    </>
  ),
  'arc-en-ciel': (
    <>
      {['#ff5a52', '#ff9a3d', '#ffd34d', '#34c972', '#4f8dff', '#b98cff'].map((color, i) => (
        <path key={color} d={`M${26 + i * 3} 34a${34 - i * 3} ${30 - i * 3} 0 0 1 ${68 - i * 6} 0`} stroke={color} strokeWidth="3.2" fill="none" />
      ))}
      <path d="M14 36c0-5 4-8 8-7 1-4 7-5 9-1 4-1 7 2 6 6 0 3-3 5-6 5H19c-3 0-5-1-5-3z" fill="#ffffff" />
      <path d="M83 36c0-5 4-8 8-7 1-4 7-5 9-1 4-1 7 2 6 6 0 3-3 5-6 5H88c-3 0-5-1-5-3z" fill="#ffffff" />
      <g className="hat__twinkle">{sparkle(60, 2, 3.6, '#ffffff')}</g>
    </>
  ),
  pharaon: (
    <>
      <path d="M24 74c0-14 2-26 8-36 6-12 16-20 28-20s22 8 28 20c6 10 8 22 8 36l-8 4c0-10-2-20-6-28-3-6-12-10-22-10s-19 4-22 10c-4 8-6 18-6 28z" fill="#ffd34d" />
      {[30, 38, 46, 54, 62, 70].map((y) => (
        <path key={y} d={`M${y < 50 ? 30 - (y - 30) * 0.1 : 27} ${y}h8M${y < 50 ? 82 + (y - 30) * 0.1 : 85} ${y}h8`} stroke="#2a5db0" strokeWidth="3.4" strokeLinecap="round" />
      ))}
      <path d="M36 36c8-5 16-7 24-7s16 2 24 7" stroke="#2a5db0" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M60 16c-3 4-3 8 0 12 3-4 3-8 0-12z" fill="#2a5db0" />
      <circle cx="60" cy="22" r="2" fill="#ff5a52" />
    </>
  ),
  /* ---------- Chapeaux de maîtrise : un tous les 5 jeux maîtrisés ---------- */
  'bandeau-maitre': (
    <>
      <path d="M27 36c9-7 20-10 33-10s24 3 33 10l-2 6c-9-5-19-8-31-8s-22 3-31 8z" fill="#c1272d" />
      <path d="M91 38l12-2-4 8zM91 40l9 6-10 1z" fill="#9b1d23" />
      <circle cx="60" cy="31" r="7" fill="#ffd34d" />
      <path d="M60 26.5l1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5z" fill="#e0a800" />
    </>
  ),
  heaume: (
    <>
      <path d="M30 44c0-20 13-32 30-32s30 12 30 32v4H30z" fill="#aab4c0" />
      <path d="M30 40h60v8H30z" fill="#7d8896" />
      <path d="M57 40h6v16c0 2-6 2-6 0z" fill="#7d8896" />
      <path d="M38 22c6-6 13-9 22-9" stroke="#e3e8ee" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M60 12c-2-8 4-12 10-10-4 2-6 6-6 10z" fill="#e63946" />
      <path d="M62 12c4-9 14-10 18-5-6 0-11 2-14 6z" fill="#c1272d" />
    </>
  ),
  'couronne-cristal': (
    <>
      <path d="M32 38l2-16 8 8 6-18 6 14 6-20 6 20 6-14 6 18 8-8 2 16z" fill="#bfe6ff" fillOpacity="0.85" />
      <path d="M48 12l6 14-6 12zM66 12l6 18-6 8zM60 4l6 20-6 14-6-14z" fill="#ffffff" fillOpacity="0.55" />
      <path d="M32 33h56v6H32z" fill="#7fb8e6" />
      <g className="hat__twinkle">{sparkle(60, 4, 4, '#ffffff')}</g>
      <g className="hat__twinkle hat__twinkle--late">{sparkle(86, 18, 3, '#ffffff')}</g>
    </>
  ),
  'chapeau-sage': (
    <>
      <path d="M36 36c6-12 12-24 22-34 2 6 2 10 0 14 8 4 14 10 26 20z" fill="#1f7a5a" />
      <path d="M58 2c4 0 6 2 6 5" stroke="#1f7a5a" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M66 20a6 6 0 1 0 4 9 5 5 0 1 1-4-9z" fill="#ffd34d" />
      {sparkle(50, 24, 3.4)}
      {sparkle(58, 31, 2.6)}
      <path d="M22 36c10-3 24-5 38-5s28 2 38 5c2 2 0 6-3 6H25c-3 0-5-4-3-6z" fill="#145c43" />
      <path d="M36 33c8 1 16 1.6 24 1.6s16-.6 24-1.6" stroke="#ffd34d" strokeWidth="2.4" fill="none" />
    </>
  ),
  'couronne-solaire': (
    <>
      <g className="hat__sun">
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d="M57.5 26 60 9l2.5 17z" fill="#ffb300" transform={`rotate(${-72 + i * 18} 60 44)`} />
        ))}
      </g>
      <path d="M30 38c8-8 18-12 30-12s22 4 30 12l-3 4c-7-6-16-9-27-9s-20 3-27 9z" fill="#ffd34d" />
      <circle cx="60" cy="27" r="6" fill="#ff8a3d" />
      <circle cx="60" cy="27" r="3" fill="#fff3b0" />
    </>
  ),
};
