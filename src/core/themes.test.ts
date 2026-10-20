import { describe, expect, it } from 'vitest';
import { isPaletteChoice, nextLevelTheme, resolveTheme, seasonThemeOf, THEMES, themeUnlocked } from './themes';

describe('thèmes de l’appli', () => {
  it('suit les saisons de l’année, l’hiver passant le Nouvel An', () => {
    expect(seasonThemeOf('2026-10-20').id).toBe('automne');
    expect(seasonThemeOf('2026-12-25').id).toBe('hiver');
    expect(seasonThemeOf('2027-01-15').id).toBe('hiver');
    expect(seasonThemeOf('2027-03-20').id).toBe('printemps');
    expect(seasonThemeOf('2027-07-14').id).toBe('ete');
    expect(seasonThemeOf('2027-09-21').id).toBe('ete');
    expect(seasonThemeOf('2027-09-22').id).toBe('automne');
  });

  it('applique la saison en « Auto », le classique si les saisons sont coupées', () => {
    expect(resolveTheme('auto', '2026-10-20', true, 1, false)).toMatchObject({ id: 'automne', decor: 'automne' });
    expect(resolveTheme('auto', '2026-10-20', false, 1, false)).toMatchObject({ id: 'classique', decor: null });
  });

  it('débloque les thèmes au niveau de joueur, les exclusifs avec Premium seulement', () => {
    const ocean = THEMES.find((t) => t.id === 'ocean')!;
    const sakura = THEMES.find((t) => t.id === 'sakura')!;
    expect(themeUnlocked(ocean, 4, false)).toBe(false);
    expect(themeUnlocked(ocean, 5, false)).toBe(true);
    expect(themeUnlocked(sakura, 50, false)).toBe(false);
    expect(themeUnlocked(sakura, 1, true)).toBe(true);
    expect(THEMES.filter((t) => t.unlock.kind === 'premium')).toHaveLength(3);
  });

  it('retombe sur « Auto » si le thème choisi n’est plus accessible, sans rien inventer', () => {
    expect(resolveTheme('ocean', '2026-10-20', true, 3, false).id).toBe('automne');
    expect(resolveTheme('sakura', '2026-10-20', true, 50, true)).toMatchObject({ id: 'sakura', decor: 'sakura' });
    expect(resolveTheme('sakura', '2026-10-20', false, 50, false).id).toBe('classique');
  });

  it('annonce le prochain thème à gagner, et reconnaît les choix valides', () => {
    expect(nextLevelTheme(1)?.id).toBe('ocean');
    expect(nextLevelTheme(12)?.id).toBe('corail');
    expect(nextLevelTheme(40)).toBeNull();
    expect(isPaletteChoice('auto')).toBe(true);
    expect(isPaletteChoice('foret')).toBe(true);
    expect(isPaletteChoice('hiver')).toBe(false);
  });
});
