import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng } from '../rng';
import { evaluate } from './calcul';
import { correspondanceLevel, generateCorrespondance, sameMatch, scoreCorrespondance } from './correspondance';
import { flechesAnswer, flechesLevel, FLECHES_TRIALS, generateFleches, scoreFleches } from './fleches';
import { generatePluie, pluieLevel, PLUIE_DURATION_MS, pluieTarget, scorePluie } from './pluie';
import { describeRule, generateReflexe, isGo, reflexeLevel, REFLEXE_TRIALS, scoreReflexe } from './reflexe';
import { describeShape } from './shapes';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const SEEDS = Array.from({ length: 25 }, (_, i) => i * 3371 + 9);
const bounded = (score: number) => {
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(100);
};

describe('Pluie de calculs', () => {
  it('prévoit des gouttes justes, dans les couloirs, sans deux de suite dans le même', () => {
    for (const level of LEVELS) {
      const config = pluieLevel(level);
      for (const seed of SEEDS.slice(0, 8)) {
        const drops = generatePluie(createRng(seed), level);
        expect(drops.length).toBe(Math.floor(PLUIE_DURATION_MS / config.spawnMs));
        drops.forEach((drop, i) => {
          expect(drop.question.answer).toBe(evaluate(drop.question.operands, drop.question.ops, drop.question.paren));
          expect(drop.lane).toBeLessThan(config.lanes);
          if (i > 0) expect(drop.lane).not.toBe(drops[i - 1].lane);
          expect(drop.spawnAt).toBeLessThan(PLUIE_DURATION_MS);
        });
      }
    }
  });

  it('donne 100 au-delà de l’objectif, borné entre 0 et 100', () => {
    for (const level of LEVELS) {
      expect(scorePluie(pluieTarget(level), level)).toBe(100);
      bounded(scorePluie(3, level));
    }
  });
});

describe('Correspondance express', () => {
  it('indique juste si chaque carte est pareille à celle d’il y a N cartes, environ une fois sur deux', () => {
    for (const level of LEVELS) {
      const { back } = correspondanceLevel(level);
      const deck = generateCorrespondance(createRng(level), level);
      deck.cards.forEach((card, i) => expect(deck.same[i]).toBe(i >= back && sameMatch(card, deck.cards[i - back])));
      const share = deck.same.filter(Boolean).length / deck.cards.length;
      expect(share).toBeGreaterThan(0.3);
      expect(share).toBeLessThan(0.7);
    }
  });

  it('ne récompense pas les réponses au hasard', () => {
    expect(scoreCorrespondance(15, 15, 1)).toBe(0);
    expect(scoreCorrespondance(30, 0, 1)).toBe(100);
    for (const level of LEVELS) bounded(scoreCorrespondance(25, 3, level));
  });
});

describe('Flèches', () => {
  it('respecte la proportion de flèches trompeuses et la consigne', () => {
    for (const level of LEVELS) {
      const config = flechesLevel(level);
      for (const seed of SEEDS.slice(0, 8)) {
        const trials = generateFleches(createRng(seed), level);
        expect(trials).toHaveLength(FLECHES_TRIALS);
        expect(trials.filter((t) => t.center !== t.flank)).toHaveLength(Math.round(FLECHES_TRIALS * config.incongruent));
        for (const t of trials) {
          if (config.rule !== 'switch') expect(t.ask).toBe(config.rule);
          expect(flechesAnswer(t)).toBe(t.ask === 'center' ? t.center : t.flank);
          if (config.dirs === 2) expect(['left', 'right']).toContain(t.center);
        }
      }
    }
  });

  it('ne donne rien au hasard et reste entre 0 et 100', () => {
    expect(scoreFleches(15, 600, 1)).toBe(0);
    expect(scoreFleches(30, 350, 1)).toBe(100);
    for (const level of LEVELS) bounded(scoreFleches(22, 700, level));
  });
});

describe('Réflexe', () => {
  it('marque juste les formes à toucher, selon la règle en cours', () => {
    for (const level of LEVELS) {
      const config = reflexeLevel(level);
      for (const seed of SEEDS.slice(0, 8)) {
        const trials = generateReflexe(createRng(seed), level);
        expect(trials).toHaveLength(REFLEXE_TRIALS);
        for (const t of trials) {
          expect(t.go).toBe(isGo(t.card, config.rules[t.ruleIndex]));
          expect(config.pool).toContain(t.card.shape);
        }
        const noGo = trials.filter((t) => !t.go).length;
        expect(Math.abs(noGo - REFLEXE_TRIALS * config.noGo)).toBeLessThanOrEqual(3);
      }
    }
  });

  it('décrit la règle en mots', () => {
    expect(describeRule({ go: ['circle'], filledOnly: true, inverted: false })).toBe('Touche les ronds pleins');
    expect(describeRule({ go: ['star'], filledOnly: false, inverted: true })).toBe('Touche tout, sauf les étoiles');
  });

  it('pénalise les fausses alertes et reste entre 0 et 100', () => {
    expect(scoreReflexe(20, 0, 0, 10, 250, 1)).toBe(100);
    expect(scoreReflexe(20, 0, 10, 0, 250, 1)).toBe(0);
    for (const level of LEVELS) bounded(scoreReflexe(15, 5, 3, 7, 600, level));
  });
});

describe('Formes', () => {
  it('accorde plein et creux, et dit la rotation', () => {
    expect(describeShape({ shape: 'star', filled: false, rotation: 0 })).toBe('étoile creuse');
    expect(describeShape({ shape: 'circle', filled: true, rotation: 0 })).toBe('rond plein');
    expect(describeShape({ shape: 'flag', filled: true, rotation: 90 })).toBe('drapeau plein, tourné de 90°');
    expect(describeRule({ go: ['star', 'circle'], filledOnly: true, inverted: false })).toBe('Touche les étoiles pleines et les ronds pleins');
  });
});
