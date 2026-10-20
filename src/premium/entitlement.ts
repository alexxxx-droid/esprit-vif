/**
 * Droit Premium de l'appareil : vrai seulement quand la facturation Google Play a confirmé un achat
 * valide (voir `billing.ts`). Une simple préférence ne suffit jamais à l'accorder.
 */
let premium = false;
const listeners = new Set<() => void>();

export function isPremium(): boolean {
  return premium;
}

export function subscribePremium(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Réservé au client de facturation, après vérification d'un achat (ou sa révocation). */
export function setPremium(value: boolean) {
  if (premium === value) return;
  premium = value;
  for (const listener of listeners) listener();
}
