import { localized, tr, type Translations } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { timeScore, type TimeThresholds } from '../scoring';

/**
 * Ordre à suivre : croissant, décroissant, alphabétique, en alternance 1-A-2-B…, ou la table de
 * Gorbov : deux couleurs mêlées, les bleus en montant et les orange en descendant, en alternance
 * (bleu 1, orange 24, bleu 2, orange 23…).
 */
export type SchulteOrder = 'asc' | 'desc' | 'alpha' | 'alt' | 'gorbov';

export interface SchulteLevel extends TimeThresholds {
  size: 5 | 6 | 7;
  order: SchulteOrder;
  /** Les cases trouvées restent marquées (sinon, aucun repère). */
  mark: boolean;
  /** Symboles inclinés et de tailles variées. */
  tilt: boolean;
  /** La grille se mélange à nouveau toutes les N trouvailles (0 = jamais). */
  reshuffleEvery: number;
  /**
   * Leurres : la moitié des cases porte les mêmes nombres en orange. Seuls les bleus comptent
   * (ordre croissant ou décroissant) ; toucher un orange est une erreur.
   */
  decoys?: boolean;
}

export interface SchulteBoard {
  size: number;
  /** Ordre dans lequel toucher les symboles (des identifiants, voir `schulteText`). */
  sequence: string[];
  /** Symbole de chaque case, ligne par ligne. Avec des leurres, il y a plus de cases que de symboles à toucher. */
  cells: string[];
  tilts: number[];
  scales: number[];
}

export const SCHULTE_PENALTY_MS = 1000;

/** Préfixe des symboles orange (table de Gorbov, leurres) : « o:12 » s'affiche 12, en orange. */
const ORANGE = 'o:';

/** Le texte affiché d'un symbole. */
export function schulteText(id: string): string {
  return id.startsWith(ORANGE) ? id.slice(ORANGE.length) : id;
}

/** La couleur d'un symbole : 0 = bleu (ou l'encre, sur une grille d'une seule couleur), 1 = orange. */
export function schulteTone(id: string): 0 | 1 {
  return id.startsWith(ORANGE) ? 1 : 0;
}

/** Les grilles à deux couleurs (Gorbov, leurres). */
export function schulteTwoTone(level: number): boolean {
  const c = pickLevel(SCHULTE_LEVELS, level);
  return c.order === 'gorbov' || Boolean(c.decoys);
}

/** « 7 bleu », « 12 orange » (« blue 7 ») : pour la consigne et les lecteurs d'écran. */
export function schulteSpoken(id: string, twoTone: boolean): string {
  const text = schulteText(id);
  if (!twoTone) return text;
  return schulteTone(id) ? tr(`${text} orange`, `orange ${text}`) : tr(`${text} bleu`, `blue ${text}`);
}

const L = (
  size: 5 | 6 | 7,
  order: SchulteOrder,
  best: number,
  worst: number,
  { mark = true, tilt = false, reshuffleEvery = 0, decoys = false } = {},
): SchulteLevel => ({ size, order, mark, tilt, reshuffleEvery, best, worst, ...(decoys ? { decoys } : {}) });

const NO_MARK = { mark: false };

/**
 * Niveau 1 : la spec (5 × 5, de 1 à 25, 100 pts en 14 s).
 * 21-30 (Expert) : la grande grille 7 × 7 (49 cases) et les leurres orange.
 * 31-40 (Maître) : tout en 7 × 7, la table de Gorbov sur 6 × 6, les combinaisons.
 * 41-50 (Légende) : la table de Gorbov en 7 × 7 (bleus montants, orange descendants), sans repères,
 * brouillée et mouvante au niveau 50.
 * Seuils : ≈ 1,6 s par case pour la première étoile sur un 7 × 7 simple, plus pour chaque difficulté
 * (à rebours ×1,08 ; sans repères ×1,2 ; brouillée ×1,15 ; mouvante ×1,25 ; alternée ×1,6 ; Gorbov ×1,7 ;
 * leurres : deux fois moins de cases à toucher, ×0,6).
 */
export const SCHULTE_LEVELS: readonly SchulteLevel[] = [
  L(5, 'asc', 14, 60),
  L(5, 'desc', 16, 64),
  L(5, 'alpha', 18, 70),
  L(6, 'asc', 24, 90),
  L(5, 'asc', 18, 70, { mark: false }),
  L(5, 'alt', 30, 100),
  L(6, 'desc', 26, 95),
  L(5, 'asc', 18, 72, { tilt: true }),
  L(5, 'asc', 22, 80, { reshuffleEvery: 5 }),
  L(6, 'asc', 28, 100, { mark: false }),
  L(5, 'alt', 34, 110, { mark: false }),
  L(6, 'asc', 28, 100, { tilt: true }),
  L(5, 'desc', 22, 82, { mark: false, tilt: true }),
  L(6, 'desc', 30, 105, { mark: false }),
  L(5, 'asc', 26, 90, { mark: false, reshuffleEvery: 4 }),
  L(6, 'alt', 40, 130),
  L(6, 'asc', 32, 110, { mark: false, tilt: true }),
  L(6, 'desc', 34, 115, { reshuffleEvery: 6 }),
  L(6, 'alt', 46, 145, { mark: false }),
  L(6, 'desc', 40, 135, { mark: false, tilt: true, reshuffleEvery: 6 }),
  // Expert
  L(7, 'asc', 38, 135),
  L(6, 'asc', 16, 58, { decoys: true }),
  L(7, 'desc', 41, 146),
  L(6, 'desc', 19, 70, { decoys: true, ...NO_MARK }),
  L(7, 'asc', 46, 162, NO_MARK),
  L(7, 'alt', 61, 216),
  L(6, 'asc', 21, 78, { decoys: true, tilt: true, reshuffleEvery: 6 }),
  L(7, 'asc', 52, 186, { ...NO_MARK, tilt: true }),
  L(7, 'desc', 59, 210, { tilt: true, reshuffleEvery: 7 }),
  L(6, 'gorbov', 41, 153),
  // Maître
  L(7, 'asc', 23, 81, { decoys: true }),
  L(7, 'alt', 73, 259, NO_MARK),
  L(7, 'asc', 57, 203, { ...NO_MARK, reshuffleEvery: 7 }),
  L(6, 'gorbov', 49, 184, NO_MARK),
  L(7, 'desc', 28, 101, { decoys: true, tilt: true }),
  L(7, 'desc', 57, 201, { ...NO_MARK, tilt: true }),
  L(6, 'gorbov', 47, 176, { tilt: true }),
  L(7, 'alt', 87, 310, { tilt: true, reshuffleEvery: 8 }),
  L(7, 'desc', 37, 131, { decoys: true, ...NO_MARK, reshuffleEvery: 7 }),
  L(6, 'gorbov', 70, 264, { ...NO_MARK, tilt: true, reshuffleEvery: 6 }),
  // Légende
  L(7, 'gorbov', 65, 230),
  L(7, 'asc', 31, 112, { decoys: true, ...NO_MARK, tilt: true }),
  L(7, 'gorbov', 74, 264, { tilt: true }),
  L(7, 'alt', 105, 373, { ...NO_MARK, tilt: true, reshuffleEvery: 7 }),
  L(7, 'gorbov', 78, 275, NO_MARK),
  L(7, 'desc', 42, 151, { decoys: true, ...NO_MARK, tilt: true, reshuffleEvery: 6 }),
  L(7, 'gorbov', 81, 287, { reshuffleEvery: 8 }),
  L(7, 'gorbov', 89, 317, { ...NO_MARK, tilt: true }),
  L(7, 'gorbov', 93, 330, { tilt: true, reshuffleEvery: 7 }),
  L(7, 'gorbov', 107, 380, { ...NO_MARK, tilt: true, reshuffleEvery: 7 }),
];

/** [français, anglais], choisis à l'affichage. */
const ORDER_LABELS: Record<SchulteOrder, Translations> = {
  asc: { fr: 'dans l’ordre', en: 'in order' },
  desc: { fr: 'à rebours', en: 'countdown' },
  alpha: { fr: 'lettres A à Y', en: 'letters A to Y' },
  alt: { fr: '1-A-2-B…', en: '1-A-2-B…' },
  gorbov: { fr: 'bleus montants, orange descendants', en: 'blue up, orange down' },
};

export function schulteLevelLabel(level: number): string {
  const c = pickLevel(SCHULTE_LEVELS, level);
  const flags = [
    c.decoys && tr('leurres orange', 'orange decoys'),
    !c.mark && tr('sans repères', 'no markers'),
    c.tilt && tr('brouillée', 'scrambled'),
    c.reshuffleEvery && tr('mouvante', 'shifting'),
  ].filter(Boolean);
  return [`${c.size} × ${c.size}`, localized(ORDER_LABELS[c.order]), ...flags].join(' · ');
}

/** La règle affichée à l'intro. */
export function schulteRule(level: number): string {
  const c = pickLevel(SCHULTE_LEVELS, level);
  const count = c.size * c.size;
  const blue = Math.ceil(count / 2);
  const orange = Math.floor(count / 2);
  let base: string;
  if (c.decoys) {
    base =
      c.order === 'desc'
        ? tr(`Touche les nombres bleus de ${blue} à 1, à rebours. Les orange sont des pièges !`, `Tap the blue numbers from ${blue} down to 1. The orange ones are traps!`)
        : tr(`Touche les nombres bleus de 1 à ${blue} dans l’ordre. Les orange sont des pièges !`, `Tap the blue numbers from 1 to ${blue} in order. The orange ones are traps!`);
  } else {
    base = {
      asc: tr(`Touche les nombres de 1 à ${count} dans l’ordre, le plus vite possible.`, `Tap the numbers from 1 to ${count} in order, as fast as you can.`),
      desc: tr(`Touche les nombres de ${count} à 1, à rebours, le plus vite possible.`, `Tap the numbers from ${count} down to 1, as fast as you can.`),
      alpha: tr('Touche les lettres de A à Y dans l’ordre, le plus vite possible.', 'Tap the letters from A to Y in order, as fast as you can.'),
      alt: tr('Alterne nombres et lettres : 1, A, 2, B, 3, C… le plus vite possible.', 'Alternate numbers and letters: 1, A, 2, B, 3, C… as fast as you can.'),
      gorbov: tr(
        `Alterne les couleurs : les bleus en montant, les orange en descendant. Bleu 1, orange ${orange}, bleu 2, orange ${orange - 1}…`,
        `Alternate colors: blue going up, orange going down. Blue 1, orange ${orange}, blue 2, orange ${orange - 1}…`,
      ),
    }[c.order];
  }
  return c.reshuffleEvery ? tr(`${base} La grille se mélange en cours de route !`, `${base} The grid reshuffles along the way!`) : base;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const numbers = (n: number, prefix = '') => Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`);

/** Suite à toucher pour une grille donnée (sans les leurres : voir `schulteCells`). */
export function schulteSequence(size: number, order: SchulteOrder, decoys = false): string[] {
  const count = size * size;
  if (decoys) {
    // Les bleus, plus nombreux d'un (49 cases = 25 bleus + 24 orange).
    const blue = numbers(Math.ceil(count / 2));
    return order === 'desc' ? blue.reverse() : blue;
  }
  switch (order) {
    case 'asc':
      return numbers(count);
    case 'desc':
      return numbers(count).reverse();
    case 'alpha':
      return [...LETTERS.slice(0, count)];
    case 'alt': {
      const sequence: string[] = [];
      for (let i = 0; sequence.length < count; i++) {
        sequence.push(String(i + 1));
        if (sequence.length < count) sequence.push(LETTERS[i]);
      }
      return sequence;
    }
    case 'gorbov': {
      // Bleu 1, orange N, bleu 2, orange N-1… : les bleus ont une case de plus si la grille est impaire.
      const blue = numbers(Math.ceil(count / 2));
      const orange = numbers(Math.floor(count / 2), ORANGE).reverse();
      return blue.flatMap((b, i) => (i < orange.length ? [b, orange[i]] : [b]));
    }
  }
}

/** Tous les symboles de la grille : la suite, plus les leurres orange s'il y en a. */
export function schulteCells(size: number, order: SchulteOrder, decoys = false): string[] {
  const sequence = schulteSequence(size, order, decoys);
  return decoys ? [...sequence, ...numbers(size * size - sequence.length, ORANGE)] : sequence;
}

export function generateSchulte(rng: Rng, level: number): SchulteBoard {
  const config = pickLevel(SCHULTE_LEVELS, level);
  const sequence = schulteSequence(config.size, config.order, config.decoys);
  const cells = rng.shuffle(config.decoys ? schulteCells(config.size, config.order, true) : sequence);
  const tilts = cells.map(() => (config.tilt ? rng.int(-30, 30) : 0));
  const scales = cells.map(() => (config.tilt ? rng.int(80, 125) / 100 : 1));
  return { size: config.size, sequence, cells, tilts, scales };
}

/** Temps total + 1 s par erreur, converti en score selon le niveau. */
export function scoreSchulte(elapsedMs: number, errors: number, level: number): number {
  const seconds = (elapsedMs + errors * SCHULTE_PENALTY_MS) / 1000;
  return timeScore(seconds, pickLevel(SCHULTE_LEVELS, level));
}
