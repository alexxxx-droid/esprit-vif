import { localized, type Translations } from './lang';

/**
 * Thèmes de l'appli : une couleur d'accent et une teinte de fond, déclinées en clair et en sombre
 * (les couleurs des domaines ne bougent jamais : elles sont validées pour le daltonisme).
 * - Les thèmes de saison s'appliquent d'eux-mêmes (réglage « Auto »), avec leur décor animé.
 * - D'autres se gagnent en montant de niveau de joueur.
 * - Trois sont réservés à Esprit Vif Premium (appli Google Play).
 */

export type SeasonThemeId = 'hiver' | 'printemps' | 'ete' | 'automne';
export type ThemeId = 'classique' | 'ocean' | 'foret' | 'corail' | 'lavande' | 'nuit' | 'or' | 'aurore' | 'sakura' | 'encre';
/** Ce que le joueur choisit : « auto » (la saison) ou un thème précis. */
export type PaletteChoice = 'auto' | ThemeId;

export type ThemeUnlock = { kind: 'free' } | { kind: 'level'; level: number } | { kind: 'premium' };

export interface ThemeDef {
  id: ThemeId;
  name: Translations;
  unlock: ThemeUnlock;
  /** Accent en clair (texte blanc dessus) et en sombre (texte foncé dessus), teinte des fonds. */
  light: string;
  dark: string;
  tint: string;
}

const theme = (id: ThemeId, name: Translations, unlock: ThemeUnlock, light: string, dark: string, tint: string): ThemeDef => ({
  id,
  name,
  unlock,
  light,
  dark,
  tint,
});

const level = (n: number): ThemeUnlock => ({ kind: 'level', level: n });
const PREMIUM: ThemeUnlock = { kind: 'premium' };

/** Contrastes vérifiés : au moins 5,4:1 pour le texte sur l'accent, en clair comme en sombre. */
export const THEMES: readonly ThemeDef[] = [
  theme('classique', { fr: 'Classique', en: 'Classic' }, { kind: 'free' }, '#4b39ef', '#9385ff', '#4b39ef'),
  theme('ocean', { fr: 'Océan', en: 'Ocean' }, level(5), '#0a6680', '#6fd3ee', '#3fb6d6'),
  theme('foret', { fr: 'Forêt', en: 'Forest' }, level(10), '#2b7330', '#8fdc8f', '#5fae63'),
  theme('corail', { fr: 'Corail', en: 'Coral' }, level(15), '#b83b28', '#ff9b86', '#ff8a70'),
  theme('lavande', { fr: 'Lavande', en: 'Lavender' }, level(20), '#7048b8', '#c9a8ff', '#b38cf0'),
  theme('nuit', { fr: 'Nuit étoilée', en: 'Starry night' }, level(30), '#3b3f9e', '#a5b4ff', '#3b4a8f'),
  theme('or', { fr: 'Or', en: 'Gold' }, level(40), '#7d5800', '#ffd36e', '#e0b440'),
  theme('aurore', { fr: 'Aurore boréale', en: 'Northern lights' }, PREMIUM, '#0d6b63', '#5eead4', '#34d399'),
  theme('sakura', { fr: 'Sakura', en: 'Sakura' }, PREMIUM, '#b0355f', '#ffb3cf', '#ffc2d6'),
  theme('encre', { fr: 'Encre', en: 'Ink' }, PREMIUM, '#141414', '#f2f2f2', '#808080'),
];

export interface SeasonThemeDef {
  id: SeasonThemeId;
  name: Translations;
  /** Bornes « MM-JJ » incluses ; l'hiver chevauche le Nouvel An. */
  from: string;
  to: string;
  light: string;
  dark: string;
  tint: string;
}

export const SEASON_THEMES: readonly SeasonThemeDef[] = [
  { id: 'hiver', name: { fr: 'Hiver', en: 'Winter' }, from: '12-21', to: '03-19', light: '#2c66ad', dark: '#8ec5ff', tint: '#7fb3e6' },
  { id: 'printemps', name: { fr: 'Printemps', en: 'Spring' }, from: '03-20', to: '06-20', light: '#b83a72', dark: '#ff9fc8', tint: '#f2a7c6' },
  { id: 'ete', name: { fr: 'Été', en: 'Summer' }, from: '06-21', to: '09-21', light: '#9a5200', dark: '#ffd166', tint: '#ffd166' },
  { id: 'automne', name: { fr: 'Automne', en: 'Autumn' }, from: '09-22', to: '12-20', light: '#ad3f17', dark: '#ffa36c', tint: '#e38b4f' },
];

export const isPaletteChoice = (value: unknown): value is PaletteChoice => value === 'auto' || THEMES.some((t) => t.id === value);

export function themeName(id: ThemeId | SeasonThemeId): string {
  const def = THEMES.find((t) => t.id === id) ?? SEASON_THEMES.find((t) => t.id === id);
  return def ? localized(def.name) : id;
}

/** La saison de l'année pour un jour « AAAA-MM-JJ ». */
export function seasonThemeOf(day: string): SeasonThemeDef {
  const md = day.slice(5);
  return SEASON_THEMES.find((s) => (s.from <= s.to ? md >= s.from && md <= s.to : md >= s.from || md <= s.to)) ?? SEASON_THEMES[0];
}

export function themeUnlocked(def: ThemeDef, rank: number, premium: boolean): boolean {
  if (def.unlock.kind === 'free') return true;
  if (def.unlock.kind === 'premium') return premium;
  return rank >= def.unlock.level;
}

export interface ResolvedTheme {
  /** Thème réellement appliqué : un thème de saison, ou un thème choisi. */
  id: ThemeId | SeasonThemeId;
  light: string;
  dark: string;
  tint: string;
  /** Décor animé à afficher (saison, ou pétales de Sakura). */
  decor: SeasonThemeId | 'sakura' | null;
}

/**
 * Le thème à appliquer. « Auto » : celui de la saison si les thèmes de saison sont gardés, sinon le
 * classique. Un thème choisi mais plus accessible (Premium remboursé, sauvegarde importée) retombe
 * sur « Auto », sans rien effacer du choix.
 */
export function resolveTheme(choice: PaletteChoice, day: string, seasonal: boolean, rank: number, premium: boolean): ResolvedTheme {
  const chosen = choice === 'auto' ? null : THEMES.find((t) => t.id === choice);
  if (chosen && themeUnlocked(chosen, rank, premium)) {
    return { id: chosen.id, light: chosen.light, dark: chosen.dark, tint: chosen.tint, decor: chosen.id === 'sakura' ? 'sakura' : null };
  }
  if (!seasonal) {
    const classic = THEMES[0];
    return { id: classic.id, light: classic.light, dark: classic.dark, tint: classic.tint, decor: null };
  }
  const season = seasonThemeOf(day);
  return { id: season.id, light: season.light, dark: season.dark, tint: season.tint, decor: season.id };
}

/** Le prochain thème à gagner en montant de niveau (null : tous gagnés). */
export function nextLevelTheme(rank: number): (ThemeDef & { unlock: { kind: 'level'; level: number } }) | null {
  const next = THEMES.filter((t): t is ThemeDef & { unlock: { kind: 'level'; level: number } } => t.unlock.kind === 'level' && t.unlock.level > rank).sort(
    (a, b) => a.unlock.level - b.unlock.level,
  )[0];
  return next ?? null;
}
