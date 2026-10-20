import { afterEach, describe, expect, it } from 'vitest';
import { setLang } from '../lang';
import { MAX_LEVEL, TIERS } from '../levels';
import { createRng, hashSeed } from '../rng';
import {
  BALANCE_LEVELS,
  balanceLevel,
  balanceLevelLabel,
  balanceTimes,
  deducedAnswer,
  deductionDepth,
  directHeavier,
  generateBalance,
  scoreBalance,
  type BalanceClue,
  type BalanceLevel,
  type BalancePuzzle,
} from './balance';
import { congruentSolids, demoViews, isChiral, mirrorSolid, orientations, picture, readable, sameSolidUpToRotation, TURNS } from './cubes';
import {
  DAY,
  formatClock,
  formatDuration,
  generateHorloges,
  HALF_DAY,
  HORLOGES_LEVELS,
  horlogesLevel,
  horlogesLevelLabel,
  scoreHorloges,
  type HorlogeLevel,
  type HorlogeQuestion,
} from './horloges';
import { follow, generateIti, heading, ITI_LEVELS, itiLevel, itiLevelLabel, scoreIti, type Cell, type ItiLevel, type ItiTrial } from './itineraire';
import {
  congruent,
  generateRotation,
  normalize,
  ROTATION_LEVELS,
  rotationLevel,
  rotationLevelLabel,
  sameUpToRotation,
  scoreRotation,
  type Piece,
  type RotationLevel,
  type RotationPuzzle,
} from './rotation';
import {
  countSolutions,
  deductionWaves,
  generateSudoku,
  peers,
  scoreSudoku,
  solveBySingles,
  sudokuDuration,
  SUDOKU_LEVELS,
  sudokuLevel,
  sudokuLevelLabel,
  type SudokuLevel,
  type SudokuPuzzle,
} from './sudoku';

/**
 * Les cinq jeux de Logique sur 50 niveaux : les niveaux 1 à 20 n'ont pas bougé (empreintes prises
 * avant l'ajout des niveaux 21 à 50), les nouveaux niveaux produisent des énigmes justes, vite, dans
 * les deux langues, et la difficulté monte palier après palier.
 */

const ALL_LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const NEW_LEVELS = ALL_LEVELS.filter((l) => l > 20);
const LANGS: ('fr' | 'en')[] = ['fr', 'en'];

afterEach(() => setLang('fr'));

// ---------- Niveaux 1 à 20 inchangés ----------

const SNAP_SEEDS = [1, 42, 20261020, 987654321];
const h = (v: unknown) => hashSeed(JSON.stringify(v));
/** Seuls les champs d'origine, dans leur ordre d'origine : un champ neuf (vide) ne compte pas. */
const pick = <T extends object>(o: T, keys: string[]) => Object.fromEntries(keys.map((k) => [k, (o as Record<string, unknown>)[k]]));
const cell = (c: Cell) => pick(c, ['col', 'row']);

function fingerprints(): Record<string, number[]> {
  const out: Record<string, number[]> = { rotation: [], balance: [], horloges: [], sudoku: [], itineraire: [] };
  for (let level = 1; level <= 20; level++) {
    out.rotation.push(
      h({
        c: pick(rotationLevel(level), ['size', 'options', 'mirrors', 'target']),
        p: SNAP_SEEDS.map((s) => generateRotation(createRng(s), level).map((p) => pick(p, ['model', 'options', 'kinds', 'answer']))),
        s: [0, 3, 7, 12, 20].flatMap((k) => [0, 2, 5].map((e) => scoreRotation(k, e, level))),
      }),
    );
    out.balance.push(
      h({
        c: pick(balanceLevel(level), ['items', 'asks', 'pairs', 'noise', 'puzzles']),
        t: balanceTimes(level),
        p: SNAP_SEEDS.map((s) =>
          generateBalance(createRng(s), level).map((p) => ({ ...pick(p, ['weights', 'ask', 'answer']), clues: p.clues.map((c) => pick(c, ['left', 'right', 'heavier'])) })),
        ),
        s: [0, 3, 5, 6].flatMap((k) => [10_000, 40_000, 90_000, 200_000].map((ms) => scoreBalance(k, ms, level))),
      }),
    );
    out.horloges.push(
      h({
        c: pick(horlogesLevel(level), ['modes', 'step', 'numerals', 'maxDelta', 'target']),
        p: SNAP_SEEDS.map((s) => generateHorloges(createRng(s), level).map((q) => pick(q, ['mode', 'clock', 'clock2', 'delta', 'options', 'answer']))),
        s: [0, 3, 7, 12, 20].flatMap((k) => [0, 2, 5].map((e) => scoreHorloges(k, e, level))),
      }),
    );
    out.sudoku.push(
      h({
        c: pick(sudokuLevel(level), ['size', 'givens', 'puzzles', 'best', 'worst']),
        p: SNAP_SEEDS.map((s) => generateSudoku(createRng(s), level).map((p) => pick(p, ['size', 'solution', 'given']))),
        s: [20_000, 60_000, 120_000, 300_000].flatMap((ms) => [0, 3].map((e) => scoreSudoku(ms, e, level))),
      }),
    );
    out.itineraire.push(
      h({
        c: pick(itiLevel(level), ['size', 'moves', 'maxSteps', 'oneByOne', 'showMs']),
        p: SNAP_SEEDS.map((s) =>
          generateIti(createRng(s), level).map((t) => ({
            size: t.size,
            start: cell(t.start),
            moves: t.moves.map((m) => pick(m, ['dir', 'steps'])),
            path: t.path.map(cell),
            end: cell(t.end),
          })),
        ),
        s: [0, 4, 8].map((k) => scoreIti(k)),
      }),
    );
  }
  return out;
}

/** Empreintes des niveaux 1 à 20 (paramètres, énigmes tirées pour 4 graines, barèmes), avant les niveaux 21 à 50. */
const SAME_IN_BOTH = {
  rotation: [
    2184844673, 641069369, 3032570865, 1327619412, 2479293466, 1313561945, 1386670878, 3797636358, 1411274306, 3338575926, 3148515996, 1718072189, 1178767969, 3642166533,
    2413962676, 701361686, 3510114500, 609057776, 1176782119, 163780557,
  ],
  balance: [
    2998244158, 3025944622, 1452879329, 3437111037, 197167588, 2637737402, 3884063727, 1992343202, 1492689921, 3474585679, 3067633314, 1052396950, 3140948166, 1105423091,
    486570545, 630483945, 3667915949, 3315325304, 773528293, 928583279,
  ],
  sudoku: [
    2501308970, 1069002160, 343790572, 2672076926, 1444278640, 3506533138, 2087567653, 186279194, 2127327215, 1165587102, 660193997, 4097904903, 2377417293, 184728640,
    4098696511, 1310011990, 248287857, 3779380998, 88455279, 2305826374,
  ],
  itineraire: [
    1568253518, 49273074, 1473935179, 2878827098, 743215656, 584843226, 2526579530, 1123172774, 3430703451, 1555857598, 3371400822, 1421872567, 2816637364, 178708178,
    3627631073, 2871990587, 152079515, 3716663538, 924138701, 298405147,
  ],
};
const BEFORE: Record<'fr' | 'en', Record<string, number[]>> = {
  fr: {
    ...SAME_IN_BOTH,
    horloges: [
      257205446, 1746214338, 432522747, 3188436780, 1575581974, 8750045, 2600208935, 14787706, 1503668397, 1595050932, 1021089832, 2713609802, 469662030, 4240776383,
      3666713251, 1342509863, 1515281661, 1075486543, 3883159776, 909902165,
    ],
  },
  en: {
    ...SAME_IN_BOTH,
    horloges: [
      1461600366, 445782314, 3075216287, 2964333816, 4109097706, 2204043917, 2700840349, 808877920, 2236573337, 3780009758, 2623838928, 807395176, 2467918718, 61310931,
      1010350973, 1607873879, 1545059869, 2839290225, 1382829864, 1423315747,
    ],
  },
};

describe('Logique : les niveaux 1 à 20 restent identiques', () => {
  for (const lang of LANGS) {
    it(`mêmes paramètres, mêmes énigmes pour une graine, mêmes barèmes (${lang})`, () => {
      setLang(lang);
      const now = fingerprints();
      for (const game of Object.keys(BEFORE[lang])) {
        // Les niveaux 1, 10 et 20 d'abord, pour un message clair ; puis tous les autres.
        for (const level of [1, 10, 20]) expect(now[game][level - 1], `${game} niveau ${level}`).toBe(BEFORE[lang][game][level - 1]);
        expect(now[game], game).toEqual(BEFORE[lang][game]);
      }
    });
  }

  it('ne tire rien de neuf aux niveaux 1 à 20 (pas de pièces penchées, de rochers, de miroir…)', () => {
    for (let level = 1; level <= 20; level++) {
      const r = rotationLevel(level);
      expect(r.tilt ?? r.solid).toBeUndefined();
      const b = balanceLevel(level);
      expect(b.chain ?? b.counts ?? b.trap).toBeUndefined();
      const hl = horlogesLevel(level);
      expect(hl.mirror).toBeUndefined();
      expect(hl.modes.every((m) => m === 'read' || m === 'later' || m === 'elapsed')).toBe(true);
      expect(sudokuLevel(level).logic).toBeUndefined();
      const i = itiLevel(level);
      expect(i.rows ?? i.rocks ?? i.diagonal).toBeUndefined();
    }
  });
});

// ---------- Tables de 50 niveaux ----------

describe('Logique : 50 niveaux par jeu', () => {
  it('chaque table a MAX_LEVEL lignes, et chaque niveau son libellé', () => {
    for (const table of [ROTATION_LEVELS, BALANCE_LEVELS, HORLOGES_LEVELS, SUDOKU_LEVELS, ITI_LEVELS]) expect(table).toHaveLength(MAX_LEVEL);
    expect(MAX_LEVEL).toBe(50);
  });

  it('deux niveaux voisins ne se ressemblent jamais tout à fait (libellés distincts, en français et en anglais)', () => {
    const labels = [rotationLevelLabel, balanceLevelLabel, horlogesLevelLabel, sudokuLevelLabel, itiLevelLabel];
    for (const lang of LANGS) {
      setLang(lang);
      for (const label of labels) for (const level of NEW_LEVELS) expect(label(level), `${label.name} ${level}`).not.toBe(label(level - 1));
    }
  });
});

// ---------- Validité des énigmes, niveaux 1 à 50, dans les deux langues ----------

const pieceKey = (piece: Piece) => JSON.stringify(normalize(piece));

function checkRotation(p: RotationPuzzle, c: RotationLevel) {
  expect(p.options).toHaveLength(c.options);
  expect(p.kinds.filter((k) => k === 'same')).toHaveLength(1);
  expect(p.kinds.filter((k) => k === 'mirror')).toHaveLength(c.mirrors);
  expect(p.kinds[p.answer]).toBe('same');
  if (p.solid) {
    expect(c.solid).toBe(true);
    expect(p.model).toHaveLength(c.size);
    expect(isChiral(p.model)).toBe(true);
    expect(readable(p.model)).toBe(true);
    const modelLook = picture(p.model).key;
    const modelLooks = new Set(orientations(p.model).map((o) => picture(o).key));
    const mirrorLooks = new Set(orientations(mirrorSolid(p.model)).map((o) => picture(o).key));
    // Le modèle ne se lit pas comme son propre reflet.
    expect(mirrorLooks.has(modelLook)).toBe(false);
    const looks = p.options.map((o) => picture(o).key);
    expect(new Set(looks).size).toBe(c.options);
    p.options.forEach((option, i) => {
      expect(option).toHaveLength(c.size);
      expect(readable(option)).toBe(true);
      expect(sameSolidUpToRotation(p.model, option)).toBe(i === p.answer);
      if (p.kinds[i] === 'same') {
        expect(looks[i]).not.toBe(modelLook);
        expect(mirrorLooks.has(looks[i])).toBe(false);
      } else {
        expect(modelLooks.has(looks[i])).toBe(false);
        expect(congruentSolids(p.model, option)).toBe(p.kinds[i] === 'mirror');
      }
    });
    return;
  }
  expect(c.solid).toBeUndefined();
  expect(p.model).toHaveLength(c.size);
  expect(pieceKey(p.options[p.answer])).not.toBe(pieceKey(p.model));
  expect(new Set(p.options.map(pieceKey)).size).toBe(c.options);
  p.options.forEach((option, i) => {
    expect(option).toHaveLength(c.size);
    expect(sameUpToRotation(p.model, option)).toBe(i === p.answer);
    if (p.kinds[i] === 'mirror') expect(congruent(p.model, option)).toBe(true);
    if (p.kinds[i] === 'other') expect(congruent(p.model, option)).toBe(false);
  });
  if (c.tilt) {
    expect(p.tilts).toHaveLength(c.options);
    for (const t of p.tilts ?? []) {
      expect(t % 90).not.toBe(0);
      expect(Math.abs(t)).toBeLessThan(90);
    }
  } else expect(p.tilts).toBeUndefined();
}

const informative = (items: number, clue: BalanceClue) => directHeavier(items, [clue]).some((row) => row.some(Boolean));
const repeats = (clue: BalanceClue) => new Set(clue.left).size < clue.left.length || new Set(clue.right).size < clue.right.length;

function checkBalance(p: BalancePuzzle, c: BalanceLevel) {
  const sum = (items: number[]) => items.reduce((s, i) => s + p.weights[i], 0);
  expect(p.weights).toHaveLength(c.items);
  expect(new Set(p.weights).size).toBe(c.items);
  for (const w of p.weights) expect(Number.isInteger(w) && w > 0).toBe(true);
  for (const clue of p.clues) expect(clue.heavier === 'left' ? sum(clue.left) > sum(clue.right) : sum(clue.right) > sum(clue.left)).toBe(true);
  const target = p.ask === 'heaviest' ? Math.max(...p.weights) : Math.min(...p.weights);
  expect(p.weights[p.answer]).toBe(target);
  expect(c.asks).toContain(p.ask);
  expect(deducedAnswer(c.items, p.clues, p.ask)).toBe(p.answer);
  expect(p.clues.length).toBeLessThanOrEqual(c.items + c.noise);
  if (!c.counts) expect(p.clues.some(repeats)).toBe(false);
  if (!c.chain) return;
  // Niveaux 21 et plus : la chaîne a exactement la longueur voulue, la réponse ne classe directement qu'un objet (le leurre).
  expect(deductionDepth(c.items, p.clues, p.ask, p.answer)).toBe(c.chain);
  const direct = directHeavier(c.items, p.clues);
  const beaten = p.ask === 'heaviest' ? direct[p.answer].filter(Boolean).length : direct.filter((row) => row[p.answer]).length;
  expect(beaten).toBe(1);
  const useless = p.clues.filter((clue) => !informative(c.items, clue));
  expect(useless).toHaveLength(c.noise);
  expect(p.clues.length - useless.length).toBeLessThanOrEqual(c.items - 1);
  if (c.trap) {
    // La réponse est du « mauvais » côté d'une balance inutile : le plus lourd en haut, le plus léger en bas.
    const misleading = useless.some((clue) => {
      const heavy = clue.heavier === 'left' ? clue.left : clue.right;
      const light = clue.heavier === 'left' ? clue.right : clue.left;
      return p.ask === 'heaviest' ? light.includes(p.answer) : heavy.includes(p.answer);
    });
    expect(misleading).toBe(true);
  }
}

function checkHorloge(q: HorlogeQuestion, c: HorlogeLevel) {
  expect(c.modes).toContain(q.mode);
  expect(q.options).toHaveLength(4);
  expect(new Set(q.options).size).toBe(4);
  expect(q.clock % c.step).toBe(0);
  if (q.mirror) expect(c.mirror).toBeGreaterThan(0);
  const twelve = Math.min(c.maxDelta, HALF_DAY - Math.max(c.step, 5));
  const answer = q.options[q.answer];
  switch (q.mode) {
    case 'read':
      expect(answer).toBe(formatClock(q.clock));
      if (q.mirror) expect(q.options).toContain(formatClock(HALF_DAY - q.clock));
      break;
    case 'later':
      expect(q.delta).toBeGreaterThan(0);
      expect(q.delta).toBeLessThanOrEqual(twelve);
      expect(answer).toBe(formatClock(q.clock + q.delta));
      if (q.mirror) expect(q.options).toContain(formatClock(HALF_DAY - q.clock + q.delta));
      break;
    case 'earlier':
      expect(q.delta).toBeGreaterThan(0);
      expect(q.delta).toBeLessThanOrEqual(twelve);
      expect(answer).toBe(formatClock(q.clock - q.delta + HALF_DAY));
      // Le piège : avancer au lieu de reculer.
      if (q.delta !== 360) expect(q.options).toContain(formatClock(q.clock + q.delta));
      break;
    case 'elapsed': {
      const d = ((q.clock2 ?? 0) - q.clock + HALF_DAY) % HALF_DAY;
      expect(d).toBeGreaterThan(0);
      expect(d).toBeLessThanOrEqual(twelve);
      expect(answer).toBe(formatDuration(d));
      if (q.mirror) expect(q.options).toContain(formatDuration(HALF_DAY - d));
      break;
    }
    case 'overnight': {
      expect(q.clock).toBeGreaterThanOrEqual(0);
      expect(q.clock).toBeLessThan(DAY);
      const d = ((q.clock2 ?? 0) - q.clock + DAY) % DAY;
      expect(d).toBeGreaterThan(0);
      expect(d).toBeLessThanOrEqual(c.maxDelta);
      expect(c.maxDelta).toBeLessThan(DAY);
      expect(answer).toBe(formatDuration(d));
      // Le piège : oublier qu'on a changé de demi-journée (sauf pour 12 h pile : 0 et 24 h ne sont pas des durées).
      if (d !== HALF_DAY) expect(q.options).toContain(formatDuration(d > HALF_DAY ? d - HALF_DAY : d + HALF_DAY));
      break;
    }
  }
}

function checkSudoku(p: SudokuPuzzle, c: SudokuLevel, level: number) {
  expect(p.size).toBe(c.size);
  expect(p.solution).toHaveLength(c.size * c.size);
  p.solution.forEach((v, i) => {
    expect(v).toBeGreaterThanOrEqual(1);
    expect(v).toBeLessThanOrEqual(c.size);
    for (const peer of peers(c.size, i)) expect(p.solution[peer]).not.toBe(v);
  });
  const grid = p.solution.map((v, i) => (p.given[i] ? v : 0));
  const shown = p.given.filter(Boolean).length;
  if (!c.logic) {
    expect(shown).toBeLessThanOrEqual(c.givens + 2);
    expect(countSolutions(grid, c.size)).toBe(1);
    return;
  }
  // Résoluble pas à pas (donc solution unique), avec exactement les chiffres annoncés.
  expect(shown, `niveau ${level}`).toBe(c.givens);
  expect(solveBySingles(grid, c.size)).toEqual(p.solution);
  expect(deductionWaves(grid, c.size)).toBeGreaterThanOrEqual(c.waves ?? 1);
}

const isDiagonal = (dir: string) => !['up', 'down', 'left', 'right'].includes(dir);

function checkIti(t: ItiTrial, c: ItiLevel) {
  const cols = c.size;
  const rows = c.rows ?? c.size;
  // Des cases d'au moins 40 px sur un écran de 360 px (328 px utiles, 5 px entre les cases).
  expect((328 - (cols - 1) * 5) / cols).toBeGreaterThanOrEqual(40);
  expect(t.size).toBe(cols);
  expect(t.rows ?? t.size).toBe(rows);
  const within = (x: Cell) => x.col >= 0 && x.row >= 0 && x.col < cols && x.row < rows;
  const same = (a: Cell, b: Cell) => a.col === b.col && a.row === b.row;
  const rocks = t.rocks ?? [];
  expect(rocks).toHaveLength(c.rocks ?? 0);
  expect(new Set(rocks.map((r) => `${r.col},${r.row}`)).size).toBe(rocks.length);
  for (const r of rocks) expect(within(r)).toBe(true);
  expect(t.moves).toHaveLength(c.moves);
  let at = t.start;
  let blocked = 0;
  const path: Cell[] = [t.start];
  t.moves.forEach((move, i) => {
    expect(move.steps).toBeGreaterThanOrEqual(1);
    expect(move.steps).toBeLessThanOrEqual(c.maxSteps);
    if (!c.diagonal) expect(isDiagonal(move.dir)).toBe(false);
    const { dc, dr } = heading(move.dir);
    if (i > 0) {
      const prev = heading(t.moves[i - 1].dir);
      expect(dc + prev.dc !== 0 || dr + prev.dr !== 0).toBe(true);
    }
    // La flèche annoncée reste dans la grille ; un rocher peut arrêter la course avant.
    expect(within({ col: at.col + dc * move.steps, row: at.row + dr * move.steps })).toBe(true);
    const cells = follow(at, move, rocks);
    expect(cells.length).toBeGreaterThanOrEqual(1);
    if (cells.length < move.steps) blocked++;
    path.push(...cells);
    at = cells[cells.length - 1];
  });
  expect(t.path).toEqual(path);
  expect(t.end).toEqual(at);
  expect(same(t.end, t.start)).toBe(false);
  for (const x of t.path) {
    expect(within(x)).toBe(true);
    expect(rocks.some((r) => same(r, x))).toBe(false);
  }
  if (rocks.length) {
    expect(blocked).toBeGreaterThanOrEqual(1);
    expect(blocked).toBeLessThanOrEqual(3);
  }
}

describe.each(LANGS)('Logique : des énigmes justes aux 50 niveaux (%s)', (lang) => {
  const seeds = lang === 'fr' ? [3, 1009, 77777] : [12345];

  it('Rotation mentale', () => {
    setLang(lang);
    for (const level of ALL_LEVELS) {
      const c = rotationLevel(level);
      for (const seed of seeds) for (const p of generateRotation(createRng(seed + level), level, c.solid ? 8 : 12)) checkRotation(p, c);
    }
  }, 60_000);

  it('Balance', () => {
    setLang(lang);
    for (const level of ALL_LEVELS) {
      const c = balanceLevel(level);
      for (const seed of [...seeds, seeds[0] + 1, seeds[0] + 2]) {
        const puzzles = generateBalance(createRng(seed * 31 + level), level);
        expect(puzzles).toHaveLength(c.puzzles);
        for (const p of puzzles) checkBalance(p, c);
        if (c.counts) expect(puzzles.some((p) => p.clues.some(repeats))).toBe(true);
      }
    }
  }, 60_000);

  it('Horloges', () => {
    setLang(lang);
    for (const level of ALL_LEVELS) {
      const c = horlogesLevel(level);
      const mirrored = { yes: 0, total: 0 };
      for (const seed of seeds) {
        for (const q of generateHorloges(createRng(seed * 7 + level), level, 40)) {
          checkHorloge(q, c);
          mirrored.total++;
          if (q.mirror) mirrored.yes++;
        }
      }
      if (c.mirror === 1) expect(mirrored.yes).toBe(mirrored.total);
      else if (c.mirror) expect(mirrored.yes).toBeGreaterThan(0);
      else expect(mirrored.yes).toBe(0);
    }
  }, 60_000);

  it('Mini-sudoku', () => {
    setLang(lang);
    for (const level of ALL_LEVELS) {
      const c = sudokuLevel(level);
      for (const seed of seeds) {
        const puzzles = generateSudoku(createRng(seed * 13 + level), level);
        expect(puzzles).toHaveLength(c.puzzles);
        for (const p of puzzles) checkSudoku(p, c, level);
      }
    }
  }, 60_000);

  it('Itinéraire', () => {
    setLang(lang);
    for (const level of ALL_LEVELS) {
      const c = itiLevel(level);
      for (const seed of seeds) for (const t of generateIti(createRng(seed * 17 + level), level)) checkIti(t, c);
    }
  }, 60_000);
});

describe('Logique : contrôles croisés', () => {
  it('les 24 rotations du cube sont distinctes, et le reflet d’une pièce chirale n’en est pas une rotation', () => {
    expect(TURNS).toHaveLength(24);
    expect(new Set(TURNS.map((t) => JSON.stringify(t))).size).toBe(24);
    const screw = [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [2, 1, 0],
      [2, 1, 1],
    ] as const;
    expect(isChiral(screw)).toBe(true);
    expect(orientations(screw)).toHaveLength(24);
    expect(sameSolidUpToRotation(screw, mirrorSolid(screw))).toBe(false);
    expect(congruentSolids(screw, mirrorSolid(screw))).toBe(true);
  });

  it('la pièce de la démo en relief (demos.tsx) donne un modèle, la même pièce tournée et son reflet, sans ambiguïté', () => {
    const demo = [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [2, 1, 0],
      [2, 1, 1],
      [2, 2, 1],
    ] as const;
    expect(isChiral(demo)).toBe(true);
    const views = demoViews(demo);
    expect(views).not.toBeNull();
    if (!views) return;
    expect(sameSolidUpToRotation(views.model, views.same)).toBe(true);
    expect(picture(views.same).key).not.toBe(picture(views.model).key);
    expect(sameSolidUpToRotation(views.model, views.mirror)).toBe(false);
    expect(congruentSolids(views.model, views.mirror)).toBe(true);
  });

  it('les grandes grilles de sudoku ont bien une seule solution (solveur à retour arrière)', () => {
    for (const level of [21, 22, 23, 33, 34, 40, 50]) {
      const [p] = generateSudoku(createRng(level * 101), level);
      const grid = p.solution.map((v, i) => (p.given[i] ? v : 0));
      expect(countSolutions(grid, p.size)).toBe(1);
    }
  }, 30_000);

  it('une balance à exemplaires ne conclut que si le côté lourd a moins d’exemplaires', () => {
    // 2 carrés (1) battent 3 triangles (2) : le carré est plus lourd.
    expect(directHeavier(3, [{ left: [1, 1], right: [2, 2, 2], heavier: 'left' }])[1][2]).toBe(true);
    // 3 triangles battent 2 carrés : on ne sait rien.
    expect(directHeavier(3, [{ left: [2, 2, 2], right: [1, 1], heavier: 'left' }]).flat().some(Boolean)).toBe(false);
    // Deux objets différents qui battent un seul : rien non plus.
    expect(directHeavier(3, [{ left: [0, 1], right: [2], heavier: 'left' }]).flat().some(Boolean)).toBe(false);
  });

  it('un rocher arrête la course juste devant lui', () => {
    const rocks = [{ col: 3, row: 0 }];
    expect(follow({ col: 0, row: 0 }, { dir: 'right', steps: 3 }, rocks)).toEqual([
      { col: 1, row: 0 },
      { col: 2, row: 0 },
    ]);
    expect(follow({ col: 0, row: 2 }, { dir: 'upRight', steps: 2 })).toEqual([
      { col: 1, row: 1 },
      { col: 2, row: 0 },
    ]);
  });
});

// ---------- Vitesse des générateurs ----------

describe('Logique : des générateurs rapides', () => {
  it('chaque partie se tire en moins de 50 ms, à tous les niveaux (médiane de 3 graines)', () => {
    const games: [string, (seed: number, level: number) => unknown][] = [
      ['rotation', (s, l) => generateRotation(createRng(s), l)],
      ['balance', (s, l) => generateBalance(createRng(s), l)],
      ['horloges', (s, l) => generateHorloges(createRng(s), l)],
      ['sudoku', (s, l) => generateSudoku(createRng(s), l)],
      ['itineraire', (s, l) => generateIti(createRng(s), l)],
    ];
    for (const [, generate] of games) generate(1, 50);
    for (const [name, generate] of games) {
      for (const level of ALL_LEVELS) {
        const times = [11, 222, 3333].map((seed) => {
          const t0 = performance.now();
          generate(seed + level, level);
          return performance.now() - t0;
        });
        const median = times.sort((a, b) => a - b)[1];
        expect(median, `${name} niveau ${level}`).toBeLessThan(50);
      }
    }
  }, 120_000);
});

// ---------- Une difficulté qui monte ----------

const tierLevels = TIERS.filter((t) => t.from > 20).map((t) => Array.from({ length: t.to - t.from + 1 }, (_, i) => t.from + i));
const nonDecreasing = (values: number[]) => values.every((v, i) => i === 0 || v >= values[i - 1]);
const nonIncreasing = (values: number[]) => values.every((v, i) => i === 0 || v <= values[i - 1]);

describe('Logique : la difficulté ne redescend pas au sein d’un palier', () => {
  it('Rotation mentale : objectif décroissant, des pièces plates aux pièces en relief', () => {
    expect(nonIncreasing(ALL_LEVELS.slice(0, 20).map((l) => rotationLevel(l).target))).toBe(true);
    for (const levels of tierLevels) {
      expect(nonIncreasing(levels.map((l) => rotationLevel(l).target)), String(levels[0])).toBe(true);
      // Mêmes pièces au sein d'un palier : planes jusqu'à 30, en relief ensuite.
      expect(new Set(levels.map((l) => Boolean(rotationLevel(l).solid))).size).toBe(1);
    }
    for (const levels of tierLevels.slice(1)) expect(nonDecreasing(levels.map((l) => rotationLevel(l).size))).toBe(true);
    expect(rotationLevel(50)).toMatchObject({ size: 10, options: 6, mirrors: 5, solid: true });
  });

  it('Balance : objets, balances inutiles, chaînes et pièges ne font que croître', () => {
    for (const levels of tierLevels) {
      const cs = levels.map(balanceLevel);
      expect(nonDecreasing(cs.map((c) => c.items))).toBe(true);
      expect(nonDecreasing(cs.map((c) => c.noise))).toBe(true);
      expect(nonDecreasing(cs.map((c) => c.chain ?? 0))).toBe(true);
      expect(nonDecreasing(cs.map((c) => Number(c.counts ?? 0) + Number(c.trap ?? 0) + Number(c.pairs)))).toBe(true);
      expect(nonDecreasing(levels.map((l) => balanceTimes(l).best))).toBe(true);
    }
  });

  it('Horloges : objectif décroissant', () => {
    expect(nonIncreasing(ALL_LEVELS.slice(0, 20).map((l) => horlogesLevel(l).target))).toBe(true);
    for (const levels of tierLevels) expect(nonIncreasing(levels.map((l) => horlogesLevel(l).target))).toBe(true);
    expect(horlogesLevel(50)).toMatchObject({ step: 1, numerals: 'none' });
  });

  it('Mini-sudoku : toujours plus long à résoudre, des grilles de plus en plus nues et profondes', () => {
    // Du niveau 20 au niveau 50 (avant, le passage des 4 × 4 au 6 × 6 repartait déjà plus court).
    const from20 = ALL_LEVELS.filter((l) => l >= 20);
    expect(nonDecreasing(from20.map((l) => sudokuLevel(l).best))).toBe(true);
    expect(nonDecreasing(ALL_LEVELS.map((l) => sudokuLevel(l).size))).toBe(true);
    for (const size of [6, 8, 9]) {
      const levels = NEW_LEVELS.filter((l) => sudokuLevel(l).size === size);
      expect(nonIncreasing(levels.map((l) => sudokuLevel(l).givens))).toBe(true);
      expect(nonDecreasing(levels.map((l) => sudokuLevel(l).waves ?? 0))).toBe(true);
    }
    expect(sudokuLevel(50)).toMatchObject({ size: 9, givens: 24 });
  });

  it('Itinéraire : plus de flèches, plus vite, plus de rochers, des grilles plus hautes', () => {
    for (const levels of tierLevels) {
      const cs = levels.map(itiLevel);
      expect(nonDecreasing(cs.map((c) => c.moves))).toBe(true);
      expect(nonIncreasing(cs.map((c) => c.showMs))).toBe(true);
      expect(nonDecreasing(cs.map((c) => c.rocks ?? 0))).toBe(true);
      expect(nonDecreasing(cs.map((c) => c.rows ?? c.size))).toBe(true);
      expect(nonDecreasing(cs.map((c) => c.maxSteps))).toBe(true);
    }
    expect(itiLevel(50)).toMatchObject({ moves: 12, maxSteps: 4, diagonal: true, rocks: 7, rows: 9 });
  });
});

// ---------- Barèmes : la première étoile reste à portée ----------

describe('Logique : barèmes calibrés niveau par niveau', () => {
  it('jeux de 60 s : 60 pts pour 60 % de l’objectif, sans erreur', () => {
    for (const level of ALL_LEVELS) {
      const r = rotationLevel(level).target;
      expect(r).toBeGreaterThanOrEqual(4);
      expect(scoreRotation(Math.ceil(r * 0.6), 0, level)).toBeGreaterThanOrEqual(60);
      expect(scoreRotation(r, 0, level)).toBe(100);
      const hl = horlogesLevel(level).target;
      expect(hl).toBeGreaterThanOrEqual(6);
      expect(scoreHorloges(Math.ceil(hl * 0.6), 0, level)).toBeGreaterThanOrEqual(60);
    }
  });

  it('Balance : tout juste, même lentement, donne la première étoile', () => {
    for (const level of ALL_LEVELS) {
      const { puzzles } = balanceLevel(level);
      const { best, worst } = balanceTimes(level);
      expect(worst).toBe(best * 3);
      expect(scoreBalance(puzzles, worst * 1000, level)).toBe(60);
      expect(scoreBalance(puzzles, best * 1000, level)).toBe(100);
    }
  });

  it('Mini-sudoku : une marge large entre 100 pts et 0 pt, la première étoile vers 40 % de l’écart', () => {
    for (const level of ALL_LEVELS) {
      const { best, worst } = sudokuLevel(level);
      expect(worst / best).toBeGreaterThanOrEqual(2.3);
      expect(scoreSudoku(best * 1000, 0, level)).toBe(100);
      expect(scoreSudoku((best + (worst - best) * 0.4) * 1000, 0, level)).toBe(60);
    }
  });
});

describe('durée annoncée du sudoku', () => {
  it('suit le niveau : une minute au début, un quart d’heure au sommet', () => {
    expect(sudokuDuration(1)).toBe('≈ 1 min');
    expect(sudokuDuration(21)).toBe('≈ 5 min');
    expect(sudokuDuration(MAX_LEVEL)).toBe('≈ 16 min');
  });
});
