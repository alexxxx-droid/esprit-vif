# Bilan de la v2.9 (20 octobre 2026)

Mission : rendre Esprit Vif ludique, fidélisant et monétisable, sans trahir « sans pub, sans
pistage ». Arbitrages d'Alex : Premium à vie sans pub, mesures locales + Play Console, test du jour
varié, Vif vivant, thèmes de saison et à gagner. Détail des choix : `DECISIONS.md` ; suivi :
`ROADMAP.md`.

## 1. Terminé

- **Fiabilité** : sauvegarde réparée au chargement (meilleurs scores, test du jour interrompu),
  numéro de schéma et migration testée sur une base v2.0, durée de chaque partie.
- **Test du jour varié** : 3 domaines différents chaque jour, déterministe par date, aucun jeu le
  lendemain, tour complet d'un domaine avant de revoir un jeu ; bilan avec score du jour et formule.
- **Objectifs du jour** (3, adaptés au niveau), **étincelles** plafonnées, **vestiaire** de
  31 chapeaux (20 à acheter en étincelles, 11 de prestige), récompenses affichées au résultat.
- **Accueil** recomposé : test du jour ou son bilan, bouton principal, objectifs, semaine, reprise,
  thèmes ; **Vif guide** qui se pose sur le bouton et le montre ; Vif qui réagit au résultat.
- **Thèmes** : saisons automatiques avec décor animé, six thèmes gagnés au niveau, trois Premium.
- **Progrès** : prochaines récompenses, semaine comparée, chiffres (temps, précision, réaction),
  activité récente ; série masquable ; corrigé « x/20 ouverts ».
- **Premium à vie** : module natif Play Billing 9.1 (vérification de signature, confirmation),
  droits, écran, restauration, mode test, historique détaillé par jeu ; docs Play Console.
- **Journal local** et définition des indicateurs (`METRIQUES.md`).

## 2. Reporté volontairement

- Publicités, même récompensées (refusées par Alex).
- Packs de jeux payants : après mesure de la rétention et de la demande.
- Cosmétiques payants à l'unité : le vestiaire se gagne en jouant.
- Vérification des achats côté serveur : pas de serveur tant que la fraude ne le justifie pas.
- Traductions es/de/it/pt (en pause depuis le 20-10) : les nouveaux textes passent par `tr()`, ils
  rejoindront les dictionnaires avec le reste.

## 3. Tests

- `npm run check` : lint, types, **480 tests** (2 ignorés), contre 432 au départ.
- Nouveaux tests : migrations et réparation de la sauvegarde, test du jour varié (400 jours
  simulés), objectifs (une seule attribution), étincelles (plafond), vestiaire (achat refusé, en
  double, prestige), fusion Drive des achats, thèmes, chiffres des Progrès, Premium (annulé, en
  attente, valide, déjà acheté, restauration, remboursement, réseau, site, APK sans clé).
- Robots (navigateur Edge sans fenêtre) : accueil avant/après le test, bilan, vestiaire (31
  chapeaux sur Vif et sur deux fruits, clair et sombre), thèmes, Progrès, Premium (site et mode
  test), historique, anglais sans reste de français, 320 × 568 sans défilement horizontal.
- Build : site, APK et AAB signés (versionCode 13).

## 4. Tester sur un téléphone Android

1. Installer l'APK (release « android » du dépôt ou `android/app/build/outputs/apk/release/`) par
   dessus la version actuelle : la progression est gardée (même clé).
2. Accueil : Vif arrive et se pose sur le bouton ; faire le test du jour (3 domaines) ; revenir :
   la carte montre le score du jour, chaque jeu se rejoue ; les objectifs se cochent.
3. Vestiaire (depuis l'accueil ou les Progrès) : acheter un chapeau, le porter, le voir sur Vif.
4. Réglages → Apparence : thèmes (saison « Auto » : automne, feuilles qui tombent) ; « Moins
   d'animations » coupe le décor et les déplacements de Vif.
5. Réglages → Esprit Vif Premium : « Premium arrive bientôt » tant que la Play Console n'est pas
   configurée (normal). Le vrai achat se teste par le canal de test interne
   (`GOOGLE_PLAY_BILLING.md`).
6. Couper le réseau : tout reste jouable.

## 5-6. Google Play Billing

Étapes, identifiant **`premium_lifetime`**, clé publique, testeurs : `GOOGLE_PLAY_BILLING.md`.
Rien n'est créé dans la Play Console à ce jour.

## 7. Publicités

Non retenues. Rien à configurer.

## 8. Coût de maintenance (estimation)

- **Sans serveur** : aucun hébergement à payer ni à surveiller (site sur GitHub Pages).
- **Récurrent** : monter la bibliothèque Play Billing environ tous les deux ans (exigence Google,
  ~1 h) ; suivre les versions cibles d'Android chaque année (~2 h avec Capacitor) ; répondre aux
  avis et aux remboursements (quelques minutes par semaine au début).
- **Ponctuel** : un thème ou des chapeaux de plus = une table et quelques dessins ; un objectif de
  plus = une ligne dans `objectives.ts` et un test.
- Risque principal : la vérification Premium sur l'appareil seulement (contournable) ; acceptable
  tant que le revenu est modeste.

## 9. Indicateurs à suivre

Installateurs conservés J1/J7/J30, notes et avis, Android vitals, commandes et remboursements
Premium (`METRIQUES.md`).

## 10. Trois prochaines améliorations (valeur / coût)

1. **Saisons de défis** : un défi de la semaine qui raconte une petite histoire sur quatre
   semaines, avec un chapeau de saison au bout ; réutilise objectifs, vestiaire et saisons.
2. **Ouvrir Premium pour de vrai** : configurer la Play Console, tester sur le canal interne,
   puis ajuster le prix d'après les premiers retours.
3. **Rappel intelligent** : proposer l'heure du rappel d'après l'heure où le joueur joue
   d'habitude (tout est déjà dans l'historique), toujours activé par lui.
