import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../levels';
import { createRng, deriveSeed } from '../rng';
import { ECHO_LEAD_MS, ECHO_LEVELS, ECHO_MAX_LENGTH, ECHO_MAX_MS, echoLength, echoLevel, echoLevelLabel, echoRule, echoShown, generateEcho, scoreEcho } from './echo';
import { GAMES } from './registry';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const tier = (from: number) => LEVELS.slice(from - 1, from + 9);
/** Un joueur rapide : 0,45 s par note rejouée, 0,6 s de pause entre deux tours. */
const REPLAY_MS = 450;
const BETWEEN_MS = 600;

describe('Écho', () => {
  it('a 50 niveaux et dure une minute au plus', () => {
    expect(ECHO_LEVELS).toHaveLength(MAX_LEVEL);
    expect(GAMES.echo.duration).toBe('≈ 1 min');
    expect(ECHO_MAX_MS).toBe(60_000);
    expect(echoRule(1)).toContain('minute');
  });

  it('tire une suite sans trois fois la même touche, et des dispositions qui changent vraiment', () => {
    for (const level of LEVELS) {
      const c = echoLevel(level);
      for (let s = 0; s < 10; s++) {
        const game = generateEcho(createRng(deriveSeed(level, s)), level);
        expect(game.sequence).toHaveLength(ECHO_MAX_LENGTH);
        game.sequence.forEach((pad, i) => {
          expect(pad).toBeGreaterThanOrEqual(0);
          expect(pad).toBeLessThan(c.pads);
          if (i >= 2) expect(pad === game.sequence[i - 1] && pad === game.sequence[i - 2]).toBe(false);
        });
        game.layouts.forEach((layout, k) => {
          expect([...layout].sort()).toEqual(Array.from({ length: c.pads }, (_, i) => i));
          const moved = layout.filter((p, i) => p !== i).length;
          if (c.shuffle && k > 0) expect(moved).toBeGreaterThanOrEqual(c.pads / 2);
          else expect(moved).toBe(0);
        });
      }
    }
  });

  it('ne joue que les nouvelles notes à partir du palier Maître, sauf au premier tour et après une erreur', () => {
    const c = echoLevel(31);
    expect(echoShown(c, 0, false)).toEqual({ from: 0, to: 3 });
    expect(echoShown(c, 2, false)).toEqual({ from: 4, to: 5 });
    expect(echoShown(c, 2, true)).toEqual({ from: 0, to: 5 });
    expect(echoShown(echoLevel(45), 1, false)).toEqual({ from: 3, to: 5 });
    expect(echoShown(echoLevel(5), 3, false)).toEqual({ from: 0, to: 5 });
  });

  it('laisse le temps d’atteindre les 100 points avant la fin de la minute', () => {
    for (const level of LEVELS) {
      const c = echoLevel(level);
      let elapsed = 0;
      let turn = 0;
      for (; echoLength(c, turn) < c.full; turn++);
      expect(echoLength(c, turn), `niveau ${level}`).toBe(c.full);
      for (let t = 0; t <= turn; t++) {
        const { from, to } = echoShown(c, t, false);
        elapsed += ECHO_LEAD_MS + (to - from) * (c.lightMs + c.gapMs) + to * REPLAY_MS + BETWEEN_MS;
      }
      expect(elapsed, `niveau ${level}`).toBeLessThanOrEqual(55_000);
    }
  });

  it('apporte une nouvelle façon de jouer à chaque palier', () => {
    expect(tier(1).every((l) => echoLevel(l).pads === 4 && !echoLevel(l).shuffle && !echoLevel(l).onlyNew)).toBe(true);
    expect(tier(11).every((l) => echoLevel(l).pads === 6)).toBe(true);
    expect(tier(21).every((l) => echoLevel(l).shuffle)).toBe(true);
    expect(tier(31).every((l) => echoLevel(l).onlyNew && echoLevel(l).add === 1)).toBe(true);
    expect(tier(41).every((l) => echoLevel(l).onlyNew && echoLevel(l).add === 2)).toBe(true);
    for (const from of [1, 11, 21, 31, 41]) expect(new Set(tier(from).map(echoLevelLabel)).size).toBeGreaterThanOrEqual(5);
  });

  it('note la plus longue suite rejouée', () => {
    for (const level of LEVELS) {
      const { zero, full } = echoLevel(level);
      expect(scoreEcho(full, level)).toBe(100);
      expect(scoreEcho(zero, level)).toBe(0);
      expect(scoreEcho(Math.ceil(zero + 0.6 * (full - zero)), level)).toBeGreaterThanOrEqual(60);
    }
  });
});
