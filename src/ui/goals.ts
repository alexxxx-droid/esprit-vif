import { tr } from '../core/lang';
import type { Domain } from '../core/types';

/** Les domaines dits comme des objectifs : ce qu'on a envie de travailler (lus dans la langue en cours). */
export const GOAL_LABELS: Record<Domain, string> = {
  get calcul() {
    return tr('Calcul mental', 'Mental math');
  },
  get memoire() {
    return tr('Mémoire', 'Memory');
  },
  get attention() {
    return tr('Concentration', 'Focus');
  },
  get vitesse() {
    return tr('Rapidité', 'Quickness');
  },
  get langage() {
    return tr('Vocabulaire', 'Vocabulary');
  },
  get logique() {
    return tr('Raisonnement', 'Reasoning');
  },
};

export const MAX_GOALS = 3;

/** Ajoute ou retire un objectif, sans dépasser le maximum. */
export function toggleGoal(goals: readonly Domain[], domain: Domain): Domain[] {
  if (goals.includes(domain)) return goals.filter((d) => d !== domain);
  return goals.length >= MAX_GOALS ? [...goals] : [...goals, domain];
}
