import { localized, type Translations } from './lang';

/** Les compagnons au choix : Vif, l'étincelle maison, et sa bande de fruits. */
export type CharacterId = 'vif' | 'pomme' | 'orange' | 'citron' | 'fraise' | 'raisin' | 'poire' | 'pasteque';

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

export const isCharacterId = (value: unknown): value is CharacterId => CHARACTERS.some((c) => c.id === value);

export function characterName(id: CharacterId): string {
  return CHARACTERS.find((c) => c.id === id)?.name ?? 'Vif';
}
