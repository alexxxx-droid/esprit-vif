import { tr } from '../core/lang';

/**
 * Le seul produit vendu : Esprit Vif Premium, achat unique non consommable (aucun abonnement).
 * Identifiant à créer à l'identique dans la Play Console (voir docs/GOOGLE_PLAY_BILLING.md).
 */
export const PREMIUM_PRODUCT_ID = 'premium_lifetime';

export interface Benefit {
  id: string;
  icon: 'sun' | 'progress' | 'spark';
  title: string;
  text: string;
}

/**
 * Ce que Premium apporte, et rien de plus : chaque ligne correspond à une fonction construite.
 * Tout le reste (28 jeux, 1 400 niveaux, test du jour, objectifs, vestiaire, thèmes gagnés en jouant,
 * statistiques) reste gratuit, pour toujours, et l'appli n'a pas de publicité.
 */
export function premiumBenefits(): Benefit[] {
  return [
    {
      id: 'themes',
      icon: 'sun',
      title: tr('Trois thèmes exclusifs', 'Three exclusive themes'),
      text: tr('Aurore boréale, Sakura et ses pétales, Encre en noir et blanc (un vrai noir en mode sombre).', 'Northern lights, Sakura with falling petals, and Ink in black and white (true black in dark mode).'),
    },
    {
      id: 'history',
      icon: 'progress',
      title: tr('L’historique détaillé de chaque jeu', 'Detailed history for every game'),
      text: tr('La courbe de tous tes scores, ton meilleur score à chaque niveau, ta précision et ton temps de réaction au fil des parties.', 'A chart of all your scores, your best score on every level, and your accuracy and reaction time over time.'),
    },
    {
      id: 'support',
      icon: 'spark',
      title: tr('Soutenir un développeur indépendant', 'Support an independent developer'),
      text: tr('Esprit Vif est fait par une seule personne, sans publicité ni pistage : Premium paie la suite.', 'Esprit Vif is made by one person, with no ads or tracking: Premium pays for what comes next.'),
    },
  ];
}
