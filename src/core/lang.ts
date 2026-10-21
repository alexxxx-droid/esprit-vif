/**
 * Langue de l'interface. Le français fait foi : chaque texte s'écrit à côté de sa traduction
 * anglaise, `tr('Réglages', 'Settings')`. Les autres langues (espagnol, allemand, italien,
 * portugais) viennent des dictionnaires `src/i18n/<langue>.json` : au moment du build, le greffon
 * `scripts/i18n-plugin.ts` ajoute leurs textes en troisième argument, sans toucher au code source.
 * Jamais d'appel à `tr` au chargement d'un module (constantes) : seulement dans des fonctions,
 * des accesseurs (get) ou des composants, sinon le texte resterait figé dans la langue du démarrage.
 */

export type Lang = 'fr' | 'en' | 'es' | 'de' | 'it' | 'pt';
export type LangChoice = 'auto' | Lang;
/** Les langues venues des dictionnaires (le français et l'anglais sont écrits dans le code). */
export type ExtraLang = Exclude<Lang, 'fr' | 'en'>;

export const LANGS: readonly Lang[] = ['fr', 'en', 'es', 'de', 'it', 'pt'];
/**
 * Les langues proposées aux joueurs : une langue n'apparaît (et « Auto » ne la choisit) qu'une fois
 * son dictionnaire et son contenu de jeux complets (`node scripts/i18n.mjs check <langue>`, `src/core/content/<langue>.ts`) :
 * `lang.test.ts` le vérifie.
 */
export const PUBLISHED_LANGS: readonly Lang[] = ['fr', 'en', 'es', 'de', 'it', 'pt'];

/** Le nom de chaque langue, dans cette langue (pour le choix dans les réglages). */
export const LANG_NAMES: Record<Lang, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
};

let current: Lang = 'fr';

export function setLang(next: Lang) {
  current = next;
}

export function lang(): Lang {
  return current;
}

/** Le texte dans la langue de l'interface ; une langue sans traduction retombe sur l'anglais. */
export function tr(fr: string, en: string, more?: Partial<Record<ExtraLang, string>>): string {
  if (current === 'fr') return fr;
  if (current === 'en') return en;
  return more?.[current] ?? en;
}

/** Un texte de table de données dans chaque langue : `{ fr, en }` dans le code, les autres ajoutées au build. */
export type Translations = { fr: string; en: string } & Partial<Record<ExtraLang, string>>;

/** Un texte porté par un objet `{ fr, en, es… }` (tables de données), dans la langue en cours. */
export function localized(text: Translations): string {
  return tr(text.fr, text.en, text);
}

/** Locale pour les dates et les nombres (Intl). */
export function locale(): string {
  return { fr: 'fr-FR', en: 'en-US', es: 'es-ES', de: 'de-DE', it: 'it-IT', pt: 'pt-BR' }[current];
}

/** « Auto » suit la langue du téléphone ; une langue non prise en charge donne l'anglais. */
export function resolveLang(choice: LangChoice, browserLanguage: string): Lang {
  if (choice !== 'auto') return choice;
  const code = browserLanguage.toLowerCase().slice(0, 2);
  return (PUBLISHED_LANGS as readonly string[]).includes(code) ? (code as Lang) : 'en';
}

/** Accord en nombre : 0 et 1 au singulier en français et en portugais du Brésil, seulement 1 ailleurs. */
export function isSingular(count: number): boolean {
  const n = Math.abs(count);
  return current === 'fr' || current === 'pt' ? n < 2 : n === 1;
}
