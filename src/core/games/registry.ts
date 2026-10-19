import { MAX_LEVEL, pickLevel } from '../levels';
import type { Domain, GameId } from '../types';
import { anagramLevel, anagramLevelLabel } from './anagrammes';
import { balanceLevelLabel } from './balance';
import { boutiqueLevel, boutiqueLevelLabel } from './boutique';
import { CALCUL_LEVELS } from './calcul';
import { correspondanceLevel, correspondanceLevelLabel } from './correspondance';
import { diableLevel, diableLevelLabel } from './diable';
import { flechesLevel, flechesLevelLabel } from './fleches';
import { horlogesLevel, horlogesLevelLabel } from './horloges';
import { intrusLevelLabel } from './intrus';
import { matriceLevel, matriceLevelLabel } from './matrice';
import { monnaieLevel, monnaieLevelLabel } from './monnaie';
import { nbackLevel, nbackLevelLabel } from './nback';
import { ordreLevel, ordreLevelLabel } from './ordre';
import { pluieLevelLabel } from './pluie';
import { describeRule, reflexeLevel, reflexeLevelLabel } from './reflexe';
import { rotationLevel, rotationLevelLabel } from './rotation';
import { SCHULTE_LEVELS, schulteLevelLabel } from './schulte';
import { STROOP_LEVELS, stroopLevelLabel } from './stroop';
import { sudokuLevel, sudokuLevelLabel } from './sudoku';
import { totalLevelLabel } from './total';

export interface DomainMeta {
  name: string;
}

export const DOMAINS: Record<Domain, DomainMeta> = {
  calcul: { name: 'Calcul' },
  memoire: { name: 'Mémoire' },
  attention: { name: 'Attention' },
  vitesse: { name: 'Vitesse' },
  langage: { name: 'Langage' },
  logique: { name: 'Logique' },
};

/** Ordre fixe des domaines : il porte aussi l'ordre des couleurs validé pour les daltonismes. */
export const DOMAIN_ORDER: readonly Domain[] = ['calcul', 'memoire', 'attention', 'vitesse', 'langage', 'logique'];

export interface GameMeta {
  id: GameId;
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
    name: 'Calcul éclair',
    domain: 'calcul',
    rule: (level) =>
      pickLevel(CALCUL_LEVELS, level).kinds.some((k) => CHAIN_KINDS.includes(k))
        ? 'Résous 20 calculs le plus vite possible. Rappel : × et ÷ passent avant + et −.'
        : 'Résous 20 calculs le plus vite possible : ta réponse se valide toute seule.',
    duration: '≈ 40 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: (level) => pickLevel(CALCUL_LEVELS, level).label,
  },
  stroop: {
    id: 'stroop',
    name: 'Couleurs piégées',
    domain: 'attention',
    rule: (level) =>
      pickLevel(STROOP_LEVELS, level).switchRatio
        ? 'Touche la couleur de l’encre… sauf quand la consigne dit « le mot » : là, lis le mot.'
        : 'Touche la couleur de l’encre, pas celle du mot écrit.',
    duration: '≈ 30 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: stroopLevelLabel,
  },
  schulte: {
    id: 'schulte',
    name: 'Table de Schulte',
    domain: 'vitesse',
    rule: (level) => {
      const c = pickLevel(SCHULTE_LEVELS, level);
      const count = c.size * c.size;
      const base = {
        asc: `Touche les nombres de 1 à ${count} dans l’ordre, le plus vite possible.`,
        desc: `Touche les nombres de ${count} à 1, à rebours, le plus vite possible.`,
        alpha: 'Touche les lettres de A à Y dans l’ordre, le plus vite possible.',
        alt: 'Alterne nombres et lettres : 1, A, 2, B, 3, C… le plus vite possible.',
      }[c.order];
      return c.reshuffleEvery ? `${base} La grille se mélange en cours de route !` : base;
    },
    duration: '≈ 30 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: schulteLevelLabel,
  },
  matrice: {
    id: 'matrice',
    name: 'Matrice',
    domain: 'memoire',
    rule: (level) =>
      matriceLevel(level).reverse
        ? 'Regarde les cases s’allumer, puis touche-les dans l’ordre inverse.'
        : 'Regarde les cases s’allumer, puis touche-les dans le même ordre.',
    duration: '≈ 1 min',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: matriceLevelLabel,
  },
  nback: {
    id: 'nback',
    name: 'Double retour',
    domain: 'memoire',
    rule: (level) => {
      const { n, mode } = nbackLevel(level);
      const back = n === 1 ? 'au coup précédent' : `il y a ${n} coups`;
      if (mode === 'letter') return `Touche « Même lettre » quand la lettre est la même qu’${n === 1 ? 'au coup précédent' : `il y a ${n} lettres`}.`;
      if (mode === 'position') return `Touche « Même place » quand la case allumée est la même qu’${back}.`;
      return `Deux questions à la fois : même lettre et même place qu’${back} ?`;
    },
    duration: '≈ 55 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 2,
    levelLabel: nbackLevelLabel,
  },
  total: {
    id: 'total',
    name: 'Total cumulé',
    domain: 'calcul',
    rule: () => 'Additionne de tête les nombres qui défilent, puis donne le total final.',
    duration: '≈ 1 min',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: totalLevelLabel,
  },
  intrus: {
    id: 'intrus',
    name: 'L’intrus',
    domain: 'attention',
    rule: () => 'Trouve le symbole différent des autres (parfois retourné en miroir), le plus de fois possible en 45 s.',
    duration: '45 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: intrusLevelLabel,
  },
  anagrammes: {
    id: 'anagrammes',
    name: 'Anagrammes',
    domain: 'langage',
    rule: (level) =>
      anagramLevel(level).decoys
        ? 'Remets les lettres dans l’ordre pour retrouver le mot caché. Attention : des lettres sont en trop !'
        : 'Remets les lettres dans l’ordre pour retrouver le mot caché.',
    duration: '≈ 1 min',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: anagramLevelLabel,
  },
  boutique: {
    id: 'boutique',
    name: 'La boutique',
    domain: 'attention',
    rule: (level) =>
      boutiqueLevel(level).cats
        ? 'Des clients entrent et sortent : combien sont dans la boutique à la fin ? Les chats ne comptent pas !'
        : 'Des clients entrent et sortent : combien sont dans la boutique à la fin ?',
    duration: '≈ 1 min',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: boutiqueLevelLabel,
  },
  diable: {
    id: 'diable',
    name: 'Calcul du diable',
    domain: 'calcul',
    rule: (level) => {
      const { n } = diableLevel(level);
      return `Les calculs défilent : donne le résultat de celui d’il y a ${n === 1 ? 'un coup' : `${n} coups`}, pas du calcul affiché.`;
    },
    duration: '≈ 1 min',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: diableLevelLabel,
  },
  ordre: {
    id: 'ordre',
    name: 'Du plus petit au plus grand',
    domain: 'memoire',
    rule: (level) =>
      ordreLevel(level).descending
        ? 'Retiens où sont les nombres, puis touche leurs cases du plus grand au plus petit.'
        : 'Retiens où sont les nombres, puis touche leurs cases du plus petit au plus grand.',
    duration: '≈ 1 min',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: ordreLevelLabel,
  },
  monnaie: {
    id: 'monnaie',
    name: 'Monnaie',
    domain: 'calcul',
    rule: (level) =>
      monnaieLevel(level).mode === 'change'
        ? 'Calcule la monnaie à rendre, le plus de fois possible en 60 secondes.'
        : 'Compte les pièces et les billets, le plus de fois possible en 60 secondes.',
    duration: '60 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: monnaieLevelLabel,
  },
  pluie: {
    id: 'pluie',
    name: 'Pluie de calculs',
    domain: 'calcul',
    rule: () => 'Tape le résultat de chaque goutte avant qu’elle ne tombe à l’eau. Trois gouttes perdues et c’est fini !',
    duration: '60 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: pluieLevelLabel,
  },
  correspondance: {
    id: 'correspondance',
    name: 'Correspondance express',
    domain: 'vitesse',
    rule: (level) =>
      correspondanceLevel(level).back === 1
        ? 'Chaque nouvelle carte est-elle pareille à la précédente ? Réponds vite : 45 secondes.'
        : 'Chaque nouvelle carte est-elle pareille à celle d’il y a deux cartes ? 45 secondes.',
    duration: '45 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: correspondanceLevelLabel,
  },
  fleches: {
    id: 'fleches',
    name: 'Flèches',
    domain: 'attention',
    rule: (level) => {
      const { rule } = flechesLevel(level);
      if (rule === 'flank') return 'Donne le sens des flèches voisines, pas de celle du milieu.';
      if (rule === 'switch') return 'Selon la consigne, donne le sens de la flèche du milieu ou de ses voisines.';
      return 'Donne le sens de la flèche du milieu, sans te laisser distraire par ses voisines.';
    },
    duration: '≈ 50 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: flechesLevelLabel,
  },
  reflexe: {
    id: 'reflexe',
    name: 'Réflexe',
    domain: 'vitesse',
    rule: (level) => {
      const { rules } = reflexeLevel(level);
      return rules.length > 1
        ? `${describeRule(rules[0])}… mais la règle va changer en cours de route !`
        : `${describeRule(rules[0])}, le plus vite possible. Pour les autres formes, ne touche rien.`;
    },
    duration: '≈ 45 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: reflexeLevelLabel,
  },
  rotation: {
    id: 'rotation',
    name: 'Rotation mentale',
    domain: 'logique',
    rule: (level) =>
      rotationLevel(level).mirrors
        ? 'Retrouve la pièce du modèle, simplement tournée. Méfie-toi de son reflet dans un miroir : il ne compte pas !'
        : 'Retrouve la pièce du modèle parmi les propositions : elle a seulement tourné. 60 secondes.',
    duration: '60 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: rotationLevelLabel,
  },
  sudoku: {
    id: 'sudoku',
    name: 'Mini-sudoku',
    domain: 'logique',
    rule: (level) => {
      const { size } = sudokuLevel(level);
      return `Chaque chiffre de 1 à ${size} une seule fois par ligne, par colonne et par bloc. Un chiffre faux coûte 5 secondes.`;
    },
    duration: '≈ 2 min',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: sudokuLevelLabel,
  },
  balance: {
    id: 'balance',
    name: 'Balance',
    domain: 'logique',
    rule: () => 'Une balance penche du côté le plus lourd. D’après toutes les balances, trouve l’objet le plus lourd… ou le plus léger.',
    duration: '≈ 1 min',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: balanceLevelLabel,
  },
  horloges: {
    id: 'horloges',
    name: 'Horloges',
    domain: 'logique',
    rule: (level) =>
      horlogesLevel(level).modes.length === 1 && horlogesLevel(level).modes[0] === 'read'
        ? 'Lis l’heure sur l’horloge à aiguilles et choisis la bonne réponse. 60 secondes.'
        : 'Lis les horloges : l’heure qu’il est, celle qu’il sera, ou le temps écoulé. 60 secondes.',
    duration: '60 s',
    maxLevel: MAX_LEVEL,
    dailyLevel: 1,
    levelLabel: horlogesLevelLabel,
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
  'stroop',
  'intrus',
  'boutique',
  'fleches',
  'schulte',
  'correspondance',
  'reflexe',
  'anagrammes',
  'rotation',
  'balance',
  'horloges',
  'sudoku',
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
];

export function isGameId(value: string): value is GameId {
  return Object.hasOwn(GAMES, value);
}

export function gamesOfDomain(domain: Domain): GameId[] {
  return GAME_ORDER.filter((id) => GAMES[id].domain === domain);
}
