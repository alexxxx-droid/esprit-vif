export type Domain = 'calcul' | 'memoire' | 'attention' | 'vitesse' | 'langage';

export type GameId = 'calcul' | 'stroop' | 'schulte' | 'matrice' | 'nback' | 'total' | 'intrus' | 'anagrammes';

export type PlayMode = 'free' | 'daily';

export interface StatLine {
  label: string;
  value: string;
}

/** Ce que renvoie une partie terminée, quel que soit le jeu. */
export interface PlayOutcome {
  /** Score normalisé, entier de 0 à 100. */
  score: number;
  /** Statistiques brutes, conservées telles quelles. */
  stats: Record<string, number>;
  /** Résumé lisible en une ligne, affiché avec les records (« 32,4 s · 1 erreur »). */
  headline: string;
  /** Détail affiché sur l'écran de résultat. */
  lines: StatLine[];
}
