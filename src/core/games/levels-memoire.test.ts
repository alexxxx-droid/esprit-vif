import { afterEach, describe, expect, it } from 'vitest';
import { CLASHING_COLORS as CLASHES } from './quiestqui';
import { setLang, type Lang } from '../lang';
import { MAX_LEVEL } from '../levels';
import { createRng, deriveSeed, hashSeed } from '../rng';
import { categoryOf } from './lexique';
import { generateMatriceRound, generateSequence, MATRICE_LEVELS, MATRICE_MAX_SPAN, matriceLevel, matriceLevelLabel, scoreMatrice } from './matrice';
import { generateMots, MOTS_LEVELS, motsLevel, motsLevelLabel, scoreMots } from './mots';
import { countLures, generateNBack, NBACK_GAP_MS, NBACK_LEVELS, NBACK_TARGETS, nbackLevel, nbackLevelLabel, nbackLoad, scoreNBack, tallyStream } from './nback';
import { generateOrdreRound, ORDRE_LEVELS, ordreLevel, ordreLevelLabel, ordreMaxSpan, scoreOrdre } from './ordre';
import { generatePaires, PAIRES_LEVELS, pairesLevel, pairesLevelLabel, scorePaires, swapSlots } from './paires';
import { generateQui, QUI_LEVELS, quiLevel, quiLevelLabel, scoreQui } from './quiestqui';
import { GAMES } from './registry';

/**
 * Les six jeux de mémoire passent de 20 à 50 niveaux : les niveaux 1 à 20 ne bougent pas (records et
 * test du jour), les niveaux 21 à 50 montent sans jamais redescendre, et la première étoile reste à portée.
 */

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const OLD = LEVELS.slice(0, 20);
/** Du niveau 20 au niveau 50 : la difficulté ne baisse jamais. */
const NEW_FROM_20 = LEVELS.slice(19);
const LANGS: readonly ('fr' | 'en')[] = ['fr', 'en'];
const SEEDS = [1, 7, 2024, 99991];
const fp = (value: unknown) => hashSeed(JSON.stringify(value)).toString(16);

afterEach(() => setLang('fr'));

function inLang<T>(lang: Lang, read: () => T): T {
  setLang(lang);
  try {
    return read();
  } finally {
    setLang('fr');
  }
}

/** Ne baisse jamais (aux arrondis près). */
function expectNonDecreasing(values: readonly number[], what: string) {
  values.forEach((v, i) => {
    if (i > 0) expect(v, `${what} : niveau ${NEW_FROM_20[i]}`).toBeGreaterThanOrEqual(values[i - 1] - 1e-9);
  });
}

function expectNonIncreasing(values: readonly number[], what: string) {
  values.forEach((v, i) => {
    if (i > 0) expect(v, `${what} : niveau ${NEW_FROM_20[i]}`).toBeLessThanOrEqual(values[i - 1] + 1e-9);
  });
}

// ---------- Les niveaux 1 à 20, tels qu'avant le passage à 50 niveaux ----------

const OLD_MATRICE = [[4,800,0],[4,700,0],[4,600,0],[5,750,0],[4,800,1],[5,650,0],[4,500,0],[5,750,1],[4,600,1],[5,550,0],[4,420,0],[5,650,1],[5,480,0],[4,480,1],[5,420,0],[5,550,1],[4,350,0],[5,360,0],[5,450,1],[5,380,1]];
const OLD_NBACK = [[1,'letter',2500,70],[2,'letter',2500,100],[2,'letter',2200,105],[1,'position',2500,80],[2,'position',2500,105],[3,'letter',2500,120],[1,'dual',2700,100],[2,'letter',1900,115],[3,'position',2500,125],[2,'dual',2800,125],[3,'letter',2100,130],[4,'letter',2500,140],[2,'dual',2400,135],[3,'position',2100,135],[3,'dual',2800,150],[4,'letter',2100,150],[4,'position',2500,155],[3,'dual',2400,160],[4,'dual',2800,170],[4,'dual',2400,180]];
const OLD_ORDRE = [[1,9,4,900,0,0],[1,20,4,800,0,0],[1,50,4,750,0,0],[1,9,4,600,0,0],[1,99,4,700,0,0],[1,20,4,800,1,0],[1,50,4,550,0,0],[1,20,4,700,0,1],[1,99,4,500,0,0],[1,50,4,650,1,0],[1,50,4,600,0,1],[1,99,5,550,0,0],[1,99,4,500,1,0],[1,50,4,600,1,1],[1,99,5,450,0,0],[-20,20,4,600,0,0],[1,99,4,500,0,1],[1,99,5,450,1,0],[-50,50,4,500,0,0],[-50,50,4,450,1,1]];
const OLD_MOTS = [[6,15000,'random'],[8,18000,'random'],[8,14000,'random'],[10,20000,'random'],[10,16000,'random'],[8,14000,'category'],[12,22000,'random'],[10,16000,'category'],[12,18000,'random'],[12,18000,'category'],[14,22000,'random'],[14,20000,'category'],[16,24000,'random'],[14,16000,'category'],[16,22000,'category'],[18,26000,'random'],[16,18000,'category'],[18,22000,'category'],[20,26000,'category'],[20,22000,'category']];
const OLD_PAIRES = [[6,3,3000,0,85000],[6,3,1500,0,85000],[8,4,3000,0,100000],[8,4,1500,0,100000],[8,4,0,0,100000],[10,4,3000,0,110000],[10,4,1500,0,110000],[10,4,0,0,110000],[6,3,0,1,85000],[12,4,3000,0,120000],[12,4,1500,0,120000],[8,4,0,1,100000],[12,4,0,0,120000],[10,4,1500,1,110000],[14,4,3000,0,135000],[14,4,1500,0,135000],[12,4,0,1,120000],[14,4,0,0,135000],[14,4,1500,1,135000],[14,4,0,1,135000]];
const OLD_QUI = [[3,1,2600,0,0],[4,1,2500,0,0],[4,1,2200,0.25,0],[5,1,2300,0.25,0],[5,1,2000,0.5,0],[6,1,2100,0.5,0],[6,2,2100,0.5,0],[6,2,1900,0.5,0],[7,2,2000,0.5,0],[7,2,1800,0.5,1],[7,2,1700,0.5,1],[8,2,1800,0.5,1],[8,2,1700,0.5,1],[8,3,1700,0.5,1],[9,2,1700,0.5,1],[9,3,1600,0.5,1],[9,3,1500,0.5,1],[10,3,1500,0.5,1],[10,3,1400,0.5,1],[10,3,1300,0.5,1]];

/** Empreintes des parties générées (4 graines) aux niveaux 1 à 20, relevées avant le passage à 50 niveaux. */
const FINGERPRINTS: Record<'fr' | 'en', Record<string, string[]>> = {
  fr: {
    matrice: ['462fda22','462fda22','462fda22','182d5f24','462fda22','182d5f24','462fda22','182d5f24','462fda22','182d5f24','462fda22','182d5f24','182d5f24','462fda22','182d5f24','182d5f24','462fda22','182d5f24','182d5f24','182d5f24'],
    nback: ['c6d8c7e2','20ae52cb','20ae52cb','ebaec421','4298f366','807b01b7','b3ff380d','20ae52cb','b3e5c0d6','b4b1fd6d','807b01b7','7e6dca18','b4b1fd6d','b3e5c0d6','9e87d665','7e6dca18','12a63ce1','9e87d665','57a3d16b','57a3d16b'],
    ordre: ['1677472f','40e6a12a','b198a23d','1677472f','81692af9','8ec5ffb2','b198a23d','40e6a12a','81692af9','e6d258a5','b198a23d','aa578c35','db91e349','e6d258a5','aa578c35','539a0610','81692af9','bcfebd7b','b5d94620','d9d4d1a0'],
    mots: ['fae9460','8ff54a0f','8ff54a0f','949d1814','949d1814','5448b1d1','2f3271c8','119ab355','2f3271c8','ddb4f5c3','14266d20','29e74665','9ecf87f9','29e74665','b27dfba0','ba82fdd7','b27dfba0','e1fba3e6','1f87bca9','1f87bca9'],
    paires: ['4260d7d0','4260d7d0','b049d869','b049d869','b049d869','63f26d07','63f26d07','63f26d07','267d5dd','24b9ffbb','24b9ffbb','f2fa8411','24b9ffbb','4f073c71','ad54a669','ad54a669','c6c34030','ad54a669','e644273','e644273'],
    quiestqui: ['96aaa154','8405ee01','cce0721d','e709f761','e2a00e23','2ad2176','ee30ec83','ee30ec83','281265c6','a5121597','a5121597','3b40e9b3','3b40e9b3','b4aff14d','cbf79bf5','b9facbaf','b9facbaf','79236a1','79236a1','79236a1'],
  },
  en: {
    matrice: ['462fda22','462fda22','462fda22','182d5f24','462fda22','182d5f24','462fda22','182d5f24','462fda22','182d5f24','462fda22','182d5f24','182d5f24','462fda22','182d5f24','182d5f24','462fda22','182d5f24','182d5f24','182d5f24'],
    nback: ['c6d8c7e2','20ae52cb','20ae52cb','ebaec421','4298f366','807b01b7','b3ff380d','20ae52cb','b3e5c0d6','b4b1fd6d','807b01b7','7e6dca18','b4b1fd6d','b3e5c0d6','9e87d665','7e6dca18','12a63ce1','9e87d665','57a3d16b','57a3d16b'],
    ordre: ['1677472f','40e6a12a','b198a23d','1677472f','81692af9','8ec5ffb2','b198a23d','40e6a12a','81692af9','e6d258a5','b198a23d','aa578c35','db91e349','e6d258a5','aa578c35','539a0610','81692af9','bcfebd7b','b5d94620','d9d4d1a0'],
    mots: ['cec6752b','2b6288b5','2b6288b5','8cbc82e','8cbc82e','ed2c8fca','1e5d4e1c','72980422','1e5d4e1c','e07415d2','67f03d9c','5404d2c0','2c86037c','5404d2c0','cda48463','1ce1a67e','cda48463','5ad9a4d1','3860875f','3860875f'],
    paires: ['4260d7d0','4260d7d0','b049d869','b049d869','b049d869','63f26d07','63f26d07','63f26d07','267d5dd','24b9ffbb','24b9ffbb','f2fa8411','24b9ffbb','4f073c71','ad54a669','ad54a669','c6c34030','ad54a669','e644273','e644273'],
    quiestqui: ['10021eb3','cb73a3e0','70c34b64','79e95ff','f9e5d8d4','183943a5','5c384f54','5c384f54','7344fb12','d577096a','d577096a','3f5b19d9','3f5b19d9','5f00c7e6','d3ac5325','6cf836b','6cf836b','930929b7','930929b7','930929b7'],
  },
};

/** Ce que les parties produisaient avant (les champs ajoutés depuis sont laissés de côté). */
const SAMPLERS: Record<string, (level: number) => unknown> = {
  matrice: (level) =>
    SEEDS.map((seed) => [0, 1, 2, 3].map((r) => generateMatriceRound(createRng(deriveSeed(seed, r)), 3 + r, level).sequence)),
  nback: (level) => SEEDS.map((seed) => generateNBack(createRng(seed), level)),
  ordre: (level) =>
    SEEDS.map((seed) =>
      [0, 1, 2, 3].map((r) => {
        const { cells, values, order } = generateOrdreRound(createRng(deriveSeed(seed, r)), 3 + 2 * r, level);
        return { cells, values, order };
      }),
    ),
  mots: (level) =>
    SEEDS.map((seed) => {
      const { study, probes } = generateMots(createRng(seed), level);
      return { study, probes };
    }),
  paires: (level) => SEEDS.map((seed) => generatePaires(createRng(seed), level)),
  quiestqui: (level) => SEEDS.map((seed) => generateQui(createRng(seed), level)),
};

describe('Mémoire : les niveaux 1 à 20 ne changent pas', () => {
  it('a 50 niveaux par jeu', () => {
    for (const table of [MATRICE_LEVELS, NBACK_LEVELS, ORDRE_LEVELS, MOTS_LEVELS, PAIRES_LEVELS, QUI_LEVELS]) expect(table).toHaveLength(MAX_LEVEL);
    for (const id of ['matrice', 'nback', 'ordre', 'mots', 'paires', 'quiestqui'] as const) expect(GAMES[id].maxLevel).toBe(50);
  });

  it('garde les réglages des niveaux 1 à 20, sans les nouveautés', () => {
    expect(OLD.map((l) => { const c = matriceLevel(l); return [c.size, c.flashMs, c.reverse ? 1 : 0]; })).toEqual(OLD_MATRICE);
    expect(OLD.map((l) => { const c = nbackLevel(l); return [c.n, c.mode, c.stepMs, c.gain]; })).toEqual(OLD_NBACK);
    expect(OLD.map((l) => { const c = ordreLevel(l); return [c.min, c.max, c.size, c.showMs, c.descending ? 1 : 0, c.sequential ? 1 : 0]; })).toEqual(OLD_ORDRE);
    expect(OLD.map((l) => { const c = motsLevel(l); return [c.count, c.studyMs, c.lures]; })).toEqual(OLD_MOTS);
    expect(OLD.map((l) => { const c = pairesLevel(l); return [c.pairs, c.cols, c.previewMs, c.similar ? 1 : 0, c.durationMs]; })).toEqual(OLD_PAIRES);
    expect(OLD.map((l) => { const c = quiLevel(l); return [c.people, c.sameFruit, c.studyMs, c.nameQuestions, c.lookAlikeNames ? 1 : 0]; })).toEqual(OLD_QUI);
    for (const level of OLD) {
      expect(matriceLevel(level)).toMatchObject({ mixed: false, lureEvery: 0, zero: 3, full: 9 });
      expect(nbackLevel(level).lures).toBe(0);
      expect(ordreLevel(level)).toMatchObject({ spread: 0, decoyEvery: 0, zero: 3, full: 9 });
      expect(motsLevel(level)).toMatchObject({ wordMs: 0, decoys: 0, answerMs: 0, net: 1 });
      expect(pairesLevel(level)).toMatchObject({ swap: false, peekMs: 900, slack: 0 });
      expect(quiLevel(level)).toMatchObject({ nameOptions: 4, serial: false, rebind: false, full: 1 });
    }
  });

  it('génère exactement les mêmes parties qu’avant, en français et en anglais', () => {
    for (const lang of LANGS) {
      inLang(lang, () => {
        for (const [game, sample] of Object.entries(SAMPLERS)) {
          expect(OLD.map((level) => fp(sample(level))), `${game} (${lang})`).toEqual(FINGERPRINTS[lang][game]);
        }
      });
    }
    // Quelques parties en clair, aux niveaux 1, 10 et 20.
    expect([1, 10, 20].map((l) => generateMatriceRound(createRng(deriveSeed(1, 0)), 3, l).sequence)).toEqual([[11, 0, 5], [11, 18, 8], [11, 18, 8]]);
    expect([1, 10, 20].map((l) => generateNBack(createRng(7), l).letter?.values.join(''))).toEqual([
      'VFTDFFFDDHHHMRCTLNPVV',
      'VFSDDFDFHFMFMRCTMMPVMV',
      'VFTFDDGMDDRMCDRTMNNVNTSV',
    ]);
    expect([1, 10, 20].map((l) => generateOrdreRound(createRng(deriveSeed(7, 2)), 7, l).values)).toEqual([
      [6, 3, 1, 2, 9, 7, 4],
      [16, 48, 14, 32, 11, 33, 45],
      [-35, 2, 4, -30, -32, 40, -19],
    ]);
    expect([1, 10, 20].map((l) => generateMots(createRng(7), l).study.slice(0, 5))).toEqual([
      ['vent', 'tête', 'camion', 'menuisier', 'Égypte'],
      ['gris', 'magenta', 'comète', 'violet', 'surligneur'],
      ['violet', 'agrafeuse', 'comète', 'surligneur', 'policier'],
    ]);
    expect(generatePaires(createRng(7), 1).cards).toEqual([3, 2, 0, 4, 5, 1, 3, 1, 5, 2, 4, 0]);
    expect(generateQui(createRng(7), 1)[0].people.map((p) => `${p.name}:${p.character}-${p.color}`).join(' ')).toBe(
      'Yanis:poire-1 Salomé:fraise-0 Robin:pomme-3',
    );
  });

  it('garde les barèmes des niveaux 1 à 20', () => {
    const rng = createRng(5);
    for (const level of OLD) {
      for (let best = 0; best <= 12; best++) {
        const linear = Math.round(Math.min(100, Math.max(0, ((best - 3) / 6) * 100)));
        expect(scoreMatrice(best, level)).toBe(linear);
        expect(scoreOrdre(best, level)).toBe(linear);
      }
      const { count } = motsLevel(level);
      for (let i = 0; i < 20; i++) {
        const hits = rng.int(0, count);
        const fa = rng.int(0, count);
        expect(scoreMots(hits, fa, level)).toBe(Math.round(Math.min(100, Math.max(0, ((hits - fa) / count) * 100))));
        const { pairs } = pairesLevel(level);
        const found = rng.int(1, pairs);
        const attempts = rng.int(found, found * 5);
        const eff = Math.min(1, Math.max(0, (3.5 * found - attempts) / (2 * found)));
        expect(scorePaires(found, attempts, level)).toBe(Math.round(70 * (found / pairs) + 30 * eff * (found / pairs)));
        const total = rng.int(1, 36);
        const correct = rng.int(0, total);
        expect(scoreQui(correct, total, level)).toBe(Math.round((correct / total) * 100));
      }
      const seq = generateNBack(createRng(level), level);
      const stream = (seq.letter ?? seq.position)!;
      const tally = tallyStream(stream, seq.n, stream.targets);
      expect(scoreNBack([tally], level)).toBe(Math.min(100, OLD_NBACK[level - 1][3] as number));
    }
  });
});

// ---------- Les 50 niveaux : des parties valides, vite générées ----------

/** Une génération : jamais plus de 50 ms. */
function timed<T>(make: () => T): T {
  const start = performance.now();
  const value = make();
  expect(performance.now() - start).toBeLessThan(50);
  return value;
}

describe('Mémoire : des parties valides aux 50 niveaux', () => {
  it('Matrice : séquences, pièges et sens', () => {
    for (const lang of LANGS) {
      inLang(lang, () => {
        for (const level of LEVELS) {
          const c = matriceLevel(level);
          const cells = c.size * c.size;
          let backward = 0;
          for (const seed of SEEDS) {
            for (let span = 3; span <= MATRICE_MAX_SPAN; span++) {
              const rng = createRng(deriveSeed(seed, span));
              const round = timed(() => generateMatriceRound(rng, span, level));
              // Même tirage que l'ancien générateur.
              expect(round.sequence).toEqual(generateSequence(createRng(deriveSeed(seed, span)), span, cells));
              expect(new Set(round.sequence).size).toBe(span);
              const lures = round.flashes.filter((f) => f.lure);
              const expectedLures = c.lureEvery ? Math.floor(span / c.lureEvery) : 0;
              expect(lures).toHaveLength(expectedLures);
              expect(round.flashes.filter((f) => !f.lure).map((f) => f.cell)).toEqual(round.sequence);
              expect(round.flashes[0].lure).toBe(false);
              round.flashes.forEach((f, i) => {
                expect(f.cell).toBeGreaterThanOrEqual(0);
                expect(f.cell).toBeLessThan(cells);
                if (f.lure) expect(round.flashes[i - 1].lure).toBe(false);
              });
              expect(new Set(round.flashes.map((f) => f.cell)).size).toBe(round.flashes.length);
              if (!c.mixed) expect(round.reverse).toBe(c.reverse);
              if (round.reverse) backward++;
            }
          }
          if (c.mixed) {
            // Le sens donné après : tantôt dans l'ordre, tantôt à l'envers.
            expect(backward).toBeGreaterThan(5);
            expect(backward).toBeLessThan(SEEDS.length * 10 - 5);
          }
          expect(matriceLevelLabel(level).length).toBeGreaterThan(2);
        }
      });
    }
  });

  it('Double retour : 6 cibles par flux, et les pièges annoncés', () => {
    for (const lang of LANGS) {
      inLang(lang, () => {
        for (const level of LEVELS) {
          const c = nbackLevel(level);
          let lures = 0;
          let streams = 0;
          for (let seed = 1; seed <= 30; seed++) {
            const seq = timed(() => generateNBack(createRng(seed * 31 + level), level));
            expect(seq.n).toBe(c.n);
            for (const stream of [seq.letter, seq.position]) {
              if (!stream) continue;
              expect(stream.values).toHaveLength(c.n + 20);
              expect(stream.targets.filter(Boolean)).toHaveLength(NBACK_TARGETS);
              stream.values.forEach((v, i) => expect(stream.targets[i]).toBe(i >= c.n && v === stream.values[i - c.n]));
              lures += countLures(stream, c.n);
              streams++;
            }
          }
          // Les pièges voulus sont bien là (le hasard en ajoute parfois d'autres).
          if (c.lures) expect(lures / streams).toBeGreaterThanOrEqual(c.lures);
          expect(nbackLevelLabel(level).length).toBeGreaterThan(2);
        }
      });
    }
  });

  it('Du plus petit au plus grand : nombres, nombres barrés et ordre de passage', () => {
    for (const lang of LANGS) {
      inLang(lang, () => {
        for (const level of LEVELS) {
          const c = ordreLevel(level);
          for (const seed of SEEDS) {
            for (const length of [3, 6, 9, 12]) {
              const round = timed(() => generateOrdreRound(createRng(deriveSeed(seed, length)), length, level));
              const count = Math.min(length, ordreMaxSpan(level));
              expect(round.cells).toHaveLength(count);
              const decoyCells = round.decoys.map((d) => d.cell);
              const all = [...round.values, ...round.decoys.map((d) => d.value)];
              expect(new Set([...round.cells, ...decoyCells]).size).toBe(count + round.decoys.length);
              expect(new Set(all).size).toBe(all.length);
              for (const cell of [...round.cells, ...decoyCells]) expect(cell).toBeLessThan(c.size * c.size);
              for (const v of all) {
                expect(v).toBeGreaterThanOrEqual(c.min);
                expect(v).toBeLessThanOrEqual(c.max);
              }
              if (c.spread) expect(Math.max(...all) - Math.min(...all)).toBeLessThan(c.spread);
              expect(round.decoys).toHaveLength(c.decoyEvery ? Math.floor(count / c.decoyEvery) : 0);
              const ordered = round.order.map((cell) => round.values[round.cells.indexOf(cell)]);
              expect(ordered).toEqual([...ordered].sort((a, b) => (c.descending ? b - a : a - b)));
              expect([...round.show].sort((a, b) => a - b)).toEqual([...round.cells, ...decoyCells].sort((a, b) => a - b));
              expect(round.cells).toContain(round.show[0]);
            }
          }
          expect(ordreLevelLabel(level).length).toBeGreaterThan(2);
        }
      });
    }
  });

  it('Mots à retenir : défilé, mots barrés et pièges, dans les deux langues', () => {
    for (const lang of LANGS) {
      inLang(lang, () => {
        for (const level of LEVELS) {
          const c = motsLevel(level);
          for (const seed of SEEDS) {
            const round = timed(() => generateMots(createRng(seed + level), level));
            expect(round.study).toHaveLength(c.count);
            expect(round.probes).toHaveLength(c.count * 2);
            expect(new Set(round.probes.map((p) => p.word)).size).toBe(c.count * 2);
            for (const p of round.probes) {
              expect(round.study.includes(p.word)).toBe(p.seen);
              expect(categoryOf(p.word), p.word).toBeDefined();
            }
            const forget = round.sequence.filter((s) => s.forget).map((s) => s.word);
            expect(forget).toHaveLength(c.decoys);
            expect(round.probes.filter((p) => p.forget).map((p) => p.word).sort()).toEqual([...forget].sort());
            expect(round.sequence.filter((s) => !s.forget).map((s) => s.word).sort()).toEqual([...round.study].sort());
            expect(round.sequence[0].forget).toBe(false);
            if (c.lures === 'category') {
              const studied = new Set(round.study.map((w) => categoryOf(w)?.id));
              for (const p of round.probes) expect(studied.has(categoryOf(p.word)?.id)).toBe(true);
            }
          }
          expect(motsLevelLabel(level).length).toBeGreaterThan(2);
        }
      });
    }
  });

  it('Paires : chaque face deux fois, et les cartes baladeuses échangent leur place', () => {
    for (const level of LEVELS) {
      const c = pairesLevel(level);
      expect((c.pairs * 2) % c.cols).toBe(0);
      for (const seed of SEEDS) {
        const deck = timed(() => generatePaires(createRng(seed + level), level));
        expect(deck.cards).toHaveLength(c.pairs * 2);
        expect(new Set(deck.faces.map((f) => `${f.shape}-${f.filled}`)).size).toBe(c.pairs);
        for (let i = 0; i < c.pairs; i++) expect(deck.cards.filter((x) => x === i)).toHaveLength(2);
      }
      expect(pairesLevelLabel(level).length).toBeGreaterThan(2);
    }
    expect(swapSlots([0, 1, 2, 3], 1, 3)).toEqual([0, 3, 2, 1]);
  });

  it('Qui est qui ? : visages, prénoms, et prénoms échangés d’une manche à l’autre', () => {
    for (const lang of LANGS) {
      inLang(lang, () => {
        for (const level of LEVELS) {
          const c = quiLevel(level);
          for (const seed of SEEDS) {
            const rounds = timed(() => generateQui(createRng(seed * 13 + level), level));
            for (const { people, questions } of rounds) {
              expect(people).toHaveLength(c.people);
              expect(new Set(people.map((p) => p.name)).size).toBe(c.people);
              expect(new Set(people.map((p) => `${p.character}-${p.color}`)).size).toBe(c.people);
              for (const p of people) expect(CLASHES[p.character]).not.toContain(p.color);
              const perFruit = new Map<string, number>();
              for (const p of people) perFruit.set(p.character, (perFruit.get(p.character) ?? 0) + 1);
              expect(Math.max(...perFruit.values())).toBeLessThanOrEqual(c.sameFruit);
              if (c.lookAlikeNames) expect(new Set(people.map((p) => p.name[0])).size).toBeLessThan(c.people);
              expect(questions.map((q) => q.target).sort((a, b) => a - b)).toEqual(people.map((_, i) => i));
              for (const q of questions) {
                expect(q.options).toContain(q.target);
                expect(new Set(q.options).size).toBe(q.options.length);
                expect(q.options).toHaveLength(q.kind === 'face' ? c.people : Math.min(c.nameOptions, c.people));
              }
            }
            if (c.rebind) {
              // Mêmes visages et mêmes prénoms, mais chaque visage change de prénom à chaque manche.
              const faceKey = (p: { character: string; color: number }) => `${p.character}-${p.color}`;
              const seen = new Map<string, Set<string>>();
              for (const { people } of rounds) {
                expect(people.map(faceKey).sort()).toEqual(rounds[0].people.map(faceKey).sort());
                expect(people.map((p) => p.name).sort()).toEqual(rounds[0].people.map((p) => p.name).sort());
                for (const p of people) {
                  const names = seen.get(faceKey(p)) ?? new Set<string>();
                  expect(names.has(p.name)).toBe(false);
                  seen.set(faceKey(p), names.add(p.name));
                }
              }
            }
          }
          expect(quiLevelLabel(level).length).toBeGreaterThan(2);
        }
      });
    }
  });
});

// ---------- Une progression qui ne redescend pas, jouable sur téléphone ----------

const matriceLoad = (level: number) => {
  const c = matriceLevel(level);
  return (c.size - 4) + (c.reverse ? 2.5 : 0) + (c.mixed ? 3.5 : 0) + (c.lureEvery === 3 ? 3 : c.lureEvery === 2 ? 4.5 : 0) + (800 - c.flashMs) / 100;
};

const ordreLoad = (level: number) => {
  const c = ordreLevel(level);
  const digits = String(Math.max(Math.abs(c.min), Math.abs(c.max))).length;
  return (
    (c.size - 4) +
    (c.descending ? 0.5 : 0) +
    (c.sequential ? 1.5 : 0) +
    (digits - 1) +
    (c.min < 0 ? 0.5 : 0) +
    (c.spread ? 1.5 : 0) +
    (c.decoyEvery === 3 ? 2.5 : c.decoyEvery === 2 ? 3.5 : 0) +
    (900 - c.showMs) / 100
  );
};

const motsLoad = (level: number) => {
  const c = motsLevel(level);
  const perWord = c.wordMs || c.studyMs / c.count;
  return c.count / 2 + (c.lures === 'category' ? 2 : 0) + (c.wordMs ? 3 : 0) + c.decoys / 2 + (1500 - perWord) / 250 + (c.answerMs ? (3000 - c.answerMs) / 500 : 0);
};

const pairesLoad = (level: number) => {
  const c = pairesLevel(level);
  const perPair = (c.durationMs / 1000 - 50) / c.pairs;
  const preview = c.previewMs === 0 ? 2 : c.previewMs <= 1500 ? 1 : 0;
  return c.pairs / 2 + (c.similar ? 3 : 0) + preview + (c.swap ? 3 : 0) + (900 - c.peekMs) / 150 + (6 - perPair) * 1.5;
};

const quiLoad = (level: number) => {
  const c = quiLevel(level);
  return (
    c.people +
    (c.sameFruit - 1) +
    (c.lookAlikeNames ? 1.5 : 0) +
    c.nameQuestions * 2 +
    (c.nameOptions - 4) / 2 +
    (c.serial ? 2 : 0) +
    (c.rebind ? 3 : 0) +
    (2600 - c.studyMs) / 200
  );
};

/** Plus petite valeur qui donne la première étoile (60 pts). */
const firstStar = (score: (value: number) => number, max: number) => Array.from({ length: max + 1 }, (_, v) => v).find((v) => score(v) >= 60) ?? Infinity;

describe('Mémoire : progression des niveaux 21 à 50', () => {
  it('ne rend jamais un niveau plus facile que le précédent', () => {
    expectNonDecreasing(NEW_FROM_20.map(matriceLoad), 'Matrice');
    expectNonDecreasing(NEW_FROM_20.map((l) => nbackLoad(nbackLevel(l))), 'Double retour');
    expectNonDecreasing(NEW_FROM_20.map(ordreLoad), 'Du plus petit au plus grand');
    expectNonDecreasing(NEW_FROM_20.map(motsLoad), 'Mots à retenir');
    expectNonDecreasing(NEW_FROM_20.map(pairesLoad), 'Paires');
    expectNonDecreasing(NEW_FROM_20.map(quiLoad), 'Qui est qui ?');
    // Chaque palier pèse nettement plus que le précédent.
    for (const load of [matriceLoad, ordreLoad, motsLoad, pairesLoad, quiLoad, (l: number) => nbackLoad(nbackLevel(l))]) {
      expect(load(30)).toBeGreaterThan(load(20));
      expect(load(40)).toBeGreaterThan(load(30));
      expect(load(50)).toBeGreaterThan(load(40));
    }
  });

  it('apporte de vraies nouveautés à chaque palier', () => {
    const tier = (from: number) => LEVELS.slice(from - 1, from + 9);
    // Matrice : 6 × 6 et pièges (Expert), sens donné après (Maître), pièges serrés (Légende).
    expect(OLD.some((l) => matriceLevel(l).size === 6 || matriceLevel(l).lureEvery || matriceLevel(l).mixed)).toBe(false);
    expect(tier(21).some((l) => matriceLevel(l).size === 6) && tier(21).some((l) => matriceLevel(l).lureEvery)).toBe(true);
    expect(tier(31).some((l) => matriceLevel(l).mixed)).toBe(true);
    expect(tier(41).every((l) => matriceLevel(l).lureEvery === 2)).toBe(true);
    // Double retour : 5 et 6 en arrière, pièges, double retour à 5.
    expect(Math.max(...OLD.map((l) => nbackLevel(l).n))).toBe(4);
    expect(tier(21).some((l) => nbackLevel(l).n === 5) && tier(21).some((l) => nbackLevel(l).lures > 0)).toBe(true);
    expect(tier(31).some((l) => nbackLevel(l).mode === 'dual' && nbackLevel(l).n === 5)).toBe(true);
    // Du plus petit au plus grand : trois chiffres et 6 × 6, nombres barrés, nombres très proches.
    expect(tier(21).some((l) => ordreLevel(l).max >= 100) && tier(21).some((l) => ordreLevel(l).size === 6)).toBe(true);
    expect(tier(31).every((l) => ordreLevel(l).decoyEvery > 0)).toBe(true);
    expect(tier(41).every((l) => ordreLevel(l).spread > 0)).toBe(true);
    // Mots : défilé un par un, mots barrés, réponse chronométrée.
    expect(tier(21).filter((l) => motsLevel(l).wordMs > 0).length).toBeGreaterThanOrEqual(8);
    expect(tier(31).every((l) => motsLevel(l).decoys > 0)).toBe(true);
    expect(tier(41).every((l) => motsLevel(l).answerMs > 0)).toBe(true);
    // Paires : 16 à 20 paires, cartes baladeuses, temps compté.
    expect(tier(21).every((l) => pairesLevel(l).pairs >= 16)).toBe(true);
    expect(tier(31).every((l) => pairesLevel(l).swap)).toBe(true);
    expect(tier(41).every((l) => (pairesLevel(l).durationMs / 1000 - 50) / pairesLevel(l).pairs <= 5)).toBe(true);
    // Qui est qui ? : un par un et six prénoms, prénoms échangés, même fruit quatre fois.
    expect(tier(21).some((l) => quiLevel(l).serial) && tier(21).some((l) => quiLevel(l).nameOptions === 6)).toBe(true);
    expect(tier(31).every((l) => quiLevel(l).rebind)).toBe(true);
    expect(tier(41).every((l) => quiLevel(l).sameFruit === 4)).toBe(true);
  });

  it('garde la première étoile à portée, de plus en plus généreuse quand tout se corse', () => {
    const matriceStar = NEW_FROM_20.map((l) => firstStar((b) => scoreMatrice(b, l), MATRICE_MAX_SPAN));
    expectNonIncreasing(matriceStar, 'Matrice (cases pour une étoile)');
    expect(Math.max(...matriceStar)).toBeLessThanOrEqual(7);
    expect(Math.min(...matriceStar)).toBeGreaterThanOrEqual(5);
    const ordreStar = NEW_FROM_20.map((l) => firstStar((b) => scoreOrdre(b, l), 12));
    expectNonIncreasing(ordreStar, 'Du plus petit au plus grand');
    NEW_FROM_20.forEach((l, i) => expect(ordreStar[i]).toBeLessThanOrEqual(ordreMaxSpan(l)));
    expect(Math.min(...ordreStar)).toBeGreaterThanOrEqual(5);
    // Double retour : précision équilibrée nécessaire pour 60 pts, entre 60 % et 70 %.
    const nbackNeed = NEW_FROM_20.map((l) => 0.5 + (0.5 * 60) / nbackLevel(l).gain);
    expectNonIncreasing(nbackNeed, 'Double retour');
    for (const need of nbackNeed) expect(need).toBeGreaterThan(0.6);
    expectNonIncreasing(NEW_FROM_20.map((l) => motsLevel(l).net), 'Mots à retenir');
    expectNonIncreasing(NEW_FROM_20.map((l) => quiLevel(l).full), 'Qui est qui ?');
    expectNonDecreasing(NEW_FROM_20.map((l) => pairesLevel(l).slack), 'Paires');
    for (const level of LEVELS) {
      // Mots : 60 pts avec 70 % des mots retrouvés et 15 % de fausses alarmes, au pire 50 % de solde net.
      const { count, net } = motsLevel(level);
      expect(scoreMots(Math.ceil(count * net * 0.6), 0, level)).toBeGreaterThanOrEqual(60);
      expect(net).toBeGreaterThanOrEqual(0.7);
      // Qui est qui ? : jamais plus de 60 % de bonnes réponses pour l'étoile, jamais moins de 42 %.
      expect(scoreQui(60, 100, level)).toBeGreaterThanOrEqual(60);
      expect(scoreQui(41, 100, level)).toBeLessThan(60);
      // Paires : toutes les paires trouvées, même à 4 coups par paire, valent l'étoile ; le temps le permet.
      const { pairs, durationMs } = pairesLevel(level);
      expect(scorePaires(pairs, pairs * 4, level)).toBeGreaterThanOrEqual(60);
      expect(durationMs / pairs).toBeGreaterThanOrEqual(6000);
    }
  });

  it('reste humainement jouable et tient sur un téléphone', () => {
    for (const level of LEVELS) {
      // Jamais moins de 0,3 s pour voir un élément.
      expect(matriceLevel(level).flashMs).toBeGreaterThanOrEqual(300);
      expect(ordreLevel(level).showMs).toBeGreaterThanOrEqual(300);
      expect(nbackLevel(level).stepMs - NBACK_GAP_MS).toBeGreaterThanOrEqual(1200);
      const mots = motsLevel(level);
      expect(mots.wordMs || mots.studyMs / mots.count).toBeGreaterThanOrEqual(800);
      if (mots.answerMs) expect(mots.answerMs).toBeGreaterThanOrEqual(1800);
      expect(pairesLevel(level).peekMs).toBeGreaterThanOrEqual(400);
      expect(quiLevel(level).studyMs).toBeGreaterThanOrEqual(900);
      // Double retour : 6 en arrière au plus, 5 en double.
      const nb = nbackLevel(level);
      expect(nb.n).toBeLessThanOrEqual(nb.mode === 'dual' ? 5 : 6);
      // Grilles : 6 × 6 au plus (46 px par case sur 360 px de large, avec 7 px d'écart et 16 px de marge).
      for (const size of [matriceLevel(level).size, ordreLevel(level).size]) {
        expect(size).toBeLessThanOrEqual(6);
        expect((328 - (size - 1) * 7) / size).toBeGreaterThanOrEqual(44);
      }
      // Paires : au moins 44 px par carte dans 328 × 600 px (360 × 740 moins l'en-tête).
      const { pairs, cols } = pairesLevel(level);
      const rows = (pairs * 2) / cols;
      expect((328 - (cols - 1) * 8) / cols).toBeGreaterThanOrEqual(44);
      expect((600 - (rows - 1) * 8) / rows).toBeGreaterThanOrEqual(44);
      // Mots : une liste affichée d'un coup ne dépasse pas 20 mots ; Qui est qui ? : 12 visages, 6 prénoms.
      if (!mots.wordMs) expect(mots.count).toBeLessThanOrEqual(20);
      expect(quiLevel(level).people).toBeLessThanOrEqual(12);
      expect(quiLevel(level).nameOptions).toBeLessThanOrEqual(6);
    }
  });

  it('écrit les règles et les libellés dans les deux langues', () => {
    const ids = ['matrice', 'nback', 'ordre', 'mots', 'paires', 'quiestqui'] as const;
    for (const id of ids) {
      for (const level of LEVELS) {
        const fr = { rule: GAMES[id].rule(level), label: GAMES[id].levelLabel(level) };
        const en = inLang('en', () => ({ rule: GAMES[id].rule(level), label: GAMES[id].levelLabel(level) }));
        expect(en.rule, `${id} ${level}`).not.toBe(fr.rule);
        expect(en.rule, `${id} ${level}`).not.toMatch(/[àâçéèêëîïôûùœ«»]/);
        expect(en.label, `${id} ${level}`).not.toMatch(/[àâçéèêëîïôûùœ«»]|\b(par|pour|chaque|pièges?)\b/);
      }
    }
    expect(inLang('en', () => matriceLevelLabel(50))).toBe('6 × 6 · 0.3 s per square · direction told after · decoy squares');
    expect(matriceLevelLabel(50)).toBe('6 × 6 · 0,3 s par case · sens donné après · cases pièges');
    expect(inLang('en', () => nbackLevelLabel(50))).toBe('5 back · letters and positions · fast · traps');
    expect(inLang('en', () => GAMES.nback.rule(50))).toContain('Watch for traps');
  });
});
