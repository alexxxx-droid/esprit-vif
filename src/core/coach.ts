import { dayIndex } from './daily';

/**
 * Le mot du coach : un conseil ou une anecdote par jour, toujours bienveillant.
 * Des astuces de jeu et des habitudes de bon sens, jamais de promesse médicale.
 */
export const COACH_TIPS: readonly string[] = [
  'Cinq minutes chaque jour valent mieux qu’une heure le dimanche : la régularité compte plus que la durée.',
  'Le sommeil aide à fixer ce que l’on a appris dans la journée. Une bonne nuit, c’est aussi de l’entraînement.',
  'Marcher vingt minutes fait du bien aux jambes… et à la tête.',
  'Pour retenir une liste, invente une petite histoire qui relie les éléments entre eux.',
  'Un numéro se retient mieux par paquets : 06 12 34 56 78 plutôt que 0612345678.',
  'Apprendre une chose nouvelle (une recette, une langue, un instrument) fait travailler l’esprit autrement que les habitudes.',
  'Un verre d’eau avant de jouer ? Être bien hydraté aide à rester concentré.',
  'Bloqué sur un problème ? Une courte pause permet souvent d’y voir plus clair.',
  'Lire dix minutes par jour enrichit le vocabulaire, sans même s’en rendre compte.',
  'Le cerveau aime la nouveauté : change de chemin pour aller faire tes courses.',
  'Calcul mental : arrondis, puis corrige. 49 × 3, c’est 50 × 3 − 3, soit 147.',
  'Trois respirations lentes avant de commencer aident à poser l’attention.',
  'Une seule chose à la fois : jongler entre plusieurs tâches fatigue plus qu’il n’y paraît.',
  'Discuter avec des amis, c’est un exercice complet : écouter, comprendre, répondre.',
  'Les jeux de société mêlent mémoire, logique et attention… et on rit en prime.',
  'Pour retenir le prénom de quelqu’un, répète-le dans la conversation dès que tu l’entends.',
  'Une partie ratée n’est qu’une partie : l’humeur et la fatigue jouent beaucoup sur les scores.',
  'Au repos, le cerveau consomme à lui seul environ un cinquième de l’énergie du corps.',
  'Varier les exercices est plus amusant, et plus complet, que de répéter toujours le même.',
  'Écrire à la main aide souvent à mieux retenir que taper au clavier.',
  'Pour retenir, se tester soi-même marche mieux que relire. C’est exactement ce que tu fais ici !',
  'Espacer les révisions dans le temps aide à retenir plus longtemps qu’un bachotage de dernière minute.',
  'Expliquer quelque chose à quelqu’un d’autre est une excellente façon de bien le comprendre.',
  'Chanter ou jouer de la musique mobilise à la fois la mémoire, l’attention et la coordination.',
  'Quelques minutes loin des écrans de temps en temps reposent les yeux et l’attention.',
  'On peut apprendre à tout âge : la curiosité n’a pas de date de péremption.',
  'Visualiser un trajet en détail, rue après rue, entraîne la mémoire des lieux.',
  'Rire détend et relance l’attention. Les erreurs de jeu sont permises, et même drôles.',
  'Faire une liste libère la mémoire pour réfléchir à autre chose.',
  'Une série de jours d’affilée motive : même une seule partie suffit à garder la flamme.',
  'Couleurs piégées : fixe le centre du mot et concentre-toi sur sa couleur, pas sur ses lettres.',
  'Table de Schulte : garde les yeux au centre de la grille et laisse ta vision périphérique chercher.',
  'Matrice : imagine la forme que dessine la séquence, comme une constellation.',
  'Double retour : répète tout bas les dernières lettres, comme une petite chanson.',
  'Total cumulé : ne garde en tête que le total, jamais la liste des nombres.',
  'Anagrammes : cherche d’abord les groupes de lettres courants (CH, OU, ON, EN…).',
  'Calcul éclair : pour multiplier par 9, multiplie par 10 et retire le nombre.',
  'Boutique : compte les entrées et les sorties à part, puis fais la différence.',
  'Paires : retourne d’abord les cartes que tu n’as jamais vues.',
  'Mots à retenir : associe chaque mot à une image un peu loufoque, elle restera.',
  'Mini-sudoku : commence par la ligne, la colonne ou le bloc le plus rempli.',
  'Rotation mentale : repère un petit détail de la forme et suis-le pendant qu’elle tourne.',
  'Balance : range les objets sur une ligne imaginaire, du plus léger au plus lourd.',
  'Horloges : compte d’abord les heures pleines, puis ajoute les minutes.',
  'Flèches : regarde uniquement celle du milieu, les voisines sont là pour te distraire.',
  'Réflexe : pas de précipitation ! Une fausse alerte coûte plus cher qu’un léger retard.',
  'Pluie de calculs : commence toujours par la goutte la plus basse.',
  'Calcul du diable : garde en tête le résultat, pas le calcul.',
  'Monnaie : additionne d’abord les billets, puis les grosses pièces, puis les centimes.',
  'Les émotions positives aident à mémoriser : amuse-toi, c’est fait pour ça !',
];

/** Le conseil du jour, le même toute la journée. */
export function coachTip(day: string): string {
  return COACH_TIPS[((dayIndex(day) % COACH_TIPS.length) + COACH_TIPS.length) % COACH_TIPS.length];
}
