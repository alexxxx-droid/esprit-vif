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

## Difficulté adaptative

- Après une partie d'entraînement libre : **score ≥ 75 → niveau + 1**, **score < 40 → niveau − 1**
  (`LEVEL_UP_AT`, `LEVEL_DOWN_BELOW` dans `src/core/scoring.ts`). Trois niveaux par jeu.
- Chaque niveau a ses propres seuils de score, pour qu'un 100 reste atteignable à tous les niveaux.

## Barèmes par jeu

| Jeu | Niveau 1 (spec) | Niveau 2 | Niveau 3 |
|---|---|---|---|
| Calcul éclair | 100 pts ≤ 20 s, 0 ≥ 80 s ; +, −, × à un chiffre | 35 s / 110 s ; deux chiffres, divisions exactes | 45 s / 130 s ; jusqu'à 100, tables de 12 |
| Couleurs piégées | 18 s / 60 s ; boutons fixes | 21 s / 66 s ; boutons qui changent de place | 24 s / 72 s ; libellés des boutons piégés eux aussi |
| Table de Schulte | 14 s / 60 s ; 5 × 5 | 24 s / 90 s ; 6 × 6 | 28 s / 100 s ; 6 × 6 brouillée (nombres inclinés) |

| Matrice | 3 cases retenues = 0, 9 = 100 ; 0,8 s par case | 0,62 s par case | 0,46 s par case |
| Double retour | N = 1, 70 pts au mieux | N = 2, 100 pts au mieux | N = 3, 100 pts dès 80 % de précision utile |
| Total cumulé | nombres de 1 à 9, un toutes les 1,5 s | jusqu'à 15, toutes les 1,15 s | jusqu'à 25, toutes les 0,85 s |
| L'intrus | grille de 3 × 3 à 6 × 6, symboles faciles ; 20 trouvés = 100 | départ 4 × 4, tous les symboles ; 18 = 100 | départ 4 × 4, symboles trompeurs ; 16 = 100 |
| Anagrammes | mots de 5 lettres ; 8 mots = 100 | 5 ou 6 lettres ; 7 mots = 100 | 6 ou 7 lettres ; 6 mots = 100 |

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

## Partie interrompue

Si l'appli passe en arrière-plan pendant une partie, la partie est annulée et reprend de
l'intro, sans pénalité : un chrono qui tourne pendant un appel fausserait le score.

## Série et tampons

Un jour compte dès qu'**une partie**, quelle qu'elle soit, a été terminée. La série en cours
reste valable jusqu'à la fin de la journée suivante.

## Couleurs

- Couleurs des domaines (Calcul bleu, Mémoire orange, Attention vert d'eau, Vitesse jaune,
  Langage rose) validées pour les daltonismes dans cet ordre, en clair et en sombre.
  Elles accompagnent toujours un nom et une icône : jamais d'information portée par la couleur seule.
- *Couleurs piégées* se joue sur une scène sombre dans les deux thèmes, pour que les quatre
  encres restent lisibles (le jaune disparaît sur fond clair).

## Hors ligne et installation

- Service worker Workbox (`vite-plugin-pwa`) : toute l'appli est mise en cache à la première
  visite (16 fichiers, environ 530 Kio, polices comprises), puis elle marche sans réseau.
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
