import { createRng, deriveSeed } from './rng';
import { STROOP_COLORS, type StroopColor } from './games/stroop';

/**
 * Mode fête : 2 à 4 joueurs sur le même écran, chacun dans sa zone. Tout le monde voit
 * la même question ; le premier qui répond juste marque, une erreur le gèle jusqu'à la suivante.
 * Uniquement des nombres entiers, des réponses à choisir (pas de saisie).
 */

export type PartyKind = 'calcul' | 'couleur' | 'grand' | 'combien';

export const PARTY_ROUNDS: { kind: PartyKind; title: string; rule: string }[] = [
  { kind: 'calcul', title: 'Calcul express', rule: 'Touche le bon résultat avant les autres.' },
  { kind: 'couleur', title: 'Couleur piégée', rule: 'Touche la couleur de l’encre, pas le mot écrit.' },
  { kind: 'grand', title: 'Le plus grand', rule: 'Touche le plus grand des deux nombres.' },
  { kind: 'combien', title: 'Combien de points ?', rule: 'Compte les points, vite !' },
  { kind: 'calcul', title: 'Finale : calcul', rule: 'Dernière manche, tout se joue maintenant !' },
];

export const QUESTIONS_PER_ROUND = 5;
export const QUESTION_TIME_MS = 8000;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;

export interface PartyOption {
  label: string;
  /** Couleur du bouton (manche « Couleur piégée »). */
  color?: StroopColor;
}

export interface PartyQuestion {
  kind: PartyKind;
  /** Texte de la question (calcul, mot de couleur…). */
  text: string;
  /** Encre du mot (manche « Couleur piégée »). */
  ink?: StroopColor;
  /** Points à compter : positions dans une grille de 5 × 5 (manche « Combien »). */
  dots?: number[];
  options: PartyOption[];
  answer: number;
}

/** Quatre propositions distinctes autour de la bonne, mélangées. */
function numberOptions(rng: ReturnType<typeof createRng>, answer: number, spread: number): { options: PartyOption[]; answer: number } {
  const values = new Set([answer]);
  while (values.size < 4) {
    const v = answer + rng.int(-spread, spread);
    if (v >= 0 && v !== answer) values.add(v);
  }
  const shuffled = rng.shuffle([...values]);
  return { options: shuffled.map((v) => ({ label: String(v) })), answer: shuffled.indexOf(answer) };
}

export function partyQuestion(seed: number, round: number, index: number): PartyQuestion {
  const rng = createRng(deriveSeed(seed, round * 100 + index));
  const kind = PARTY_ROUNDS[round].kind;
  // Les questions durcissent un peu au fil des manches.
  const hard = round >= 2;
  if (kind === 'calcul') {
    const op = rng.pick(hard ? ['+', '−', '×'] : ['+', '−']);
    let a = rng.int(hard ? 6 : 2, hard ? 15 : 12);
    let b = rng.int(2, hard ? 12 : 9);
    if (op === '−' && b > a) [a, b] = [b, a];
    const value = op === '+' ? a + b : op === '−' ? a - b : a * b;
    return { kind, text: `${a} ${op} ${b}`, ...numberOptions(rng, value, op === '×' ? 8 : 4) };
  }
  if (kind === 'couleur') {
    const colors = rng.shuffle(STROOP_COLORS).slice(0, 4);
    const ink = colors[0];
    const word = rng.pick(STROOP_COLORS.filter((c) => c !== ink));
    const shuffled = rng.shuffle(colors);
    return {
      kind,
      text: word,
      ink,
      options: shuffled.map((c) => ({ label: c, color: c })),
      answer: shuffled.indexOf(ink),
    };
  }
  if (kind === 'grand') {
    const a = rng.int(hard ? 100 : 10, hard ? 999 : 99);
    let b = a;
    // Des nombres proches : on lit les chiffres, pas seulement la longueur.
    while (b === a || b <= 0) b = a + rng.int(-9, 9) * (rng.chance(0.5) ? 1 : 10);
    const pair = [a, b];
    return { kind, text: 'Le plus grand ?', options: pair.map((v) => ({ label: String(v) })), answer: a > b ? 0 : 1 };
  }
  const count = rng.int(hard ? 8 : 4, hard ? 16 : 10);
  const dots = rng.shuffle(Array.from({ length: 25 }, (_, i) => i)).slice(0, count);
  return { kind, text: 'Combien de points ?', dots, ...numberOptions(rng, count, 3) };
}

export interface PartyPlayer {
  name: string;
  color: number;
  score: number;
}

/** Classement final : le plus de points d'abord, ex æquo partagés. */
export function partyRanking(players: readonly PartyPlayer[]): { player: PartyPlayer; rank: number }[] {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return sorted.map((player) => ({ player, rank: sorted.findIndex((p) => p.score === player.score) + 1 }));
}
