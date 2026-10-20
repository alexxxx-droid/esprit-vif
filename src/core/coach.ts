import { byLang } from './content';
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
  'Monnaie : additionne d’abord les billets, du plus gros au plus petit, puis les pièces.',
  'Les émotions positives aident à mémoriser : amuse-toi, c’est fait pour ça !',
];

/** Les mêmes conseils en anglais, dans le même ordre (le conseil du jour est le même dans les deux langues). */
export const COACH_TIPS_EN: readonly string[] = [
  'Five minutes every day beats an hour on Sunday: regularity matters more than length.',
  'Sleep helps lock in what you learned during the day. A good night is training too.',
  'A twenty-minute walk is good for your legs… and for your head.',
  'To remember a list, make up a little story that links the items together.',
  'A number is easier to remember in chunks: 555 123 4567 rather than 5551234567.',
  'Learning something new (a recipe, a language, an instrument) works your mind differently than your habits do.',
  'A glass of water before you play? Staying hydrated helps you stay focused.',
  'Stuck on a problem? A short break often helps you see more clearly.',
  'Reading ten minutes a day builds your vocabulary without you even noticing.',
  'Your brain loves new things: take a different route when you go shopping.',
  'Mental math: round, then adjust. 49 × 3 is 50 × 3 − 3, which is 147.',
  'Three slow breaths before you start help you settle your attention.',
  'One thing at a time: juggling several tasks is more tiring than it seems.',
  'Chatting with friends is a full workout: listening, understanding, answering.',
  'Board games mix memory, logic and attention… and you laugh along the way.',
  'To remember someone’s name, use it in the conversation as soon as you hear it.',
  'A bad game is just one game: mood and tiredness play a big part in scores.',
  'At rest, the brain alone uses about a fifth of the body’s energy.',
  'Mixing up the exercises is more fun, and more complete, than always repeating the same one.',
  'Writing by hand often helps you remember better than typing.',
  'To remember, testing yourself works better than rereading. That’s exactly what you’re doing here!',
  'Spacing out your reviews helps you remember longer than last-minute cramming.',
  'Explaining something to someone else is a great way to understand it well.',
  'Singing or playing music uses memory, attention and coordination all at once.',
  'A few minutes away from screens now and then rest your eyes and your attention.',
  'You can learn at any age: curiosity has no expiration date.',
  'Picturing a route in detail, street by street, trains your memory for places.',
  'Laughing relaxes you and refreshes your attention. Mistakes in a game are allowed, even funny.',
  'Making a list frees up your memory to think about something else.',
  'A streak of days in a row is motivating: even a single game keeps the flame alive.',
  'Color Trap: look at the center of the word and focus on its color, not its letters.',
  'Schulte Table: keep your eyes on the center of the grid and let your side vision do the searching.',
  'Grid Memory: picture the shape the sequence draws, like a constellation.',
  'Look Back: quietly repeat the last letters, like a little song.',
  'Running Total: keep only the total in mind, never the list of numbers.',
  'Anagrams: look for common letter groups first (TH, CH, ING, ER…).',
  'Flash Math: to multiply by 9, multiply by 10 and subtract the number.',
  'The Shop: count what comes in and what goes out separately, then take the difference.',
  'Pairs: turn over the cards you have never seen first.',
  'Word Recall: link each word to a slightly silly picture, and it will stick.',
  'Mini Sudoku: start with the row, column or box that is the most filled in.',
  'Mental Rotation: spot a small detail of the shape and follow it while it turns.',
  'Scales: line the objects up in your mind, from lightest to heaviest.',
  'Clocks: count the full hours first, then add the minutes.',
  'Arrows: look only at the middle one, the others are there to distract you.',
  'Reflex: don’t rush! A false alarm costs more than a slight delay.',
  'Number Rain: always start with the lowest drop.',
  'Tricky Sums: keep the result in mind, not the calculation.',
  'Small Change: add up the bills first, from largest to smallest, then the coins.',
  'Positive emotions help you remember: have fun, that’s what it’s for!',
];

/** Les conseils de la langue en cours. */
export function coachTips(): readonly string[] {
  return byLang(COACH_TIPS, COACH_TIPS_EN, (c) => c.coachTips);
}

/** Le conseil du jour, le même toute la journée. */
export function coachTip(day: string): string {
  const tips = coachTips();
  return tips[((dayIndex(day) % tips.length) + tips.length) % tips.length];
}
