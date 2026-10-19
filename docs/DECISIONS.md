# Décisions de conception

Ce fichier note les choix faits là où la spécification laissait une marge.
Chaque choix est réversible : il suffit de modifier la constante citée.

## Pile technique

- **React 19 + Vite + TypeScript** (choix d'Alex). Pas de routeur : le fragment d'URL (`#/…`) suffit
  et fonctionne tel quel sur GitHub Pages comme dans l'APK.
- **IndexedDB via `idb`**, derrière l'interface `Storage` (`src/store/storage.ts`). Une version
  en mémoire sert aux tests et prend le relais si le navigateur bloque le stockage
  (un bandeau prévient alors que rien ne sera conservé).
- Polices embarquées (Bricolage Grotesque, JetBrains Mono, licence OFL) : rien n'est chargé
  depuis un service tiers.

## Test du jour

- Toujours *Calcul éclair* et *Couleurs piégées*, puis un 3e jeu qui tourne chaque jour
  (`DAILY_ROTATION` dans `src/core/games/registry.ts`, indexé par le numéro du jour).
- Les jeux du test se jouent à **niveau fixe** (`dailyLevel`) : N = 2 pour le Double retour,
  niveau 1 ailleurs. Le test officiel utilise une **graine dérivée de la date** : tout le monde
  a le même test un jour donné, et une partie se rejoue à l'identique.
- **Un seul test officiel par jour** : le premier test *terminé* de la journée. Les suivants sont
  marqués « pour le plaisir » et n'entrent ni dans la courbe ni dans la comparaison.
- Un test commencé reste à « Continuer » jusqu'à minuit ; en relancer un abandonne l'ancien.
- Le test du jour ne fait pas bouger les niveaux d'entraînement, mais ses scores comptent
  pour les records et pour le profil par domaine.

## Niveaux, étoiles et progression

- **20 niveaux par jeu** (`MAX_LEVEL`, `src/core/levels.ts`). Le niveau 1 reprend la spec ; chaque
  jeu décrit ses 20 niveaux dans une table (`*_LEVELS` dans `src/core/games/`) et l'intro affiche
  ce qui change (« 6 × 6 brouillée », « 2 lettres manquantes »…).
- **Étoiles** : 1 dès 60 pts, 2 dès 80, 3 dès 95 (`STAR_THRESHOLDS`). La première étoile
  **débloque le niveau suivant** ; on rejoue librement tout niveau débloqué.
- Difficulté adaptative en entraînement libre : score ≥ 60 → niveau + 1, score < 40 → niveau − 1
  (`LEVEL_UP_AT`, `LEVEL_DOWN_BELOW`), sans jamais dépasser le niveau débloqué.
- **Médailles par jeu** : bronze au niveau 5 réussi, argent au 10, or au 15, platine avec
  3 étoiles au 20.
- **XP** : `round((5 + 0,45 × score) × (1 + 5 % par niveau au-delà du 1er))` par partie, plus des
  bonus (test du jour 40, étoile 10, séance 30, marathon 30, duel 10 : `XP_BONUS`). Rang n :
  `100(n−1) + 25(n−1)(n−2)/2` XP ; titres d'« Esprit curieux » à « Esprit légendaire ».
- **Tout se déduit de l'historique** (parties, tests, meilleurs scores) : rangs, médailles et
  35 trophées sont recalculés, rien ne peut se désynchroniser. Seuls séances, marathons et duels
  ont leur petite mémoire (`extras`), exportée avec le reste.

## Barèmes par jeu

Les seuils du niveau 1 (la spec) ; les niveaux suivants sont dans les tables de chaque jeu.

| Jeu | Niveau 1 |
|---|---|
| Calcul éclair | 100 pts ≤ 20 s, 0 ≥ 80 s ; +, −, × à un chiffre |
| Couleurs piégées | 18 s / 60 s ; boutons fixes |
| Table de Schulte | 14 s / 60 s ; 5 × 5 |
| Matrice | 3 cases retenues = 0, 9 = 100 ; 0,8 s par case |
| Double retour | N = 1, 70 pts au mieux |
| Total cumulé | nombres de 1 à 9, un toutes les 1,5 s |
| L'intrus | grille de 3 × 3 à 6 × 6, symboles faciles ; 20 trouvés = 100 |
| Anagrammes | mots de 5 lettres ; 8 mots = 100 |

- Calcul éclair : les soustractions ne donnent jamais de résultat négatif ; une division part
  toujours du quotient, elle tombe donc juste. Une erreur affiche la bonne réponse et passe à la suite.
- Couleurs piégées : exactement 5 mots sur 20 concordent (25 %), jamais deux fois la même encre
  de suite. Clavier : R, B, V, J (ou 1 à 4 selon la position).
- Table de Schulte : la consigne « Touche le 7 » reste affichée ; une erreur ajoute 1 s.
- Matrice : la séquence repart à la même longueur après un échec, avec de nouvelles cases ;
  après une erreur, l'appli montre le bon ordre. Clavier : touches 1-4 / A-R / Q-F / W-V
  (positions physiques, quelle que soit la disposition du clavier).
- Double retour : consonnes uniquement ; lettre affichée 2 s puis 0,5 s de blanc ; exactement
  6 cibles sur 20. Le score repose sur la **précision équilibrée**, la moyenne du taux de bonnes
  réponses et du taux de bonnes abstentions : répondre toujours, ou jamais, rapporte 0. Une cible
  ratée est signalée à la fin de l'essai. Clavier : Espace ou Entrée.
- Total cumulé : la réponse se valide avec **OK** (ou Entrée) et non automatiquement, car le
  nombre de chiffres trahirait le total. Points = somme des longueurs des manches réussies ;
  5 manches parfaites depuis 4 nombres (4 + 5 + 6 + 7 + 8 = 30) = 100. La longueur reprend +1
  après une réussite, −1 après un échec (3 au minimum).
- L'intrus : −2 s par erreur ; la grille grandit toutes les 5 trouvailles au niveau 1.
- Anagrammes : une réponse est acceptée si c'est **n'importe quel mot de la liste** formé des mêmes
  lettres (CHIEN / NICHE, SIGNE / SINGE). Le mélange n'est jamais un mot de la liste. Passer
  (bouton ou Entrée) montre la solution. Clavier : taper les lettres, Retour arrière pour effacer.

## Les 16 nouveaux jeux

- Ils reprennent des **mécaniques classiques** de l'entraînement cérébral (calcul en chaîne,
  rotation mentale, go/no-go, flanker, paires…) avec des **noms, des visuels et des sons
  originaux** : rien n'est repris d'un jeu existant.
- Un 6e domaine, **Logique**, accueille Rotation mentale, Balance, Horloges et Mini-sudoku.
  Sa couleur (vert franc) a été validée avec les cinq autres.
- Jeux à durée fixe (60 s) : une erreur annule une bonne réponse, pour que répondre au hasard
  ne rapporte rien. Jeux à quantité fixe : la justesse compte d'abord, la vitesse module
  (`0,6 + 0,4 × vitesse`).
- **Rotation mentale** : pièces sans symétrie dès qu'un reflet sert de piège ; la bonne pièce est
  toujours visiblement tournée.
- **Mini-sudoku** : grilles 4 × 4 puis 6 × 6 à **solution unique** (vérifiée par un solveur) ;
  un chiffre faux est refusé et coûte 5 s.
- **Balance** : la réponse se déduit **sans calcul** (un contre un, ou un objet seul plus lourd que
  deux autres). Les « balances inutiles » des niveaux avancés sont vraies mais n'aident pas.
- **Lexique** (`lexique.ts`) : 496 mots en 25 catégories, **aucun mot dans deux catégories** et
  aucun double sens gênant (pas d'« orange », d'« avocat », de « rose »…). *Lettre manquante*
  donne la catégorie en indice, et aucun leurre ne forme un mot connu.
- **Paires** : les faces se distinguent toujours par la forme (et le remplissage), la couleur ne
  fait qu'aider ; 70 % du score pour les paires trouvées, 30 % pour l'économie de coups.

## Modes de jeu

- **Séance du jour** (`src/core/modes.ts`) : 4 jeux de 4 domaines, les deux domaines les plus
  faibles d'abord (un domaine jamais joué passe en tête), puis deux autres tirés au sort. Calculée
  sur les parties d'**avant aujourd'hui** : elle ne change pas en cours de journée. Elle compte
  comme terminée dès que ses 4 jeux ont été joués en entraînement libre, par son écran ou non.
- **Marathon** : tous les jeux d'un domaine à la suite, chacun au niveau du joueur ; le total des
  scores fait le record du domaine. Les parties comptent comme de l'entraînement libre.
- **Duel à deux** : 3 manches de 3 domaines différents, la **même graine** pour les deux joueurs ;
  niveau 1, 5 ou 10 au choix. Rien n'est enregistré, sauf le nombre de duels (trophée, XP).
- **Mode fête** (`src/core/party.ts`) : 2 à 4 joueurs sur un écran, la même question pour tous ;
  le premier qui répond juste marque, une erreur gèle jusqu'à la question suivante. Que des
  entiers et des réponses à toucher, aucune saisie.
- **Défis entre amies** (`src/core/challenges.ts`) : le jeu en ligne demanderait un serveur, que
  le cahier des charges exclut. Un défi tient donc **tout entier dans le lien** (`#/defi/<code>`,
  JSON en base64url, ~180 caractères) : identifiant, graine, niveau, 3 jeux, prénom et scores de
  qui l'envoie. Chacune joue la même graine chez elle, puis renvoie le lien avec ses scores ; les
  résultats reçus sont gardés dans la progression (`extras.friends`, 60 défis au plus) et font un
  classement par catégorie (moyenne des parties de défi). Une seule tentative ; les niveaux ne
  bougent pas (un défi au niveau 10 ne doit pas débloquer le 11). Le prénom est demandé avant de
  jouer s'il manque, sinon le score reviendrait signé « Joueur 1 ». Les liens pointent vers le
  site public : ils s'ouvrent même chez qui n'a pas l'appli ; dans l'APK, on peut coller le lien.

## Partie interrompue

Si l'appli passe en arrière-plan pendant une partie, la partie est annulée et reprend de
l'intro, sans pénalité : un chrono qui tourne pendant un appel fausserait le score.

## Série et tampons

Un jour compte dès qu'**une partie**, quelle qu'elle soit, a été terminée. La série en cours
reste valable jusqu'à la fin de la journée suivante. **Un jour de repos est pardonné, au plus une
fois tous les 7 jours** (`REST_DAY_EVERY`) ; deux jours manqués d'affilée rompent la série. Le
lendemain d'un repos, l'accueil le dit gentiment. Les trophées de série suivent la même règle.

## Confort et plaisir (v2.1)

Inspiré de ce que les joueurs saluent ou reprochent aux grandes applis du genre (Lumosity,
Elevate, Peak, NeuroNation, CogniFit) :

- **Une vignette par jeu** (`GameArt.tsx`) : les applis les plus appréciées donnent à chaque jeu
  une image reconnaissable ; ici 24 dessins originaux, deux encres sur la couleur du domaine.
- **Ambiance du domaine** : un halo discret et la barre de progression à la couleur du domaine,
  de l'intro au résultat. Purement décoratif : aucune information ne passe par la seule couleur.
- **Se comparer à soi** : sans serveur, pas de classement mondial ; le résultat situe la partie
  par rapport aux 10 précédentes du même jeu (`compare.ts`, ±3 pts = « dans ta moyenne »).
- **Célébrer** : confettis pour un record, trois étoiles, une médaille ou un nouveau rang ; rien
  quand le système demande moins d'animations.
- **Des constats, pas seulement des chiffres** (`insights.ts`) : un score sans interprétation
  n'aide personne. Chaque constat exige assez de parties (3 par période, 6 par moment de la
  journée) ; le « meilleur moment » compare chaque partie à la moyenne de son jeu.
- **Progrès en onglets** (Résumé, Trophées, Records) : l'écran faisait près de 15 000 px ;
  les trophées se rangent du plus avancé au moins avancé.
- **Série qui pardonne** : la pression des séries est la plainte la plus fréquente sur ces applis.

## Couleurs

- Couleurs des domaines (Calcul bleu, Mémoire orange, Attention vert d'eau, Vitesse jaune,
  Langage rose, Logique vert) validées pour les daltonismes dans cet ordre, en clair et en sombre.
  Elles accompagnent toujours un nom et une icône : jamais d'information portée par la couleur seule.
- *Couleurs piégées* se joue sur une scène sombre dans les deux thèmes, pour que les quatre
  encres restent lisibles (le jaune disparaît sur fond clair).

## Hors ligne et installation

- Service worker Workbox (`vite-plugin-pwa`) : toute l'appli est mise en cache à la première
  visite (22 fichiers, environ 730 Kio, polices comprises), puis elle marche sans réseau.
- Seuls les jeux de caractères utiles au français sont gardés hors ligne (latin et latin étendu).
- Mise à jour **proposée** (bannière « Mettre à jour ») plutôt qu'automatique : un rechargement
  imposé pourrait couper une partie. La bannière n'apparaît que sur les écrans hors jeu.
- L'invitation du navigateur à installer l'appli est remplacée par une carte discrète sur
  l'accueil (que l'on peut écarter) et une ligne dans les Réglages.
- Icônes générées une fois depuis `public/favicon.svg` (`npm run icons`), version « maskable »
  comprise pour Android.

## Rappel quotidien

Sans serveur, une PWA ne peut pas déclencher une notification à heure fixe de façon fiable.
Dans le navigateur, le rappel prend la forme d'un **bandeau sur l'accueil** à partir de l'heure
choisie ; l'appli Android programme une **vraie notification locale**.

Dans l'APK, les rappels sont programmés **jour par jour sur les 14 jours suivants** plutôt qu'en
répétition infinie : on peut ainsi sauter le jour où le test est déjà fait (reprogrammation à
chaque ouverture et à la fin de chaque test). Sans ouverture de l'appli pendant deux semaines,
les rappels s'arrêtent d'eux-mêmes : encourager, jamais harceler.

## Appli Android

- Capacitor 8, identifiant `io.github.alexxxxdroid.espritvif`. Le site est construit en mode
  `android` (chemins relatifs, pas de service worker : les fichiers sont déjà dans l'APK).
- APK **signé avec une clé stable** (secrets GitHub en CI, copie locale hors du dépôt) : sans
  cela, chaque build aurait sa propre clé de débogage et une mise à jour exigerait de désinstaller,
  donc de perdre la progression. `versionCode` = numéro de build GitHub.
- Bouton retour Android : écran précédent, ou sortie de l'appli depuis l'accueil.
- Export de la sauvegarde : feuille de partage Android (enregistrer dans Fichiers, envoyer…).

## Voix

La reconnaissance vocale (Web Speech) est **désactivée par défaut** : sur Chrome, l'audio est
analysé par un service en ligne, ce qui ne colle pas avec « aucun pistage ». L'option l'explique.
