# Esprit Vif

Quelques minutes par jour pour garder l’esprit vif : un test du jour en trois mini-jeux,
un âge cérébral indicatif et un entraînement libre qui s’adapte à ton niveau.
Sans compte, sans publicité, sans pistage : tout reste sur ton appareil.
Tout est gratuit ; dans l’appli Android, un **Premium à vie** facultatif (achat unique, pas
d’abonnement) ajoute trois thèmes exclusifs, huit chapeaux, trois compagnons, l’historique détaillé
de chaque jeu et un bilan du mois. Tout s’essaie avant d’acheter.

**Jouer :** https://alexxxx-droid.github.io/esprit-vif/

> L’âge cérébral est un indicateur ludique, pas une mesure médicale.

## Au programme

**31 mini-jeux** répartis en six domaines, chacun avec **50 niveaux** en cinq paliers (Débutant,
Confirmé, Expert, Maître, Légende), soit **1 550 niveaux**, puis dix crans de **maîtrise** :

| Domaine | Jeux |
| --- | --- |
| Calcul | Calcul éclair, Total cumulé, Calcul du diable, Monnaie, Pluie de calculs |
| Mémoire | Matrice, Double retour, Du plus petit au plus grand, Mots à retenir, Paires, Qui est qui ? |
| Attention | Couleurs piégées, L’intrus, La boutique, Flèches, Filature |
| Vitesse | Table de Schulte, Correspondance express, Réflexe, Coup d’œil, Lucioles |
| Langage | Anagrammes, Lettre manquante, Catégories, Lecture éclair, Contraires |
| Logique | Rotation mentale, Balance, Horloges, Mini-sudoku, Itinéraire |

- **Niveaux et étoiles** : 1 étoile dès 60 pts (le niveau suivant se débloque), 2 dès 80, 3 dès 95.
- **Médailles par jeu** : bronze au niveau 5, argent au 10, or au 15, platine avec 3 étoiles au 20,
  diamant au 35, légende avec 3 étoiles au 50.
- **Rang et XP** : chaque partie rapporte de l’expérience ; les rangs vont d’« Esprit curieux » à
  « Esprit légendaire ». **46 trophées** récompensent la régularité, la curiosité et les exploits.
- **Carte du cerveau** : les six domaines sur un radar, d’après les dernières parties.
- **Le mot du coach** : un conseil différent chaque jour.
- **Ce que disent tes parties** : tes tendances en clair (domaine qui progresse, meilleur moment
  de la journée, régularité), et après chaque partie, où tu te situes par rapport à ta moyenne.
- **Une série qui pardonne** : un jour de repos par semaine ne casse pas ta série (et on peut la
  masquer).
- **Objectifs du jour** : trois petits objectifs chaque jour (jouer, varier, réussir), choisis selon
  ton niveau, qui rapportent XP et étincelles.
- **Le vestiaire de Vif** : 20 chapeaux à offrir avec les étincelles gagnées en jouant, 11 chapeaux
  de prestige réservés aux exploits (paliers, médailles, séries, niveaux de joueur).
- **Vif vivant** : il traverse l’accueil, se pose sur le bouton principal et le montre du doigt,
  et réagit à tes résultats.
- **Thèmes** : un thème par saison (neige, pétales, lucioles, feuilles), six thèmes à gagner en
  montant de niveau, trois de plus avec Premium.
- **Progrès en clair** : ta semaine comparée à la précédente, temps de jeu, précision, temps de
  réaction, dernières parties, prochaines récompenses.
- **Après le niveau 50** : dix crans de **maîtrise** par jeu (la partie du niveau 50, toujours plus
  exigeante), le **Défi Légende du jour**, des **saisons de défis** en histoires de quatre semaines avec
  un chapeau à collectionner, et un rang de joueur sans fin (titres, auras de Vif).
- **En six langues** : français, anglais, espagnol, allemand, italien et portugais du Brésil. La
  langue suit le téléphone, ou se choisit dans les réglages ; chaque langue a ses propres mots,
  catégories, phrases et prénoms dans les jeux de langage.
- **Transfert par QR code** : ta progression passe d'un téléphone à l'autre, ou du site à l'appli,
  par une suite de QR codes (ou un code à copier-coller), sans compte ni serveur.
- **Écrire au doigt** : dans les jeux de nombres, tu peux écrire ta réponse au lieu de toucher le
  pavé ; le chiffre est reconnu sur le téléphone, sans connexion.

Six façons de jouer :

- **Test du jour** : trois jeux de trois domaines, qui changent chaque jour, et l’âge cérébral
  indicatif.
- **Séance du jour** : quatre jeux choisis pour toi, tes domaines les plus fragiles d’abord.
- **Marathon** : tous les jeux d’un domaine à la suite, pour battre ton record de points.
- **Duel à deux** : trois manches sur le même téléphone, la même partie pour les deux joueurs.
- **Mode fête** : de 2 à 4 joueurs en même temps sur un seul écran, chacun dans son coin.
- **Défis entre amies** : un lien, les mêmes parties chacune sur son téléphone, et un classement
  par catégorie gardé sur chaque appareil. Sans compte ni serveur : tout tient dans le lien.

## Lancer en local

Il faut Node.js 22 ou plus récent.

```bash
npm install
npm run dev        # http://localhost:5173/esprit-vif/
```

## Tester

```bash
npm test           # tests unitaires (Vitest)
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm run check      # les trois à la suite
```

## Construire

```bash
npm run build      # vérifie les types puis produit dist/
npm run preview    # sert dist/ sur http://localhost:4173/esprit-vif/
```

Chaque `push` sur `main` relance lint, types et tests, puis publie `dist/` sur GitHub Pages
(`.github/workflows/deploy.yml`).

## Installer l’appli (PWA)

Esprit Vif s’installe depuis le navigateur comme une vraie application, puis fonctionne
**hors ligne** : tout est gardé sur l’appareil après la première visite. Quand une nouvelle
version est publiée, une bannière propose de mettre à jour (jamais en pleine partie).

### Sur Android

1. Ouvre https://alexxxx-droid.github.io/esprit-vif/ dans **Chrome**.
2. Touche **Installer** sur la carte de l’accueil, ou ouvre le menu **⋮** →
   **Ajouter à l’écran d’accueil** → **Installer**.
3. L’icône Esprit Vif rejoint tes autres applis ; elle s’ouvre en plein écran.

### Sur Windows

1. Ouvre la même adresse dans **Edge** ou **Chrome**.
2. Clique sur l’icône d’installation à droite de la barre d’adresse ; dans Edge, on la trouve
   aussi dans le menu **…** → **Applications** → **Installer Esprit Vif**.
3. L’appli s’ouvre dans sa propre fenêtre et apparaît dans le menu Démarrer.

Le bouton **Installer Esprit Vif sur cet appareil** apparaît aussi dans les Réglages quand le
navigateur le permet.

## Appli Android (APK)

Esprit Vif existe aussi en APK, construit avec Capacitor à partir du même code. Par rapport à
la PWA, il ajoute un **vrai rappel quotidien par notification** (uniquement les jours où le test
n’est pas encore fait) et des vibrations natives.

### Installer l’APK

1. Sur le téléphone, ouvre https://github.com/alexxxx-droid/esprit-vif/releases/tag/android
   et télécharge **esprit-vif.apk**.
2. Ouvre le fichier. Android demande d’autoriser l’installation depuis le navigateur
   (« sources inconnues ») : accepte.
3. Les versions suivantes s’installent par-dessus, sans perdre la progression : elles sont
   signées avec la même clé.

La PWA et l’APK gardent chacun leur propre progression : pour passer de l’un à l’autre, utilise
**Réglages → Exporter**, puis **Importer** de l’autre côté.

### Construire l’APK

- **Automatiquement** : à chaque `push` sur `main`, le workflow `.github/workflows/android.yml`
  construit l’APK signé, le joint au run (artefact) et le publie dans la release « android ».
  La clé de signature vient des secrets du dépôt.
- **En local** (JDK 21 et SDK Android nécessaires) :

  ```bash
  npm run build:android            # site en mode Android, puis cap sync
  cd android
  ./gradlew assembleDebug          # APK de test : app/build/outputs/apk/debug/
  ./gradlew assembleRelease        # APK signé, si les variables ANDROID_KEYSTORE_* sont définies
  ```

  Les icônes et écrans de démarrage Android se régénèrent avec `npm run icons:android`.

## Organisation du code

```
src/core/     logique pure, sans interface : générateurs, scores, âge cérébral, test du jour,
              objectifs, étincelles, vestiaire, thèmes, statistiques
src/premium/  Premium à vie : catalogue, client de facturation, droits
src/analytics/ journal d'utilisation local (jamais envoyé)
src/store/    stockage local (IndexedDB) et progression, export/import JSON
src/ui/       interface React : écrans, déroulé de partie, jeux, sons et vibrations
src/native.ts ce que l'APK ajoute : notifications, vibrations natives, bouton retour, partage
src/styles/   jetons de design (clair/sombre) et feuilles de style
android/      projet Android généré par Capacitor (icônes, signature, version)
scripts/      génération des icônes Android
docs/         décisions de conception
```

Les choix faits là où la spécification laissait une marge sont notés dans
[`docs/DECISIONS.md`](docs/DECISIONS.md). Voir aussi [`docs/ROADMAP.md`](docs/ROADMAP.md) (feuille de
route), [`docs/AUDIT.md`](docs/AUDIT.md), [`docs/GOOGLE_PLAY_BILLING.md`](docs/GOOGLE_PLAY_BILLING.md)
(Premium) et [`docs/METRIQUES.md`](docs/METRIQUES.md) (indicateurs).
