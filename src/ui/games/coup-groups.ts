/**
 * Les deux nuées de Coup d'œil : bleue et orange, deux teintes que les daltoniens distinguent aussi.
 * Le libellé porte ses deux langues et se choisit à l'affichage : `tr(g.more.fr, g.more.en)`.
 */
export const COUP_GROUPS = [
  { name: 'bleus', more: { fr: 'Plus de bleus', en: 'More blue' }, color: 'var(--d-calcul)' },
  { name: 'orange', more: { fr: 'Plus d’orange', en: 'More orange' }, color: 'var(--d-memoire)' },
] as const;
