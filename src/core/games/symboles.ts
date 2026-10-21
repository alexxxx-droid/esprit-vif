import { tr } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * Symboles : le grand classique des tests de vitesse (codage). Une table associe des formes à des
 * chiffres ; une forme s'affiche, on touche son chiffre, le plus vite possible pendant 45 s. Une
 * erreur retire un point : toucher au hasard ne rapporte rien.
 * Les paliers changent la façon de jouer : six symboles (Confirmé), la table change en cours de
 * partie (Expert), la table se cache après quelques secondes, à retenir (Maître), huit symboles et
 * des touches dans le désordre (Légende).
 */

export const SYMBOLES_DURATION_MS = 45_000;
/** Ce que coûte un coup d'œil à la table cachée (paliers Maître et Légende). */
export const SYMBOLES_PEEK_MS = 2000;

export interface SymbolesLevel {
  symbols: 4 | 6 | 8;
  /** La table change toutes les `shuffleEvery` réponses (0 : jamais). */
  shuffleEvery: number;
  /** La table se cache au bout de ce temps (0 : toujours visible). */
  hideMs: number;
  /** Les touches des chiffres sont dans le désordre. */
  mixedPad: boolean;
  /** Bonnes réponses moins erreurs pour 100 pts. */
  target: number;
}

/** Interpolation d'un palier : de `a` (1er niveau) à `b` (10e). */
const step = (i: number, a: number, b: number) => Math.round(a + ((b - a) * i) / 9);
/** Une durée de palier, arrondie à la demi-seconde (« 6,5 s », jamais « 6,67 s »). */
const half = (i: number, a: number, b: number) => Math.round(step(i, a, b) / 500) * 500;

const lvl = (symbols: 4 | 6 | 8, shuffleEvery: number, hideMs: number, mixedPad: boolean, target: number): SymbolesLevel => ({ symbols, shuffleEvery, hideMs, mixedPad, target });

export const SYMBOLES_LEVELS: readonly SymbolesLevel[] = [
  // Débutant : quatre symboles, la table toujours sous les yeux.
  ...Array.from({ length: 10 }, (_, i) => lvl(4, 0, 0, false, step(i, 24, 30))),
  // Confirmé : six symboles.
  ...Array.from({ length: 10 }, (_, i) => lvl(6, 0, 0, false, step(i, 22, 27))),
  // Expert : la table change en cours de partie.
  ...Array.from({ length: 10 }, (_, i) => lvl(6, step(i, 12, 8), 0, false, step(i, 20, 24))),
  // Maître : la table se cache ; on la retient (un coup d'œil coûte 2 s).
  ...Array.from({ length: 10 }, (_, i) => lvl(i < 5 ? 4 : 6, 0, half(i, 8000, 5000), false, step(i, 18, 22))),
  // Légende : huit symboles, touches dans le désordre.
  ...Array.from({ length: 10 }, (_, i) => lvl(8, 0, i < 5 ? 0 : half(i, 9000, 7000), true, step(i, 16, 19))),
];

export function symbolesLevel(level: number): SymbolesLevel {
  return pickLevel(SYMBOLES_LEVELS, level);
}

export function symbolesLevelLabel(level: number): string {
  const c = symbolesLevel(level);
  return [
    tr(`${c.symbols} symboles`, `${c.symbols} symbols`),
    c.shuffleEvery > 0 && tr(`la table change toutes les ${c.shuffleEvery} réponses`, `table changes every ${c.shuffleEvery} answers`),
    c.hideMs > 0 && tr(`table cachée après ${secondsLabel(c.hideMs)}`, `table hidden after ${secondsLabel(c.hideMs)}`),
    c.mixedPad && tr('touches mélangées', 'mixed keys'),
    tr(`objectif ${c.target}`, `target ${c.target}`),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** La règle affichée à l'intro. */
export function symbolesRule(level: number): string {
  const c = symbolesLevel(level);
  const parts = [
    tr('Touche le chiffre de chaque symbole, d’après la table du haut. Une erreur retire un point. 45 secondes.', 'Tap the number for each symbol, using the table at the top. A mistake costs a point. 45 seconds.'),
    c.shuffleEvery > 0 && tr(`La table change toutes les ${c.shuffleEvery} réponses : relis-la.`, `The table changes every ${c.shuffleEvery} answers: read it again.`),
    c.hideMs > 0 &&
      tr(
        `La table se cache au bout de ${secondsLabel(c.hideMs)} : retiens-la. Un coup d’œil coûte 2 secondes.`,
        `The table hides after ${secondsLabel(c.hideMs)}: remember it. A peek costs 2 seconds.`,
      ),
    c.mixedPad && tr('Les touches des chiffres sont dans le désordre.', 'The number keys are out of order.'),
  ];
  return parts.filter(Boolean).join(' ');
}

export interface SymbolesGame {
  /** Pour chaque table successive : le chiffre (1 à n) de chaque forme (index de forme). */
  tables: number[][];
  /** Les formes à coder, dans l'ordre (jamais deux fois la même de suite). */
  sequence: number[];
  /** L'ordre des touches de chiffres. */
  pad: number[];
}

/** Assez de symboles pour une partie, même très rapide. */
const LENGTH = 200;

export function generateSymboles(rng: Rng, level: number): SymbolesGame {
  const c = symbolesLevel(level);
  // Les formes du jeu : `symbols` parmi les huit.
  const shapes = rng.shuffle(Array.from({ length: 8 }, (_, i) => i)).slice(0, c.symbols);
  const digits = Array.from({ length: c.symbols }, (_, i) => i + 1);
  const tableCount = c.shuffleEvery ? Math.ceil(LENGTH / c.shuffleEvery) : 1;
  const tables: number[][] = [];
  for (let t = 0; t < tableCount; t++) {
    const table = Array.from({ length: 8 }, () => 0);
    // Une nouvelle table change vraiment : au moins la moitié des chiffres bougent.
    for (;;) {
      const order = rng.shuffle([...digits]);
      shapes.forEach((shape, k) => (table[shape] = order[k]));
      const previous = tables[t - 1];
      if (!previous || shapes.filter((s) => previous[s] !== table[s]).length >= c.symbols / 2) break;
    }
    tables.push([...table]);
  }
  const sequence: number[] = [];
  while (sequence.length < LENGTH) {
    const shape = rng.pick(shapes);
    if (shape !== sequence[sequence.length - 1]) sequence.push(shape);
  }
  return { tables, sequence, pad: c.mixedPad ? rng.shuffle([...digits]) : digits };
}

/** La table en vigueur pour la réponse `index`. */
export const tableAt = (c: SymbolesLevel, game: SymbolesGame, index: number) => game.tables[c.shuffleEvery ? Math.floor(index / c.shuffleEvery) : 0];

/** Bonnes réponses moins erreurs, rapportées à l'objectif du niveau. */
export function scoreSymboles(correct: number, errors: number, level: number): number {
  return countScore(correct - errors, 0, symbolesLevel(level).target);
}
