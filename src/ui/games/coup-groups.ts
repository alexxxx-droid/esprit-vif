/**
 * Les deux nuées de Coup d'œil : bleue et orange, deux teintes que les daltoniens distinguent aussi.
 * Le libellé porte ses deux langues et se choisit à l'affichage : `tr(g.more.fr, g.more.en)`
 * (`g.fewer` quand la question s'inverse).
 */
export const COUP_GROUPS = [
  { name: 'bleus', more: { fr: 'Plus de bleus', en: 'More blue' }, fewer: { fr: 'Moins de bleus', en: 'Fewer blue' }, color: 'var(--d-calcul)' },
  { name: 'orange', more: { fr: 'Plus d’orange', en: 'More orange' }, fewer: { fr: 'Moins d’orange', en: 'Fewer orange' }, color: 'var(--d-memoire)' },
] as const;

/** Les points gris (niveaux avancés) : ils ne comptent pas. */
export const COUP_NOISE_COLOR = 'var(--ink-3)';
