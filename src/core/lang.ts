/**
 * Langue de l'interface. Le français fait foi : chaque texte s'écrit à côté de sa traduction,
 * `tr('Réglages', 'Settings')`, et le choix se fait à l'affichage. Jamais d'appel à `tr` au
 * chargement d'un module (constantes) : seulement dans des fonctions, des accesseurs (get) ou
 * des composants, sinon le texte resterait figé dans la langue du démarrage.
 */

export type Lang = 'fr' | 'en';
export type LangChoice = 'auto' | Lang;

let current: Lang = 'fr';

export function setLang(next: Lang) {
  current = next;
}

export function lang(): Lang {
  return current;
}

/** Le texte dans la langue de l'interface. */
export function tr(fr: string, en: string): string {
  return current === 'en' ? en : fr;
}

/** Locale pour les dates et les nombres (Intl). */
export function locale(): string {
  return current === 'en' ? 'en-US' : 'fr-FR';
}

/** « Auto » suit la langue du téléphone : français s'il est en français, anglais sinon. */
export function resolveLang(choice: LangChoice, browserLanguage: string): Lang {
  if (choice !== 'auto') return choice;
  return browserLanguage.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}
