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

- [x] Réconcilier au chargement : meilleurs scores et résultats de test retrouvés depuis les parties
      (appli tuée entre deux écritures)
- [x] Numéro de schéma dans la base + migration versionnée, testée sur une sauvegarde v2.0
- [x] Durée de chaque partie enregistrée (temps de jeu cumulé, à partir de cette version)
- [x] En-tête de l'accueil : prénom par défaut tronqué

## Phase 2 — Expérience quotidienne

- [x] Test du jour varié : 3 jeux de 3 domaines différents, déterministe par date, aucun jeu répété
      avant d'avoir fait le tour de son domaine
- [x] Bilan du test : score du jour (moyenne des 3), récompenses du jour, rejouer pour le plaisir
- [x] Objectifs du jour : 3 par jour, tirés selon le niveau du joueur, XP + étincelles, versés une fois
- [x] Étincelles (gagnées en jouant, plafonnées par jour) et vestiaire de Vif : chapeaux à acheter
      avec les étincelles, chapeaux de prestige gagnés par exploits, prochaine récompense affichée
- [x] Accueil recomposé : salutation + niveau, test du jour (ou son bilan), bouton principal,
      objectifs, semaine, reprendre le dernier jeu, accès direct aux thèmes
- [x] Vif vivant (demande d'Alex du 20-10) : il traverse l'accueil, se pose sur le bouton principal et
      le montre ; impressionné au résultat ; essaie son chapeau au vestiaire (Progrès : en phase 3).
      Jamais pendant une partie, rien si « réduire les animations »
- [x] Thèmes de l'appli : thèmes de saison automatiques (désactivables), thèmes gagnés au niveau de
      joueur 5, 10, 15…, 3 thèmes exclusifs Premium

## Phase 3 — Progrès

- [x] Résumé chiffré : parties, jours, temps de jeu, précision moyenne, temps de réaction
- [x] Bilan de la semaine (comparé à la précédente), activité récente
- [x] États vides qui expliquent comment obtenir les premières données
- [x] Tests de cohérence : chaque chiffre affiché = un calcul sur les parties enregistrées
- [x] Prochaines récompenses montrées par Vif ; série masquable (réglage)

## Phase 4 — Premium à vie (appli Google Play)

- [x] Catalogue (`premium_lifetime`), client de facturation (module natif Play Billing), droits,
      écran Premium, restauration, mode test explicite
- [x] Avantages réellement construits : thèmes de couleur supplémentaires, historique détaillé par jeu
- [x] Achats en attente, annulés, déjà détenus, remboursés ; jeux gratuits jamais bloqués
- [x] Guide Play Console (`docs/GOOGLE_PLAY_BILLING.md`) : produit à créer, clé, testeurs

## Phase 5 — Rétention et lancement

- [x] Journal d'événements local (jamais envoyé), indicateurs définis (`docs/METRIQUES.md`)
- [x] Rappels : revérifier l'opt-in, le texte, la fréquence
- [x] Confidentialité et fiche Play mises à jour (achats intégrés, aucune collecte)
- [x] Version 2.9.0 : tests, build web, APK et AAB signés

Bilan complet (tests, procédure sur téléphone, maintenance, suite) : [`BILAN_V2.9.md`](BILAN_V2.9.md).

## v2.10 — fin de jeu et 6e pack (demandes d'Alex du 20-10)

- [x] Contrôle des 28 jeux au toucher réel ; captures de la fiche Play Store (fr, en)
- [x] Maîtrise I-X après le niveau 50, couronnes, chapeaux tous les 5 jeux maîtrisés
- [x] Défi Légende du jour
- [x] Rang sans fin : titres, étincelles, auras de Vif
- [x] Saisons de défis (6 histoires de 4 semaines) et chapeaux de saison en éditions
- [x] 3 nouveaux jeux : Filature (Attention), Lucioles (Vitesse), Contraires (Langage)
- [x] Traductions espagnol, allemand, italien, portugais (dictionnaires, contenus, Android, fiche) : en v2.11

## v2.11 — six langues (demandes d'Alex du 21-10)

- [x] Espagnol, allemand, italien, portugais du Brésil proposés : 2 073 textes d'interface par langue,
      contenu des jeux de langage écrit dans chaque langue, Android, fiche Play Store, confidentialité
- [x] Plus aucun texte hors de portée des dictionnaires (chapeaux, thèmes, chapitres de saison,
      pluriels, ponctuation) ; la langue choisie n'est plus remise sur Auto au lancement
- [x] Accueil : flèche retour entre les étapes, trois promesses sur le premier écran (vu chez Elevate)
- [x] Jeux rapides raccourcis : Coup d'œil et Pluie de calculs 45 s ; Lecture éclair, Contraires,
      Lucioles 40 s (objectifs au prorata)
- [x] Mots longs : onglets à la largeur de leur nom, puces des domaines sur deux colonnes hors fr/en ;
      80 écrans vérifiés sans débordement en 360 × 740 dans les six langues
- [ ] Relecture par des natifs (noms de chapeaux, histoires de saison, listes de mots, Lecture éclair)
- [ ] Captures de la fiche Play Store dans les quatre nouvelles langues
- [ ] Peut-être : ne charger que le contenu de la langue utilisée (le paquet principal passe de
      ≈ 250 à 533 Ko compressés avec les quatre langues)

## Reste à faire par Alex

- [ ] Play Console : profil de paiement, produit `premium_lifetime`, clé publique, testeurs
      (`GOOGLE_PLAY_BILLING.md`) ; secret GitHub `PLAY_BILLING_PUBLIC_KEY`
- [ ] Tester l'achat réel sur le canal de test interne
- [ ] (déjà noté) `gh auth refresh -s workflow` pour publier `.github/workflows/`

## Reporté volontairement

- Publicités (même récompensées) : refusées par Alex le 20-10.
- Packs de jeux payants : seulement après avoir mesuré la rétention et la demande.
- Cosmétiques à l'unité : le vestiaire se gagne en jouant ; à revoir si Premium se vend.
- Saisons animées (neige, feuilles…) : retour d'Alex du 20-10, après cette version.
