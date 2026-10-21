import { byCount } from '../format';
import { grandLevelLabel, grandRule } from './grand';
import { regleLevelLabel, regleRule } from './regle';
import { symbolesLevelLabel, symbolesRule } from './symboles';
import { aiguillagesLevelLabel, aiguillagesRule } from './aiguillages';
import { melesLevelLabel, melesRule } from './motsmeles';
import { combienLevelLabel, combienRule } from './combien';
import { codeLevelLabel, codeRule } from './code';
import { miroirLevelLabel, miroirRule } from './miroir';
import { echoLevelLabel, echoRule } from './echo';
import { compteLevelLabel, compteRule } from './compte';
import { suitesLevelLabel, suitesRule } from './suites';
import { tr } from '../lang';
import { isMastery, MAX_LEVEL, masteryName, passScore, pickLevel, secondsLabel, TOP_LEVEL } from '../levels';
import type { Domain, GameId } from '../types';
import { anagramLevel, anagramLevelLabel } from './anagrammes';
import { balanceLevel, balanceLevelLabel } from './balance';
import { boutiqueLevelLabel, boutiqueRule } from './boutique';
import { CALCUL_LEVELS, calculRule } from './calcul';
import { categoriesLevel, categoriesLevelLabel } from './categories';
import { correspondanceLevelLabel, correspondanceRule } from './correspondance';
import { diableLevelLabel, diableRule } from './diable';
import { flechesLevelLabel, flechesRule } from './fleches';
import { horlogesLevel, horlogesLevelLabel } from './horloges';
import { intrusLevelLabel, intrusRule } from './intrus';
import { coupLevelLabel, coupRule } from './coupdoeil';
import { itiLevel, itiLevelLabel } from './itineraire';
import { lectureLevel, lectureLevelLabel, lectureRule } from './lecture';
import { lettreLevel, lettreLevelLabel, lettreRule } from './lettre';
import { quiLevel, quiLevelLabel } from './quiestqui';
import { matriceLevel, matriceLevelLabel } from './matrice';
import { monnaieLevelLabel, monnaieRule } from './monnaie';
import { motsLevel, motsLevelLabel } from './mots';
import { nbackLevel, nbackLevelLabel } from './nback';
import { ordreLevel, ordreLevelLabel } from './ordre';
import { pairesLevel, pairesLevelLabel } from './paires';
import { pluieLevelLabel, pluieRule } from './pluie';
import { reflexeLevelLabel, reflexeRule } from './reflexe';
import { rotationLevel, rotationLevelLabel } from './rotation';
import { schulteLevelLabel, schulteRule } from './schulte';
import { stroopLevelLabel, stroopRule } from './stroop';
import { sudokuDuration, sudokuLevel, sudokuLevelLabel } from './sudoku';
import { totalLevelLabel, totalRule } from './total';
import { filatureLevelLabel, filatureRule } from './filature';
import { luciolesLevelLabel, luciolesRule } from './lucioles';
import { contrairesLevelLabel, contrairesRule } from './contraires';

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
  /** La même, quand elle varie beaucoup avec le niveau (le sudoku passe de 1 à 15 minutes). */
  durationAt?: (level: number) => string;
  maxLevel: number;
  /** Niveau imposé au test du jour, pour que les résultats restent comparables. */
  dailyLevel: number;
  /** Ce que change le niveau, en quelques mots. */
  levelLabel: (level: number) => string;
}

/** Durée indicative d'une partie à ce niveau. */
export function durationFor(meta: GameMeta, level: number): string {
  return meta.durationAt?.(level) ?? meta.duration;
}

export const GAMES: Record<GameId, GameMeta> = {
  filature: {
    id: 'filature',
    get name() {
      return tr('Filature', 'Keep Track');
    },
    domain: 'attention',
    rule: filatureRule,
    duration: '≈ 1 min',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: filatureLevelLabel,
  },
  lucioles: {
    id: 'lucioles',
    get name() {
      return tr('Lucioles', 'Fireflies');
    },
    domain: 'vitesse',
    rule: luciolesRule,
    duration: '40 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: luciolesLevelLabel,
  },
  contraires: {
    id: 'contraires',
    get name() {
      return tr('Contraires', 'Opposites');
    },
    domain: 'langage',
    rule: contrairesRule,
    duration: '40 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: contrairesLevelLabel,
  },
  calcul: {
    id: 'calcul',
    get name() {
      return tr('Calcul éclair', 'Flash Math');
    },
    domain: 'calcul',
    rule: calculRule,
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
    rule: stroopRule,
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
    rule: schulteRule,
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
    rule: (level) => {
      const c = matriceLevel(level);
      const base = c.mixed
        ? tr(
            'Regarde les cases s’allumer : le sens (même ordre ou à l’envers) ne s’affiche qu’après.',
            'Watch the squares light up: only afterwards are you told whether to tap them in the same or reverse order.',
          )
        : c.reverse
          ? tr('Regarde les cases s’allumer, puis touche-les dans l’ordre inverse.', 'Watch the squares light up, then tap them in reverse order.')
          : tr('Regarde les cases s’allumer, puis touche-les dans le même ordre.', 'Watch the squares light up, then tap them in the same order.');
      return c.lureEvery
        ? tr(`${base} Ignore les cases barrées : ce sont des pièges.`, `${base} Ignore the crossed-out squares: they’re traps.`)
        : base;
    },
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
      const { n, mode, lures } = nbackLevel(level);
      const back = tr(byCount(n, 'au coup précédent', `il y a ${n} coups`), byCount(n, 'the previous one', `the one from ${n} turns ago`));
      const traps = lures
        ? tr(' Gare aux pièges : ce qui revient un coup trop tôt ou trop tard ne compte pas.', ' Watch for traps: a repeat one turn too early or too late doesn’t count.')
        : '';
      if (mode === 'letter') {
        return (
          tr(
            byCount(n, 'Touche « Même lettre » quand la lettre est la même qu’au coup précédent.', `Touche « Même lettre » quand la lettre est la même qu’il y a ${n} lettres.`),
            byCount(n, 'Tap “Same letter” when the letter matches the previous one.', `Tap “Same letter” when the letter matches the one ${n} letters back.`),
          ) + traps
        );
      }
      if (mode === 'position')
        return tr(`Touche « Même place » quand la case allumée est la même qu’${back}.`, `Tap “Same spot” when the lit square matches ${back}.`) + traps;
      return tr(`Deux questions à la fois : même lettre et même place qu’${back} ?`, `Two questions at once: same letter and same spot as ${back}?`) + traps;
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
    rule: totalRule,
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
    rule: intrusRule,
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
      anagramLevel(level).twins
        ? tr(
            'Remets les lettres dans l’ordre pour retrouver le mot caché. Attention : des lettres sont en trop, et ce sont des sosies de celles du mot !',
            'Put the letters back in order to find the hidden word. Careful: some letters don’t belong, and they copy the word’s own letters!',
          )
        : anagramLevel(level).decoys
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
    rule: boutiqueRule,
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
    rule: diableRule,
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
    rule: (level) => {
      const c = ordreLevel(level);
      const base = c.descending
        ? tr(
            'Retiens où sont les nombres, puis touche leurs cases du plus grand au plus petit.',
            'Remember where the numbers are, then tap their squares from largest to smallest.',
          )
        : tr(
            'Retiens où sont les nombres, puis touche leurs cases du plus petit au plus grand.',
            'Remember where the numbers are, then tap their squares from smallest to largest.',
          );
      return c.decoyEvery
        ? tr(`${base} Ne touche pas les nombres barrés.`, `${base} Don’t tap the crossed-out numbers.`)
        : base;
    },
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
    rule: monnaieRule,
    duration: '45 s',
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
    rule: pluieRule,
    duration: '45 s',
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
    rule: correspondanceRule,
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
    rule: flechesRule,
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
    rule: reflexeRule,
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
    rule: (level) => {
      const c = rotationLevel(level);
      if (c.solid) {
        return tr(
          'Pièces en relief : retrouve la même pièce, tournée dans l’espace. Son reflet dans un miroir ne compte pas ! 45 secondes.',
          '3D pieces: find the same piece, turned in space. Its mirror image doesn’t count! 45 seconds.',
        );
      }
      if (c.tilt) {
        return tr(
          'Retrouve la pièce du modèle, simplement tournée : les propositions sont penchées. Méfie-toi de son reflet dans un miroir !',
          'Find the model piece, just turned around: the choices are tilted. Watch out for its mirror image!',
        );
      }
      return c.mirrors
        ? tr(
            'Retrouve la pièce du modèle, simplement tournée. Méfie-toi de son reflet dans un miroir : il ne compte pas !',
            'Find the model piece, just turned around. Watch out for its mirror image: it doesn’t count!',
          )
        : tr(
            'Retrouve la pièce du modèle parmi les propositions : elle a seulement tourné. 45 secondes.',
            'Find the model piece among the choices: it has only been turned. 45 seconds.',
          );
    },
    duration: '45 s',
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
      const { size, logic } = sudokuLevel(level);
      const rule = tr(
        `Chaque chiffre de 1 à ${size} une seule fois par ligne, par colonne et par bloc. Un chiffre faux coûte 5 secondes.`,
        `Each digit from 1 to ${size} appears once in every row, column and box. A wrong digit costs 5 seconds.`,
      );
      return logic ? `${rule} ${tr('Tout se déduit pas à pas, sans jamais deviner.', 'Everything can be worked out step by step, no guessing.')}` : rule;
    },
    duration: '≈ 2 min',
    durationAt: sudokuDuration,
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
    rule: (level) => {
      const c = balanceLevel(level);
      const rule = tr(
        'Une balance penche du côté le plus lourd. D’après toutes les balances, trouve l’objet le plus lourd… ou le plus léger.',
        'A scale tips toward the heavier side. Using all the scales, find the heaviest item… or the lightest.',
      );
      if (c.counts) {
        return `${rule} ${tr(
          'Deux carrés qui battent trois triangles : le carré est plus lourd. Trois triangles qui battent deux carrés : on ne sait rien.',
          'Two squares beating three triangles: the square is heavier. Three triangles beating two squares: that tells you nothing.',
        )}`;
      }
      if (c.trap) {
        return `${rule} ${tr(
          'Méfie-toi : certaines balances n’apprennent rien, et la réponse peut y perdre.',
          'Careful: some scales tell you nothing, and the answer can lose on them.',
        )}`;
      }
      return rule;
    },
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
    rule: (level) => {
      const c = horlogesLevel(level);
      if (c.modes.includes('overnight')) {
        return tr(
          'Durées sur 24 heures : regarde si chaque horloge indique le matin, l’après-midi ou le soir. 45 secondes.',
          '24-hour durations: check whether each clock shows AM or PM. 45 seconds.',
        );
      }
      if (c.mirror) {
        return tr(
          'Certaines horloges sont vues dans un miroir : retrouve l’heure vraie avant de répondre. 45 secondes.',
          'Some clocks are seen in a mirror: find the real time before you answer. 45 seconds.',
        );
      }
      if (c.modes.includes('earlier')) {
        return tr(
          'Lis les horloges : l’heure qu’il est, celle qu’il sera, celle qu’il était, ou le temps écoulé. 45 secondes.',
          'Read the clocks: the time now, later, earlier, or the time that has passed. 45 seconds.',
        );
      }
      return c.modes.length === 1 && c.modes[0] === 'read'
        ? tr('Lis l’heure sur l’horloge à aiguilles et choisis la bonne réponse. 45 secondes.', 'Read the time on the clock and pick the right answer. 45 seconds.')
        : tr(
            'Lis les horloges : l’heure qu’il est, celle qu’il sera, ou le temps écoulé. 45 secondes.',
            'Read the clocks: the time now, the time it will be, or the time that has passed. 45 seconds.',
          );
    },
    duration: '45 s',
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
      const { count, lures, wordMs, decoys, answerMs } = motsLevel(level);
      if (wordMs) {
        return [
          tr(
            `${count} mots défilent un par un : retiens-les, puis dis si chaque mot était dans la liste.`,
            `${count} words go by one at a time: memorize them, then say whether each word was on the list.`,
          ),
          decoys > 0 && tr('Les mots barrés sont à oublier : ils reviendront en pièges.', 'Forget the crossed-out words: they’ll come back as traps.'),
          answerMs > 0 && tr(`Réponds en moins de ${secondsLabel(answerMs)}.`, `Answer within ${secondsLabel(answerMs)}.`),
        ]
          .filter(Boolean)
          .join(' ');
      }
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
    duration: '≈ 1 min',
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
      lettreRule(level) ??
      (lettreLevel(level).missing === 1
        ? tr(
            'Il manque une lettre : choisis celle qui complète le mot. La catégorie te met sur la piste. 45 secondes.',
            'One letter is missing: pick the one that completes the word. The category gives you a hint. 45 seconds.',
          )
        : tr(
            'Il manque deux lettres : choisis la paire qui complète le mot. La catégorie te met sur la piste. 45 secondes.',
            'Two letters are missing: pick the pair that completes the word. The category gives you a hint. 45 seconds.',
          )),
    duration: '45 s',
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
    rule: (level) =>
      categoriesLevel(level).camouflage
        ? tr(
            'Tous les mots vont ensemble… sauf un, venu de la famille d’à côté. Les mots vont par paires de même initiale, et l’intrus s’y fond : lis bien. 45 secondes.',
            'All the words go together… except one, from a neighboring group. Words come in pairs with the same first letter, and the odd one blends in: read carefully. 45 seconds.',
          )
        : categoriesLevel(level).twin !== undefined
          ? tr(
              'Tous les mots vont ensemble… sauf un, venu de la famille d’à côté (un radis parmi des fruits). Trouve l’intrus le plus vite possible. 45 secondes.',
              'All the words go together… except one, from a neighboring group (a radish among fruits). Find the odd one out as fast as you can. 45 seconds.',
            )
          : tr(
              'Tous les mots vont ensemble… sauf un. Trouve l’intrus le plus vite possible. 45 secondes.',
              'All the words go together… except one. Find the odd one out as fast as you can. 45 seconds.',
            ),
    duration: '45 s',
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
    rule: (level) => {
      const base = tr(
        'Retourne les cartes deux par deux et retrouve toutes les paires, en le moins de coups possible.',
        'Turn the cards over two at a time and find all the pairs, in as few moves as you can.',
      );
      return pairesLevel(level).swap
        ? tr(`${base} Attention : deux cartes ratées échangent leur place !`, `${base} Careful: two mismatched cards swap places!`)
        : base;
    },
    duration: '≈ 1 min',
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
    rule: coupRule,
    duration: '45 s',
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
    rule: (level) => {
      const c = quiLevel(level);
      const base =
        c.nameQuestions > 0
          ? tr(
              'Des compagnons se présentent : retiens leur prénom. Retrouve ensuite qui est qui, et le prénom de chacun. Deux manches.',
              'Companions introduce themselves: remember their names. Then find who’s who, and each one’s name. Two rounds.',
            )
          : tr(
              'Des compagnons se présentent : retiens leur prénom, puis retrouve qui est qui. Deux manches.',
              'Companions introduce themselves: remember their names, then find who’s who. Two rounds.',
            );
      return c.rebind
        ? tr(`${base} À chaque manche, les mêmes visages changent de prénom !`, `${base} Each round, the same faces get different names!`)
        : base;
    },
    duration: '≈ 1 min',
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
      lectureRule(level) ??
      (lectureLevel(level).tiers.includes(3)
        ? tr(
            'Lis chaque phrase jusqu’au bout : vraie ou fausse ? Attention aux « ne… pas ». 40 secondes.',
            'Read each sentence all the way through: true or false? Watch out for “not”. 40 seconds.',
          )
        : tr('Lis chaque phrase et dis vite si elle est vraie ou fausse. 40 secondes.', 'Read each sentence and quickly say whether it’s true or false. 40 seconds.')),
    duration: '40 s',
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
    rule: (level) => {
      const c = itiLevel(level);
      const rule = c.oneByOne
        ? tr(
            'Les flèches défilent une par une : suis le trajet de tête depuis ton compagnon, puis touche la case d’arrivée. Huit trajets.',
            'The arrows show up one at a time: follow the route in your head from your companion, then tap where it ends. Eight routes.',
          )
        : tr(
            'Lis les flèches (« → 2 » : deux cases à droite) : elles vont disparaître. Touche la case où l’on arrive. Huit trajets.',
            'Read the arrows (“→ 2”: two squares right): they’ll disappear. Tap the square where you end up. Eight routes.',
          );
      const twists = [
        c.diagonal && tr('« ↗ 2 » : deux cases en diagonale.', '“↗ 2”: two squares diagonally.'),
        c.rocks && tr('Un rocher arrête la course : on s’arrête juste devant.', 'A rock stops you: you halt right in front of it.'),
      ].filter(Boolean);
      return [rule, ...twists].join(' ');
    },
    duration: '≈ 1 min',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: itiLevelLabel,
  },
  suites: {
    id: 'suites',
    get name() {
      return tr('Suites logiques', 'Number Series');
    },
    domain: 'logique',
    rule: suitesRule,
    duration: '45 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: suitesLevelLabel,
  },
  compte: {
    id: 'compte',
    get name() {
      return tr('Le compte est bon', 'Hit the Number');
    },
    domain: 'calcul',
    rule: compteRule,
    duration: '45 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: compteLevelLabel,
  },
  echo: {
    id: 'echo',
    get name() {
      return tr('Écho', 'Echo');
    },
    domain: 'memoire',
    rule: echoRule,
    duration: '≈ 1 min',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: echoLevelLabel,
  },
  miroir: {
    id: 'miroir',
    get name() {
      return tr('Miroir', 'Mirror');
    },
    domain: 'vitesse',
    rule: miroirRule,
    duration: '45 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: miroirLevelLabel,
  },
  code: {
    id: 'code',
    get name() {
      return tr('Code secret', 'Secret Code');
    },
    domain: 'logique',
    rule: codeRule,
    duration: '≈ 1 min',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: codeLevelLabel,
  },
  combien: {
    id: 'combien',
    get name() {
      return tr('Combien de cubes\u00a0?', 'Cube Count');
    },
    domain: 'vitesse',
    rule: combienRule,
    duration: '45 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: combienLevelLabel,
  },
  motsmeles: {
    id: 'motsmeles',
    get name() {
      return tr('Mots mêlés', 'Word Search');
    },
    domain: 'langage',
    rule: melesRule,
    duration: '45 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: melesLevelLabel,
  },
  aiguillages: {
    id: 'aiguillages',
    get name() {
      return tr('Aiguillages', 'Switchyard');
    },
    domain: 'attention',
    rule: aiguillagesRule,
    duration: '≈ 45 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: aiguillagesLevelLabel,
  },
  symboles: {
    id: 'symboles',
    get name() {
      return tr('Symboles', 'Symbol Code');
    },
    domain: 'vitesse',
    rule: symbolesRule,
    duration: '45 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: symbolesLevelLabel,
  },
  regle: {
    id: 'regle',
    get name() {
      return tr('Changement de règle', 'Rule Switch');
    },
    domain: 'attention',
    rule: regleRule,
    duration: '45 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: regleLevelLabel,
  },
  grand: {
    id: 'grand',
    get name() {
      return tr('Le plus grand\u00a0?', 'Which Is Bigger?');
    },
    domain: 'calcul',
    rule: grandRule,
    duration: '45 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: grandLevelLabel,
  },
};

/** Ordre d'affichage dans l'entraînement : regroupé par domaine. */
/**
 * La maîtrise prolonge chaque jeu jusqu'au niveau 60 : ses crans rejouent la partie du niveau 50
 * (même règle, même durée), avec leur propre libellé et le score à atteindre.
 */
for (const meta of Object.values(GAMES)) {
  const { levelLabel, durationAt } = meta;
  meta.maxLevel = TOP_LEVEL;
  meta.levelLabel = (level) =>
    isMastery(level)
      ? tr(`${masteryName(level)} · ${passScore(level)} pts pour réussir`, `${masteryName(level)} · ${passScore(level)} pts to pass`)
      : levelLabel(level);
  // La règle se lit au niveau joué (`playedLevel`) : l'intro la demande ainsi.
  if (durationAt) meta.durationAt = (level) => durationAt(Math.min(level, MAX_LEVEL));
}

export const GAME_ORDER: readonly GameId[] = [
  'calcul',
  'total',
  'diable',
  'monnaie',
  'pluie',
  'compte',
  'grand',
  'matrice',
  'nback',
  'ordre',
  'mots',
  'paires',
  'quiestqui',
  'echo',
  'stroop',
  'intrus',
  'boutique',
  'fleches',
  'filature',
  'aiguillages',
  'regle',
  'schulte',
  'correspondance',
  'reflexe',
  'coupdoeil',
  'lucioles',
  'miroir',
  'combien',
  'symboles',
  'anagrammes',
  'lettre',
  'categories',
  'lecture',
  'contraires',
  'motsmeles',
  'rotation',
  'balance',
  'horloges',
  'sudoku',
  'itineraire',
  'suites',
  'code',
];

/** Jeux du test du jour, par domaine (dans l'ordre des domaines) : tous les jeux y participent. */
export const DAILY_POOL: readonly (readonly GameId[])[] = DOMAIN_ORDER.map((domain) => GAME_ORDER.filter((id) => GAMES[id].domain === domain));

export function isGameId(value: string): value is GameId {
  return Object.hasOwn(GAMES, value);
}

export function gamesOfDomain(domain: Domain): GameId[] {
  return GAME_ORDER.filter((id) => GAMES[id].domain === domain);
}
