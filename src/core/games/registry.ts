import { tr } from '../lang';
import { MAX_LEVEL, pickLevel } from '../levels';
import type { Domain, GameId } from '../types';
import { anagramLevel, anagramLevelLabel } from './anagrammes';
import { balanceLevelLabel } from './balance';
import { boutiqueLevel, boutiqueLevelLabel } from './boutique';
import { CALCUL_LEVELS } from './calcul';
import { categoriesLevelLabel } from './categories';
import { correspondanceLevel, correspondanceLevelLabel } from './correspondance';
import { diableLevel, diableLevelLabel } from './diable';
import { flechesLevel, flechesLevelLabel } from './fleches';
import { horlogesLevel, horlogesLevelLabel } from './horloges';
import { intrusLevelLabel } from './intrus';
import { coupLevelLabel } from './coupdoeil';
import { itiLevel, itiLevelLabel } from './itineraire';
import { lectureLevel, lectureLevelLabel } from './lecture';
import { lettreLevel, lettreLevelLabel } from './lettre';
import { quiLevel, quiLevelLabel } from './quiestqui';
import { matriceLevel, matriceLevelLabel } from './matrice';
import { monnaieLevel, monnaieLevelLabel } from './monnaie';
import { motsLevel, motsLevelLabel } from './mots';
import { nbackLevel, nbackLevelLabel } from './nback';
import { ordreLevel, ordreLevelLabel } from './ordre';
import { pairesLevelLabel } from './paires';
import { pluieLevelLabel } from './pluie';
import { describeRule, reflexeLevel, reflexeLevelLabel } from './reflexe';
import { rotationLevel, rotationLevelLabel } from './rotation';
import { SCHULTE_LEVELS, schulteLevelLabel } from './schulte';
import { STROOP_LEVELS, stroopLevelLabel } from './stroop';
import { sudokuLevel, sudokuLevelLabel } from './sudoku';
import { totalLevelLabel } from './total';

export interface DomainMeta {
  /** Nom affiché, dans la langue de l'interface (accesseur : lu à l'affichage). */
  name: string;
}

export const DOMAINS: Record<Domain, DomainMeta> = {
  calcul: {
    get name() {
      return tr('Calcul', 'Math');
    },
  },
  memoire: {
    get name() {
      return tr('Mémoire', 'Memory');
    },
  },
  attention: {
    get name() {
      return tr('Attention', 'Attention');
    },
  },
  vitesse: {
    get name() {
      return tr('Vitesse', 'Speed');
    },
  },
  langage: {
    get name() {
      return tr('Langage', 'Language');
    },
  },
  logique: {
    get name() {
      return tr('Logique', 'Logic');
    },
  },
};

/** Ordre fixe des domaines : il porte aussi l'ordre des couleurs validé pour les daltonismes. */
export const DOMAIN_ORDER: readonly Domain[] = ['calcul', 'memoire', 'attention', 'vitesse', 'langage', 'logique'];

export interface GameMeta {
  id: GameId;
  /** Nom affiché, dans la langue de l'interface (accesseur : lu à l'affichage). */
  name: string;
  domain: Domain;
  /** La règle en une phrase, affichée à l'intro (elle peut changer avec le niveau). */
  rule: (level: number) => string;
  /** Durée indicative d'une partie. */
  duration: string;
  maxLevel: number;
  /** Niveau imposé au test du jour, pour que les résultats restent comparables. */
  dailyLevel: number;
  /** Ce que change le niveau, en quelques mots. */
  levelLabel: (level: number) => string;
}

const CHAIN_KINDS = ['chainAddSub', 'chainMulAdd', 'chainMulMul', 'chainBig'];

export const GAMES: Record<GameId, GameMeta> = {
  calcul: {
    id: 'calcul',
    get name() {
      return tr('Calcul éclair', 'Flash Math');
    },
    domain: 'calcul',
    rule: (level) =>
      pickLevel(CALCUL_LEVELS, level).kinds.some((k) => CHAIN_KINDS.includes(k))
        ? tr(
            'Résous 20 calculs le plus vite possible. Rappel : × et ÷ passent avant + et −.',
            'Solve 20 problems as fast as you can. Remember: × and ÷ come before + and −.',
          )
        : tr(
            'Résous 20 calculs le plus vite possible : ta réponse se valide toute seule.',
            'Solve 20 problems as fast as you can: your answer goes in by itself.',
          ),
    duration: '≈ 40 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: (level) => pickLevel(CALCUL_LEVELS, level).label,
  },
  stroop: {
    id: 'stroop',
    get name() {
      return tr('Couleurs piégées', 'Color Trap');
    },
    domain: 'attention',
    rule: (level) =>
      pickLevel(STROOP_LEVELS, level).switchRatio
        ? tr(
            'Touche la couleur de l’encre… sauf quand la consigne dit « le mot » : là, lis le mot.',
            'Tap the color of the ink… except when the prompt says “the word”: then read the word.',
          )
        : tr('Touche la couleur de l’encre, pas celle du mot écrit.', 'Tap the color of the ink, not the color the word spells.'),
    duration: '≈ 30 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: stroopLevelLabel,
  },
  schulte: {
    id: 'schulte',
    get name() {
      return tr('Table de Schulte', 'Schulte Table');
    },
    domain: 'vitesse',
    rule: (level) => {
      const c = pickLevel(SCHULTE_LEVELS, level);
      const count = c.size * c.size;
      const base = {
        asc: tr(`Touche les nombres de 1 à ${count} dans l’ordre, le plus vite possible.`, `Tap the numbers from 1 to ${count} in order, as fast as you can.`),
        desc: tr(`Touche les nombres de ${count} à 1, à rebours, le plus vite possible.`, `Tap the numbers from ${count} down to 1, as fast as you can.`),
        alpha: tr('Touche les lettres de A à Y dans l’ordre, le plus vite possible.', 'Tap the letters from A to Y in order, as fast as you can.'),
        alt: tr('Alterne nombres et lettres : 1, A, 2, B, 3, C… le plus vite possible.', 'Alternate numbers and letters: 1, A, 2, B, 3, C… as fast as you can.'),
      }[c.order];
      return c.reshuffleEvery ? tr(`${base} La grille se mélange en cours de route !`, `${base} The grid reshuffles along the way!`) : base;
    },
    duration: '≈ 30 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: schulteLevelLabel,
  },
  matrice: {
    id: 'matrice',
    get name() {
      return tr('Matrice', 'Grid Memory');
    },
    domain: 'memoire',
    rule: (level) =>
      matriceLevel(level).reverse
        ? tr('Regarde les cases s’allumer, puis touche-les dans l’ordre inverse.', 'Watch the squares light up, then tap them in reverse order.')
        : tr('Regarde les cases s’allumer, puis touche-les dans le même ordre.', 'Watch the squares light up, then tap them in the same order.'),
    duration: '≈ 1 min',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: matriceLevelLabel,
  },
  nback: {
    id: 'nback',
    get name() {
      return tr('Double retour', 'Look Back');
    },
    domain: 'memoire',
    rule: (level) => {
      const { n, mode } = nbackLevel(level);
      const back = n === 1 ? 'au coup précédent' : `il y a ${n} coups`;
      const backEn = n === 1 ? 'the previous one' : `the one from ${n} turns ago`;
      if (mode === 'letter') {
        return tr(
          `Touche « Même lettre » quand la lettre est la même qu’${n === 1 ? 'au coup précédent' : `il y a ${n} lettres`}.`,
          `Tap “Same letter” when the letter matches ${n === 1 ? 'the previous one' : `the one ${n} letters back`}.`,
        );
      }
      if (mode === 'position') return tr(`Touche « Même place » quand la case allumée est la même qu’${back}.`, `Tap “Same spot” when the lit square matches ${backEn}.`);
      return tr(`Deux questions à la fois : même lettre et même place qu’${back} ?`, `Two questions at once: same letter and same spot as ${backEn}?`);
    },
    duration: '≈ 55 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 2,
    levelLabel: nbackLevelLabel,
  },
  total: {
    id: 'total',
    get name() {
      return tr('Total cumulé', 'Running Total');
    },
    domain: 'calcul',
    rule: () =>
      tr('Additionne de tête les nombres qui défilent, puis donne le total final.', 'Add up the numbers in your head as they go by, then give the final total.'),
    duration: '≈ 1 min',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: totalLevelLabel,
  },
  intrus: {
    id: 'intrus',
    get name() {
      return tr('L’intrus', 'Odd One Out');
    },
    domain: 'attention',
    rule: () =>
      tr(
        'Trouve le symbole différent des autres (parfois retourné en miroir), le plus de fois possible en 45 s.',
        'Find the symbol that’s different from the others (sometimes it’s mirrored), as many times as you can in 45 s.',
      ),
    duration: '45 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: intrusLevelLabel,
  },
  anagrammes: {
    id: 'anagrammes',
    get name() {
      return tr('Anagrammes', 'Anagrams');
    },
    domain: 'langage',
    rule: (level) =>
      anagramLevel(level).decoys
        ? tr(
            'Remets les lettres dans l’ordre pour retrouver le mot caché. Attention : des lettres sont en trop !',
            'Put the letters back in order to find the hidden word. Careful: some letters don’t belong!',
          )
        : tr('Remets les lettres dans l’ordre pour retrouver le mot caché.', 'Put the letters back in order to find the hidden word.'),
    duration: '≈ 1 min',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: anagramLevelLabel,
  },
  boutique: {
    id: 'boutique',
    get name() {
      return tr('La boutique', 'The Shop');
    },
    domain: 'attention',
    rule: (level) =>
      boutiqueLevel(level).cats
        ? tr(
            'Des clients entrent et sortent : combien sont dans la boutique à la fin ? Les chats ne comptent pas !',
            'Customers come in and go out: how many are in the shop at the end? Cats don’t count!',
          )
        : tr(
            'Des clients entrent et sortent : combien sont dans la boutique à la fin ?',
            'Customers come in and go out: how many are in the shop at the end?',
          ),
    duration: '≈ 1 min',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: boutiqueLevelLabel,
  },
  diable: {
    id: 'diable',
    get name() {
      return tr('Calcul du diable', 'Tricky Sums');
    },
    domain: 'calcul',
    rule: (level) => {
      const { n } = diableLevel(level);
      return tr(
        `Les calculs défilent : donne le résultat de celui d’il y a ${n === 1 ? 'un coup' : `${n} coups`}, pas du calcul affiché.`,
        `The sums keep coming: give the answer to the one from ${n === 1 ? '1 turn' : `${n} turns`} ago, not the one on screen.`,
      );
    },
    duration: '≈ 1 min',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: diableLevelLabel,
  },
  ordre: {
    id: 'ordre',
    get name() {
      return tr('Du plus petit au plus grand', 'Smallest to Largest');
    },
    domain: 'memoire',
    rule: (level) =>
      ordreLevel(level).descending
        ? tr(
            'Retiens où sont les nombres, puis touche leurs cases du plus grand au plus petit.',
            'Remember where the numbers are, then tap their squares from largest to smallest.',
          )
        : tr(
            'Retiens où sont les nombres, puis touche leurs cases du plus petit au plus grand.',
            'Remember where the numbers are, then tap their squares from smallest to largest.',
          ),
    duration: '≈ 1 min',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: ordreLevelLabel,
  },
  monnaie: {
    id: 'monnaie',
    get name() {
      return tr('Monnaie', 'Small Change');
    },
    domain: 'calcul',
    rule: (level) =>
      monnaieLevel(level).mode === 'change'
        ? tr('Calcule la monnaie à rendre, le plus de fois possible en 60 secondes.', 'Work out the change to give back, as many times as you can in 60 seconds.')
        : tr('Compte les pièces et les billets, le plus de fois possible en 60 secondes.', 'Count the coins and bills, as many times as you can in 60 seconds.'),
    duration: '60 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: monnaieLevelLabel,
  },
  pluie: {
    id: 'pluie',
    get name() {
      return tr('Pluie de calculs', 'Number Rain');
    },
    domain: 'calcul',
    rule: () =>
      tr(
        'Tape le résultat de chaque goutte avant qu’elle ne tombe à l’eau. Trois gouttes perdues et c’est fini !',
        'Type the answer to each drop before it hits the water. Lose three drops and it’s over!',
      ),
    duration: '60 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: pluieLevelLabel,
  },
  correspondance: {
    id: 'correspondance',
    get name() {
      return tr('Correspondance express', 'Quick Match');
    },
    domain: 'vitesse',
    rule: (level) =>
      correspondanceLevel(level).back === 1
        ? tr(
            'Chaque nouvelle carte est-elle pareille à la précédente ? Réponds vite : 45 secondes.',
            'Is each new card the same as the one before? Answer fast: 45 seconds.',
          )
        : tr(
            'Chaque nouvelle carte est-elle pareille à celle d’il y a deux cartes ? 45 secondes.',
            'Is each new card the same as the one two cards back? 45 seconds.',
          ),
    duration: '45 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: correspondanceLevelLabel,
  },
  fleches: {
    id: 'fleches',
    get name() {
      return tr('Flèches', 'Arrows');
    },
    domain: 'attention',
    rule: (level) => {
      const { rule } = flechesLevel(level);
      if (rule === 'flank') return tr('Donne le sens des flèches voisines, pas de celle du milieu.', 'Give the direction of the outer arrows, not the middle one.');
      if (rule === 'switch') {
        return tr(
          'Selon la consigne, donne le sens de la flèche du milieu ou de ses voisines.',
          'Follow the prompt: give the direction of the middle arrow or of its neighbors.',
        );
      }
      return tr(
        'Donne le sens de la flèche du milieu, sans te laisser distraire par ses voisines.',
        'Give the direction of the middle arrow, without letting its neighbors distract you.',
      );
    },
    duration: '≈ 50 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: flechesLevelLabel,
  },
  reflexe: {
    id: 'reflexe',
    get name() {
      return tr('Réflexe', 'Reflex');
    },
    domain: 'vitesse',
    rule: (level) => {
      const { rules } = reflexeLevel(level);
      const first = describeRule(rules[0]);
      return rules.length > 1
        ? tr(`${first}… mais la règle va changer en cours de route !`, `${first}… but the rule will change along the way!`)
        : tr(`${first}, le plus vite possible. Pour les autres formes, ne touche rien.`, `${first}, as fast as you can. For any other shape, don’t tap anything.`);
    },
    duration: '≈ 45 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: reflexeLevelLabel,
  },
  rotation: {
    id: 'rotation',
    get name() {
      return tr('Rotation mentale', 'Mental Rotation');
    },
    domain: 'logique',
    rule: (level) =>
      rotationLevel(level).mirrors
        ? tr(
            'Retrouve la pièce du modèle, simplement tournée. Méfie-toi de son reflet dans un miroir : il ne compte pas !',
            'Find the model piece, just turned around. Watch out for its mirror image: it doesn’t count!',
          )
        : tr(
            'Retrouve la pièce du modèle parmi les propositions : elle a seulement tourné. 60 secondes.',
            'Find the model piece among the choices: it has only been turned. 60 seconds.',
          ),
    duration: '60 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: rotationLevelLabel,
  },
  sudoku: {
    id: 'sudoku',
    get name() {
      return tr('Mini-sudoku', 'Mini Sudoku');
    },
    domain: 'logique',
    rule: (level) => {
      const { size } = sudokuLevel(level);
      return tr(
        `Chaque chiffre de 1 à ${size} une seule fois par ligne, par colonne et par bloc. Un chiffre faux coûte 5 secondes.`,
        `Each digit from 1 to ${size} appears once in every row, column and box. A wrong digit costs 5 seconds.`,
      );
    },
    duration: '≈ 2 min',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: sudokuLevelLabel,
  },
  balance: {
    id: 'balance',
    get name() {
      return tr('Balance', 'Scales');
    },
    domain: 'logique',
    rule: () =>
      tr(
        'Une balance penche du côté le plus lourd. D’après toutes les balances, trouve l’objet le plus lourd… ou le plus léger.',
        'A scale tips toward the heavier side. Using all the scales, find the heaviest item… or the lightest.',
      ),
    duration: '≈ 1 min',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: balanceLevelLabel,
  },
  horloges: {
    id: 'horloges',
    get name() {
      return tr('Horloges', 'Clocks');
    },
    domain: 'logique',
    rule: (level) =>
      horlogesLevel(level).modes.length === 1 && horlogesLevel(level).modes[0] === 'read'
        ? tr('Lis l’heure sur l’horloge à aiguilles et choisis la bonne réponse. 60 secondes.', 'Read the time on the clock and pick the right answer. 60 seconds.')
        : tr(
            'Lis les horloges : l’heure qu’il est, celle qu’il sera, ou le temps écoulé. 60 secondes.',
            'Read the clocks: the time now, the time it will be, or the time that has passed. 60 seconds.',
          ),
    duration: '60 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: horlogesLevelLabel,
  },
  mots: {
    id: 'mots',
    get name() {
      return tr('Mots à retenir', 'Word Recall');
    },
    domain: 'memoire',
    rule: (level) => {
      const { count, lures } = motsLevel(level);
      return lures === 'category'
        ? tr(
            `Mémorise ${count} mots, puis dis si chaque mot était dans la liste. Attention : les nouveaux mots leur ressemblent !`,
            `Memorize ${count} words, then say whether each word was on the list. Careful: the new words look a lot like them!`,
          )
        : tr(
            `Mémorise ${count} mots, puis dis pour chaque mot s’il était dans la liste.`,
            `Memorize ${count} words, then say for each word whether it was on the list.`,
          );
    },
    get duration() {
      return tr('≈ 1 min 30', '≈ 1 min 30 s');
    },
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: motsLevelLabel,
  },
  lettre: {
    id: 'lettre',
    get name() {
      return tr('Lettre manquante', 'Missing Letter');
    },
    domain: 'langage',
    rule: (level) =>
      lettreLevel(level).missing === 1
        ? tr(
            'Il manque une lettre : choisis celle qui complète le mot. La catégorie te met sur la piste. 60 secondes.',
            'One letter is missing: pick the one that completes the word. The category gives you a hint. 60 seconds.',
          )
        : tr(
            'Il manque deux lettres : choisis la paire qui complète le mot. La catégorie te met sur la piste. 60 secondes.',
            'Two letters are missing: pick the pair that completes the word. The category gives you a hint. 60 seconds.',
          ),
    duration: '60 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: lettreLevelLabel,
  },
  categories: {
    id: 'categories',
    get name() {
      return tr('Catégories', 'Categories');
    },
    domain: 'langage',
    rule: () =>
      tr(
        'Tous les mots vont ensemble… sauf un. Trouve l’intrus le plus vite possible. 60 secondes.',
        'All the words go together… except one. Find the odd one out as fast as you can. 60 seconds.',
      ),
    duration: '60 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: categoriesLevelLabel,
  },
  paires: {
    id: 'paires',
    get name() {
      return tr('Paires', 'Pairs');
    },
    domain: 'memoire',
    rule: () =>
      tr(
        'Retourne les cartes deux par deux et retrouve toutes les paires, en le moins de coups possible.',
        'Turn the cards over two at a time and find all the pairs, in as few moves as you can.',
      ),
    get duration() {
      return tr('≈ 1 min 30', '≈ 1 min 30 s');
    },
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: pairesLevelLabel,
  },
  coupdoeil: {
    id: 'coupdoeil',
    get name() {
      return tr('Coup d’œil', 'At a Glance');
    },
    domain: 'vitesse',
    rule: () =>
      tr(
        'Des points bleus et orange apparaissent un instant. Sans compter, dis quelle couleur était la plus nombreuse. 60 secondes.',
        'Blue and orange dots flash up for a moment. Without counting, say which color had more dots. 60 seconds.',
      ),
    duration: '60 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: coupLevelLabel,
  },
  quiestqui: {
    id: 'quiestqui',
    get name() {
      return tr('Qui est qui ?', "Who's Who?");
    },
    domain: 'memoire',
    rule: (level) =>
      quiLevel(level).nameQuestions > 0
        ? tr(
            'Des compagnons se présentent : retiens leur prénom. Retrouve ensuite qui est qui, et le prénom de chacun. Trois manches.',
            'Companions introduce themselves: remember their names. Then find who’s who, and each one’s name. Three rounds.',
          )
        : tr(
            'Des compagnons se présentent : retiens leur prénom, puis retrouve qui est qui. Trois manches.',
            'Companions introduce themselves: remember their names, then find who’s who. Three rounds.',
          ),
    duration: '≈ 2 min',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: quiLevelLabel,
  },
  lecture: {
    id: 'lecture',
    get name() {
      return tr('Lecture éclair', 'Speed Reading');
    },
    domain: 'langage',
    rule: (level) =>
      lectureLevel(level).tiers.includes(3)
        ? tr(
            'Lis chaque phrase jusqu’au bout : vraie ou fausse ? Attention aux « ne… pas ». 60 secondes.',
            'Read each sentence all the way through: true or false? Watch out for “not”. 60 seconds.',
          )
        : tr('Lis chaque phrase et dis vite si elle est vraie ou fausse. 60 secondes.', 'Read each sentence and quickly say whether it’s true or false. 60 seconds.'),
    duration: '60 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: lectureLevelLabel,
  },
  itineraire: {
    id: 'itineraire',
    get name() {
      return tr('Itinéraire', 'Route Finder');
    },
    domain: 'logique',
    rule: (level) =>
      itiLevel(level).oneByOne
        ? tr(
            'Les flèches défilent une par une : suis le trajet de tête depuis ton compagnon, puis touche la case d’arrivée. Huit trajets.',
            'The arrows show up one at a time: follow the route in your head from your companion, then tap where it ends. Eight routes.',
          )
        : tr(
            'Lis les flèches (« → 2 » : deux cases à droite) : elles vont disparaître. Touche la case où l’on arrive. Huit trajets.',
            'Read the arrows (“→ 2”: two squares right): they’ll disappear. Tap the square where you end up. Eight routes.',
          ),
    get duration() {
      return tr('≈ 1 min 30', '≈ 1 min 30 s');
    },
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: itiLevelLabel,
  },
};

/** Ordre d'affichage dans l'entraînement : regroupé par domaine. */
export const GAME_ORDER: readonly GameId[] = [
  'calcul',
  'total',
  'diable',
  'monnaie',
  'pluie',
  'matrice',
  'nback',
  'ordre',
  'mots',
  'paires',
  'quiestqui',
  'stroop',
  'intrus',
  'boutique',
  'fleches',
  'schulte',
  'correspondance',
  'reflexe',
  'coupdoeil',
  'anagrammes',
  'lettre',
  'categories',
  'lecture',
  'rotation',
  'balance',
  'horloges',
  'sudoku',
  'itineraire',
];

/** Jeux qui tournent sur le 3e emplacement du test du jour. */
export const DAILY_ROTATION: readonly GameId[] = [
  'schulte',
  'matrice',
  'nback',
  'total',
  'intrus',
  'anagrammes',
  'boutique',
  'diable',
  'ordre',
  'monnaie',
  'pluie',
  'correspondance',
  'fleches',
  'reflexe',
  'rotation',
  'balance',
  'horloges',
  'sudoku',
  'mots',
  'lettre',
  'categories',
  'paires',
  'coupdoeil',
  'quiestqui',
  'lecture',
  'itineraire',
];

export function isGameId(value: string): value is GameId {
  return Object.hasOwn(GAMES, value);
}

export function gamesOfDomain(domain: Domain): GameId[] {
  return GAME_ORDER.filter((id) => GAMES[id].domain === domain);
}
