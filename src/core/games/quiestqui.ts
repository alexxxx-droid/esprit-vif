import { CHARACTERS, type CharacterId } from '../characters';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { clampScore } from '../scoring';

/**
 * Qui est qui ? : des compagnons se présentent, chacun avec son prénom ; il faut ensuite
 * retrouver qui est qui. Un visage = un compagnon sur un fond de couleur. Aux niveaux élevés,
 * le même fruit revient sur plusieurs fonds, les prénoms se ressemblent, et l'on demande aussi
 * le prénom d'un visage (et pas seulement le visage d'un prénom).
 */

export const QUI_ROUNDS = 3;
export const QUI_COLORS = 6;

/**
 * Fonds où le compagnon se verrait mal (0 bleu, 1 orange, 2 vert d'eau, 3 jaune, 4 rose, 5 vert) :
 * pas de pastèque sur du vert ni de citron sur du jaune.
 */
export const CLASHING_COLORS: Record<CharacterId, readonly number[]> = {
  vif: [0],
  pomme: [1, 4],
  orange: [1, 3],
  citron: [3],
  fraise: [1, 4],
  raisin: [],
  poire: [2, 3, 5],
  pasteque: [2, 5],
};

export interface QuiLevel {
  people: number;
  /** Combien de fois un même fruit peut revenir dans une manche. */
  sameFruit: 1 | 2 | 3;
  /** Temps d'étude par visage. */
  studyMs: number;
  /** Part des questions « Quel est son prénom ? » (le reste : « Qui est Léa ? »). */
  nameQuestions: number;
  /** Prénoms qui commencent par la même lettre. */
  lookAlikeNames: boolean;
}

const Q = (people: number, sameFruit: 1 | 2 | 3, studyMs: number, nameQuestions: number, lookAlikeNames = false): QuiLevel => ({
  people,
  sameFruit,
  studyMs,
  nameQuestions,
  lookAlikeNames,
});

export const QUI_LEVELS: readonly QuiLevel[] = [
  Q(3, 1, 2600, 0),
  Q(4, 1, 2500, 0),
  Q(4, 1, 2200, 0.25),
  Q(5, 1, 2300, 0.25),
  Q(5, 1, 2000, 0.5),
  Q(6, 1, 2100, 0.5),
  Q(6, 2, 2100, 0.5),
  Q(6, 2, 1900, 0.5),
  Q(7, 2, 2000, 0.5),
  Q(7, 2, 1800, 0.5, true),
  Q(7, 2, 1700, 0.5, true),
  Q(8, 2, 1800, 0.5, true),
  Q(8, 2, 1700, 0.5, true),
  Q(8, 3, 1700, 0.5, true),
  Q(9, 2, 1700, 0.5, true),
  Q(9, 3, 1600, 0.5, true),
  Q(9, 3, 1500, 0.5, true),
  Q(10, 3, 1500, 0.5, true),
  Q(10, 3, 1400, 0.5, true),
  Q(10, 3, 1300, 0.5, true),
];

export function quiLevel(level: number): QuiLevel {
  return pickLevel(QUI_LEVELS, level);
}

export function quiLevelLabel(level: number): string {
  const c = quiLevel(level);
  return [`${c.people} visages`, c.sameFruit > 1 ? 'fruits en double' : null, c.lookAlikeNames ? 'prénoms proches' : null, `${secondsLabel(c.studyMs)} chacun`]
    .filter(Boolean)
    .join(' · ');
}

/** Prénoms courts et variés ; regroupés par initiale pour les niveaux où ils se ressemblent. */
export const QUI_NAMES: readonly string[] = [
  'Léa', 'Léo', 'Lina', 'Lou', 'Louise', 'Lucas', 'Léon', 'Lise',
  'Malo', 'Mila', 'Margot', 'Mathis', 'Marius', 'Maya', 'Max', 'Manon',
  'Nina', 'Noé', 'Nils', 'Nora', 'Nathan', 'Naël',
  'Sami', 'Sacha', 'Simon', 'Sofia', 'Selma', 'Salomé',
  'Théo', 'Tom', 'Tess', 'Timéo', 'Tara',
  'Inès', 'Iris', 'Ilyes', 'Ivan', 'Ilan',
  'Jade', 'Jules', 'Julie', 'Joé', 'Jonas',
  'Alba', 'Adam', 'Alice', 'Arthur', 'Anna', 'Axel',
  'Clara', 'Camille', 'Côme', 'Chloé', 'Cyril',
  'Rose', 'Robin', 'Romy', 'Raphaël', 'Rayan',
  'Emma', 'Eden', 'Elsa', 'Ethan', 'Eliott',
  'Félix', 'Fanny', 'Gabin', 'Hugo', 'Oscar', 'Pablo', 'Victor', 'Zoé', 'Yanis', 'Basile', 'Agathe', 'Paul',
];

export interface Person {
  character: CharacterId;
  color: number;
  name: string;
}

export interface QuiQuestion {
  kind: 'face' | 'name';
  /** La personne demandée (indice dans `people`). */
  target: number;
  /** Les choix proposés : des indices de personnes, dans l'ordre d'affichage. */
  options: number[];
}

export interface QuiRound {
  people: Person[];
  questions: QuiQuestion[];
}

function pickNames(rng: Rng, count: number, lookAlike: boolean): string[] {
  if (!lookAlike) return rng.shuffle(QUI_NAMES).slice(0, count);
  // Deux ou trois initiales seulement : Léa, Léo, Lina… se bousculent.
  const byInitial = new Map<string, string[]>();
  for (const name of QUI_NAMES) byInitial.set(name[0], [...(byInitial.get(name[0]) ?? []), name]);
  const groups = rng.shuffle([...byInitial.values()].filter((g) => g.length >= 4));
  const names: string[] = [];
  for (const group of groups) {
    for (const name of rng.shuffle(group).slice(0, Math.ceil(count / 2))) if (names.length < count) names.push(name);
    if (names.length >= count) break;
  }
  return rng.shuffle(names);
}

function pickFaces(rng: Rng, count: number, sameFruit: number): Pick<Person, 'character' | 'color'>[] {
  const faces: Pick<Person, 'character' | 'color'>[] = [];
  for (const character of rng.shuffle(CHARACTERS.map((c) => c.id))) {
    // Les fruits en double viennent en tête de liste : ils doivent vraiment se ressembler.
    const copies = Math.min(sameFruit, count - faces.length);
    for (let k = 0; k < copies && faces.length < count; k++) {
      faces.push({ character, color: 0 });
    }
    if (faces.length >= count) break;
  }
  // Une couleur différente pour deux visages du même fruit ; sinon, couleurs tirées au sort.
  const colors = new Map<CharacterId, number[]>();
  return faces.map((face) => {
    const taken = colors.get(face.character) ?? [];
    const free = Array.from({ length: QUI_COLORS }, (_, i) => i).filter((c) => !taken.includes(c) && !CLASHING_COLORS[face.character].includes(c));
    const color = rng.pick(free);
    colors.set(face.character, [...taken, color]);
    return { ...face, color };
  });
}

export function generateQuiRound(rng: Rng, level: number): QuiRound {
  const c = quiLevel(level);
  const faces = pickFaces(rng, c.people, c.sameFruit);
  const names = pickNames(rng, c.people, c.lookAlikeNames);
  const people = rng.shuffle(faces.map((face, i) => ({ ...face, name: names[i] })));
  const nameCount = Math.round(c.people * c.nameQuestions);
  const kinds = rng.shuffle(Array.from({ length: c.people }, (_, i) => (i < nameCount ? 'name' : 'face')));
  const questions = rng.shuffle(people.map((_, i) => i)).map((target, k): QuiQuestion => {
    const kind = kinds[k] as QuiQuestion['kind'];
    const others = rng.shuffle(people.map((_, i) => i).filter((i) => i !== target));
    // « Qui est … ? » : tous les visages ; « Quel est son prénom ? » : quatre prénoms.
    const options = rng.shuffle(kind === 'face' ? [target, ...others] : [target, ...others.slice(0, 3)]);
    return { kind, target, options };
  });
  return { people, questions };
}

export function generateQui(rng: Rng, level: number): QuiRound[] {
  return Array.from({ length: QUI_ROUNDS }, () => generateQuiRound(rng, level));
}

/** Part de bonnes réponses, sur toutes les manches. */
export function scoreQui(correct: number, total: number): number {
  return total ? clampScore((correct / total) * 100) : 0;
}
