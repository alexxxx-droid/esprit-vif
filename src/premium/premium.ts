import { track } from '../analytics/journal';
import type { BillingBackend, OwnedPurchase, Product } from './billing';
import { PREMIUM_PRODUCT_ID } from './catalog';
import { setPremium } from './entitlement';

/**
 * Le droit Premium et l'état de la boutique. Premium n'est accordé que pour un achat que Google
 * Play renvoie **terminé** (pas « en attente ») et dont la signature a été vérifiée. Le résultat est
 * gardé sur l'appareil pour fonctionner hors ligne, et revérifié à chaque lancement : un achat
 * remboursé ou annulé disparaît de Google Play, et Premium avec lui.
 *
 * Limite assumée (pas de serveur) : un appareil modifié peut tromper une vérification faite sur
 * l'appareil lui-même. Ce n'est pas une protection complète contre la fraude, juste la bonne
 * pratique sans serveur.
 */

export function hasPremium(purchases: readonly OwnedPurchase[]): boolean {
  return purchases.some((p) => p.productIds.includes(PREMIUM_PRODUCT_ID) && p.state === 'purchased' && p.verified);
}

export function hasPending(purchases: readonly OwnedPurchase[]): boolean {
  return purchases.some((p) => p.productIds.includes(PREMIUM_PRODUCT_ID) && p.state === 'pending');
}

export type Shop = 'checking' | 'ready' | 'web' | 'not-configured' | 'unavailable' | 'network';

export type Notice = 'purchased' | 'pending' | 'cancelled' | 'restored' | 'nothing-to-restore' | 'error' | 'network' | null;

export interface PremiumState {
  premium: boolean;
  shop: Shop;
  product: Product | null;
  /** Un achat attend sa confirmation (paiement en espèces, accord parental…). */
  pending: boolean;
  busy: 'buy' | 'restore' | null;
  notice: Notice;
  test: boolean;
}

const CACHE_KEY = 'esprit-vif:premium';

interface Cache {
  premium: boolean;
  checkedAt: string;
}

function readCache(): Cache | null {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
    return raw && typeof raw === 'object' && (raw as Cache).premium === true ? (raw as Cache) : null;
  } catch {
    return null;
  }
}

function writeCache(premium: boolean) {
  try {
    if (premium) localStorage.setItem(CACHE_KEY, JSON.stringify({ premium, checkedAt: new Date().toISOString() }));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    // Sans stockage, Premium sera simplement revérifié auprès de Google Play au prochain lancement.
  }
}

export class PremiumController {
  private state: PremiumState;
  private readonly listeners = new Set<() => void>();
  readonly backend: BillingBackend;

  constructor(backend: BillingBackend) {
    this.backend = backend;
    // Le dernier achat vérifié vaut jusqu'à la prochaine réponse de Google Play (hors ligne compris).
    const cached = backend.kind !== 'web' && readCache() !== null;
    this.state = { premium: cached, shop: 'checking', product: null, pending: false, busy: null, notice: null, test: backend.kind === 'test' };
    setPremium(cached);
  }

  getState = (): PremiumState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private set(patch: Partial<PremiumState>) {
    this.state = { ...this.state, ...patch };
    setPremium(this.state.premium);
    if ('premium' in patch) writeCache(this.state.premium);
    for (const listener of this.listeners) listener();
  }

  /** Au lancement : la boutique est-elle là, quel est le prix, et que dit Google Play des achats ? */
  async init(): Promise<void> {
    const availability = await this.backend.availability();
    if (!availability.ok) {
      // Site ou boutique non configurée : aucun achat vérifiable, donc pas de Premium.
      // Hors ligne ou service indisponible : on garde le dernier achat vérifié.
      const keep = availability.reason === 'network' || availability.reason === 'unavailable';
      this.set({ shop: availability.reason, ...(keep ? {} : { premium: false }) });
      return;
    }
    const product = await this.backend.product();
    this.set({ shop: 'ready', product });
    await this.check(false);
  }

  /** Revérifie les achats auprès de Google Play ; une erreur garde l'état connu. */
  private async check(announce: boolean): Promise<boolean> {
    try {
      const purchases = await this.backend.owned();
      const premium = hasPremium(purchases);
      this.set({ premium, pending: !premium && hasPending(purchases) });
      return premium;
    } catch {
      if (announce) this.set({ notice: 'network' });
      return this.state.premium;
    }
  }

  async buy(): Promise<void> {
    if (this.state.busy || this.state.shop !== 'ready') return;
    this.set({ busy: 'buy', notice: null });
    track('purchase_started');
    const outcome = await this.backend.purchase();
    switch (outcome.kind) {
      case 'purchased': {
        const premium = hasPremium([outcome.purchase]);
        this.set({ busy: null, premium: premium || this.state.premium, pending: false, notice: premium ? 'purchased' : 'error' });
        track(premium ? 'purchase_confirmed' : 'purchase_failed', premium ? undefined : { code: 'unverified' });
        return;
      }
      case 'pending':
        this.set({ busy: null, pending: true, notice: 'pending' });
        track('purchase_pending');
        return;
      case 'cancelled':
        this.set({ busy: null, notice: 'cancelled' });
        track('purchase_cancelled');
        return;
      case 'already-owned': {
        // Déjà acheté (autre appareil, réinstallation) : on va le chercher chez Google Play.
        const premium = await this.check(true);
        this.set({ busy: null, notice: premium ? 'restored' : 'error' });
        track('restore', { via: 'already-owned', premium });
        return;
      }
      case 'error':
        this.set({ busy: null, notice: outcome.code === 'network' ? 'network' : 'error' });
        track('purchase_failed', { code: outcome.code });
    }
  }

  async restore(): Promise<void> {
    if (this.state.busy) return;
    if (this.state.shop !== 'ready') {
      await this.init();
      if (this.getState().shop !== 'ready') return;
    }
    this.set({ busy: 'restore', notice: null });
    try {
      const purchases = await this.backend.owned();
      const premium = hasPremium(purchases);
      this.set({ busy: null, premium, pending: !premium && hasPending(purchases), notice: premium ? 'restored' : 'nothing-to-restore' });
      track('restore', { premium });
    } catch {
      this.set({ busy: null, notice: 'network' });
    }
  }

  dismissNotice() {
    if (this.state.notice) this.set({ notice: null });
  }
}
