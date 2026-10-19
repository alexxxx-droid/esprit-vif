import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * Lecture éclair : une phrase, vraie ou fausse ? On lit vite, on juge aussitôt. Chaque idée existe
 * en deux versions (une vraie, une fausse) : on ne peut pas mémoriser « cette phrase est fausse ».
 * Trois paliers : des phrases courtes, puis plus longues, puis des négations et de petits
 * raisonnements où il faut lire jusqu'au bout.
 */

export const LECTURE_DURATION_MS = 60_000;

/** Une idée, en version vraie et en version fausse. */
export type SentencePair = readonly [truth: string, lie: string];

export const SENTENCES: readonly (readonly SentencePair[])[] = [
  // Palier 1 : des phrases courtes.
  [
    ['La neige est froide.', 'La neige est brûlante.'],
    ['Le feu est chaud.', 'Le feu est glacé.'],
    ['Un chat a quatre pattes.', 'Un chat a six pattes.'],
    ['Les oiseaux ont des plumes.', 'Les oiseaux ont des écailles.'],
    ['Le lait est blanc.', 'Le lait est vert.'],
    ['Une semaine a sept jours.', 'Une semaine a dix jours.'],
    ['Les poissons vivent dans l’eau.', 'Les poissons vivent dans les arbres.'],
    ['Le citron est jaune.', 'Le citron est bleu.'],
    ['Une voiture a des roues.', 'Une voiture a des ailes.'],
    ['L’herbe est verte.', 'L’herbe est violette.'],
    ['On dort dans un lit.', 'On dort dans un four.'],
    ['La mer est salée.', 'La mer est sucrée.'],
    ['Un carré a quatre côtés.', 'Un carré a trois côtés.'],
    ['Les vaches donnent du lait.', 'Les vaches donnent de la laine.'],
    ['Une année compte douze mois.', 'Une année compte huit mois.'],
    ['On boit dans un verre.', 'On boit dans une fourchette.'],
    ['La glace fond au soleil.', 'La glace durcit au soleil.'],
    ['Le chien aboie.', 'Le chien miaule.'],
    ['Les abeilles font du miel.', 'Les abeilles font du lait.'],
    ['Un triangle a trois côtés.', 'Un triangle a cinq côtés.'],
    ['On lit un livre.', 'On boit un livre.'],
    ['La pomme est un fruit.', 'La pomme est un outil.'],
    ['Le piano est un instrument.', 'Le piano est un animal.'],
    ['Paris est en France.', 'Paris est en Espagne.'],
    ['Une main a cinq doigts.', 'Une main a sept doigts.'],
    ['On voit avec les yeux.', 'On voit avec les oreilles.'],
    ['On entend avec les oreilles.', 'On entend avec les genoux.'],
    ['Le petit du chat est le chaton.', 'Le petit du chat est le poussin.'],
    ['La fraise est rouge.', 'La fraise est noire.'],
    ['Le mouton a de la laine.', 'Le mouton a des plumes.'],
    ['Deux et deux font quatre.', 'Deux et deux font cinq.'],
    ['Le train roule sur des rails.', 'Le train roule sur l’eau.'],
    ['Un vélo a deux roues.', 'Un vélo a cinq roues.'],
    ['Le lion est un animal.', 'Le lion est une plante.'],
    ['La pluie mouille.', 'La pluie sèche.'],
    ['Les arbres ont des feuilles.', 'Les arbres ont des dents.'],
    ['Lundi vient après dimanche.', 'Lundi vient après mercredi.'],
    ['Le sucre est sucré.', 'Le sucre est salé.'],
    ['On écrit avec un stylo.', 'On écrit avec une cuillère.'],
    ['Le canard sait nager.', 'Le canard sait tricoter.'],
  ],
  // Palier 2 : plus longues, avec des comparaisons.
  [
    ['Un éléphant est bien plus lourd qu’une souris.', 'Une souris est bien plus lourde qu’un éléphant.'],
    ['L’eau gèle quand il fait très froid.', 'L’eau gèle quand il fait très chaud.'],
    ['Une heure compte soixante minutes.', 'Une heure compte cent minutes.'],
    ['Les ours polaires vivent dans les régions froides.', 'Les ours polaires vivent dans les déserts brûlants.'],
    ['Le Soleil se lève à l’est.', 'Le Soleil se lève à l’ouest.'],
    ['La girafe a un cou très long.', 'La girafe a un cou très court.'],
    ['Février est le mois le plus court de l’année.', 'Février est le mois le plus long de l’année.'],
    ['On ouvre un parapluie quand il pleut.', 'On ouvre un parapluie pour couper le pain.'],
    ['Une douzaine d’œufs, cela fait douze œufs.', 'Une douzaine d’œufs, cela fait vingt œufs.'],
    ['Le cœur fait circuler le sang dans le corps.', 'Les cheveux font circuler le sang dans le corps.'],
    ['Un kilomètre est plus long qu’un mètre.', 'Un mètre est plus long qu’un kilomètre.'],
    ['Les chenilles deviennent des papillons.', 'Les chenilles deviennent des oiseaux.'],
    ['Le pain est fait avec de la farine.', 'Le pain est fait avec du sable.'],
    ['Le pôle Nord est une région très froide.', 'Le pôle Nord est une région très chaude.'],
    ['La tortue avance plus lentement que le lièvre.', 'La tortue court plus vite que le cheval.'],
    ['Le dentiste soigne les dents.', 'Le dentiste répare les voitures.'],
    ['Les plantes ont besoin de lumière pour pousser.', 'Les plantes poussent mieux dans le noir complet.'],
    ['Avec le lait, on peut faire du fromage.', 'Avec du jus d’orange, on fait du fromage.'],
    ['Il y a soixante secondes dans une minute.', 'Il y a dix secondes dans une minute.'],
    ['Un avion transporte des passagers dans les airs.', 'Un avion transporte des passagers sous la mer.'],
    ['La Terre tourne autour du Soleil.', 'Le Soleil tourne autour de la Terre.'],
    ['Le boulanger fait du pain et des croissants.', 'Le boulanger répare les voitures et les camions.'],
    ['Les dauphins remontent à la surface pour respirer.', 'Les dauphins n’ont jamais besoin de respirer de l’air.'],
    ['En automne, beaucoup d’arbres perdent leurs feuilles.', 'Au printemps, tous les arbres perdent leurs feuilles.'],
    ['Un bouchon de liège flotte sur l’eau.', 'Une clé en fer flotte sur l’eau.'],
    ['Le hibou chasse surtout la nuit.', 'Le hibou chasse surtout à midi.'],
    ['Le nombre dix est plus grand que le nombre sept.', 'Le nombre sept est plus grand que le nombre dix.'],
    ['Le facteur apporte le courrier dans les boîtes aux lettres.', 'Le facteur apporte le courrier dans les rivières.'],
    ['Les escargots avancent très lentement.', 'Les escargots avancent plus vite qu’une voiture.'],
    ['On fait cuire les pâtes dans de l’eau bouillante.', 'On fait cuire les pâtes dans de l’eau glacée.'],
    ['Le zèbre a des rayures noires et blanches.', 'Le zèbre a des taches rouges et vertes.'],
    ['Midi se trouve au milieu de la journée.', 'Minuit se trouve au milieu de la journée.'],
    ['Un orchestre joue de la musique ensemble.', 'Un orchestre joue au football ensemble.'],
    ['La Lune tourne autour de la Terre.', 'La Terre tourne autour de la Lune.'],
    ['Un litre d’eau pèse environ un kilo.', 'Un litre d’eau pèse environ dix kilos.'],
    ['Les nuages apportent la pluie.', 'Les montagnes apportent la pluie.'],
    ['Un siècle dure cent ans.', 'Un siècle dure dix ans.'],
    ['Le pompier éteint les incendies.', 'Le pompier allume les incendies.'],
    ['Les araignées ont huit pattes.', 'Les araignées ont deux pattes.'],
    ['L’hiver est en général plus froid que l’été en France.', 'L’été est en général plus froid que l’hiver en France.'],
  ],
  // Palier 3 : des négations et de petits raisonnements, à lire jusqu'au bout.
  [
    ['Un poisson ne survit pas longtemps hors de l’eau.', 'Un poisson n’a jamais besoin d’eau pour vivre.'],
    ['Il n’est pas vrai que les chats aboient.', 'Il est vrai que les chats aboient.'],
    ['Les serpents n’ont pas de pattes.', 'Les serpents ont quatre pattes.'],
    ['Une semaine ne compte pas huit jours.', 'Une semaine ne compte pas sept jours.'],
    ['La glace n’est pas chaude.', 'La glace n’est pas froide.'],
    ['Les chiens ne sont pas tous noirs.', 'Tous les chiens, sans exception, sont noirs.'],
    ['Aucun triangle n’a quatre côtés.', 'Certains triangles ont quatre côtés.'],
    ['Si tous les chats sont des animaux, alors mon chat est un animal.', 'Si tous les chats sont des animaux, alors tous les animaux sont des chats.'],
    ['Il est faux de dire qu’un carré a cinq côtés.', 'Il est faux de dire qu’un carré a quatre côtés.'],
    ['Les oiseaux ne savent pas tous voler.', 'Tous les oiseaux, sans exception, savent voler.'],
    ['Ni le lion ni le tigre ne mangent que de l’herbe.', 'Le lion et le tigre ne mangent que de l’herbe.'],
    ['Une minute n’est pas plus longue qu’une heure.', 'Une heure n’est pas plus longue qu’une minute.'],
    ['Sans eau, les plantes finissent par se faner.', 'Sans eau, les plantes poussent plus vite.'],
    ['Personne ne respire sous l’eau sans équipement.', 'Tout le monde respire sous l’eau sans équipement.'],
    ['Pas un seul mois de l’année n’a quarante jours.', 'Au moins un mois de l’année a quarante jours.'],
    ['Ce n’est pas avec les pieds qu’on écrit d’habitude.', 'Ce n’est pas avec les mains qu’on écrit d’habitude.'],
    ['Un nombre pair n’est jamais impair.', 'Un nombre pair est parfois impair.'],
    ['Il n’est pas impossible de voir la Lune en plein jour.', 'Il est impossible de voir la Lune en plein jour.'],
    ['Sept n’est pas un nombre pair.', 'Huit n’est pas un nombre pair.'],
    ['Juste avant mardi, il y a lundi, et non mercredi.', 'Juste avant mardi, il y a mercredi, et non lundi.'],
    ['Une fourmi n’est pas plus grosse qu’un chien.', 'Un chien n’est pas plus gros qu’une fourmi.'],
    ['Le contraire de « monter », ce n’est pas « grimper ».', 'Le contraire de « monter », ce n’est pas « descendre ».'],
    ['Le mot « chat » ne contient pas la lettre O.', 'Le mot « chat » ne contient pas la lettre A.'],
    ['Dix moins trois ne font pas huit.', 'Dix moins trois ne font pas sept.'],
    ['Si Paul est plus grand que Léa, et moi plus grand que Paul, je suis plus grand que Léa.', 'Si Paul est plus grand que Léa, et moi plus grand que Paul, Léa est plus grande que moi.'],
    ['Les roses ne sont pas toutes rouges.', 'Toutes les roses, sans exception, sont rouges.'],
    ['Un enfant n’est jamais plus âgé que ses parents.', 'Un enfant est toujours plus âgé que ses parents.'],
    ['On ne règle pas le réveil pour se coucher, mais pour se lever.', 'On règle le réveil pour se coucher, et non pour se lever.'],
    ['Le mot « soleil » ne commence pas par la lettre L.', 'Le mot « soleil » ne commence pas par la lettre S.'],
    ['Il ne pousse pas de pommes sur un sapin.', 'Les sapins donnent des pommes.'],
    ['Un nombre plus grand que dix n’est jamais plus petit que cinq.', 'Un nombre plus grand que dix est parfois plus petit que cinq.'],
    ['Du jaune mêlé à du rouge ne donne pas du bleu.', 'Du jaune mêlé à du rouge ne donne pas de l’orange.'],
    ['Après jeudi ne vient pas samedi, mais vendredi.', 'Après jeudi ne vient pas vendredi, mais samedi.'],
    ['Un cube n’a aucune face ronde.', 'Un cube n’a aucune face carrée.'],
    ['Une moitié n’est pas plus petite qu’un quart.', 'Un quart n’est pas plus petit qu’une moitié.'],
    ['Le double de quatre n’est pas six.', 'Le double de quatre n’est pas huit.'],
    ['Si demain est samedi, alors aujourd’hui n’est pas lundi.', 'Si demain est samedi, alors aujourd’hui est lundi.'],
    ['Il n’y a pas plus de jours dans un mois que dans une année.', 'Il y a plus de jours dans un mois que dans une année.'],
    ['Quand il gèle, l’eau du lac ne devient pas plus chaude.', 'Quand il gèle, l’eau du lac devient brûlante.'],
    ['Ce n’est pas la vache qui pond les œufs, mais la poule.', 'Ce n’est pas la poule qui pond les œufs, mais la vache.'],
  ],
];

export interface LectureLevel {
  /** Paliers de phrases tirés à ce niveau (1 à 3). */
  tiers: readonly (1 | 2 | 3)[];
  /** Bonnes réponses moins erreurs en 60 s pour 100 pts (au hasard : 0). */
  target: number;
}

const L = (tiers: (1 | 2 | 3)[], target: number): LectureLevel => ({ tiers, target });

export const LECTURE_LEVELS: readonly LectureLevel[] = [
  L([1], 16),
  L([1], 17),
  L([1], 18),
  L([1], 19),
  L([1, 2], 16),
  L([1, 2], 17),
  L([2], 14),
  L([2], 15),
  L([2], 16),
  L([1, 2, 3], 13),
  L([2, 3], 12),
  L([2, 3], 13),
  L([2, 3], 14),
  L([3], 10),
  L([3], 11),
  L([3], 12),
  L([2, 3], 15),
  L([3], 13),
  L([3], 14),
  L([3], 15),
];

export function lectureLevel(level: number): LectureLevel {
  return pickLevel(LECTURE_LEVELS, level);
}

const TIER_LABELS = { 1: 'phrases courtes', 2: 'phrases longues', 3: 'négations' } as const;

export function lectureLevelLabel(level: number): string {
  const c = lectureLevel(level);
  return `${c.tiers.map((t) => TIER_LABELS[t]).join(' et ')} · objectif ${c.target}`;
}

export interface LectureQuestion {
  sentence: string;
  truth: boolean;
}

/**
 * Une suite de phrases : chaque idée sort une fois, dans une version tirée au sort. Pour les plus
 * rapides, un second passage suit, mélangé autrement et avec des versions tirées à nouveau.
 */
export function generateLecture(rng: Rng, level: number): LectureQuestion[] {
  const pool = lectureLevel(level).tiers.flatMap((t) => SENTENCES[t - 1]);
  const pass = () => rng.shuffle(pool).map(([truth, lie]) => (rng.chance(0.5) ? { sentence: truth, truth: true } : { sentence: lie, truth: false }));
  return [...pass(), ...pass()];
}

export function scoreLecture(correct: number, errors: number, level: number): number {
  return countScore(correct - errors, 0, lectureLevel(level).target);
}
