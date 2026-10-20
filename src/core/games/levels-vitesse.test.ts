import { afterEach, describe, expect, it } from 'vitest';
import { setLang } from '../lang';
import { MAX_LEVEL, pickLevel, tierOf } from '../levels';
import { createRng, hashSeed } from '../rng';
import { CORRESPONDANCE_LEVELS, correspondanceByValue, correspondanceLevel, correspondanceLevelLabel, generateCorrespondance, sameMatch, scoreCorrespondance } from './correspondance';
import { COUP_LEVELS, coupExpected, coupLevel, coupLevelLabel, generateCoupTrial, scoreCoup } from './coupdoeil';
import { describeRule, generateReflexe, isGo, REFLEXE_LEVELS, reflexeLevel, reflexeLevelLabel, REFLEXE_TRIALS, scoreReflexe } from './reflexe';
import { GAMES } from './registry';
import { generateSchulte, SCHULTE_LEVELS, schulteCells, schulteLevelLabel, schulteSequence, schulteText, schulteTone, scoreSchulte } from './schulte';

/**
 * Les 50 niveaux des jeux de Vitesse (Table de Schulte, Correspondance express, Réflexe, Coup d'œil).
 * Les niveaux 1 à 20 ne doivent pas bouger d'un iota : records et test du jour en dépendent.
 */

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const NEW_LEVELS = LEVELS.filter((level) => level > 20);
const SEEDS = [1, 42, 2026, 987654321];
const LEGACY = Array.from({ length: 20 }, (_, i) => i + 1);
const fingerprint = (data: unknown) => hashSeed(JSON.stringify(data));

afterEach(() => setLang('fr'));

/** Tout ce que produisent les niveaux 1 à 20 (parties, scores, libellés, règles), réduit à une empreinte par jeu. */
function legacyPrints() {
  const labels = (fn: (level: number) => string) =>
    ['fr', 'en'].map((l) => {
      setLang(l as 'fr' | 'en');
      const out = LEGACY.map(fn);
      setLang('fr');
      return out;
    });
  const schulte = LEGACY.map((level) => [
    SEEDS.map((seed) => {
      const b = generateSchulte(createRng(seed), level);
      return [b.size, b.sequence, b.cells, b.tilts, b.scales];
    }),
    [0, 9_000, 20_000, 45_000, 90_000, 200_000].map((ms) => [0, 3].map((e) => scoreSchulte(ms, e, level))),
  ]);
  const correspondance = LEGACY.map((level) => [
    SEEDS.map((seed) => {
      const d = generateCorrespondance(createRng(seed), level);
      return [d.cards.map((c) => (c.kind === 'shape' ? [c.shape.shape, c.shape.filled, c.shape.rotation] : c.text)), d.same];
    }),
    [0, 5, 12, 20, 30, 40].map((c) => [0, 4].map((e) => scoreCorrespondance(c, e, level))),
  ]);
  const reflexe = LEGACY.map((level) => [
    SEEDS.map((seed) => generateReflexe(createRng(seed), level).map((t) => [t.card.shape, t.card.filled, t.card.rotation, t.ruleIndex, t.go, t.gapMs])),
    [300, 450, 600, 800].map((rt) => scoreReflexe(18, 2, 3, 7, rt, level)),
  ]);
  const coup = LEGACY.map((level) => [
    SEEDS.map((seed) => {
      const rng = createRng(seed);
      return Array.from({ length: 6 }, () => {
        const t = generateCoupTrial(rng, level);
        return [t.answer, t.groups.map((g) => g.map((d) => [d.x, d.y, d.r]))];
      });
    }),
    [0, 5, 10, 15, 20].map((c) => [0, 3].map((e) => scoreCoup(c, e, level))),
  ]);
  return {
    schulte: fingerprint([schulte, labels(schulteLevelLabel)]),
    correspondance: fingerprint([correspondance, labels(correspondanceLevelLabel)]),
    reflexe: fingerprint([reflexe, labels(reflexeLevelLabel)]),
    coup: fingerprint([coup, labels(coupLevelLabel)]),
    rules: fingerprint((['schulte', 'correspondance', 'reflexe', 'coupdoeil'] as const).map((id) => labels(GAMES[id].rule))),
  };
}

/** Durée d'un appel, en ms. */
function timed<T>(fn: () => T): [T, number] {
  const start = performance.now();
  const out = fn();
  return [out, performance.now() - start];
}

/** Mots français qui trahiraient un texte anglais non traduit. */
const FRENCH = /\b(Touche|touche|règle|carte|cartes|contre|pour réagir|bleus|pièges|leurres|sans|brouillée|mouvante|formes|lettres|nombres|gris|moins|plus nombreuse)\b/;

describe('Vitesse — les niveaux 1 à 20 ne changent pas', () => {
  it('produisent les mêmes parties, scores, libellés et règles qu’avant (graines fixes, empreintes)', () => {
    // Empreintes relevées avant l'ajout des niveaux 21 à 50.
    expect(legacyPrints()).toEqual({
      schulte: 3813405048,
      correspondance: 1275596207,
      reflexe: 54229200,
      coup: 114852447,
      rules: 3133184483,
    });
  });
});

describe('Vitesse — 50 niveaux, en français et en anglais', () => {
  it('chaque table a MAX_LEVEL niveaux', () => {
    expect(SCHULTE_LEVELS).toHaveLength(MAX_LEVEL);
    expect(CORRESPONDANCE_LEVELS).toHaveLength(MAX_LEVEL);
    expect(REFLEXE_LEVELS).toHaveLength(MAX_LEVEL);
    expect(COUP_LEVELS).toHaveLength(MAX_LEVEL);
    // Les tables ont 50 niveaux ; la maîtrise (51-60) rejoue le niveau 50.
    for (const id of ['schulte', 'correspondance', 'reflexe', 'coupdoeil'] as const) expect(GAMES[id].maxLevel).toBe(MAX_LEVEL + 10);
  });

  it('a un libellé et une règle dans chaque langue, sans trou ni reste de français en anglais', () => {
    for (const lang of ['fr', 'en'] as const) {
      setLang(lang);
      for (const level of LEVELS) {
        for (const id of ['schulte', 'correspondance', 'reflexe', 'coupdoeil'] as const) {
          const texts = [GAMES[id].rule(level), GAMES[id].levelLabel(level)];
          for (const text of texts) {
            expect(text.length).toBeGreaterThan(3);
            expect(text).not.toMatch(/undefined|NaN|null|\[object/);
            if (lang === 'en') expect(text).not.toMatch(FRENCH);
          }
        }
      }
    }
  });

  it('distingue les règles nouvelles en mots, dans les deux langues', () => {
    const rule = (fill: ('filled' | 'hollow')[], go: ('circle' | 'square' | 'star')[], inverted = false) => ({ go, filledOnly: false, inverted, fill });
    expect(describeRule(rule(['hollow', 'filled'], ['circle', 'square']))).toBe('Touche les ronds creux et les carrés pleins');
    expect(describeRule(rule(['hollow'], ['star'], true))).toBe('Touche tout, sauf les étoiles creuses');
    setLang('en');
    expect(describeRule(rule(['hollow', 'filled'], ['circle', 'square']))).toBe('Tap the hollow circles and the filled squares');
    expect(describeRule(rule(['hollow'], ['star'], true))).toBe('Tap everything except the hollow stars');
    expect(GAMES.schulte.rule(41)).toContain('Blue 1, orange 24, blue 2');
    expect(GAMES.correspondance.rule(25)).toContain('three cards back');
  });
});

describe('Table de Schulte — niveaux 21 à 50', () => {
  it('produit des grilles valides, vite, à tous les niveaux', () => {
    for (const level of LEVELS) {
      const c = pickLevel(SCHULTE_LEVELS, level);
      for (const seed of SEEDS) {
        const [board, ms] = timed(() => generateSchulte(createRng(seed), level));
        expect(ms).toBeLessThan(50);
        expect(board.cells).toHaveLength(c.size * c.size);
        expect(new Set(board.cells).size).toBe(board.cells.length);
        expect([...board.cells].sort()).toEqual([...schulteCells(c.size, c.order, c.decoys)].sort());
        for (const id of board.sequence) expect(board.cells).toContain(id);
        expect(c.best).toBeLessThan(c.worst);
      }
    }
  });

  it('garde des cases d’au moins 44 px sur un écran de 360 px (marges de 16 px, 3 px entre cases en 7 × 7)', () => {
    for (const level of LEVELS) {
      const { size } = pickLevel(SCHULTE_LEVELS, level);
      const gap = size >= 7 ? 3 : 6;
      expect((360 - 2 * 16 - gap * (size - 1)) / size).toBeGreaterThanOrEqual(44);
    }
  });

  it('table de Gorbov : bleus montants et orange descendants, en alternance', () => {
    const seq = schulteSequence(7, 'gorbov');
    expect(seq).toHaveLength(49);
    expect(seq.slice(0, 4).map((id) => [schulteTone(id), schulteText(id)])).toEqual([
      [0, '1'],
      [1, '24'],
      [0, '2'],
      [1, '23'],
    ]);
    expect(seq.at(-1)).toBe('25');
    seq.forEach((id, i) => expect(schulteTone(id)).toBe(i % 2));
    expect(schulteSequence(6, 'gorbov').slice(0, 2).map(schulteText)).toEqual(['1', '18']);
  });

  it('leurres : seuls les bleus sont à toucher, chaque nombre a son double orange', () => {
    const board = generateSchulte(createRng(3), 31);
    expect(board.sequence).toEqual(Array.from({ length: 25 }, (_, i) => String(i + 1)));
    const decoys = board.cells.filter((id) => schulteTone(id) === 1);
    expect(decoys).toHaveLength(24);
    expect(decoys.map(schulteText).sort()).toEqual(board.sequence.slice(0, 24).sort());
    expect(schulteSequence(7, 'desc', true)[0]).toBe('25');
  });

  it('monte en difficulté : grandes grilles dès le palier Expert, Gorbov 7 × 7 en Légende, niveau 50 le plus long', () => {
    for (const level of NEW_LEVELS) expect(pickLevel(SCHULTE_LEVELS, level).size).toBeGreaterThanOrEqual(6);
    const legend = LEVELS.filter((level) => tierOf(level) === 'legende').map((level) => pickLevel(SCHULTE_LEVELS, level));
    expect(legend.every((c) => c.size === 7)).toBe(true);
    expect(legend.filter((c) => c.order === 'gorbov').length).toBeGreaterThanOrEqual(6);
    // Temps de la première étoile (60 pts) par case à toucher : il ne baisse pas d'un palier à l'autre.
    const perTarget = (level: number) => {
      const c = pickLevel(SCHULTE_LEVELS, level);
      const targets = schulteSequence(c.size, c.order, c.decoys).length;
      return (c.worst - 0.6 * (c.worst - c.best)) / targets;
    };
    const tierMean = (tier: string) => {
      const values = LEVELS.filter((level) => tierOf(level) === tier).map(perTarget);
      return values.reduce((a, b) => a + b, 0) / values.length;
    };
    const means = ['debutant', 'confirme', 'expert', 'maitre', 'legende'].map(tierMean);
    for (let i = 1; i < means.length; i++) expect(means[i]).toBeGreaterThan(means[i - 1]);
    expect(Math.max(...LEVELS.map(perTarget))).toBe(perTarget(50));
  });

  it('donne 60 pts à un bon joueur du niveau, 0 à un très lent', () => {
    for (const level of NEW_LEVELS) {
      const c = pickLevel(SCHULTE_LEVELS, level);
      const firstStar = (c.worst - 0.6 * (c.worst - c.best)) * 1000;
      expect(scoreSchulte(firstStar - 500, 0, level)).toBeGreaterThanOrEqual(60);
      expect(scoreSchulte(c.worst * 1000, 0, level)).toBe(0);
      expect(scoreSchulte(c.best * 1000, 0, level)).toBe(100);
    }
  });
});

describe('Correspondance express — niveaux 21 à 50', () => {
  it('construit des paquets justes et équilibrés à tous les niveaux, vite', () => {
    for (const level of LEVELS) {
      const { back } = correspondanceLevel(level);
      for (const seed of SEEDS) {
        const [deck, ms] = timed(() => generateCorrespondance(createRng(seed), level));
        expect(ms).toBeLessThan(50);
        deck.cards.forEach((card, i) => expect(deck.same[i]).toBe(i >= back && sameMatch(card, deck.cards[i - back])));
        const share = deck.same.filter(Boolean).length / deck.cards.length;
        expect(share).toBeGreaterThan(0.3);
        expect(share).toBeLessThan(0.7);
        for (const card of deck.cards) {
          if (card.kind === 'text') {
            expect(card.text).toMatch(/^([A-Za-z]|\d{1,2})$/);
            if (card.look === 'pips') expect(card.text).toMatch(/^[1-6]$/);
            if (card.look === 'lower') expect(card.text).toMatch(/^[A-Z]$/);
          }
        }
      }
    }
  });

  it('A = a, 3 = ⚂ : une carte pareille change souvent de dessin', () => {
    const byValue = NEW_LEVELS.filter((level) => correspondanceByValue(correspondanceLevel(level).set) !== null);
    expect(byValue.length).toBeGreaterThanOrEqual(8);
    for (const level of byValue) {
      const deck = generateCorrespondance(createRng(7), level);
      const { back } = correspondanceLevel(level);
      const pairs = deck.cards.map((card, i) => [card, deck.cards[i - back]] as const).filter((_, i) => deck.same[i]);
      const relooked = pairs.filter(([a, b]) => a.kind === 'text' && b.kind === 'text' && (a.look ?? '') !== (b.look ?? '')).length;
      // Le mélange expert compte aussi des formes, qui n'ont qu'un dessin.
      expect(relooked / pairs.length).toBeGreaterThan(correspondanceLevel(level).set === 'mixedHard' ? 0.1 : 0.3);
    }
  });

  it('les pièges reprennent une carte voisine de la bonne', () => {
    const lureShare = (level: number) => {
      const { back } = correspondanceLevel(level);
      let lures = 0;
      let different = 0;
      for (const seed of SEEDS) {
        const deck = generateCorrespondance(createRng(seed), level);
        deck.cards.forEach((card, i) => {
          if (i < back + 1 || deck.same[i]) return;
          different++;
          if (sameMatch(card, deck.cards[i - back + 1]) || (i - back - 1 >= 0 && sameMatch(card, deck.cards[i - back - 1]))) lures++;
        });
      }
      return lures / different;
    };
    // Niveau 46 (pièges une fois sur deux) contre niveau 43 (même jeu de cartes, sans pièges).
    expect(lureShare(46)).toBeGreaterThan(lureShare(43) + 0.25);
  });

  it('monte en difficulté : trois cartes en arrière dès l’Expert, objectifs qui baissent avec l’écart', () => {
    expect(NEW_LEVELS.some((level) => tierOf(level) === 'expert' && correspondanceLevel(level).back === 3)).toBe(true);
    for (const level of LEVELS.filter((l) => tierOf(l) === 'legende')) expect(correspondanceLevel(level).back).toBe(3);
    for (const back of [1, 2, 3] as const) {
      const legacyMin = Math.min(...LEGACY.map(correspondanceLevel).filter((c) => c.back === back).map((c) => c.target));
      const targets = NEW_LEVELS.map(correspondanceLevel)
        .filter((c) => c.back === back)
        .map((c) => c.target);
      targets.forEach((t, i) => {
        if (Number.isFinite(legacyMin)) expect(t).toBeLessThanOrEqual(legacyMin);
        if (i > 0) expect(t).toBeLessThanOrEqual(targets[i - 1]);
      });
    }
  });

  it('ne donne rien au hasard, 60 pts à 60 % de l’objectif', () => {
    for (const level of LEVELS) {
      expect(scoreCorrespondance(15, 15, level)).toBe(0);
      const { target } = correspondanceLevel(level);
      expect(scoreCorrespondance(Math.ceil(target * 0.6), 0, level)).toBeGreaterThanOrEqual(60);
    }
  });
});

describe('Réflexe — niveaux 21 à 50', () => {
  it('marque juste chaque forme, formes changeantes comprises, à tous les niveaux, vite', () => {
    for (const lang of ['fr', 'en'] as const) {
      setLang(lang);
      for (const level of LEVELS) {
        const c = reflexeLevel(level);
        for (const seed of SEEDS) {
          const [trials, ms] = timed(() => generateReflexe(createRng(seed), level));
          expect(ms).toBeLessThan(50);
          expect(trials).toHaveLength(REFLEXE_TRIALS);
          for (const t of trials) {
            const rule = c.rules[t.ruleIndex];
            expect(describeRule(rule).length).toBeGreaterThan(5);
            expect(t.go).toBe(isGo(t.card, rule));
            expect(c.pool).toContain(t.card.shape);
            if (t.lure) {
              expect(c.lures).toBeGreaterThan(0);
              expect(t.go).toBe(false);
              expect(isGo(t.lure, rule)).toBe(true);
              expect(c.pool).toContain(t.lure.shape);
              const [min, max] = c.lureMs ?? [0, 0];
              expect(t.lureMs).toBeGreaterThanOrEqual(min);
              expect(t.lureMs).toBeLessThanOrEqual(max);
            }
          }
          expect(trials.filter((t) => !t.go)).toHaveLength(Math.round(REFLEXE_TRIALS * c.noGo));
        }
      }
    }
  });

  it('alterne vraiment les règles quand elles reviennent', () => {
    for (const level of NEW_LEVELS) {
      const c = reflexeLevel(level);
      const trials = generateReflexe(createRng(5), level);
      const changes = trials.filter((t, i) => i > 0 && t.ruleIndex !== trials[i - 1].ruleIndex).length;
      expect(changes).toBe((c.blocks ?? c.rules.length) - 1);
    }
    // Les formes changeantes existent bien aux niveaux Maître et Légende.
    const lured = (level: number) => SEEDS.reduce((n, seed) => n + generateReflexe(createRng(seed), level).filter((t) => t.lure).length, 0);
    expect(lured(31)).toBeGreaterThan(0);
    expect(lured(50)).toBeGreaterThan(4);
  });

  it('raccourcit la fenêtre sans descendre sous 350 ms', () => {
    for (let level = 21; level <= MAX_LEVEL; level++) {
      expect(reflexeLevel(level).windowMs).toBeLessThanOrEqual(reflexeLevel(level - 1).windowMs);
      expect(reflexeLevel(level).windowMs).toBeGreaterThanOrEqual(350);
    }
    expect(reflexeLevel(MAX_LEVEL).windowMs).toBeLessThanOrEqual(460);
  });

  it('garde la première étoile à portée d’un bon joueur du niveau', () => {
    // Bon joueur : 90 % de bonnes touches et de retenues (75 % sur les formes changeantes),
    // réaction à 82 % de la fenêtre. Il doit faire au moins aussi bien qu'au palier Confirmé (11-20).
    const model = (level: number) => {
      const c = reflexeLevel(level);
      const trials = generateReflexe(createRng(11), level);
      const go = trials.filter((t) => t.go).length;
      const lures = trials.filter((t) => t.lure).length;
      const plain = trials.length - go - lures;
      const rejections = 0.9 * plain + 0.75 * lures;
      return scoreReflexe(0.9 * go, 0.1 * go, plain + lures - rejections, rejections, 0.82 * c.windowMs, level);
    };
    const reference = Math.min(...LEGACY.filter((level) => level > 10).map(model));
    for (const level of NEW_LEVELS) expect(model(level)).toBeGreaterThanOrEqual(reference);
    // Toucher tout, tout le temps : rien.
    for (const level of LEVELS) expect(scoreReflexe(20, 0, 10, 0, 300, level)).toBe(0);
  });
});

describe('Coup d’œil — niveaux 21 à 50', () => {
  it('montre des nuées valides, vite, avec les points gris annoncés', () => {
    for (const level of LEVELS) {
      const c = coupLevel(level);
      const rng = createRng(level * 77);
      const [trials, ms] = timed(() => Array.from({ length: 80 }, () => generateCoupTrial(rng, level)));
      // Le jeu tire 80 essais d'un coup au départ.
      expect(ms).toBeLessThan(250);
      for (const t of trials) {
        const [many, few] = t.answer === 0 ? t.groups : [t.groups[1], t.groups[0]];
        expect(few.length).toBeGreaterThanOrEqual(c.min);
        expect(few.length).toBeLessThanOrEqual(c.max);
        expect(many.length).toBeGreaterThan(few.length);
        if (c.twist) {
          // Le rapport est un plancher : jamais sous 1,06, jamais sous celui du niveau.
          expect(many.length / few.length).toBeGreaterThanOrEqual(c.ratio - 1e-9);
          expect(t.noise ?? []).toHaveLength(c.twist.decoys);
          for (const d of [...many, ...few, ...(t.noise ?? [])]) expect(d.r).toBeGreaterThanOrEqual(1);
        } else {
          expect(t.noise).toBeUndefined();
          expect(t.ask).toBeUndefined();
        }
        expect(coupExpected(t)).toBe(t.ask === 'fewer' ? 1 - t.answer : t.answer);
      }
    }
  });

  it('reste lisible et faisable : rapport ≥ 1,06, affichage ≥ 300 ms, de plus en plus serré', () => {
    for (let level = 2; level <= MAX_LEVEL; level++) {
      const c = coupLevel(level);
      const previous = coupLevel(level - 1);
      expect(c.ratio).toBeGreaterThanOrEqual(1.06);
      expect(c.showMs).toBeGreaterThanOrEqual(300);
      expect(c.ratio).toBeLessThanOrEqual(previous.ratio);
      expect(c.showMs).toBeLessThanOrEqual(previous.showMs);
      expect(c.target).toBeLessThanOrEqual(previous.target);
      expect(c.max + Math.ceil(c.max * c.ratio) + (c.twist?.decoys ?? 0)).toBeLessThanOrEqual(120);
    }
    expect(coupLevel(MAX_LEVEL).showMs).toBe(300);
  });

  it('ni la taille des points ni la quantité d’encre ne trahit la réponse', () => {
    const area = (dots: { r: number }[]) => dots.reduce((sum, d) => sum + d.r * d.r, 0);
    const meanR = (dots: { r: number }[]) => area(dots) / dots.length;
    for (const level of [21, 35, 50]) {
      const rng = createRng(level);
      let inkTells = 0;
      let sizeTells = 0;
      const n = 600;
      for (let k = 0; k < n; k++) {
        const t = generateCoupTrial(rng, level);
        const [a, b] = t.groups;
        if ((area(a) > area(b) ? 0 : 1) === t.answer) inkTells++;
        if ((meanR(a) < meanR(b) ? 0 : 1) === t.answer) sizeTells++;
      }
      expect(inkTells / n).toBeLessThan(0.62);
      expect(sizeTells / n).toBeLessThan(0.62);
      expect(inkTells / n).toBeGreaterThan(0.38);
      expect(sizeTells / n).toBeGreaterThan(0.38);
    }
  });

  it('inverse la question aussi souvent qu’annoncé', () => {
    for (const level of [32, 50]) {
      const { twist } = coupLevel(level);
      const rng = createRng(level);
      const n = 600;
      const fewer = Array.from({ length: n }, () => generateCoupTrial(rng, level)).filter((t) => t.ask === 'fewer').length;
      expect(Math.abs(fewer / n - (twist?.fewer ?? 0))).toBeLessThan(0.07);
    }
  });

  it('ne récompense pas le hasard ; 60 pts à 60 % de l’objectif', () => {
    for (const level of LEVELS) {
      expect(scoreCoup(15, 15, level)).toBe(0);
      expect(scoreCoup(Math.ceil(coupLevel(level).target * 0.6), 0, level)).toBeGreaterThanOrEqual(60);
    }
  });
});
