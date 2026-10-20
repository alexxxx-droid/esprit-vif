import { afterEach, describe, expect, it } from 'vitest';
import { setLang } from '../lang';
import { MAX_LEVEL, TIERS } from '../levels';
import { createRng, deriveSeed, hashSeed } from '../rng';
import {
  CALCUL_COUNT,
  CALCUL_LEVELS,
  calculRule,
  evaluate,
  formatCalc,
  formatSolved,
  generateCalcul,
  scoreCalcul,
  type CalcOp,
  type CalcQuestion,
} from './calcul';
import { DIABLE_LEVELS, diableLevel, diableLevelLabel, diableRule, generateDiable, generateDiableBacks, scoreDiable } from './diable';
import { generateMonnaie, MONNAIE_LEVELS, monnaieLevel, monnaieLevelLabel, monnaieRule, scoreMonnaie } from './monnaie';
import { generatePluie, PLUIE_DURATION_MS, PLUIE_LEVELS, pluieCount, pluieLevel, pluieLevelLabel, pluieRule, pluieTarget, pluieTrapCount, scorePluie } from './pluie';
import { GAMES } from './registry';
import {
  generateTotalRound,
  scoreTotal,
  TOTAL_LEVELS,
  TOTAL_MAX_LENGTH,
  totalLevel,
  totalLevelLabel,
  totalMaxValue,
  totalPerfectPoints,
  totalRule,
} from './total';

/**
 * Les 50 niveaux des cinq jeux de calcul (Calcul éclair, Total cumulé, Calcul du diable, Monnaie,
 * Pluie de calculs) : niveaux 1 à 20 inchangés, niveaux 21 à 50 valides, plus durs palier après palier.
 */

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const NEW_LEVELS = LEVELS.filter((level) => level > 20);
const SEEDS = Array.from({ length: 12 }, (_, i) => i * 7919 + 3);
const LANGS = ['fr', 'en'] as const;

afterEach(() => setLang('fr'));

/** Palier (0 à 4) d'un niveau. */
const tierIndex = (level: number) => TIERS.findIndex((t) => level >= t.from && level <= t.to);
/** Valeur agrégée de chaque palier, dans l'ordre. */
const perTier = (pick: (level: number) => number, combine: (values: number[]) => number) =>
  TIERS.map((t) => combine(LEVELS.filter((l) => l >= t.from && l <= t.to).map(pick)));
const nonDecreasing = (values: readonly number[]) => values.every((v, i) => i === 0 || v >= values[i - 1]);
const nonIncreasing = (values: readonly number[]) => values.every((v, i) => i === 0 || v <= values[i - 1]);

/** Temps du générateur le plus lent sur quelques graines, en ms. */
function slowest(run: (seed: number) => unknown): number {
  let worst = 0;
  for (const seed of SEEDS) {
    const start = performance.now();
    run(seed);
    worst = Math.max(worst, performance.now() - start);
  }
  return worst;
}

// ---------- Niveaux 1 à 20 inchangés ----------

/** Empreinte des niveaux 1 à 20, relevée AVANT l'ajout des niveaux 21 à 50 (même générateur, même graine). */
const q = (c: CalcQuestion) => `${c.operands.join(',')}|${c.ops.join(',')}|${String(c.paren)}|${formatCalc(c)}=${c.answer}`;
const FP_SEEDS = [1, 42, 2024, 99_999, 123_456_789];
const both = (text: () => string) => {
  setLang('en');
  const en = text();
  setLang('fr');
  return `${text()}/${en}`;
};

function fingerprints(level: number) {
  const calcul = [
    ...FP_SEEDS.map((s) => generateCalcul(createRng(s), level).map(q).join(';')),
    [scoreCalcul(30_000, 0, level), scoreCalcul(90_000, 3, level), scoreCalcul(150_000, 1, level)].join(),
    both(() => CALCUL_LEVELS[level - 1].label),
  ].join('#');
  const total = [
    ...FP_SEEDS.flatMap((s) =>
      [3, 4, 6, 9, 14].map((len) => {
        const r = generateTotalRound(createRng(s * 31 + len), len, level);
        return `${r.steps.join(',')}=${r.total}`;
      }),
    ),
    JSON.stringify(totalLevel(level)),
    [totalPerfectPoints(level), scoreTotal(10, level), scoreTotal(25, level)].join(),
    both(() => totalLevelLabel(level)),
  ].join('#');
  const d = diableLevel(level);
  const diable = [
    ...FP_SEEDS.map((s) => generateDiable(createRng(s), level).map(q).join(';')),
    [d.n, d.count, d.best, d.worst, d.kinds.join()].join(),
    [scoreDiable(d.count - 2, 50_000, level), scoreDiable(d.count, 20_000, level), scoreDiable(3, 200_000, level)].join(),
    both(() => diableLevelLabel(level)),
  ].join('#');
  const m = monnaieLevel(level);
  const monnaie = [
    ...FP_SEEDS.flatMap((s) =>
      [0, 1, 2, 3, 4, 5].map((i) => {
        const x = generateMonnaie(createRng(deriveSeed(s, i)), level);
        return `${x.mode}|${x.items.join(',')}|${x.price}|${x.paid}|${x.answer}`;
      }),
    ),
    [m.mode, m.values.join(' '), m.minItems, m.maxItems, m.maxPrice, m.paidWith.join(' '), m.hideMs, m.target].join(),
    [scoreMonnaie(3, level), scoreMonnaie(5, level), scoreMonnaie(9, level)].join(),
    both(() => monnaieLevelLabel(level)),
  ].join('#');
  const p = pluieLevel(level);
  const pluie = [
    ...FP_SEEDS.map((s) =>
      generatePluie(createRng(s), level)
        .map((drop) => `${drop.id}:${drop.lane}:${drop.spawnAt}:${q(drop.question)}`)
        .join(';'),
    ),
    [p.kinds.join(' '), p.fallMs, p.spawnMs, p.lanes, pluieTarget(level)].join(),
    [scorePluie(5, level), scorePluie(12, level)].join(),
    // L'exemple de calcul (« ex. 347 × 6 ») est venu après coup : le reste du libellé ne bouge pas.
    both(() => pluieLevelLabel(level).replace(/ · (ex\.|e\.g\.) [^·]*$/, '')),
  ].join('#');
  return { calcul, total, diable, monnaie, pluie };
}

const BEFORE: Record<keyof ReturnType<typeof fingerprints>, number[]> = {
  calcul: [
    2816167022, 2310282386, 673378716, 1813875996, 4162732868, 2542785625, 644486041, 2032253790, 2349536123, 924334386, 2673028486, 254263502,
    538307091, 3123581710, 3917335766, 3494538407, 3520155811, 2594400758, 1900808367, 1109553292,
  ],
  total: [
    3080958701, 364457864, 3966928761, 1622265553, 2610955595, 2749451277, 2669725798, 3913117782, 1238965772, 392654393, 1256522711, 68795010,
    2513072060, 758663860, 2702088786, 98232604, 1939464367, 4215643178, 1806953009, 3130930527,
  ],
  diable: [
    470262548, 3506652858, 3803273918, 2801840363, 798677928, 395203040, 3268129144, 4111657939, 2432278279, 198929177, 1854391541, 3867577488,
    3826040026, 2809458032, 2887587560, 3688599767, 3288924208, 908705559, 66201891, 228037406,
  ],
  monnaie: [
    297156020, 382431269, 2799508091, 3810348072, 1707065736, 645489854, 675510357, 2655613841, 3826191041, 3077858711, 105580558, 3660869484,
    1013027291, 552611956, 2679738791, 1808470287, 1500064964, 237994956, 2352661899, 3525718860,
  ],
  pluie: [
    3391577487, 2617388023, 1934646337, 110576886, 4095854607, 2961208418, 2165263596, 1330817923, 3304481609, 3250127911, 1645402957, 4095777221,
    708198429, 1595109457, 3425017047, 3032222069, 4005276426, 2708224272, 4048190421, 2303234049,
  ],
};

/** Règles d'intro des niveaux 1 à 20 (français et anglais), relevées avant le changement. */
const RULES = {
  calcul: calculRule,
  total: totalRule,
  diable: diableRule,
  monnaie: monnaieRule,
  pluie: pluieRule,
} as const;

const RULES_BEFORE: Record<keyof typeof RULES, number[]> = {
  calcul: [
    3099446503, 3099446503, 3099446503, 3099446503, 956451784, 3099446503, 956451784, 3099446503, 956451784, 3099446503, 3099446503, 956451784,
    3099446503, 3099446503, 956451784, 956451784, 956451784, 3099446503, 956451784, 956451784,
  ],
  total: Array.from({ length: 20 }, () => 1397813152),
  diable: [
    2059156690, 2059156690, 2059156690, 2291424186, 2291424186, 2059156690, 2291424186, 3690139518, 2291424186, 3690139518, 2291424186, 3690139518,
    2291424186, 3690139518, 3088100522, 3690139518, 3088100522, 3690139518, 3088100522, 3088100522,
  ],
  monnaie: [
    19234792, 19234792, 19234792, 641644271, 19234792, 19234792, 641644271, 19234792, 19234792, 641644271, 19234792, 641644271, 19234792, 19234792,
    641644271, 19234792, 19234792, 641644271, 19234792, 19234792,
  ],
  pluie: Array.from({ length: 20 }, () => 3083513530),
};

describe('niveaux 1 à 20 des jeux de calcul', () => {
  it('génèrent exactement les mêmes parties, avec les mêmes barèmes et libellés', () => {
    for (let level = 1; level <= 20; level++) {
      const f = fingerprints(level);
      for (const game of Object.keys(BEFORE) as (keyof typeof BEFORE)[]) {
        expect(`${game} ${level}: ${hashSeed(f[game])}`).toBe(`${game} ${level}: ${BEFORE[game][level - 1]}`);
      }
    }
  });

  it('gardent la même règle d’intro', () => {
    const now = Object.fromEntries(
      (Object.keys(RULES) as (keyof typeof RULES)[]).map((game) => [game, Array.from({ length: 20 }, (_, i) => hashSeed(both(() => RULES[game](i + 1))))]),
    );
    expect(now).toEqual(RULES_BEFORE);
  });
});

// ---------- Tables complètes ----------

describe('tables des jeux de calcul', () => {
  it('ont une ligne par niveau, jusqu’au niveau 50', () => {
    for (const table of [CALCUL_LEVELS, TOTAL_LEVELS, DIABLE_LEVELS, MONNAIE_LEVELS, PLUIE_LEVELS]) expect(table).toHaveLength(MAX_LEVEL);
  });

  it('sont reliées au registre, avec règle et libellé dans les deux langues à chaque niveau', () => {
    expect(GAMES.calcul.rule).toBe(calculRule);
    expect(GAMES.total.rule).toBe(totalRule);
    expect(GAMES.diable.rule).toBe(diableRule);
    expect(GAMES.monnaie.rule).toBe(monnaieRule);
    expect(GAMES.pluie.rule).toBe(pluieRule);
    for (const id of ['calcul', 'total', 'diable', 'monnaie', 'pluie'] as const) {
      for (const level of LEVELS) {
        setLang('fr');
        const fr = `${GAMES[id].rule(level)} | ${GAMES[id].levelLabel(level)}`;
        setLang('en');
        const en = `${GAMES[id].rule(level)} | ${GAMES[id].levelLabel(level)}`;
        expect(fr).not.toBe(en);
        for (const text of [fr, en]) expect(text).not.toMatch(/undefined|NaN|false|null/);
      }
    }
  });

  it('donnent un libellé différent à chaque niveau de Calcul éclair', () => {
    for (const lang of LANGS) {
      setLang(lang);
      expect(new Set(CALCUL_LEVELS.map((c) => c.label)).size).toBe(MAX_LEVEL);
    }
  });
});

// ---------- Calcul éclair ----------

/** Le calcul « à l'endroit » d'un trou, une fois le nombre caché remis à sa place. */
function holeHolds(q: CalcQuestion): boolean {
  const [shown, result] = q.operands;
  const op = q.ops[0] as Exclude<CalcOp, '%'>;
  const left = q.paren === 'holeLeft' ? q.answer : shown;
  const right = q.paren === 'holeLeft' ? shown : q.answer;
  return evaluate([left, right], [op]) === result;
}

const isHole = (q: CalcQuestion) => q.paren === 'holeLeft' || q.paren === 'holeRight';

describe('Calcul éclair, niveaux 1 à 50', () => {
  it('pose 20 calculs justes, entiers, positifs, à 4 chiffres au plus, en français comme en anglais', () => {
    for (const lang of LANGS) {
      setLang(lang);
      for (const level of LEVELS) {
        expect(slowest((seed) => generateCalcul(createRng(seed), level))).toBeLessThan(50);
        for (const seed of SEEDS) {
          const questions = generateCalcul(createRng(seed), level);
          expect(questions).toHaveLength(CALCUL_COUNT);
          for (const c of questions) {
            expect(c.answer).toBe(evaluate(c.operands, c.ops, c.paren));
            expect(Number.isInteger(c.answer)).toBe(true);
            expect(c.answer).toBeGreaterThanOrEqual(0);
            expect(c.answer).toBeLessThan(10_000);
            for (const n of c.operands) expect(Number.isInteger(n) && n > 0).toBe(true);
            const text = formatCalc(c);
            expect(text).not.toMatch(/undefined|NaN/);
            expect(text.length).toBeLessThanOrEqual(22);
            if (isHole(c)) {
              expect(text).toContain('?');
              expect(c.answer).toBeGreaterThan(0);
              expect(holeHolds(c)).toBe(true);
            }
            if (c.ops[0] === '%') {
              expect(c.ops).toHaveLength(1);
              expect((c.operands[0] * c.operands[1]) % 100).toBe(0);
              expect(text).toMatch(lang === 'fr' ? /% de / : /% of /);
            }
            c.ops.forEach((op, i) => {
              if (op === '÷' && !isHole(c)) expect(c.operands[i] % c.operands[i + 1]).toBe(0);
            });
          }
        }
      }
    }
  });

  it('écrit les nouvelles formes comme on les lit', () => {
    expect(formatCalc({ operands: [7, 23, 8], ops: ['×', '−'], paren: 'right', answer: 105 })).toBe('7 × (23 − 8)');
    expect(formatCalc({ operands: [13, 8, 17, 9], ops: ['+', '×', '−'], paren: 'both', answer: 168 })).toBe('(13 + 8) × (17 − 9)');
    expect(formatCalc({ operands: [7, 84], ops: ['×'], paren: 'holeLeft', answer: 12 })).toBe('? × 7 = 84');
    expect(formatCalc({ operands: [48, 113], ops: ['+'], paren: 'holeRight', answer: 65 })).toBe('48 + ? = 113');
    expect(evaluate([7, 23, 8], ['×', '−'], 'right')).toBe(105);
    expect(evaluate([13, 8, 17, 9], ['+', '×', '−'], 'both')).toBe(168);
    expect(evaluate([6, 14], ['÷'], 'holeLeft')).toBe(84);
    expect(evaluate([96, 8], ['÷'], 'holeRight')).toBe(12);
    expect(evaluate([120, 47], ['−'], 'holeRight')).toBe(73);
    expect(evaluate([27, 58], ['−'], 'holeLeft')).toBe(85);
    expect(evaluate([25, 84], ['%'])).toBe(21);
    expect(evaluate([56, 7, 6], ['÷', '×'])).toBe(48);
    // La correction remet le nombre caché à sa place.
    expect(formatSolved({ operands: [7, 84], ops: ['×'], paren: 'holeLeft', answer: 12 })).toBe('12 × 7 = 84');
    expect(formatSolved({ operands: [3, 4], ops: ['+'], paren: false, answer: 7 })).toBe('3 + 4 = 7');
    setLang('en');
    expect(formatCalc({ operands: [25, 84], ops: ['%'], paren: false, answer: 21 })).toBe('25% of 84');
    setLang('fr');
    expect(formatCalc({ operands: [25, 84], ops: ['%'], paren: false, answer: 21 })).toBe('25 % de 84');
  });

  it('durcit le barème niveau après niveau, sans jamais le relâcher', () => {
    expect(nonDecreasing(CALCUL_LEVELS.map((c) => c.best))).toBe(true);
    expect(nonDecreasing(CALCUL_LEVELS.map((c) => c.worst))).toBe(true);
    for (const c of CALCUL_LEVELS) expect(c.worst).toBeGreaterThan(c.best);
  });

  it('apporte de nouvelles familles de calculs à chaque palier', () => {
    for (const tier of TIERS.slice(2)) {
      const before = new Set(CALCUL_LEVELS.slice(0, tier.from - 1).flatMap((c) => c.kinds));
      const fresh = CALCUL_LEVELS.slice(tier.from - 1, tier.to)
        .flatMap((c) => c.kinds)
        .filter((k) => !before.has(k));
      expect(new Set(fresh).size).toBeGreaterThanOrEqual(5);
    }
  });

  it('garde la première étoile (60 pts) accessible : au moins 6 s par calcul au-delà du niveau 20', () => {
    for (const level of NEW_LEVELS) {
      const { best, worst } = CALCUL_LEVELS[level - 1];
      const star = best + 0.4 * (worst - best);
      expect(scoreCalcul(star * 1000, 0, level)).toBe(60);
      expect(star / CALCUL_COUNT).toBeGreaterThanOrEqual(6);
    }
  });
});

// ---------- Total cumulé ----------

describe('Total cumulé, niveaux 1 à 50', () => {
  it('garde des manches justes et rapides à toutes les longueurs', () => {
    for (const level of LEVELS) {
      const { start } = totalLevel(level);
      expect(slowest((seed) => generateTotalRound(createRng(seed), TOTAL_MAX_LENGTH, level))).toBeLessThan(50);
      for (const seed of SEEDS) {
        for (let length = 3; length <= TOTAL_MAX_LENGTH; length++) {
          const round = generateTotalRound(createRng(seed * 13 + length), length, level);
          expect(round.steps).toHaveLength(length);
          expect(Number.isInteger(round.total)).toBe(true);
          expect(String(round.total).length).toBeLessThanOrEqual(String(totalMaxValue(level)).length);
          if (round.kinds) {
            expect(round.kinds).toHaveLength(length);
            expect(round.kinds[0]).toBe('add');
            round.kinds.forEach((kind, i) => {
              if (kind === 'decoy') expect(round.kinds?.[i - 1]).not.toBe('decoy');
              if (kind === 'times') expect(round.kinds?.[i - 1]).toBe('add');
            });
          }
        }
      }
      // Cinq manches réussies depuis le départ restent sous la longueur maximale.
      expect(start + 4).toBeLessThanOrEqual(TOTAL_MAX_LENGTH);
    }
  });

  it('peut toujours ajouter ou retirer : le plus grand nombre ne dépasse pas la moitié du total maximum', () => {
    for (const level of LEVELS) expect(totalMaxValue(level)).toBeGreaterThanOrEqual(2 * totalLevel(level).maxStep - 1);
  });

  it('montre vraiment des nombres barrés et des multiplications aux niveaux qui en ont', () => {
    for (const level of NEW_LEVELS) {
      const c = totalLevel(level);
      const kinds = SEEDS.flatMap((seed) => generateTotalRound(createRng(seed), 10, level).kinds ?? []);
      expect(kinds.includes('decoy')).toBe(Boolean(c.decoys));
      expect(kinds.includes('times')).toBe(Boolean(c.times));
    }
  });

  it('durcit chaque palier : totaux plus grands, nombres plus grands, défilement plus rapide, rebondissements', () => {
    expect(nonDecreasing(perTier(totalMaxValue, (v) => Math.max(...v)))).toBe(true);
    expect(nonDecreasing(perTier((l) => totalLevel(l).maxStep, (v) => Math.max(...v)))).toBe(true);
    expect(nonIncreasing(perTier((l) => totalLevel(l).stepMs, (v) => Math.min(...v)))).toBe(true);
    expect(nonDecreasing(perTier((l) => totalLevel(l).start, (v) => Math.max(...v)))).toBe(true);
    const twists = (l: number) => Number(Boolean(totalLevel(l).decoys)) + Number(Boolean(totalLevel(l).times));
    expect(nonDecreasing(perTier(twists, (v) => v.reduce((a, b) => a + b, 0)))).toBe(true);
    for (const level of LEVELS) {
      // Jamais un nombre affiché moins de 350 ms ; rien de nouveau avant le niveau 21.
      expect(totalLevel(level).stepMs).toBeGreaterThanOrEqual(350);
      if (level <= 30) expect(twists(level)).toBe(0);
    }
  });
});

// ---------- Calcul du diable ----------

describe('Calcul du diable, niveaux 1 à 50', () => {
  it('pose des calculs justes et un écart toujours valable', () => {
    for (const lang of LANGS) {
      setLang(lang);
      for (const level of LEVELS) {
        const { n, count, varying } = diableLevel(level);
        expect(slowest((seed) => generateDiable(createRng(seed), level))).toBeLessThan(50);
        const seen = new Set<number>();
        for (const seed of SEEDS) {
          const questions = generateDiable(createRng(seed), level);
          expect(questions).toHaveLength(count);
          for (const c of questions) {
            expect(c.answer).toBe(evaluate(c.operands, c.ops, c.paren));
            expect(Number.isInteger(c.answer) && c.answer >= 0).toBe(true);
            expect(formatCalc(c).length).toBeLessThanOrEqual(12);
          }
          const backs = generateDiableBacks(createRng(deriveSeed(seed, 1)), level);
          expect(backs).toHaveLength(count);
          backs.forEach((back, k) => {
            seen.add(back);
            expect(back).toBeGreaterThanOrEqual(1);
            expect(back).toBeLessThanOrEqual(n);
            // Le calcul visé a déjà été montré.
            const target = k + n - back;
            expect(target).toBeGreaterThanOrEqual(0);
            expect(target).toBeLessThan(count);
          });
        }
        if (varying) expect(seen.size).toBe(n);
        else expect([...seen]).toEqual([n]);
      }
    }
  });

  it('durcit chaque palier : plus loin en arrière, calculs effacés, puis écart variable', () => {
    expect(nonDecreasing(perTier((l) => diableLevel(l).n, (v) => Math.max(...v)))).toBe(true);
    expect(nonDecreasing(perTier((l) => diableLevel(l).count, (v) => Math.max(...v)))).toBe(true);
    const twists = (l: number) => Number(Boolean(diableLevel(l).hideMs)) + Number(Boolean(diableLevel(l).varying));
    expect(nonDecreasing(perTier(twists, (v) => v.reduce((a, b) => a + b, 0)))).toBe(true);
    const shortest = perTier((l) => diableLevel(l).hideMs ?? Infinity, (v) => Math.min(...v)).slice(2);
    expect(nonIncreasing(shortest)).toBe(true);
    for (const level of LEVELS) {
      const { hideMs, varying } = diableLevel(level);
      if (level <= 20) expect(twists(level)).toBe(0);
      if (varying) expect(tierIndex(level)).toBeGreaterThanOrEqual(3);
      if (hideMs) expect(hideMs).toBeGreaterThanOrEqual(1000);
    }
  });

  it('donne 60 pts pour un sans-faute au temps le plus lent, à chaque niveau', () => {
    for (const level of LEVELS) {
      const { count, best, worst } = diableLevel(level);
      expect(scoreDiable(count, worst * 1000, level)).toBe(60);
      expect(scoreDiable(count, best * 1000, level)).toBe(100);
      expect(worst).toBeGreaterThan(best);
    }
  });
});

// ---------- Monnaie ----------

describe('Monnaie, niveaux 1 à 50', () => {
  it('compte juste et rend juste, en euros entiers à 4 chiffres au plus', () => {
    for (const lang of LANGS) {
      setLang(lang);
      for (const level of LEVELS) {
        const c = monnaieLevel(level);
        expect(slowest((seed) => generateMonnaie(createRng(seed), level))).toBeLessThan(50);
        for (const seed of SEEDS) {
          for (let i = 0; i < 5; i++) {
            const m = generateMonnaie(createRng(deriveSeed(seed, i)), level);
            expect(m.answer % 100).toBe(0);
            expect(m.answer).toBeGreaterThan(0);
            expect(m.answer / 100).toBeLessThan(10_000);
            if (c.stacks) {
              const piles = new Map<number, number>();
              for (const v of m.items) piles.set(v, (piles.get(v) ?? 0) + 1);
              expect(piles.size).toBeGreaterThanOrEqual(c.stacks.piles[0]);
              expect(piles.size).toBeLessThanOrEqual(c.stacks.piles[1]);
              for (const n of piles.values()) {
                expect(n).toBeGreaterThanOrEqual(2);
                expect(n).toBeLessThanOrEqual(c.stacks.maxCount);
              }
            }
            if (c.basket) {
              const lines = m.lines ?? [];
              expect(lines.length).toBeGreaterThanOrEqual(c.basket.lines[0]);
              expect(lines.length).toBeLessThanOrEqual(c.basket.lines[1]);
              for (const line of lines) {
                expect(line.qty).toBeGreaterThanOrEqual(1);
                expect(line.qty).toBeLessThanOrEqual(c.basket.maxQty);
                expect(line.unit % 100).toBe(0);
                expect(line.unit).toBeGreaterThan(0);
                expect(line.unit).toBeLessThanOrEqual(c.basket.maxUnit * 100);
              }
              const subtotal = lines.reduce((sum, line) => sum + line.unit * line.qty, 0);
              const coupon = m.coupon ?? 0;
              if (!c.basket.coupon) expect(coupon).toBe(0);
              expect(coupon * 2).toBeLessThanOrEqual(subtotal);
              expect(m.price).toBe(subtotal - coupon);
              expect(m.price).toBeLessThan(m.paid);
            } else {
              expect(m.lines).toBeUndefined();
            }
          }
        }
      }
    }
  });

  it('propose vraiment des bons de réduction aux niveaux qui en ont', () => {
    for (const level of NEW_LEVELS) {
      const c = monnaieLevel(level);
      if (!c.basket?.coupon) continue;
      const coupons = SEEDS.map((seed) => generateMonnaie(createRng(seed), level).coupon ?? 0);
      expect(coupons.filter(Boolean).length).toBeGreaterThan(SEEDS.length / 2);
    }
  });

  it('durcit chaque palier : montants plus grands, nouveaux rebondissements, mémoire plus courte', () => {
    /** Le plus grand montant possible d'une question du niveau, en euros. */
    const biggest = (level: number) => {
      const c = monnaieLevel(level);
      if (c.mode === 'change') return c.maxPrice / 100;
      return (Math.max(...c.values) * (c.stacks ? c.stacks.piles[1] * c.stacks.maxCount : c.maxItems)) / 100;
    };
    expect(nonDecreasing(perTier(biggest, (v) => Math.max(...v)))).toBe(true);
    const twists = (l: number) => Number(Boolean(monnaieLevel(l).stacks)) + Number(Boolean(monnaieLevel(l).basket)) + Number(Boolean(monnaieLevel(l).basket?.coupon));
    expect(nonDecreasing(perTier(twists, (v) => v.reduce((a, b) => a + b, 0)))).toBe(true);
    for (const level of LEVELS) {
      const c = monnaieLevel(level);
      if (level <= 20) expect(twists(level)).toBe(0);
      if (c.hideMs) expect(c.hideMs).toBeGreaterThanOrEqual(1000);
      // Piles cachées : au moins 0,7 s par pile pour les lire.
      if (c.stacks && c.hideMs) expect(c.hideMs / c.stacks.piles[1]).toBeGreaterThanOrEqual(700);
      expect(c.target).toBeGreaterThanOrEqual(3);
      expect(scoreMonnaie(c.target, level)).toBe(100);
    }
  });
});

// ---------- Pluie de calculs ----------

describe('Pluie de calculs, niveaux 1 à 50', () => {
  it('prévoit une pluie juste, dans les temps, avec le bon nombre de pièges', () => {
    for (const lang of LANGS) {
      setLang(lang);
      for (const level of LEVELS) {
        const c = pluieLevel(level);
        expect(slowest((seed) => generatePluie(createRng(seed), level))).toBeLessThan(50);
        for (const seed of SEEDS) {
          const drops = generatePluie(createRng(seed), level);
          expect(drops).toHaveLength(pluieCount(level));
          expect(drops.filter((d) => d.trap)).toHaveLength(pluieTrapCount(level));
          expect(drops[0].trap ?? false).toBe(false);
          expect(drops[1].trap ?? false).toBe(false);
          drops.forEach((drop, i) => {
            expect(Number.isInteger(drop.question.answer) && drop.question.answer >= 0).toBe(true);
            expect(drop.spawnAt).toBeLessThan(PLUIE_DURATION_MS);
            if (i > 0) expect(drop.spawnAt).toBeGreaterThan(drops[i - 1].spawnAt);
            // Les nouveaux niveaux gardent des gouttes assez courtes pour leurs couloirs.
            if (level > 20) expect(formatCalc(drop.question).length).toBeLessThanOrEqual(c.lanes === 4 ? 8 : 9);
          });
          if (c.storm) expect(drops[1].spawnAt - drops[0].spawnAt).toBeLessThan(c.spawnMs);
        }
      }
    }
  });

  it('fixe un objectif autour de 80 % des gouttes à résoudre (pièges exclus)', () => {
    for (const level of LEVELS) {
      const solvable = pluieCount(level) - pluieTrapCount(level);
      expect(pluieTarget(level)).toBeLessThanOrEqual(Math.round(solvable * 0.85));
      expect(pluieTarget(level)).toBeGreaterThanOrEqual(Math.floor(solvable * 0.75));
      expect(pluieTarget(level)).toBeGreaterThanOrEqual(8);
      expect(scorePluie(pluieTarget(level), level)).toBe(100);
    }
  });

  it('durcit chaque palier : averses, puis pièges et brouillard, sans fenêtre de lecture trop courte', () => {
    const twists = (l: number) => Number(Boolean(pluieLevel(l).storm)) + Number(Boolean(pluieLevel(l).traps)) + Number(Boolean(pluieLevel(l).fog));
    expect(nonDecreasing(perTier(twists, (v) => v.reduce((a, b) => a + b, 0)))).toBe(true);
    expect(nonDecreasing(perTier(twists, (v) => Math.max(...v)))).toBe(true);
    for (const level of LEVELS) {
      const c = pluieLevel(level);
      if (level <= 20) expect(twists(level)).toBe(0);
      if (c.traps || c.fog) expect(tierIndex(level)).toBeGreaterThanOrEqual(3);
      // Brouillard : le calcul reste lisible au moins 1,5 s.
      if (c.fog) expect(c.fallMs * c.fog).toBeGreaterThanOrEqual(1500);
      expect(c.spawnMs).toBeGreaterThanOrEqual(1300);
      expect(c.fallMs).toBeGreaterThanOrEqual(2 * c.spawnMs);
    }
  });
});

// ---------- Rejouabilité ----------

describe('niveaux 21 à 50', () => {
  it('rejouent la même partie avec la même graine', () => {
    for (const level of NEW_LEVELS) {
      expect(generateCalcul(createRng(77), level)).toEqual(generateCalcul(createRng(77), level));
      expect(generateTotalRound(createRng(77), 9, level)).toEqual(generateTotalRound(createRng(77), 9, level));
      expect(generateDiableBacks(createRng(77), level)).toEqual(generateDiableBacks(createRng(77), level));
      expect(generateMonnaie(createRng(77), level)).toEqual(generateMonnaie(createRng(77), level));
      expect(generatePluie(createRng(77), level)).toEqual(generatePluie(createRng(77), level));
    }
  });
});
