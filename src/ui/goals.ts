import type { Domain } from '../core/types';

/** Les domaines dits comme des objectifs : ce qu'on a envie de travailler. */
export const GOAL_LABELS: Record<Domain, string> = {
  calcul: 'Calcul mental',
  memoire: 'Mémoire',
  attention: 'Concentration',
  vitesse: 'Rapidité',
  langage: 'Vocabulaire',
  logique: 'Raisonnement',
};

export const MAX_GOALS = 3;

/** Ajoute ou retire un objectif, sans dépasser le maximum. */
export function toggleGoal(goals: readonly Domain[], domain: Domain): Domain[] {
  if (goals.includes(domain)) return goals.filter((d) => d !== domain);
  return goals.length >= MAX_GOALS ? [...goals] : [...goals, domain];
}
