import { afterEach, describe, expect, it } from 'vitest';
import { setLang } from '../lang';
import { describeShape, fillWord, SHAPE_NAMES, SHAPES, theShape } from './shapes';

describe('Formes', () => {
  afterEach(() => setLang('fr'));

  it('accorde les noms en français', () => {
    expect(theShape('circle')).toBe('le rond');
    expect(theShape('star')).toBe('l’étoile');
    expect(theShape('cross')).toBe('la croix');
    expect(fillWord('star', true, true)).toBe('pleines');
    expect(fillWord('circle', false, true)).toBe('creux');
  });

  it('dit les formes en anglais, l’adjectif avant le nom', () => {
    setLang('en');
    const names = SHAPES.map((s) => SHAPE_NAMES[s]);
    expect(new Set(names).size).toBe(SHAPES.length);
    for (const name of names) expect(name).toMatch(/^[a-z]+$/);
    expect(SHAPE_NAMES.circle).toBe('circle');
    expect(theShape('star')).toBe('the star');
    expect(fillWord('star', true, true)).toBe('filled');
    expect(fillWord('circle', false)).toBe('hollow');
    expect(describeShape({ shape: 'star', filled: false, rotation: 0 })).toBe('hollow star');
    expect(describeShape({ shape: 'flag', filled: true, rotation: 90 })).toBe('filled flag, rotated 90°');
    setLang('fr');
    expect(describeShape({ shape: 'star', filled: false, rotation: 0 })).toBe('étoile creuse');
  });
});
