import { describe, expect, it } from 'vitest';
import type { ProgressionInput } from './progression';
import { HATS, hatName, purchaseBlocker, wardrobe } from './wardrobe';

const empty: ProgressionInput = { plays: [], tests: [], bests: {}, sessions: [], marathons: 0, duels: 0, challenges: 0 };

describe('vestiaire de Vif', () => {
  it('a des chapeaux uniques, chacun avec un nom, un prix ou une condition', () => {
    expect(new Set(HATS.map((h) => h.id)).size).toBe(HATS.length);
    for (const hat of HATS) {
      expect(hatName(hat.id).length).toBeGreaterThan(1);
      expect(Boolean(hat.price) !== Boolean(hat.prestige)).toBe(true);
    }
  });

  it('calcule le solde : gagné moins dépensé', () => {
    const status = wardrobe(empty, [{ id: 'casquette', cost: 40, day: '2026-10-20' }], 100);
    expect(status.balance).toBe(60);
    expect(status.hats.find((h) => h.id === 'casquette')?.owned).toBe(true);
    expect(status.nextShop?.id).toBe('fleur');
  });

  it('refuse un achat sans assez d’étincelles, en double ou d’un chapeau de prestige', () => {
    const status = wardrobe(empty, [{ id: 'casquette', cost: 40, day: '2026-10-20' }], 80);
    expect(purchaseBlocker(status, 'casquette')).toMatch(/Déjà/);
    expect(purchaseBlocker(status, 'viking')).toMatch(/160/);
    expect(purchaseBlocker(status, 'couronne')).toMatch(/ne s’achète pas/);
    expect(purchaseBlocker(status, 'fleur')).toBeNull();
  });

  it('donne les chapeaux de prestige aux exploits, et montre où en est le joueur', () => {
    const levels = Object.fromEntries(Array.from({ length: 22 }, (_, i) => [i + 1, { score: 70 }]));
    const status = wardrobe({ ...empty, bests: { calcul: levels } }, [], 0);
    expect(status.hats.find((h) => h.id === 'beret')?.owned).toBe(true);
    expect(status.hats.find((h) => h.id === 'magicien')?.progress).toEqual([23, 31]);
    expect(status.hats.find((h) => h.id === 'couronne')?.owned).toBe(false);
    expect(status.nextPrestige?.id).toBe('magicien');
  });
});
