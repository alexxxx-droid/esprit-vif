import { afterEach, describe, expect, it } from 'vitest';
import { lang, setLang } from '../lang';
import { MAX_LEVEL, TIERS } from '../levels';
import { createRng, deriveSeed, hashSeed } from '../rng';
import { BOUTIQUE_ROUNDS, boutiqueLevel, boutiqueLevelLabel, boutiqueRule, generateBoutiqueRound, scoreBoutique } from './boutique';
import {
  FLECHES_LEVELS,
  FLECHES_TRIALS,
  flechesAnswer,
  flechesLevel,
  flechesLevelLabel,
  flechesResponse,
  flechesRule,
  generateFleches,
  OPPOSITE,
  scoreFleches,
  type FlechesLevel,
} from './fleches';
import {
  generateIntrus,
  INTRUS_CHIRAL_CHARS,
  INTRUS_LEVELS,
  INTRUS_MAX_ROWS,
  intrusCell,
  intrusLevel,
  intrusLevelLabel,
  intrusRule,
  intrusShape,
  intrusSize,
  scoreIntrus,
  type IntrusBoard,
  type IntrusLevel,
} from './intrus';
import { GAMES } from './registry';
import {
  generateStroop,
  scoreStroop,
  STROOP_COUNT,
  STROOP_LEVELS,
  stroopAnswer,
  stroopLevelLabel,
  stroopPalette,
  stroopRule,
  type StroopLevel,
} from './stroop';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const NEW_LEVELS = LEVELS.filter((level) => level > 20);
const SEEDS = Array.from({ length: 12 }, (_, i) => i * 7919 + 11);
const LANGS = ['fr', 'en'] as const;

afterEach(() => setLang('fr'));

/** Exécute `run` dans les deux langues, et revient au français. */
function inBothLanguages(run: () => void) {
  for (const l of LANGS) {
    setLang(l);
    run();
  }
  setLang('fr');
}

/** Durée d'un appel, en ms. */
function timed<T>(run: () => T): [T, number] {
  const start = performance.now();
  const out = run();
  return [out, performance.now() - start];
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const tierOfLevel = (level: number) => TIERS.findIndex((t) => level >= t.from && level <= t.to);

/** La difficulté moyenne de chaque palier monte strictement. */
function expectTiersRise(index: (level: number) => number) {
  const means = TIERS.map((t) => mean(LEVELS.filter((l) => l >= t.from && l <= t.to).map(index)));
  for (let i = 1; i < means.length; i++) expect(means[i], `palier ${i + 1}`).toBeGreaterThan(means[i - 1]);
}

// ---------- Les niveaux 1 à 20 ne changent pas ----------

function labels(read: () => string): string[] {
  setLang('fr');
  const fr = read();
  setLang('en');
  const en = read();
  setLang('fr');
  return [fr, en];
}

const PRINT_SEEDS = [1, 42, 2026, 987654321];

function stroopPrint(level: number): string {
  const items = PRINT_SEEDS.map((seed) =>
    generateStroop(createRng(seed), level).map(({ word, ink, ask, buttons, buttonInks }) => [word, ink, ask, buttons, buttonInks]),
  );
  const scores = [12_000, 20_000, 35_000, 50_000, 70_000, 95_000, 130_000].flatMap((ms) => [0, 1, 3].map((e) => scoreStroop(ms, e, level)));
  return JSON.stringify([items, scores, labels(() => stroopLevelLabel(level))]);
}

function intrusPrint(level: number): string {
  const boards = PRINT_SEEDS.map((seed) => {
    const out: unknown[] = [];
    let previous: IntrusBoard | undefined;
    for (let found = 0; found < 14; found++) {
      const board = generateIntrus(createRng(deriveSeed(seed, found)), intrusSize(found, level), level, previous);
      const { size, base, odd, oddIndex, mirrored, tilts } = board;
      out.push([size, base, odd, oddIndex, mirrored, tilts]);
      previous = board;
    }
    return out;
  });
  const sizes = Array.from({ length: 30 }, (_, found) => intrusSize(found, level));
  const scores = Array.from({ length: 30 }, (_, found) => scoreIntrus(found, level));
  return JSON.stringify([boards, sizes, scores, labels(() => intrusLevelLabel(level))]);
}

function boutiquePrint(level: number): string {
  const rounds = PRINT_SEEDS.map((seed) =>
    Array.from({ length: 5 }, (_, r) => {
      const { start, events, answer } = generateBoutiqueRound(createRng(deriveSeed(seed, r)), level);
      return [start, events.map(({ enter, leave, cats }) => [enter, leave, cats]), answer];
    }),
  );
  const scores = [0, 1, 2, 3, 4, 5].map((c) => scoreBoutique(c));
  return JSON.stringify([rounds, scores, labels(() => boutiqueLevelLabel(level))]);
}

function flechesPrint(level: number): string {
  const trials = PRINT_SEEDS.map((seed) => generateFleches(createRng(seed), level).map(({ center, flank, ask, offset }) => [center, flank, ask, offset]));
  const scores = [10, 15, 20, 25, 28, 30].flatMap((c) => [null, 300, 450, 600, 900, 1300, 2500].map((rt) => scoreFleches(c, rt, level)));
  return JSON.stringify([trials, scores, labels(() => flechesLevelLabel(level))]);
}

const hex = (text: string) => hashSeed(text).toString(16).padStart(8, '0');

/** Empreintes relevées AVANT l'ajout des niveaux 21 à 50 (parties générées, scores, libellés FR/EN). */
const BEFORE: Record<'stroop' | 'intrus' | 'boutique' | 'fleches', string[]> = {
  stroop: [
    '1bca3ef2', 'f5b81f59', '78cf185f', '7e008da9', 'a64f1e2d', 'da94b11a', 'b530dbd4', '80f04e30', 'ed08600f', 'e57e2054',
    'd521aef8', 'ff2eaf17', 'a703cb15', '9eb1b39b', '54fcaf73', '70529ba0', '8c4b835d', '3a5d3ae6', '360811e5', '4ca5dc37',
  ],
  intrus: [
    '5c123c34', '153c68a4', 'c5fda1ca', '9e70cb3f', '122653eb', '5704ea24', 'acfe318a', '74b5547c', '393e4805', '78008ca4',
    '74d858d7', '4c27e12e', 'c9a7c90a', 'fce93706', 'e2bdfc93', '49d8130b', '9676e513', '7da80542', '4c6e638b', '9c0444e7',
  ],
  boutique: [
    '2f488a34', '0886b0ae', '4de338bb', '54685728', '1ce0a833', 'd99a2054', '7a2c3b4c', '8d108c40', '00c39e4e', '25eb5e22',
    'ef07e056', '33538d16', '8e152d28', 'b5f1b966', 'df9c2b91', '39bdcea8', 'd636def5', '0bdd5930', 'cc984d8d', 'f02cce4a',
  ],
  fleches: [
    '02baecc3', '92cb3677', 'd853c441', '0859cb59', '60758465', '75d7c47b', 'b20c1907', '76a3d3bf', '32940d5a', '755c593d',
    '18cd9faf', '020adafc', '9e354596', 'f833d3aa', '60ffe019', '052f67fd', 'e7d1c149', '8b6614ed', 'e7b4c38c', 'db5d8f54',
  ],
};

describe('Attention : les niveaux 1 à 20 restent identiques', () => {
  const OLD = Array.from({ length: 20 }, (_, i) => i + 1);

  it('Couleurs piégées : mêmes mots, mêmes scores, mêmes libellés', () => {
    expect(OLD.map((level) => hex(stroopPrint(level)))).toEqual(BEFORE.stroop);
  });

  it('L’intrus : mêmes grilles, mêmes tailles, mêmes scores', () => {
    expect(OLD.map((level) => hex(intrusPrint(level)))).toEqual(BEFORE.intrus);
  });

  it('La boutique : mêmes manches, mêmes scores', () => {
    expect(OLD.map((level) => hex(boutiquePrint(level)))).toEqual(BEFORE.boutique);
  });

  it('Flèches : mêmes essais, mêmes scores', () => {
    expect(OLD.map((level) => hex(flechesPrint(level)))).toEqual(BEFORE.fleches);
  });

  it('garde les niveaux 1 à 20 sans les nouveautés', () => {
    for (const level of OLD) {
      const s = STROOP_LEVELS[level - 1];
      expect([s.frame, s.flashMs, s.deadlineMs]).toEqual([0, null, null]);
      const f = FLECHES_LEVELS[level - 1];
      expect([f.cue, f.reverse, f.nogo, f.motion, f.layout]).toEqual(['text', 0, 0, false, 'row']);
      const i = INTRUS_LEVELS[level - 1];
      expect([i.flip, i.colors, i.sizes, i.mixed, i.maxRows, i.spin]).toEqual([false, false, false, 0, 6, false]);
      const b = boutiqueLevel(level);
      expect([b.surprise, b.bakery, b.askBakery]).toEqual([0, false, 0]);
    }
  });
});

// ---------- Tables complètes ----------

describe('Attention : 50 niveaux par jeu', () => {
  it('a une ligne par niveau, et des libellés et règles dans les deux langues', () => {
    expect(STROOP_LEVELS).toHaveLength(MAX_LEVEL);
    expect(INTRUS_LEVELS).toHaveLength(MAX_LEVEL);
    expect(FLECHES_LEVELS).toHaveLength(MAX_LEVEL);
    for (const id of ['stroop', 'intrus', 'boutique', 'fleches'] as const) {
      const game = GAMES[id];
      const texts = LEVELS.map((level) => {
        setLang('fr');
        const fr = [game.levelLabel(level), game.rule(level)];
        setLang('en');
        const en = [game.levelLabel(level), game.rule(level)];
        return { fr, en };
      });
      setLang('fr');
      texts.forEach(({ fr, en }, i) => {
        expect(fr[0].length, `${id} ${i + 1}`).toBeGreaterThan(2);
        expect(fr[1].length).toBeGreaterThan(10);
        expect(en[1]).not.toBe(fr[1]);
        expect(en[0]).not.toBe(fr[0]);
        expect(en.join(' ')).not.toMatch(/[àâçéèêëîïôûùœ«»]/);
      });
      // Les nouveaux niveaux annoncent leur nouveauté : aucun ne reprend le libellé d'un niveau 1 à 20.
      const old = new Set(texts.slice(0, 20).map((t) => t.fr[0]));
      for (const t of texts.slice(20)) expect(old.has(t.fr[0]), `${id} : ${t.fr[0]}`).toBe(false);
    }
  });

  it('annonce les nouveautés dans la règle', () => {
    expect(stroopRule(25)).toMatch(/cadre/);
    expect(stroopRule(35)).toMatch(/efface/);
    expect(stroopRule(45)).toMatch(/par mot/);
    expect(intrusRule(23)).toMatch(/tête en bas/);
    expect(intrusRule(35)).toMatch(/qu’une fois/);
    expect(intrusRule(45)).toMatch(/tournent/);
    expect(boutiqueRule(25)).toMatch(/entrés/);
    expect(boutiqueRule(35)).toMatch(/boulangerie/);
    expect(flechesRule(25)).toMatch(/bleues/);
    expect(flechesRule(35)).toMatch(/inverse/);
    expect(flechesRule(45)).toMatch(/barrées/);
    setLang('en');
    expect(flechesRule(50)).toBe(
      'Blue arrows: give the direction of the middle one. Orange arrows: the direction of the outer ones. Framed arrows: answer the opposite way. Crossed-out arrows: don’t tap anything.',
    );
    expect(stroopLevelLabel(50)).toBe('8 colors · tricky buttons · word, ink or frame · flash words 0.6 s · 2.8 s per word');
    expect(lang()).toBe('en');
  });
});

// ---------- Couleurs piégées ----------

describe('Couleurs piégées, niveaux 1 à 50', () => {
  it('génère vite 20 mots valides, avec une seule bonne réponse', () => {
    inBothLanguages(() => {
      for (const level of LEVELS) {
        const config = pickStroop(level);
        const palette = stroopPalette(level);
        for (const seed of SEEDS) {
          const [items, ms] = timed(() => generateStroop(createRng(seed), level));
          expect(ms).toBeLessThan(50);
          expect(items).toHaveLength(STROOP_COUNT);
          expect(items.filter((it) => it.ask === 'frame')).toHaveLength(Math.round(STROOP_COUNT * config.frame));
          expect(items.filter((it) => it.ask === 'word')).toHaveLength(Math.round(STROOP_COUNT * config.switchRatio));
          for (const [i, item] of items.entries()) {
            // Chaque couleur du niveau a exactement un bouton : une seule bonne réponse.
            expect([...item.buttons].sort()).toEqual([...palette].sort());
            expect(item.buttons.filter((c) => c === stroopAnswer(item))).toHaveLength(1);
            if (i > 0) expect(item.ink).not.toBe(items[i - 1].ink);
            if (config.frame) {
              expect(item.frame).not.toBeNull();
              expect(item.frame).not.toBe(item.ink);
              if (item.ask === 'frame') expect(item.frame).not.toBe(item.word);
            } else expect(item.frame).toBeNull();
            if (item.ask === 'word') expect(item.word).not.toBe(item.ink);
          }
        }
      }
    });
  });

  it('durcit chaque palier : cadre, puis 8 couleurs et mot éclair, puis temps limité', () => {
    for (const level of NEW_LEVELS) {
      const c = pickStroop(level);
      expect(c.frame).toBeGreaterThan(0);
      if (level > 30) expect(c.colors).toBeGreaterThanOrEqual(7);
      if (level > 32) expect(c.colors).toBe(8);
      if (level > 30) expect(c.flashMs).not.toBeNull();
      if (level > 40) expect(c.deadlineMs).not.toBeNull();
      if (level > 21) {
        const p = pickStroop(level - 1);
        expect(c.colors).toBeGreaterThanOrEqual(p.colors);
        if (p.flashMs && c.flashMs) expect(c.flashMs).toBeLessThanOrEqual(p.flashMs);
        if (p.deadlineMs && c.deadlineMs) expect(c.deadlineMs).toBeLessThanOrEqual(p.deadlineMs);
      }
      // Jamais moins de 350 ms pour réagir ; le mot éclair reste visible au moins 0,6 s.
      if (c.deadlineMs) expect(c.deadlineMs).toBeGreaterThanOrEqual(2000);
      if (c.flashMs) expect(c.flashMs).toBeGreaterThanOrEqual(600);
    }
    expectTiersRise((level) => {
      const c = pickStroop(level);
      const flash = c.flashMs ? 1 + (1600 - c.flashMs) / 1000 : 0;
      const deadline = c.deadlineMs ? 1 + (4000 - c.deadlineMs) / 1000 : 0;
      return c.colors / 2 + Number(c.shuffle) + Number(c.trap) + 2 * c.switchRatio + 3 * c.frame + flash + deadline;
    });
  });

  it('laisse la 1re étoile à un bon joueur, et rien à qui touche au hasard', () => {
    for (const level of NEW_LEVELS) {
      const c = pickStroop(level);
      // Un bon joueur : ~2,6 s par mot à ce niveau, 3 erreurs (dont une hors délai).
      const perWord = Math.min(2.6, (c.deadlineMs ?? 99_000) / 1000);
      const good = scoreStroop(STROOP_COUNT * perWord * 1000, 3, level);
      expect(good, `niveau ${level}`).toBeGreaterThanOrEqual(60);
      expect(scoreStroop(c.best * 1000, 0, level)).toBe(100);
      // Toucher n'importe quoi très vite : presque toutes les réponses fausses.
      const errors = Math.round(STROOP_COUNT * (1 - 1 / c.colors));
      expect(scoreStroop(8000, errors, level), `niveau ${level}`).toBeLessThanOrEqual(5);
      // Tout laisser filer (temps limité) ne rapporte rien non plus.
      if (c.deadlineMs) expect(scoreStroop(STROOP_COUNT * c.deadlineMs, STROOP_COUNT, level)).toBe(0);
    }
  });

  it('ne rapporte rien non plus aux niveaux 1 à 20 à qui touche au hasard', () => {
    for (let level = 1; level <= 20; level++) {
      const c = pickStroop(level);
      const errors = Math.round(STROOP_COUNT * (1 - 1 / c.colors));
      expect(scoreStroop(4000, errors, level), `niveau ${level}`).toBeLessThanOrEqual(5);
    }
  });
});

function pickStroop(level: number): StroopLevel {
  return STROOP_LEVELS[Math.min(MAX_LEVEL, Math.max(1, level)) - 1];
}

// ---------- L'intrus ----------

const signature = (board: IntrusBoard, cell: number) => {
  const { symbol, mirrored, flipped } = intrusCell(board, cell);
  return `${symbol}|${mirrored ? 'm' : ''}${flipped ? 'f' : ''}`;
};

describe('L’intrus, niveaux 1 à 50', () => {
  it('pose une grille avec un seul intrus, tous les autres symboles en plusieurs exemplaires', () => {
    inBothLanguages(() => {
      for (const level of LEVELS) {
        const c = intrusLevel(level);
        for (const seed of SEEDS.slice(0, 6)) {
          let previous: IntrusBoard | undefined;
          for (let found = 0; found < 24; found++) {
            const { cols, rows } = intrusShape(found, level);
            const [board, ms] = timed(() => generateIntrus(createRng(deriveSeed(seed, found)), cols, level, previous, rows));
            expect(ms).toBeLessThan(50);
            const count = cols * rows;
            expect(board.size).toBe(cols);
            expect(board.rows).toBe(rows);
            expect(board.tilts).toHaveLength(count);
            const counts = new Map<string, number>();
            for (let cell = 0; cell < count; cell++) counts.set(signature(board, cell), (counts.get(signature(board, cell)) ?? 0) + 1);
            expect(counts.get(signature(board, board.oddIndex))).toBe(1);
            for (const [sig, n] of counts) if (sig !== signature(board, board.oddIndex)) expect(n, sig).toBeGreaterThanOrEqual(2);
            if (board.flipped) expect(c.flip).toBe(true);
            if (board.mirrored) expect(c.mirror).toBe(true);
            if (board.alt !== null) expect(c.mixed).toBeGreaterThan(0);
            // La couleur ne trahit jamais l'intrus.
            if (board.hues) expect(board.hues.filter((h) => h === board.hues![board.oddIndex]).length).toBeGreaterThan(1);
            else expect(c.colors).toBe(false);
            expect(board.scales !== null).toBe(c.sizes);
            if (c.spin) {
              // Quand tout tourne, seul un reflet de symbole sans symétrie reste reconnaissable.
              expect(board.spins).toHaveLength(count);
              expect(board.mirrored || board.flipped).toBe(true);
              expect(INTRUS_CHIRAL_CHARS).toContain(board.base);
              if (board.alt !== null) expect(INTRUS_CHIRAL_CHARS).toContain(board.alt);
            } else expect(board.spins).toBeNull();
            previous = board;
          }
        }
      }
    });
  });

  it('garde des cases d’au moins 44 px : 6 colonnes au plus, 8 rangées au plus', () => {
    for (const level of LEVELS) {
      for (let found = 0; found < 40; found++) {
        const { cols, rows } = intrusShape(found, level);
        expect(cols).toBeLessThanOrEqual(6);
        expect(rows).toBeLessThanOrEqual(INTRUS_MAX_ROWS);
        expect(rows).toBeGreaterThanOrEqual(cols);
        // 360 px de large moins les marges : (328 − 5 × 6) / 6 ≈ 49 px par case.
        expect((328 - (cols - 1) * 6) / cols).toBeGreaterThanOrEqual(44);
      }
    }
  });

  it('durcit chaque palier et garde la 1re étoile à portée', () => {
    for (const level of NEW_LEVELS) {
      const c = intrusLevel(level);
      if (level <= 30) expect(c.flip || c.colors).toBe(true);
      if (level > 30 && level <= 40) expect(c.mixed).toBeGreaterThan(0);
      if (level > 40) expect(c.spin || c.maxRows === 8).toBe(true);
      // 60 pts : au plus 9 trouvés en 45 s, soit 5 s par intrus.
      expect(Math.ceil(c.target * 0.6)).toBeLessThanOrEqual(9);
      expect(scoreIntrus(c.target, level)).toBe(100);
    }
    expectTiersRise((level) => {
      const c: IntrusLevel = intrusLevel(level);
      const symbols = c.tiers.includes(3) || c.tiers.length === 0 ? 1 : 0.5;
      return (
        symbols +
        Number(c.mirror) * 0.5 +
        Number(c.flip) +
        Number(c.colors) +
        Number(c.sizes) +
        2 * c.mixed +
        2 * Number(c.spin) +
        (c.maxRows - 6) / 2 +
        c.start / 3 +
        3 / c.growEvery +
        Number(c.tilt) * 0.5 -
        c.target / 10
      );
    });
  });
});

// ---------- La boutique ----------

describe('La boutique, niveaux 1 à 50', () => {
  it('pose des manches justes : une seule réponse, à deux chiffres au plus', () => {
    inBothLanguages(() => {
      for (const level of LEVELS) {
        const c = boutiqueLevel(level);
        const questions = new Set<string>();
        for (const seed of SEEDS) {
          for (let r = 0; r < BOUTIQUE_ROUNDS; r++) {
            const [round, ms] = timed(() => generateBoutiqueRound(createRng(deriveSeed(seed, r)), level));
            expect(ms).toBeLessThan(50);
            let inside = round.start;
            let bakery = round.bakeryStart ?? 0;
            let entered = 0;
            let left = 0;
            for (const e of round.events) {
              expect(e.leave).toBeLessThanOrEqual(inside);
              expect(e.bakeryOut).toBeLessThanOrEqual(bakery);
              if (!c.bakery) expect(e.bakeryIn + e.bakeryOut).toBe(0);
              inside += e.enter - e.leave;
              bakery += e.bakeryIn - e.bakeryOut;
              entered += e.enter;
              left += e.leave;
            }
            expect(round.answer).toBe(inside);
            expect(round.expected).toBe({ inside, entered, left, bakery }[round.question]);
            expect(round.expected).toBeGreaterThanOrEqual(0);
            expect(round.expected).toBeLessThanOrEqual(99);
            if (round.question === 'bakery') expect(c.askBakery).toBeGreaterThan(0);
            if (round.question === 'entered' || round.question === 'left') expect(c.surprise).toBeGreaterThan(0);
            expect(round.bakeryStart !== null).toBe(c.bakery);
            questions.add(round.question);
          }
        }
        if (c.surprise > 0) expect(questions.has('entered') || questions.has('left')).toBe(true);
        if (c.askBakery > 0) expect(questions.has('bakery')).toBe(true);
      }
    });
  });

  it('durcit chaque palier : question surprise, boulangerie, puis deux magasins à suivre', () => {
    for (const level of NEW_LEVELS) {
      const c = boutiqueLevel(level);
      if (level <= 30) expect(c.surprise).toBeGreaterThan(0);
      if (level > 30) expect(c.bakery).toBe(true);
      if (level > 40) expect(c.askBakery).toBeGreaterThan(0);
      // Les clients restent visibles : au moins 750 ms par mouvement.
      expect(c.stepMs).toBeGreaterThanOrEqual(750);
      expect(c.maxMoves).toBeLessThanOrEqual(5);
    }
    expectTiersRise((level) => {
      const c = boutiqueLevel(level);
      return (
        c.events / 4 +
        c.maxMoves / 2 +
        (1700 - c.stepMs) / 500 +
        Number(c.both) +
        Number(c.cats) * 0.5 +
        2 * c.surprise +
        2 * Number(c.bakery) +
        3 * c.askBakery
      );
    });
  });
});

// ---------- Flèches ----------

describe('Flèches, niveaux 1 à 50', () => {
  it('pose 30 essais valides : une seule touche juste, ou aucune sur les flèches barrées', () => {
    inBothLanguages(() => {
      for (const level of LEVELS) {
        const c = flechesLevel(level);
        for (const seed of SEEDS) {
          const [trials, ms] = timed(() => generateFleches(createRng(seed), level));
          expect(ms).toBeLessThan(50);
          expect(trials).toHaveLength(FLECHES_TRIALS);
          expect(trials.filter((t) => t.kind === 'nogo')).toHaveLength(Math.round(FLECHES_TRIALS * c.nogo));
          expect(trials.filter((t) => t.kind === 'reverse')).toHaveLength(Math.round(FLECHES_TRIALS * c.reverse));
          expect(trials[0].kind).toBe('go');
          for (const t of trials) {
            const response = flechesResponse(t);
            if (t.kind === 'nogo') expect(response).toBeNull();
            else expect(response).toBe(t.kind === 'reverse' ? OPPOSITE[flechesAnswer(t)] : flechesAnswer(t));
            if (c.dirs === 2) {
              expect(['left', 'right']).toContain(t.center);
              expect(['left', 'right']).toContain(t.flank);
            }
            if (c.layout === 'mixed') expect(['row', 'column', 'square']).toContain(t.layout);
            else expect(t.layout).toBe(c.layout);
            if (c.rule !== 'switch') expect(t.ask).toBe(c.rule);
          }
        }
      }
    });
  });

  it('apporte une règle nouvelle à chaque palier, sans jamais descendre sous 350 ms', () => {
    for (const level of LEVELS) expect(flechesLevel(level).windowMs).toBeGreaterThanOrEqual(1000);
    for (const level of NEW_LEVELS) {
      const c = flechesLevel(level);
      if (level <= 30) expect(c.cue === 'color' || c.motion || c.layout !== 'row').toBe(true);
      if (level > 30 && level <= 40) expect(c.reverse).toBeGreaterThan(0);
      if (level > 40) expect(c.nogo).toBeGreaterThan(0);
      if (c.cue === 'color') expect(c.rule).toBe('switch');
    }
    // Au niveau 50, tout se mélange.
    const last = flechesLevel(MAX_LEVEL);
    expect([last.dirs, last.cue, last.layout, last.motion]).toEqual([4, 'color', 'mixed', true]);
    expect(last.reverse).toBeGreaterThan(0);
    expect(last.nogo).toBeGreaterThan(0);
    expectTiersRise((level) => {
      const c: FlechesLevel = flechesLevel(level);
      return (
        c.dirs / 2 +
        (c.rule === 'switch' ? 1 : c.rule === 'flank' ? 0.5 : 0) +
        (c.cue === 'color' ? 0.5 : 0) +
        3 * c.reverse +
        4 * c.nogo +
        Number(c.motion) * 0.5 +
        (c.layout === 'row' ? 0 : 0.5) +
        Number(c.jitter) * 0.3 +
        c.incongruent +
        (2000 - c.windowMs) / 1000
      );
    });
  });

  it('laisse la 1re étoile à un bon joueur, rien au hasard ni à qui ne touche rien', () => {
    for (const level of LEVELS) {
      const c = flechesLevel(level);
      // Bon joueur : 27 sur 30, en réagissant à 62 % du temps permis.
      expect(scoreFleches(27, c.windowMs * 0.62, level), `niveau ${level}`).toBeGreaterThanOrEqual(60);
      // Hasard (une direction sur deux ou quatre) ou abstention totale (seules les barrées sont justes).
      expect(scoreFleches(Math.floor(FLECHES_TRIALS / c.dirs), 400, level)).toBe(0);
      expect(scoreFleches(Math.round(FLECHES_TRIALS * c.nogo), null, level)).toBe(0);
    }
  });
});

describe('paliers', () => {
  it('range bien les niveaux 21 à 50 dans les paliers Expert, Maître et Légende', () => {
    expect(tierOfLevel(21)).toBe(2);
    expect(tierOfLevel(40)).toBe(3);
    expect(tierOfLevel(50)).toBe(4);
  });
});
