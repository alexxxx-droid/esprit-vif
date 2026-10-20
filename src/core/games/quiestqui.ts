import { CHARACTERS, type CharacterId } from '../characters';
import { byLang } from '../content';
import { tr } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { clampScore } from '../scoring';

/**
 * Qui est qui ? : des compagnons se présentent, chacun avec son prénom ; il faut ensuite
 * retrouver qui est qui. Un visage = un compagnon sur un fond de couleur. Aux niveaux élevés,
 * le même fruit revient sur plusieurs fonds, les prénoms se ressemblent, et l'on demande aussi
 * le prénom d'un visage (et pas seulement le visage d'un prénom).
 * Expert : jusqu'à 12 visages, présentés un par un, six prénoms au choix. Maître : les mêmes visages
 * et les mêmes prénoms reviennent à chaque manche, mais mélangés autrement. Légende : le même fruit
 * jusqu'à quatre fois, et de moins en moins de temps.
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
  /** Combien de fois un même fruit peut revenir dans une manche (moins si ses fonds possibles manquent). */
  sameFruit: 1 | 2 | 3 | 4;
  /** Temps d'étude par visage. */
  studyMs: number;
  /** Part des questions « Quel est son prénom ? » (le reste : « Qui est Léa ? »). */
  nameQuestions: number;
  /** Prénoms qui commencent par la même lettre. */
  lookAlikeNames: boolean;
  /** Prénoms proposés à « Quel est son prénom ? ». */
  nameOptions: number;
  /** Les visages se présentent un par un (chacun `studyMs`) au lieu de tous ensemble. */
  serial: boolean;
  /** Mêmes visages et mêmes prénoms à chaque manche, mais chaque visage change de prénom. */
  rebind: boolean;
  /** Part de bonnes réponses qui vaut 100 pts : 1 jusqu'au niveau 20. */
  full: number;
}

const Q = (people: number, sameFruit: 1 | 2 | 3, studyMs: number, nameQuestions: number, lookAlikeNames = false): QuiLevel => ({
  people,
  sameFruit,
  studyMs,
  nameQuestions,
  lookAlikeNames,
  nameOptions: 4,
  serial: false,
  rebind: false,
  full: 1,
});

interface Twists {
  serial?: boolean;
  options?: number;
  rebind?: boolean;
}

/** Niveaux 21 à 50 : prénoms toujours proches ; `full` : la part de bonnes réponses qui vaut 100 pts. */
const X = (people: number, sameFruit: 3 | 4, studyMs: number, nameQuestions: number, full: number, { serial = false, options = 4, rebind = false }: Twists = {}): QuiLevel => ({
  people,
  sameFruit,
  studyMs,
  nameQuestions,
  lookAlikeNames: true,
  nameOptions: options,
  serial,
  rebind,
  full,
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
  // Expert : un par un, jusqu'à 12 visages, six prénoms au choix.
  X(10, 3, 1700, 0.5, 0.9, { serial: true }),
  X(11, 3, 1400, 0.5, 0.9),
  X(10, 3, 1500, 0.5, 0.9, { serial: true }),
  X(11, 3, 1400, 0.5, 0.9, { options: 6 }),
  X(10, 3, 1300, 0.5, 0.9, { serial: true }),
  X(12, 3, 1400, 0.5, 0.9, { options: 6 }),
  X(11, 3, 1400, 0.5, 0.9, { serial: true }),
  X(12, 3, 1300, 0.75, 0.9, { options: 6 }),
  X(11, 3, 1300, 0.5, 0.9, { serial: true, options: 6 }),
  X(12, 3, 1200, 0.75, 0.9, { options: 6 }),
  // Maître : les mêmes visages changent de prénom à chaque manche.
  X(10, 3, 1300, 0.5, 0.8, { options: 6, rebind: true }),
  X(11, 3, 1300, 0.5, 0.8, { options: 6, rebind: true }),
  X(10, 3, 1300, 0.5, 0.8, { serial: true, rebind: true }),
  X(12, 3, 1300, 0.5, 0.8, { options: 6, rebind: true }),
  X(11, 3, 1300, 0.5, 0.8, { serial: true, rebind: true }),
  X(12, 3, 1200, 0.75, 0.8, { options: 6, rebind: true }),
  X(11, 3, 1200, 0.75, 0.8, { serial: true, options: 6, rebind: true }),
  X(12, 3, 1000, 0.75, 0.8, { options: 6, rebind: true }),
  X(12, 3, 1300, 0.75, 0.8, { serial: true, options: 6, rebind: true }),
  X(12, 3, 1200, 0.75, 0.8, { serial: true, options: 6, rebind: true }),
  // Légende : le même fruit jusqu'à quatre fois, de moins en moins de temps.
  X(12, 4, 1300, 0.75, 0.75, { serial: true, options: 6, rebind: true }),
  X(12, 4, 1250, 0.75, 0.75, { serial: true, options: 6, rebind: true }),
  X(12, 4, 1200, 0.75, 0.75, { serial: true, options: 6, rebind: true }),
  X(12, 4, 1150, 0.75, 0.75, { serial: true, options: 6, rebind: true }),
  X(12, 4, 1100, 0.75, 0.75, { serial: true, options: 6, rebind: true }),
  X(12, 4, 1100, 0.75, 0.7, { serial: true, options: 6, rebind: true }),
  X(12, 4, 1050, 0.75, 0.7, { serial: true, options: 6, rebind: true }),
  X(12, 4, 1000, 0.75, 0.7, { serial: true, options: 6, rebind: true }),
  X(12, 4, 950, 0.75, 0.7, { serial: true, options: 6, rebind: true }),
  X(12, 4, 900, 0.75, 0.7, { serial: true, options: 6, rebind: true }),
];

export function quiLevel(level: number): QuiLevel {
  return pickLevel(QUI_LEVELS, level);
}

export function quiLevelLabel(level: number): string {
  const c = quiLevel(level);
  const study = secondsLabel(c.studyMs);
  return [
    tr(`${c.people} visages`, `${c.people} faces`),
    c.sameFruit > 1 ? tr('fruits en double', 'repeated fruits') : null,
    c.lookAlikeNames ? tr('prénoms proches', 'similar names') : null,
    c.serial ? tr('un par un', 'one at a time') : null,
    c.nameOptions > 4 ? tr(`${c.nameOptions} prénoms au choix`, `${c.nameOptions} name choices`) : null,
    c.rebind ? tr('prénoms échangés à chaque manche', 'names reshuffled each round') : null,
    tr(`${study} chacun`, `${study} each`),
  ]
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

/** Les mêmes, pour une interface en anglais : des prénoms courants là-bas, groupés de la même façon. */
export const QUI_NAMES_EN: readonly string[] = [
  'Lily', 'Leo', 'Lucy', 'Liam', 'Luke', 'Lola', 'Leah', 'Logan',
  'Mia', 'Max', 'Mila', 'Mason', 'Maya', 'Milo', 'Molly', 'Miles',
  'Noah', 'Nora', 'Nina', 'Nate', 'Nick', 'Naomi',
  'Sam', 'Sara', 'Sofia', 'Seth', 'Sadie', 'Simon',
  'Tom', 'Tess', 'Theo', 'Tara', 'Tyler',
  'Ivy', 'Ian', 'Isla', 'Iris', 'Isaac',
  'Jack', 'Jade', 'Jake', 'Julia', 'Jonas',
  'Ava', 'Adam', 'Alice', 'Amy', 'Alex', 'Anna',
  'Chloe', 'Cole', 'Clara', 'Carl', 'Cody',
  'Rose', 'Ryan', 'Ruby', 'Rex', 'Riley',
  'Emma', 'Eli', 'Ella', 'Ethan', 'Evan',
  'Finn', 'Grace', 'Hugo', 'Oscar', 'Paul', 'Victor', 'Zoe', 'Owen', 'Ben', 'Hazel', 'Kate', 'Gus',
];

/** Les prénoms de la langue de l'interface (tirés au début de chaque manche). */
export function quiNames(): readonly string[] {
  return byLang(QUI_NAMES, QUI_NAMES_EN, (c) => c.quiNames);
}

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
  const pool = quiNames();
  if (!lookAlike) return rng.shuffle(pool).slice(0, count);
  // Deux ou trois initiales seulement : Léa, Léo, Lina… se bousculent.
  const byInitial = new Map<string, string[]>();
  for (const name of pool) byInitial.set(name[0], [...(byInitial.get(name[0]) ?? []), name]);
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
    // Jamais plus de copies que de fonds possibles (la poire n'en a que trois).
    const copies = Math.min(sameFruit, QUI_COLORS - CLASHING_COLORS[character].length, count - faces.length);
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
  return { people, questions: quiQuestions(rng, c, people) };
}

/** Une question par personne, dans le désordre : « Qui est … ? » ou « Quel est son prénom ? ». */
function quiQuestions(rng: Rng, c: QuiLevel, people: readonly Person[]): QuiQuestion[] {
  const nameCount = Math.round(c.people * c.nameQuestions);
  const kinds = rng.shuffle(Array.from({ length: c.people }, (_, i) => (i < nameCount ? 'name' : 'face')));
  return rng.shuffle(people.map((_, i) => i)).map((target, k): QuiQuestion => {
    const kind = kinds[k] as QuiQuestion['kind'];
    const others = rng.shuffle(people.map((_, i) => i).filter((i) => i !== target));
    // « Qui est … ? » : tous les visages ; « Quel est son prénom ? » : quatre prénoms (six aux niveaux avancés).
    const options = rng.shuffle(kind === 'face' ? [target, ...others] : [target, ...others.slice(0, c.nameOptions - 1)]);
    return { kind, target, options };
  });
}

export function generateQui(rng: Rng, level: number): QuiRound[] {
  const c = quiLevel(level);
  if (!c.rebind) return Array.from({ length: QUI_ROUNDS }, () => generateQuiRound(rng, level));
  // Mêmes visages, mêmes prénoms, mais un décalage différent à chaque manche : chaque visage change de
  // prénom, et ne retrouve jamais celui d'une manche précédente.
  const first = generateQuiRound(rng, level);
  const faces = first.people.map(({ character, color }) => ({ character, color }));
  const names = first.people.map((p) => p.name);
  const shifts = rng.shuffle(Array.from({ length: faces.length - 1 }, (_, i) => i + 1)).slice(0, QUI_ROUNDS - 1);
  const others = shifts.map((shift): QuiRound => {
    const people = rng.shuffle(faces.map((face, i) => ({ ...face, name: names[(i + shift) % names.length] })));
    return { people, questions: quiQuestions(rng, c, people) };
  });
  return [first, ...others];
}

/** Part de bonnes réponses, sur toutes les manches ; aux niveaux 21 et plus, 100 pts dès la part `full`. */
export function scoreQui(correct: number, total: number, level = 1): number {
  return total ? clampScore((correct / total / quiLevel(level).full) * 100) : 0;
}
