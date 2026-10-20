import { beforeEach, describe, expect, it, vi } from 'vitest';
import { playBackend, testBackend, webBackend, type BillingBackend, type OwnedPurchase, type PlayBillingApi } from './billing';
import { PREMIUM_PRODUCT_ID } from './catalog';
import { isPremium } from './entitlement';
import { hasPremium, PremiumController } from './premium';

/** Un petit stockage local en mémoire, comme celui du navigateur. */
function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  };
}

const owned = (state: OwnedPurchase['state'], verified = true, product = PREMIUM_PRODUCT_ID): OwnedPurchase => ({ productIds: [product], state, verified, token: 't' });

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
});

async function ready(backend: BillingBackend) {
  const controller = new PremiumController(backend);
  await controller.init();
  return controller;
}

describe('droit Premium', () => {
  it('ne s’accorde que pour un achat terminé, vérifié, du bon produit', () => {
    expect(hasPremium([owned('purchased')])).toBe(true);
    expect(hasPremium([owned('pending')])).toBe(false);
    expect(hasPremium([owned('purchased', false)])).toBe(false);
    expect(hasPremium([owned('purchased', true, 'autre_produit')])).toBe(false);
    expect(hasPremium([])).toBe(false);
  });
});

describe('boutique (mode test)', () => {
  it('un achat annulé ne débloque rien', async () => {
    const backend = testBackend();
    backend.scenario = 'cancel';
    const c = await ready(backend);
    await c.buy();
    expect(c.getState()).toMatchObject({ premium: false, notice: 'cancelled', busy: null });
    expect(isPremium()).toBe(false);
  });

  it('un achat en attente ne débloque pas Premium avant d’être confirmé', async () => {
    const backend = testBackend();
    backend.scenario = 'pending';
    const c = await ready(backend);
    await c.buy();
    expect(c.getState()).toMatchObject({ premium: false, pending: true, notice: 'pending' });
    // Le paiement est confirmé plus tard : la vérification suivante l'accorde.
    backend.settlePending();
    await c.restore();
    expect(c.getState()).toMatchObject({ premium: true, pending: false, notice: 'restored' });
  });

  it('un achat valide donne Premium, gardé pour le prochain lancement', async () => {
    const backend = testBackend();
    const c = await ready(backend);
    await c.buy();
    expect(c.getState()).toMatchObject({ premium: true, notice: 'purchased' });
    expect(isPremium()).toBe(true);
    // Relancement hors ligne : le dernier achat vérifié vaut encore.
    const offline = testBackend();
    offline.scenario = 'error';
    const again = await ready(offline);
    expect(again.getState().premium).toBe(true);
  });

  it('un achat déjà fait (réinstallation, autre appareil) se restaure', async () => {
    const backend = testBackend();
    backend.scenario = 'already-owned';
    const c = await ready(backend);
    await c.buy();
    expect(c.getState()).toMatchObject({ premium: true, notice: 'restored' });
  });

  it('« Restaurer » sans achat le dit simplement, sans rien accorder', async () => {
    const c = await ready(testBackend());
    await c.restore();
    expect(c.getState()).toMatchObject({ premium: false, notice: 'nothing-to-restore' });
  });

  it('un remboursement retire Premium à la vérification suivante', async () => {
    const backend = testBackend();
    const c = await ready(backend);
    await c.buy();
    backend.refund();
    const relaunch = await ready(backend);
    expect(relaunch.getState().premium).toBe(false);
  });

  it('une erreur réseau pendant l’achat n’accorde rien et ne perd rien', async () => {
    const backend = testBackend();
    backend.scenario = 'error';
    const c = await ready(backend);
    await c.buy();
    expect(c.getState()).toMatchObject({ premium: false, notice: 'network', busy: null });
  });
});

describe('sans boutique', () => {
  it('sur le site, Premium ne s’achète pas et rien n’est accordé', async () => {
    localStorage.setItem('esprit-vif:premium', JSON.stringify({ premium: true, checkedAt: '2026-10-20' }));
    const c = await ready(webBackend);
    expect(c.getState()).toMatchObject({ shop: 'web', premium: false });
    await c.buy();
    expect(c.getState().premium).toBe(false);
  });

  it('dans l’APK sans clé de la Play Console, la boutique se dit non configurée', async () => {
    const api: PlayBillingApi = {
      status: async () => ({ configured: false, ready: false }),
      product: async () => Promise.reject(new Error('non')),
      purchase: async () => Promise.reject(new Error('non')),
      owned: async () => Promise.reject(new Error('non')),
    };
    const c = await ready(playBackend(api));
    expect(c.getState()).toMatchObject({ shop: 'not-configured', premium: false });
  });

  it('Google Play indisponible : on garde le dernier achat vérifié, sans planter', async () => {
    localStorage.setItem('esprit-vif:premium', JSON.stringify({ premium: true, checkedAt: '2026-10-20' }));
    const api: PlayBillingApi = {
      status: async () => Promise.reject(Object.assign(new Error('hors ligne'), { code: 'network' })),
      product: async () => Promise.reject(new Error('non')),
      purchase: async () => Promise.reject(new Error('non')),
      owned: async () => Promise.reject(new Error('non')),
    };
    const c = await ready(playBackend(api));
    expect(c.getState()).toMatchObject({ shop: 'network', premium: true });
  });

  it('traduit les réponses du module natif (achat en attente, achat refusé)', async () => {
    const answers = [
      { kind: 'pending', code: 'ok', message: '' },
      { kind: 'error', code: 'developer-error', message: 'mauvais produit' },
    ];
    const api: PlayBillingApi = {
      status: async () => ({ configured: true, ready: true }),
      product: async () => ({ id: PREMIUM_PRODUCT_ID, title: 'Premium', price: '8,99 €', currency: 'EUR' }),
      purchase: async () => answers.shift()!,
      owned: async () => ({ purchases: [] }),
    };
    const c = await ready(playBackend(api));
    expect(c.getState().product?.price).toBe('8,99 €');
    await c.buy();
    expect(c.getState()).toMatchObject({ premium: false, pending: true, notice: 'pending' });
    await c.buy();
    expect(c.getState()).toMatchObject({ premium: false, notice: 'error' });
  });
});
