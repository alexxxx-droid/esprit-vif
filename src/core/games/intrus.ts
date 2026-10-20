import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

export interface IntrusPair {
  base: string;
  odd: string;
  /** 1 = se repère d'un coup d'œil, 3 = demande de l'attention. */
  tier: 1 | 2 | 3;
}

export const INTRUS_PAIRS: readonly IntrusPair[] = [
  { base: 'O', odd: 'Q', tier: 1 },
  { base: 'E', odd: 'F', tier: 1 },
  { base: 'M', odd: 'N', tier: 1 },
  { base: 'C', odd: 'G', tier: 1 },
  { base: 'P', odd: 'R', tier: 1 },
  { base: 'V', odd: 'Y', tier: 1 },
  { base: 'b', odd: 'd', tier: 2 },
  { base: 'p', odd: 'q', tier: 2 },
  { base: '6', odd: '9', tier: 2 },
  { base: 'n', odd: 'u', tier: 2 },
  { base: '3', odd: '8', tier: 2 },
  { base: 'W', odd: 'M', tier: 2 },
  { base: 'c', odd: 'ç', tier: 2 },
  { base: '5', odd: 'S', tier: 3 },
  { base: '2', odd: 'Z', tier: 3 },
  { base: '8', odd: 'B', tier: 3 },
  { base: '0', odd: 'O', tier: 3 },
  { base: 'é', odd: 'è', tier: 3 },
  { base: '6', odd: 'G', tier: 3 },
];

/** Symboles qui ne ressemblent pas à leur reflet : l'intrus est le même symbole, retourné. */
export const INTRUS_MIRROR_CHARS = ['F', 'R', 'L', 'J', 'K', 'N', 'S', 'Z', 'G', 'P', '4', '7', 'E'];

/** Symboles qui changent quand on les met tête en bas : l'intrus est le même symbole, renversé. */
export const INTRUS_FLIP_CHARS = ['F', 'R', 'L', 'J', 'P', 'G', '4', '7', 'A', 'T', 'V', 'Y', 'U'];

/**
 * Symboles sans aucune symétrie : même en tournant, leur reflet reste reconnaissable.
 * Ce sont les seuls utilisés quand les symboles tournent sur eux-mêmes.
 */
export const INTRUS_CHIRAL_CHARS = ['F', 'R', 'L', 'J', 'N', 'S', 'Z', 'G', 'P', '4', '7'];

/** Familles de symboles qui se ressemblent : deux servent de fond, mêlés, le troisième est l'intrus. */
export const INTRUS_FAMILIES: readonly (readonly string[])[] = [
  ['b', 'd', 'p', 'q'],
  ['E', 'F', 'B', 'P', 'R'],
  ['O', 'Q', 'C', 'G', '0'],
  ['M', 'N', 'W', 'H'],
  ['S', '5', '2', 'Z'],
  ['6', '9', '8', '3'],
  ['n', 'u', 'h', 'm'],
  ['V', 'Y', 'X', 'K'],
  ['é', 'è', 'ê', 'e'],
];

/** Teintes des couleurs trompeuses (la couleur ne compte jamais). */
export const INTRUS_HUES = [4, 32, 135, 212, 285];

export const INTRUS_DURATION_MS = 45_000;
export const INTRUS_PENALTY_MS = 2000;
export const INTRUS_MAX_SIZE = 6;
/** Au-delà de 6 × 6, la grille gagne des rangées (6 × 7, 6 × 8) : les cases restent assez grandes pour le doigt. */
export const INTRUS_MAX_ROWS = 8;

export interface IntrusLevel {
  /** Familles de paires utilisées. */
  tiers: number[];
  /** Intrus en miroir. */
  mirror: boolean;
  start: number;
  /** La grille grandit toutes les N trouvailles. */
  growEvery: number;
  /** Symboles inclinés au hasard. */
  tilt: boolean;
  /** Trouvés pour 100 pts. */
  target: number;
  /** Intrus tête en bas. */
  flip: boolean;
  /** Couleurs trompeuses (elles ne comptent pas). */
  colors: boolean;
  /** Tailles mêlées (elles ne comptent pas). */
  sizes: boolean;
  /** Part des grilles où deux symboles de fond sont mêlés : l'intrus est le seul qui n'apparaît qu'une fois. */
  mixed: number;
  /** Rangées au plus (6 : grille carrée ; 7 ou 8 : 6 colonnes). `start` peut aller jusqu'à 8. */
  maxRows: number;
  /** Les symboles tournent sur eux-mêmes (l'intrus est alors toujours un reflet). */
  spin: boolean;
}

type Extras = Partial<Pick<IntrusLevel, 'flip' | 'colors' | 'sizes' | 'mixed' | 'maxRows' | 'spin'>>;

const L = (tiers: number[], mirror: boolean, start: number, growEvery: number, tilt: boolean, target: number, extras: Extras = {}): IntrusLevel => ({
  tiers,
  mirror,
  start,
  growEvery,
  tilt,
  target,
  flip: extras.flip ?? false,
  colors: extras.colors ?? false,
  sizes: extras.sizes ?? false,
  mixed: extras.mixed ?? 0,
  maxRows: extras.maxRows ?? Math.max(INTRUS_MAX_SIZE, start),
  spin: extras.spin ?? false,
});

const FLIP = { flip: true } as const;
const DECOYS = { colors: true, sizes: true } as const;

/**
 * Niveau 1 : la spec (grille de 3 × 3 à 6 × 6, 45 s, 20 trouvés = 100).
 * 21-30 (Expert) : intrus tête en bas, couleurs et tailles trompeuses.
 * 31-40 (Maître) : deux familles de symboles mêlées, grilles de 6 × 7 puis 6 × 8.
 * 41-50 (Légende) : les symboles tournent sur eux-mêmes ; seul le reflet trahit l'intrus.
 */
export const INTRUS_LEVELS: readonly IntrusLevel[] = [
  L([1, 2], false, 3, 5, false, 20),
  L([1, 2, 3], false, 3, 5, false, 20),
  L([1, 2], false, 4, 4, false, 19),
  L([3], false, 3, 5, false, 18),
  L([1, 2], false, 3, 5, true, 18),
  L([], true, 3, 5, false, 18),
  L([2, 3], false, 4, 4, false, 17),
  L([1, 2, 3], false, 3, 4, true, 17),
  L([], true, 4, 4, false, 16),
  L([3], false, 4, 4, true, 16),
  L([1, 2, 3], true, 4, 4, false, 16),
  L([], true, 3, 4, true, 15),
  L([2, 3], false, 5, 3, true, 15),
  L([3], true, 4, 3, false, 15),
  L([], true, 4, 3, true, 14),
  L([1, 2, 3], true, 5, 3, true, 14),
  L([3], false, 5, 3, true, 14),
  L([], true, 5, 3, true, 13),
  L([3], true, 5, 2, true, 13),
  L([3], true, 6, 2, true, 12),
  // Expert : tête en bas, couleurs et tailles trompeuses.
  L([2, 3], false, 4, 3, true, 14, { colors: true }),
  L([], true, 4, 3, true, 14, { colors: true }),
  L([], false, 4, 3, false, 15, FLIP),
  L([3], true, 5, 3, true, 13, { colors: true }),
  L([], true, 5, 3, true, 13, FLIP),
  L([2, 3], false, 5, 3, true, 13, DECOYS),
  L([], true, 5, 2, true, 12, { ...FLIP, colors: true }),
  L([3], true, 6, 3, true, 12, DECOYS),
  L([], true, 6, 3, true, 12, { ...FLIP, ...DECOYS }),
  L([3], true, 6, 2, true, 11, { ...FLIP, ...DECOYS }),
  // Maître : deux familles mêlées, grilles plus hautes.
  L([2, 3], false, 4, 3, true, 13, { mixed: 0.5 }),
  L([3], true, 4, 3, true, 13, { mixed: 0.5, colors: true }),
  L([3], true, 5, 3, true, 12, { mixed: 0.5, maxRows: 7 }),
  L([], true, 5, 3, true, 12, { ...FLIP, mixed: 0.5, colors: true, maxRows: 7 }),
  L([3], true, 5, 3, true, 12, { ...DECOYS, mixed: 0.6, maxRows: 7 }),
  L([], true, 6, 3, true, 11, { ...FLIP, mixed: 0.5, colors: true, maxRows: 8 }),
  L([3], true, 6, 3, true, 11, { ...FLIP, mixed: 0.6, sizes: true, maxRows: 8 }),
  L([], true, 6, 2, true, 11, { ...FLIP, ...DECOYS, mixed: 0.6, maxRows: 8 }),
  L([3], true, 6, 2, true, 10, { ...FLIP, ...DECOYS, mixed: 0.7, maxRows: 8 }),
  L([3], true, 7, 2, true, 10, { ...FLIP, ...DECOYS, mixed: 0.7, maxRows: 8 }),
  // Légende : les symboles tournent (et quelques grilles géantes immobiles).
  L([], true, 4, 3, false, 12, { spin: true, colors: true }),
  L([], true, 5, 3, false, 12, { spin: true, ...FLIP, mixed: 0.4 }),
  L([], true, 5, 3, false, 11, { spin: true, ...FLIP, mixed: 0.5, colors: true, maxRows: 7 }),
  L([3], true, 7, 2, true, 10, { ...FLIP, ...DECOYS, mixed: 0.8, maxRows: 8 }),
  L([], true, 5, 2, false, 11, { spin: true, ...FLIP, ...DECOYS, mixed: 0.5, maxRows: 7 }),
  L([], true, 6, 3, false, 10, { spin: true, ...FLIP, mixed: 0.6, colors: true, maxRows: 8 }),
  L([3], true, 8, 2, true, 9, { ...FLIP, ...DECOYS, mixed: 0.8, maxRows: 8 }),
  L([], true, 6, 2, false, 9, { spin: true, ...FLIP, ...DECOYS, mixed: 0.6, maxRows: 8 }),
  L([], true, 7, 2, false, 8, { spin: true, ...FLIP, ...DECOYS, mixed: 0.7, maxRows: 8 }),
  L([], true, 8, 2, false, 8, { spin: true, ...FLIP, ...DECOYS, mixed: 0.7, maxRows: 8 }),
];

export function intrusLevel(level: number): IntrusLevel {
  return pickLevel(INTRUS_LEVELS, level);
}

const gridLabel = (rows: number) => `${Math.min(INTRUS_MAX_SIZE, rows)} × ${rows}`;

export function intrusLevelLabel(level: number): string {
  const c = intrusLevel(level);
  const mirrors = tr('miroirs', 'mirrors');
  const upside = tr('têtes en bas', 'upside down');
  const turned = c.mirror && c.flip ? tr('miroirs et têtes en bas', 'mirrored or upside down') : c.flip ? upside : c.mirror ? mirrors : '';
  const decoys =
    c.colors && c.sizes
      ? tr('couleurs et tailles trompeuses', 'decoy colors and sizes')
      : c.colors
        ? tr('couleurs trompeuses', 'decoy colors')
        : c.sizes && tr('tailles mêlées', 'mixed sizes');
  const grows = c.maxRows > Math.max(INTRUS_MAX_SIZE, c.start);
  const symbols =
    c.tiers.length === 0
      ? turned
      : c.tiers.includes(1)
        ? c.tiers.includes(3)
          ? tr('symboles variés', 'mixed symbols')
          : tr('symboles faciles', 'easy symbols')
        : tr('symboles trompeurs', 'tricky symbols');
  return [
    c.spin && tr('symboles qui tournent', 'spinning symbols'),
    symbols,
    c.tiers.length > 0 && turned,
    c.mixed > 0 && tr('familles mêlées', 'mixed families'),
    decoys,
    c.tilt && tr('en désordre', 'tilted'),
    grows
      ? tr(`grille ${gridLabel(c.start)} → ${gridLabel(c.maxRows)}`, `grid ${gridLabel(c.start)} → ${gridLabel(c.maxRows)}`)
      : tr(`dès ${gridLabel(c.start)}`, `from ${gridLabel(c.start)}`),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** La règle du niveau, affichée à l'intro. */
export function intrusRule(level: number): string {
  const c = intrusLevel(level);
  const base =
    c.mixed > 0
      ? tr(
          'Trouve le seul symbole qui n’apparaît qu’une fois (deux familles sont mêlées, l’intrus peut être retourné), le plus de fois possible en 45 s.',
          'Find the one symbol that appears only once (two families are mixed, and the odd one may be flipped), as many times as you can in 45 s.',
        )
      : c.flip
        ? tr(
            'Trouve le symbole différent des autres (retourné en miroir ou tête en bas), le plus de fois possible en 45 s.',
            'Find the symbol that’s different from the others (mirrored or upside down), as many times as you can in 45 s.',
          )
        : tr(
            'Trouve le symbole différent des autres (parfois retourné en miroir), le plus de fois possible en 45 s.',
            'Find the symbol that’s different from the others (sometimes it’s mirrored), as many times as you can in 45 s.',
          );
  const decoys =
    c.colors && c.sizes
      ? tr('La couleur et la taille ne comptent pas.', 'Color and size don’t matter.')
      : c.colors
        ? tr('La couleur ne compte pas.', 'Color doesn’t matter.')
        : c.sizes
          ? tr('La taille ne compte pas.', 'Size doesn’t matter.')
          : '';
  const spin = c.spin ? tr('Les symboles tournent : l’intrus est un reflet.', 'The symbols spin: the odd one is a mirror image.') : '';
  return [base, spin, decoys].filter(Boolean).join(' ');
}

/** La grille grandit au fil des réussites : carrée jusqu'à 6 × 6, puis plus haute (6 × 7, 6 × 8) aux niveaux qui le prévoient. */
export function intrusShape(found: number, level: number): { cols: number; rows: number } {
  const c = intrusLevel(level);
  const rows = Math.min(c.maxRows, c.start + Math.floor(found / c.growEvery));
  return { cols: Math.min(INTRUS_MAX_SIZE, rows), rows };
}

/** Nombre de colonnes de la grille. */
export function intrusSize(found: number, level: number): number {
  return intrusShape(found, level).cols;
}

export interface IntrusBoard {
  /** Colonnes. */
  size: number;
  /** Rangées (autant que de colonnes, sauf les grilles de 6 × 7 et 6 × 8). */
  rows: number;
  base: string;
  odd: string;
  oddIndex: number;
  /** L'intrus est le même symbole que les autres, mais retourné en miroir. */
  mirrored: boolean;
  /** L'intrus est le même symbole que les autres, mais tête en bas. */
  flipped: boolean;
  /** Second symbole de fond (familles mêlées), et ses cases. */
  alt: string | null;
  altCells: number[];
  /** Inclinaison de chaque case, en degrés. */
  tilts: number[];
  /** Teinte trompeuse de chaque case. */
  hues: number[] | null;
  /** Taille de chaque symbole (1 = normale). */
  scales: number[] | null;
  /** Rotation continue de chaque symbole : secondes par tour, négatif = sens inverse. */
  spins: number[] | null;
}

/** Ce qu'affiche une case : le symbole et son retournement éventuel. */
export function intrusCell(board: IntrusBoard, cell: number): { symbol: string; mirrored: boolean; flipped: boolean } {
  if (cell === board.oddIndex) return { symbol: board.odd, mirrored: board.mirrored, flipped: board.flipped };
  return { symbol: board.alt !== null && board.altCells.includes(cell) ? board.alt : board.base, mirrored: false, flipped: false };
}

type Symbols = Pick<IntrusBoard, 'base' | 'odd' | 'mirrored' | 'flipped' | 'alt' | 'altCells'>;

const plain = (base: string, odd: string): Symbols => ({ base, odd, mirrored: false, flipped: false, alt: null, altCells: [] });

/** Un symbole retourné (miroir ou tête en bas) parmi ses semblables. */
function turnedSymbols(rng: Rng, c: IntrusLevel, previous: IntrusBoard | undefined): Symbols {
  const flipped = c.flip && (!c.mirror || rng.chance(0.5));
  const chars = c.spin ? INTRUS_CHIRAL_CHARS : flipped ? INTRUS_FLIP_CHARS : INTRUS_MIRROR_CHARS;
  const char = rng.pick(chars.filter((ch) => ch !== previous?.base));
  return { base: char, odd: char, mirrored: !flipped, flipped, alt: null, altCells: [] };
}

/** Deux symboles de fond mêlés (au moins deux fois chacun) ; l'intrus n'apparaît qu'une fois. */
function mixedSymbols(rng: Rng, c: IntrusLevel, count: number, oddIndex: number, previous: IntrusBoard | undefined): Symbols {
  const canTurn = c.mirror || c.flip;
  let symbols: Symbols;
  if (canTurn && (c.spin || rng.chance(0.5))) {
    // L'intrus est un reflet de l'un des deux symboles de fond.
    const turned = turnedSymbols(rng, c, previous);
    const pool = c.spin ? INTRUS_CHIRAL_CHARS : [...INTRUS_MIRROR_CHARS, ...INTRUS_FLIP_CHARS];
    symbols = { ...turned, alt: rng.pick(pool.filter((ch) => ch !== turned.base)) };
  } else {
    const family = rng.pick(INTRUS_FAMILIES.filter((f) => !previous || !f.includes(previous.base)));
    const [base, alt, odd] = rng.shuffle(family);
    symbols = { ...plain(base, odd), alt };
  }
  const others = rng.shuffle(Array.from({ length: count }, (_, i) => i).filter((i) => i !== oddIndex));
  const altCount = Math.max(2, Math.round((others.length * rng.int(35, 50)) / 100));
  return { ...symbols, altCells: others.slice(0, altCount).sort((a, b) => a - b) };
}

export function generateIntrus(rng: Rng, size: number, level: number, previous?: IntrusBoard, rows = size): IntrusBoard {
  const c = intrusLevel(level);
  const count = size * rows;
  const tilts = Array.from({ length: count }, () => (c.tilt ? rng.int(-35, 35) : 0));
  const oddIndex = rng.int(0, count - 1);
  const board = { size, rows, oddIndex, tilts, hues: null, scales: null, spins: null };
  // Les tirages des niveaux 1 à 20 restent les mêmes, dans le même ordre : leurs parties ne changent pas.
  let symbols: Symbols;
  if (c.mixed > 0 && rng.chance(c.mixed)) symbols = mixedSymbols(rng, c, count, oddIndex, previous);
  else if (c.flip && !c.mirror && c.tiers.length === 0) symbols = turnedSymbols(rng, c, previous);
  else if ((c.mirror || c.flip) && (c.tiers.length === 0 || rng.chance(0.5))) {
    if (!c.flip && !c.spin) {
      const char = rng.pick(INTRUS_MIRROR_CHARS.filter((ch) => ch !== previous?.base));
      symbols = { base: char, odd: char, mirrored: true, flipped: false, alt: null, altCells: [] };
    } else symbols = turnedSymbols(rng, c, previous);
  } else {
    const pool = INTRUS_PAIRS.filter(
      (p) => c.tiers.includes(p.tier) && !(previous && [p.base, p.odd].includes(previous.base) && [p.base, p.odd].includes(previous.odd)),
    );
    const pair = rng.pick(pool);
    // Tantôt beaucoup de « b » et un « d », tantôt l'inverse.
    symbols = rng.chance(0.5) ? plain(pair.base, pair.odd) : plain(pair.odd, pair.base);
  }
  return { ...board, ...symbols, ...decorate(rng, c, count, oddIndex) };
}

/** Couleurs, tailles et rotations trompeuses : elles ne désignent jamais l'intrus. */
function decorate(rng: Rng, c: IntrusLevel, count: number, oddIndex: number): Pick<IntrusBoard, 'hues' | 'scales' | 'spins'> {
  let hues: number[] | null = null;
  if (c.colors) {
    hues = Array.from({ length: count }, () => rng.pick(INTRUS_HUES));
    // Jamais une couleur unique sur l'intrus : elle le trahirait.
    if (hues.filter((h) => h === hues![oddIndex]).length === 1) {
      const other = (oddIndex + rng.int(1, count - 1)) % count;
      hues[other] = hues[oddIndex];
    }
  }
  const scales = c.sizes ? Array.from({ length: count }, () => rng.int(76, 118) / 100) : null;
  const spins = c.spin ? Array.from({ length: count }, () => rng.int(7, 13) * (rng.chance(0.5) ? 1 : -1)) : null;
  return { hues, scales, spins };
}

export function scoreIntrus(found: number, level: number): number {
  return countScore(found, 0, intrusLevel(level).target);
}
