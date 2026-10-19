import { tr } from './lang';

/** Les compagnons au choix : Vif, l'étincelle maison, et sa bande de fruits. */
export type CharacterId = 'vif' | 'pomme' | 'orange' | 'citron' | 'fraise' | 'raisin' | 'poire' | 'pasteque';

export interface Character {
  id: CharacterId;
  /** Nom affiché, dans la langue de l'interface (accesseur : lu à l'affichage). */
  name: string;
}

/** Un compagnon et son nom dans les deux langues, choisi à la lecture. */
const character = (id: CharacterId, fr: string, en: string): Character => ({
  id,
  get name() {
    return tr(fr, en);
  },
});

export const CHARACTERS: readonly Character[] = [
  character('vif', 'Vif', 'Vif'),
  character('pomme', 'Pomme', 'Apple'),
  character('orange', 'Orange', 'Orange'),
  character('citron', 'Citron', 'Lemon'),
  character('fraise', 'Fraise', 'Strawberry'),
  character('raisin', 'Raisin', 'Grape'),
  character('poire', 'Poire', 'Pear'),
  character('pasteque', 'Pastèque', 'Watermelon'),
];

export const isCharacterId = (value: unknown): value is CharacterId => CHARACTERS.some((c) => c.id === value);

export function characterName(id: CharacterId): string {
  return CHARACTERS.find((c) => c.id === id)?.name ?? 'Vif';
}
