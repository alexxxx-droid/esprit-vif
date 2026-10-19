import { afterEach, describe, expect, it } from 'vitest';
import { COACH_TIPS, COACH_TIPS_EN, coachTip, coachTips } from './coach';
import { setLang } from './lang';

describe('Le mot du coach en anglais', () => {
  afterEach(() => setLang('fr'));

  it('a un conseil anglais pour chaque conseil français', () => {
    expect(COACH_TIPS_EN).toHaveLength(COACH_TIPS.length);
    expect(new Set(COACH_TIPS_EN).size).toBe(COACH_TIPS_EN.length);
    for (const tip of COACH_TIPS_EN) {
      expect(tip).toMatch(/^[A-Z0-9].*[.!…)]$/u);
      expect(tip).not.toMatch(/'/);
      expect(tip).not.toMatch(/ [:;!?]/);
    }
  });

  it('donne le même conseil du jour dans les deux langues', () => {
    const day = '2026-10-19';
    const fr = coachTip(day);
    setLang('en');
    expect(coachTips()).toBe(COACH_TIPS_EN);
    expect(COACH_TIPS_EN.indexOf(coachTip(day))).toBe(COACH_TIPS.indexOf(fr));
  });
});
