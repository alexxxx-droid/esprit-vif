import { describe, expect, it } from 'vitest';
import { setLang } from '../lang';
import { MAX_LEVEL, TIERS } from '../levels';
import { createRng } from '../rng';
import { generateLucioles, isCatchable, LUCIOLES_LEVELS, luciolesLevel, luciolesLevelLabel, luciolesRule, neighbours, scoreLucioles } from './lucioles';

const tier = (t: number) => LUCIOLES_LEVELS.slice(TIERS[t].from - 1, TIERS[t].to);

describe('Lucioles, niveaux 1 à 50', () => {
  it('a une ligne par niveau, des libellés et une règle dans les deux langues', () => {
    expect(LUCIOLES_LEVELS).toHaveLength(MAX_LEVEL);
    for (const lang of ['fr', 'en'] as const) {
      setLang(lang);
      for (let level = 1; level <= MAX_LEVEL; level++) {
        expect(luciolesLevelLabel(level).length).toBeGreaterThan(5);
        expect(luciolesRule(level).length).toBeGreaterThan(20);
      }
    }
    setLang('fr');
    expect(luciolesRule(1)).toMatch(/luciole/);
    setLang('en');
    expect(luciolesRule(41)).toMatch(/Gold/);
    setLang('fr');
  });

  it('apporte une nouvelle façon de jouer à chaque palier', () => {
    expect(tier(0).every((c) => !c.pairs && !c.reds && !c.hops && !c.golds && c.size <= 4)).toBe(true);
    expect(tier(1).every((c) => c.pairs > 0 && !c.reds)).toBe(true);
    expect(tier(2).every((c) => c.reds === 0.25 && !c.hops)).toBe(true);
    expect(tier(3).every((c) => c.reds > 0 && c.hops > 0 && !c.golds)).toBe(true);
    expect(tier(4).every((c) => c.size === 5 && c.reds > 0 && c.hops > 0 && c.golds > 0)).toBe(true);
  });

  it('durcit le rythme : la fenêtre raccourcit dans chaque palier et d’un palier à l’autre', () => {
    for (let t = 0; t < TIERS.length; t++) {
      const windows = tier(t).map((c) => c.windowMs);
      for (let i = 1; i < windows.length; i++) expect(windows[i]).toBeLessThan(windows[i - 1]);
      if (t > 0) expect(windows.at(-1)).toBeLessThanOrEqual(tier(t - 1).at(-1)!.windowMs);
    }
    expect(luciolesLevel(1)).toMatchObject({ size: 3, windowMs: 1300 });
    expect(luciolesLevel(50).windowMs).toBe(500);
  });

  it('garde des objectifs atteignables', () => {
    for (const c of LUCIOLES_LEVELS) {
      expect(c.target).toBeGreaterThan(30);
      expect(c.target).toBeLessThan(90);
    }
  });
});

describe('Lucioles, vagues', () => {
  it('rejoue exactement la même partie pour une même graine', () => {
    expect(generateLucioles(createRng(42), 31)).toEqual(generateLucioles(createRng(42), 31));
    expect(generateLucioles(createRng(42), 31)).not.toEqual(generateLucioles(createRng(43), 31));
  });

  it('ne met jamais deux lucioles dans la même case au même moment, sauts compris', () => {
    for (const level of [1, 15, 25, 35, 45, 50]) {
      const size = luciolesLevel(level).size;
      for (const wave of generateLucioles(createRng(level), level)) {
        const cells = wave.lucioles.flatMap((l) => (l.hopTo === undefined ? [l.cell] : [l.cell, l.hopTo]));
        expect(new Set(cells).size).toBe(cells.length);
        for (const l of wave.lucioles) {
          expect(l.cell).toBeLessThan(size * size);
          if (l.hopTo !== undefined) expect(neighbours(l.cell, size)).toContain(l.hopTo);
        }
        // Une vague garde toujours au moins une luciole à attraper quand elle en a deux.
        if (wave.lucioles.length === 2) expect(wave.lucioles.some(isCatchable)).toBe(true);
      }
    }
  });

  it('ne rallume pas aussitôt la case de la vague précédente', () => {
    const waves = generateLucioles(createRng(7), 5);
    for (let i = 1; i < waves.length; i++) expect(waves[i].lucioles[0].cell).not.toBe(waves[i - 1].lucioles[0].cell);
  });

  it('garde la bonne part de rouges en Expert, de voyageuses en Maître, de dorées en Légende', () => {
    const share = (level: number, test: (l: { kind: string; hopTo?: number }) => boolean) => {
      const all = generateLucioles(createRng(level * 31), level, 2000).flatMap((w) => w.lucioles);
      return all.filter(test).length / all.length;
    };
    expect(share(25, (l) => l.kind === 'red')).toBeGreaterThan(0.2);
    expect(share(25, (l) => l.kind === 'red')).toBeLessThan(0.3);
    expect(share(1, (l) => l.kind !== 'normal' || l.hopTo !== undefined)).toBe(0);
    expect(share(38, (l) => l.hopTo !== undefined)).toBeGreaterThan(0.3);
    expect(share(45, (l) => l.kind === 'gold')).toBeGreaterThan(0.12);
  });

  it('a une grille de 5 × 5 où chaque case du bord a moins de voisines que le centre', () => {
    expect(neighbours(0, 5)).toEqual([1, 5, 6]);
    expect(neighbours(12, 5)).toHaveLength(8);
  });
});

describe('Lucioles, score', () => {
  it('reste entre 0 et 100, et ne donne rien à qui touche au hasard ou ne fait rien', () => {
    expect(scoreLucioles(0, 0, 0, 1)).toBe(0);
    expect(scoreLucioles(0, 40, 0, 1)).toBe(0);
    expect(scoreLucioles(10, 0, 40, 1)).toBe(0);
    expect(scoreLucioles(500, 0, 0, 50)).toBe(100);
    const target = luciolesLevel(1).target;
    expect(scoreLucioles(target, 0, 0, 1)).toBe(100);
    expect(scoreLucioles(Math.round(target * 0.6), 0, 0, 1)).toBe(60);
  });

  it('retire une demi-luciole par ratée et une par mauvais appui', () => {
    const t = luciolesLevel(1).target;
    expect(scoreLucioles(30, 4, 0, 1)).toBe(Math.round((100 * 28) / t));
    expect(scoreLucioles(30, 0, 4, 1)).toBe(Math.round((100 * 26) / t));
  });
});
