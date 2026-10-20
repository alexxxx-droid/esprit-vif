import { localized, type Translations } from './lang';

/** Les compagnons au choix : Vif, l'étincelle maison, et sa bande de fruits (trois sont réservés à Premium). */
export type CharacterId = 'vif' | 'pomme' | 'orange' | 'citron' | 'fraise' | 'raisin' | 'poire' | 'pasteque' | 'kiwi' | 'ananas' | 'myrtille';

export interface Character {
  id: CharacterId;
  /** Nom affiché, dans la langue de l'interface (accesseur : lu à l'affichage). */
  name: string;
}

/** Un compagnon et son nom dans chaque langue, choisi à la lecture. */
const character = (id: CharacterId, name: Translations): Character => ({
  id,
  get name() {
    return localized(name);
  },
});

/**
 * Les compagnons gratuits. « Qui est qui ? » tire ses visages de cette liste : la garder telle
 * quelle, sinon les parties d'une même graine changeraient.
 */
export const CHARACTERS: readonly Character[] = [
  character('vif', { fr: 'Vif', en: 'Vif' }),
  character('pomme', { fr: 'Pomme', en: 'Apple' }),
  character('orange', { fr: 'Orange', en: 'Orange' }),
  character('citron', { fr: 'Citron', en: 'Lemon' }),
  character('fraise', { fr: 'Fraise', en: 'Strawberry' }),
  character('raisin', { fr: 'Raisin', en: 'Grape' }),
  character('poire', { fr: 'Poire', en: 'Pear' }),
  character('pasteque', { fr: 'Pastèque', en: 'Watermelon' }),
];

/** Les compagnons exclusifs d'Esprit Vif Premium. */
export const PREMIUM_CHARACTERS: readonly Character[] = [
  character('kiwi', { fr: 'Kiwi', en: 'Kiwi' }),
  character('ananas', { fr: 'Ananas', en: 'Pineapple' }),
  character('myrtille', { fr: 'Myrtille', en: 'Blueberry' }),
];

export const ALL_CHARACTERS: readonly Character[] = [...CHARACTERS, ...PREMIUM_CHARACTERS];

export const isCharacterId = (value: unknown): value is CharacterId => ALL_CHARACTERS.some((c) => c.id === value);

export const isPremiumCharacter = (id: CharacterId) => PREMIUM_CHARACTERS.some((c) => c.id === id);

/** Le compagnon montré : un compagnon Premium redevient Vif sans Premium (le choix est gardé). */
export function shownCharacter(id: CharacterId, premium: boolean): CharacterId {
  return !premium && isPremiumCharacter(id) ? 'vif' : id;
}

export function characterName(id: CharacterId): string {
  return ALL_CHARACTERS.find((c) => c.id === id)?.name ?? 'Vif';
}
