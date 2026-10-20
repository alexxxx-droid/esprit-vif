# Feuille de route — v2.9 « jouer chaque jour, Premium à vie »

Mission du 20-10-2026 (produit ludique, fidélisant, monétisable). Audit : [`AUDIT.md`](AUDIT.md).
Arbitrages d'Alex le même jour : **Premium à vie sans aucune pub** (appli Google Play seulement,
rien de gratuit ne devient payant), **mesures locales + Play Console** (aucun SDK, aucune collecte),
**test du jour varié** (3 domaines différents chaque jour). Les récompenses suivent son choix du
matin : **étincelles + prestige**, pour habiller Vif.

Règle de chaque phase : tests, lint et types verts, captures vérifiées sur 360 × 740, puis commit.

## Phase 0 — Audit

- [x] Pile, build, tests (432 verts au départ), modèle de données, risques → `AUDIT.md`
- [x] Arbitrages des contradictions avec la promesse « sans pub, sans pistage »

## Phase 1 — Fondations

- [ ] Réconcilier au chargement : meilleurs scores et résultats de test retrouvés depuis les parties
      (appli tuée entre deux écritures)
- [ ] Numéro de schéma dans la base + migration versionnée, testée sur une sauvegarde v2.0
- [ ] Durée de chaque partie enregistrée (temps de jeu cumulé, à partir de cette version)
- [ ] En-tête de l'accueil : prénom par défaut tronqué

## Phase 2 — Expérience quotidienne

- [ ] Test du jour varié : 3 jeux de 3 domaines différents, déterministe par date, aucun jeu répété
      avant d'avoir fait le tour de son domaine
- [ ] Bilan du test : score du jour (moyenne des 3), récompenses du jour, rejouer pour le plaisir
- [ ] Objectifs du jour : 3 par jour, tirés selon le niveau du joueur, XP + étincelles, versés une fois
- [ ] Étincelles (gagnées en jouant, plafonnées par jour) et vestiaire de Vif : chapeaux à acheter
      avec les étincelles, chapeaux de prestige gagnés par exploits, prochaine récompense affichée
- [ ] Accueil recomposé : salutation + niveau, test du jour (ou son bilan), bouton principal,
      objectifs, semaine, reprendre le dernier jeu, accès direct aux thèmes

## Phase 3 — Progrès

- [ ] Résumé chiffré : parties, jours, temps de jeu, précision moyenne, temps de réaction
- [ ] Bilan de la semaine (comparé à la précédente), activité récente
- [ ] États vides qui expliquent comment obtenir les premières données
- [ ] Tests de cohérence : chaque chiffre affiché = un calcul sur les parties enregistrées

## Phase 4 — Premium à vie (appli Google Play)

- [ ] Catalogue (`premium_lifetime`), client de facturation (module natif Play Billing), droits,
      écran Premium, restauration, mode test explicite
- [ ] Avantages réellement construits : thèmes de couleur supplémentaires, historique détaillé par jeu
- [ ] Achats en attente, annulés, déjà détenus, remboursés ; jeux gratuits jamais bloqués
- [ ] Guide Play Console (`docs/GOOGLE_PLAY_BILLING.md`) : produit à créer, clé, testeurs

## Phase 5 — Rétention et lancement

- [ ] Journal d'événements local (jamais envoyé), indicateurs définis (`docs/METRIQUES.md`)
- [ ] Rappels : revérifier l'opt-in, le texte, la fréquence
- [ ] Confidentialité et fiche Play mises à jour (achats intégrés, aucune collecte)
- [ ] Version 2.9.0 : tests, build web, APK et AAB signés

## Reporté volontairement

- Publicités (même récompensées) : refusées par Alex le 20-10.
- Packs de jeux payants : seulement après avoir mesuré la rétention et la demande.
- Cosmétiques à l'unité : le vestiaire se gagne en jouant ; à revoir si Premium se vend.
- Saisons animées (neige, feuilles…) : retour d'Alex du 20-10, après cette version.
