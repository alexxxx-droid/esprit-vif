/** Les compagnons au choix : Vif, l'étincelle maison, et sa bande de fruits. */
export type CharacterId = 'vif' | 'pomme' | 'orange' | 'citron' | 'fraise' | 'raisin' | 'poire' | 'pasteque';

export interface Character {
  id: CharacterId;
  name: string;
}

export const CHARACTERS: readonly Character[] = [
  { id: 'vif', name: 'Vif' },
  { id: 'pomme', name: 'Pomme' },
  { id: 'orange', name: 'Orange' },
  { id: 'citron', name: 'Citron' },
  { id: 'fraise', name: 'Fraise' },
  { id: 'raisin', name: 'Raisin' },
  { id: 'poire', name: 'Poire' },
  { id: 'pasteque', name: 'Pastèque' },
];

export const isCharacterId = (value: unknown): value is CharacterId => CHARACTERS.some((c) => c.id === value);

export function characterName(id: CharacterId): string {
  return CHARACTERS.find((c) => c.id === id)?.name ?? 'Vif';
}
