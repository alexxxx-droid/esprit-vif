import { tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { clampScore, countScore } from '../scoring';

/**
 * Code secret : un petit Mastermind. On propose des couleurs, les indices disent ce qui est juste ;
 * chaque code trouvé rapporte d'autant plus qu'il a demandé peu d'essais. Deux ou trois codes par
 * partie, une minute au plus.
 * Les paliers changent la façon de jouer : quatre pions et cinq couleurs (Confirmé), une couleur
 * peut revenir (Expert), les indices ne disent plus quel pion, seulement combien sont bien ou mal
 * placés (Maître), comptés et couleurs répétées ensemble (Légende).
 */

export const CODE_DURATION_MS = 60_000;

export interface CodeLevel {
  pegs: 3 | 4;
  colors: 4 | 5 | 6;
  /** Une couleur peut revenir plusieurs fois dans le code. */
  repeats: boolean;
  /** Un indice par pion (juste, présent ailleurs, absent), ou seulement les nombres. */
  hints: 'pegs' | 'counts';
  /** Essais par code. */
  tries: number;
  /** Essais d'un bon joueur : trouver en `par` essais ou moins vaut 100 pts. */
  par: number;
  /** Codes par partie. */
  codes: number;
}

const lvl = (pegs: 3 | 4, colors: 4 | 5 | 6, repeats: boolean, hints: 'pegs' | 'counts', tries: number, par: number, codes: number): CodeLevel => ({
  pegs,
  colors,
  repeats,
  hints,
  tries,
  par,
  codes,
});

export const CODE_LEVELS: readonly CodeLevel[] = [
  // Débutant : trois pions, quatre puis cinq couleurs, un indice par pion.
  ...Array.from({ length: 10 }, (_, i) => lvl(3, i < 5 ? 4 : 5, false, 'pegs', 6, 3, 3)),
  // Confirmé : quatre pions.
  ...Array.from({ length: 10 }, (_, i) => lvl(4, i < 5 ? 5 : 6, false, 'pegs', 7, 4, 3)),
  // Expert : une couleur peut revenir.
  ...Array.from({ length: 10 }, (_, i) => lvl(i < 5 ? 3 : 4, 5, true, 'pegs', 7, 4, 3)),
  // Maître : seulement le nombre de pions bien placés et mal placés.
  ...Array.from({ length: 10 }, (_, i) => lvl(3, i < 5 ? 4 : 5, false, 'counts', 7, 4, 2)),
  // Légende : comptés, et une couleur peut revenir.
  ...Array.from({ length: 10 }, (_, i) => lvl(3, i < 5 ? 4 : 5, true, 'counts', 8, 5, 2)),
];

export function codeLevel(level: number): CodeLevel {
  return pickLevel(CODE_LEVELS, level);
}

export function codeLevelLabel(level: number): string {
  const c = codeLevel(level);
  return [
    tr(`${c.pegs} pions · ${c.colors} couleurs`, `${c.pegs} pegs · ${c.colors} colors`),
    c.repeats && tr('couleurs répétées', 'repeated colors'),
    c.hints === 'counts' && tr('indices comptés', 'counted clues'),
    tr(`${c.codes} codes`, `${c.codes} codes`),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** La règle affichée à l'intro. */
export function codeRule(level: number): string {
  const c = codeLevel(level);
  const parts = [
    c.hints === 'pegs'
      ? tr(
          'Trouve le code secret en peu d’essais. Sous chaque pion : ✓ bien placé, • présent mais ailleurs, rien s’il n’y est pas.',
          'Crack the secret code in as few tries as you can. Under each peg: ✓ right place, • in the code but elsewhere, nothing if it isn’t there.',
        )
      : tr(
          'Trouve le code secret en peu d’essais. Les indices ne disent plus quel pion : seulement combien sont bien placés (●) et mal placés (○).',
          'Crack the secret code in as few tries as you can. Clues no longer say which peg: only how many are in the right place (●) or the wrong place (○).',
        ),
    c.repeats && tr('Une couleur peut revenir plusieurs fois.', 'A color can appear more than once.'),
    tr(`${c.codes} codes, une minute au plus.`, `${c.codes} codes, one minute at most.`),
  ];
  return parts.filter(Boolean).join(' ');
}

export type PegHint = 'good' | 'near' | 'miss';

/** Un indice par pion : bien placé, présent ailleurs (une fois par pion du code), ou absent. */
export function pegHints(secret: readonly number[], guess: readonly number[]): PegHint[] {
  const hints: PegHint[] = guess.map((g, i) => (g === secret[i] ? 'good' : 'miss'));
  const left = secret.filter((s, i) => guess[i] !== s);
  guess.forEach((g, i) => {
    if (hints[i] === 'good') return;
    const k = left.indexOf(g);
    if (k >= 0) {
      hints[i] = 'near';
      left.splice(k, 1);
    }
  });
  return hints;
}

/** Les nombres seulement : pions bien placés, et couleurs justes mais mal placées. */
export function hintCounts(secret: readonly number[], guess: readonly number[]): { good: number; near: number } {
  const hints = pegHints(secret, guess);
  return { good: hints.filter((h) => h === 'good').length, near: hints.filter((h) => h === 'near').length };
}

export function generateCodes(rng: Rng, level: number): number[][] {
  const c = codeLevel(level);
  return Array.from({ length: c.codes }, () => {
    if (!c.repeats) return rng.shuffle(Array.from({ length: c.colors }, (_, i) => i)).slice(0, c.pegs);
    // Couleurs répétées : au moins une couleur revient, sinon le palier ne changerait rien.
    for (;;) {
      const code = Array.from({ length: c.pegs }, () => rng.int(0, c.colors - 1));
      if (new Set(code).size < c.pegs) return code;
    }
  });
}

/** Les points d'un code : 100 en `par` essais ou moins, de moins en moins ensuite ; 0 s'il n'est pas trouvé. */
export function codePoints(triesUsed: number | null, level: number): number {
  const c = codeLevel(level);
  if (triesUsed === null) return 0;
  return countScore(c.tries + 1 - triesUsed, 0, c.tries + 1 - c.par);
}

/** La moyenne des codes de la partie (un code pas trouvé, ou pas commencé à la fin de la minute, vaut 0). */
export function scoreCode(results: readonly (number | null)[], level: number): number {
  const c = codeLevel(level);
  const total = Array.from({ length: c.codes }, (_, i) => codePoints(results[i] ?? null, level)).reduce((a, b) => a + b, 0);
  return clampScore(total / c.codes);
}
