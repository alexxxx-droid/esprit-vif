import { PREMIUM_PRODUCT_ID } from './catalog';

/**
 * Le client de facturation, derrière une interface : Google Play dans l'appli Android, rien sur le
 * site (Premium ne s'y vend pas), et un mode test explicite pour le développement uniquement.
 */

export interface Product {
  id: string;
  title: string;
  /** Prix formaté par Google Play, dans la monnaie du joueur (« 8,99 € »). */
  price: string;
}

/** Un achat tel que Google Play le décrit, vérifié (signature) par le module natif. */
export interface OwnedPurchase {
  productIds: string[];
  state: 'purchased' | 'pending' | 'unknown';
  verified: boolean;
  token: string;
}

export type PurchaseOutcome =
  | { kind: 'purchased'; purchase: OwnedPurchase }
  | { kind: 'pending' }
  | { kind: 'cancelled' }
  | { kind: 'already-owned' }
  | { kind: 'error'; code: string; message: string };

export type Availability = { ok: true } | { ok: false; reason: 'web' | 'not-configured' | 'unavailable' | 'network' };

export interface BillingBackend {
  readonly kind: 'play' | 'web' | 'test';
  availability(): Promise<Availability>;
  product(): Promise<Product | null>;
  purchase(): Promise<PurchaseOutcome>;
  /** Les achats connus de Google Play ; une erreur si la vérification est impossible (hors ligne…). */
  owned(): Promise<OwnedPurchase[]>;
}

/** Ce que le module natif `PlayBilling` expose (android/…/PlayBillingPlugin.java). */
export interface PlayBillingApi {
  status(): Promise<{ configured: boolean; ready: boolean }>;
  product(options: { id: string }): Promise<Product & { currency: string }>;
  purchase(options: { id: string }): Promise<{ kind: string; code: string; message: string; purchase?: OwnedPurchase }>;
  owned(options: { id: string }): Promise<{ purchases: OwnedPurchase[] }>;
}

const codeOf = (e: unknown) => (typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : 'error');
const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function playBackend(api: PlayBillingApi): BillingBackend {
  return {
    kind: 'play',
    async availability() {
      try {
        const status = await api.status();
        return status.configured ? { ok: true } : { ok: false, reason: 'not-configured' };
      } catch (e) {
        return { ok: false, reason: codeOf(e) === 'network' ? 'network' : 'unavailable' };
      }
    },
    async product() {
      try {
        const { id, title, price } = await api.product({ id: PREMIUM_PRODUCT_ID });
        return { id, title, price };
      } catch {
        return null;
      }
    },
    async purchase() {
      try {
        const result = await api.purchase({ id: PREMIUM_PRODUCT_ID });
        if (result.kind === 'purchased' && result.purchase) return { kind: 'purchased', purchase: result.purchase };
        if (result.kind === 'pending' || result.kind === 'cancelled' || result.kind === 'already-owned') return { kind: result.kind };
        return { kind: 'error', code: result.code, message: result.message };
      } catch (e) {
        return { kind: 'error', code: codeOf(e), message: messageOf(e) };
      }
    },
    async owned() {
      const { purchases } = await api.owned({ id: PREMIUM_PRODUCT_ID });
      return purchases;
    },
  };
}

/** Le site : Premium n'y est pas vendu (paiement par Google Play uniquement, dans l'appli). */
export const webBackend: BillingBackend = {
  kind: 'web',
  availability: async () => ({ ok: false, reason: 'web' }),
  product: async () => null,
  purchase: async () => ({ kind: 'error', code: 'web', message: 'Premium s’achète dans l’appli Android.' }),
  owned: async () => [],
};

export type TestScenario = 'success' | 'pending' | 'cancel' | 'error' | 'already-owned';

/**
 * Mode test (développement seulement, jamais dans une version publiée) : aucun achat réel. La
 * réponse de la prochaine tentative se choisit sur l'écran Premium, et l'on peut « rembourser ».
 */
export function testBackend(): BillingBackend & { scenario: TestScenario; refund(): void; settlePending(): void } {
  let bought = false;
  let pending = false;
  const purchase = (state: OwnedPurchase['state']): OwnedPurchase => ({ productIds: [PREMIUM_PRODUCT_ID], state, verified: true, token: 'test-token' });
  return {
    kind: 'test',
    scenario: 'success',
    availability: async () => ({ ok: true }),
    product: async () => ({ id: PREMIUM_PRODUCT_ID, title: 'Esprit Vif Premium (test)', price: '8,99 € (test)' }),
    async purchase() {
      if (bought) return { kind: 'already-owned' };
      switch (this.scenario) {
        case 'success':
          bought = true;
          return { kind: 'purchased', purchase: purchase('purchased') };
        case 'pending':
          pending = true;
          return { kind: 'pending' };
        case 'cancel':
          return { kind: 'cancelled' };
        case 'already-owned':
          bought = true;
          return { kind: 'already-owned' };
        default:
          return { kind: 'error', code: 'network', message: 'Réseau indisponible (test)' };
      }
    },
    async owned() {
      if (this.scenario === 'error') throw Object.assign(new Error('Réseau indisponible (test)'), { code: 'network' });
      return bought ? [purchase('purchased')] : pending ? [purchase('pending')] : [];
    },
    refund() {
      bought = false;
      pending = false;
    },
    settlePending() {
      if (pending) {
        pending = false;
        bought = true;
      }
    },
  };
}

export type TestBackend = ReturnType<typeof testBackend>;
