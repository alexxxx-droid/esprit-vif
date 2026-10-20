import { afterEach, describe, expect, it } from 'vitest';
import { NBSP } from '../format';
import { lang, setLang } from '../lang';
import { MAX_LEVEL, TIERS } from '../levels';
import { createRng } from '../rng';
import {
  discAt,
  FILATURE_ARENA,
  FILATURE_LEVELS,
  FILATURE_R,
  FILATURE_TRIALS,
  filatureLevel,
  filatureLevelLabel,
  filatureRule,
  generateFilature,
  generateFilatureTrial,
  scoreFilature,
} from './filature';

const original = lang();
afterEach(() => setLang(original));

describe('Filature, niveaux 1 à 50', () => {
  it('a une ligne par niveau', () => {
    expect(FILATURE_LEVELS).toHaveLength(MAX_LEVEL);
  });

  it('commence doucement : 2 disques parmi 6, lents, sans nuage ni à-coup ni leurre', () => {
    expect(filatureLevel(1)).toMatchObject({ targets: 2, dots: 6, clouds: 0, joltMs: 0, lures: 0 });
    expect(filatureLevel(1).speed).toBeLessThanOrEqual(20);
  });

  it('apporte une nouveauté à chaque palier : nuages, puis à-coups, puis leurres', () => {
    for (let level = 1; level <= 20; level++) expect(filatureLevel(level)).toMatchObject({ clouds: 0, joltMs: 0, lures: 0 });
    for (let level = 21; level <= 30; level++) expect(filatureLevel(level).clouds).toBeGreaterThan(0);
    for (let level = 31; level <= 40; level++) expect(filatureLevel(level).joltMs).toBeGreaterThan(0);
    for (let level = 41; level <= 50; level++) {
      const c = filatureLevel(level);
      expect(c.lures).toBeGreaterThan(0);
      expect(c.clouds).toBeGreaterThan(0);
      expect(c.joltMs).toBeGreaterThan(0);
    }
  });

  it('durcit chaque palier : jamais moins de disques à suivre ni de disques en tout qu’au palier d’avant', () => {
    for (let t = 1; t < TIERS.length; t++) {
      const before = FILATURE_LEVELS.slice(TIERS[t - 1].from - 1, TIERS[t - 1].to);
      const tier = FILATURE_LEVELS.slice(TIERS[t].from - 1, TIERS[t].to);
      const avg = (rows: typeof tier, key: 'targets' | 'dots' | 'speed') => rows.reduce((s, r) => s + r[key], 0) / rows.length;
      expect(avg(tier, 'targets')).toBeGreaterThanOrEqual(avg(before, 'targets'));
      expect(avg(tier, 'dots')).toBeGreaterThanOrEqual(avg(before, 'dots'));
      expect(Math.max(...tier.map((r) => r.targets))).toBeGreaterThanOrEqual(Math.max(...before.map((r) => r.targets)));
    }
    // Au sein d'un palier, le nombre de disques à suivre ne redescend jamais.
    for (const tier of TIERS) {
      const rows = FILATURE_LEVELS.slice(tier.from - 1, tier.to);
      for (let i = 1; i < rows.length; i++) expect(rows[i].targets).toBeGreaterThanOrEqual(rows[i - 1].targets);
    }
  });

  it('écrit un libellé et une règle à chaque niveau, en français et en anglais', () => {
    for (const language of ['fr', 'en'] as const) {
      setLang(language);
      for (let level = 1; level <= MAX_LEVEL; level++) {
        expect(filatureLevelLabel(level).length).toBeGreaterThan(5);
        expect(filatureRule(level).length).toBeGreaterThan(30);
      }
    }
    setLang('fr');
    expect(filatureLevelLabel(1)).toBe(`2 à suivre parmi 6 · 4${NBSP}s`);
    expect(filatureLevelLabel(45)).toMatch(/2 nuages · à-coups · leurres/);
    setLang('en');
    expect(filatureRule(41)).toMatch(/Lures flash/);
  });
});

describe('Filature, mouvement et score', () => {
  it('donne exactement les mêmes trajectoires pour une même graine', () => {
    const a = generateFilature(createRng(42), 37);
    const b = generateFilature(createRng(42), 37);
    expect(a).toEqual(b);
    expect(a).toHaveLength(FILATURE_TRIALS);
    expect(generateFilature(createRng(43), 37)).not.toEqual(a);
  });

  it('garde chaque disque dans l’arène, à chaque pas, à tous les paliers', () => {
    for (const level of [1, 15, 25, 35, 45, 50]) {
      const trial = generateFilatureTrial(createRng(level * 7), level);
      const c = filatureLevel(level);
      expect(trial.targets).toHaveLength(c.targets);
      expect(new Set(trial.targets).size).toBe(c.targets);
      expect(trial.clouds).toHaveLength(c.clouds);
      expect(trial.lures).toHaveLength(c.lures);
      for (const frame of trial.frames) {
        expect(frame).toHaveLength(c.dots * 2);
        for (const v of frame) {
          expect(v).toBeGreaterThanOrEqual(FILATURE_R - 0.01);
          expect(v).toBeLessThanOrEqual(FILATURE_ARENA - FILATURE_R + 0.01);
        }
      }
      // Un leurre n'est jamais un disque à suivre.
      for (const lure of trial.lures) expect(trial.targets).not.toContain(lure.disc);
    }
  });

  it('bouge vraiment, et laisse les disques à peu près séparés à l’arrivée (on doit pouvoir les toucher)', () => {
    const trial = generateFilatureTrial(createRng(5), 20);
    const first = discAt(trial, 0, 0);
    const last = discAt(trial, trial.frames.length - 1, 0);
    expect(Math.hypot(first.x - last.x, first.y - last.y)).toBeGreaterThan(1);
    const end = trial.frames.length - 1;
    const dots = filatureLevel(20).dots;
    for (let i = 0; i < dots; i++) {
      for (let j = i + 1; j < dots; j++) {
        const a = discAt(trial, end, i);
        const b = discAt(trial, end, j);
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(FILATURE_R * 1.6);
      }
    }
  });

  it('donne 100 pour un sans-faute, 0 pour tout faux, et reste borné', () => {
    const t = filatureLevel(1).targets * FILATURE_TRIALS;
    expect(scoreFilature(t, 0, 1)).toBe(100);
    expect(scoreFilature(0, t, 1)).toBe(0);
    expect(scoreFilature(t / 2, 0, 1)).toBe(50);
    for (let correct = 0; correct <= t; correct++) {
      const s = scoreFilature(correct, t - correct, 1);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});
