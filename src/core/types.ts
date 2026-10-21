export type Domain = 'calcul' | 'memoire' | 'attention' | 'vitesse' | 'langage' | 'logique';

export type GameId =
  | 'calcul'
  | 'stroop'
  | 'schulte'
  | 'matrice'
  | 'nback'
  | 'total'
  | 'intrus'
  | 'anagrammes'
  | 'boutique'
  | 'diable'
  | 'ordre'
  | 'monnaie'
  | 'pluie'
  | 'correspondance'
  | 'fleches'
  | 'reflexe'
  | 'rotation'
  | 'sudoku'
  | 'balance'
  | 'horloges'
  | 'mots'
  | 'lettre'
  | 'categories'
  | 'paires'
  | 'coupdoeil'
  | 'quiestqui'
  | 'lecture'
  | 'itineraire'
  | 'filature'
  | 'lucioles'
  | 'contraires'
  | 'suites'
  | 'compte'
  | 'echo'
  | 'miroir'
  | 'code'
  | 'combien'
  | 'motsmeles'
  | 'aiguillages'
  | 'symboles'
  | 'regle'
  | 'grand'
  | 'manque'
  | 'pendu'
  | 'taquin';

/** Entraînement libre, test du jour, ou Défi Légende du jour. */
export type PlayMode = 'free' | 'daily' | 'legende';

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
  /** Durée de la partie, mesurée par le déroulé commun (pas par le jeu). */
  durationMs?: number;
}
