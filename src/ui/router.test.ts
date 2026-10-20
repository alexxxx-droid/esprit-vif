import { describe, expect, it } from 'vitest';
import { parseHash, routeHash } from './router';

describe('routes de l’Entraînement', () => {
  it('ouvre la page d’un thème, et revient à la liste des thèmes sinon', () => {
    expect(parseHash('#/entrainement')).toEqual({ name: 'training' });
    expect(parseHash('#/entrainement/logique')).toEqual({ name: 'training', domain: 'logique' });
    expect(parseHash('#/entrainement/inconnu')).toEqual({ name: 'training' });
    expect(routeHash({ name: 'training', domain: 'calcul' })).toBe('#/entrainement/calcul');
    expect(routeHash({ name: 'training' })).toBe('#/entrainement');
  });
});
