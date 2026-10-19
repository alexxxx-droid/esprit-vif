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

- Calcul éclair : les soustractions ne donnent jamais de résultat négatif ; une division part
  toujours du quotient, elle tombe donc juste. Une erreur affiche la bonne réponse et passe à la suite.
- Couleurs piégées : exactement 5 mots sur 20 concordent (25 %), jamais deux fois la même encre
  de suite. Clavier : R, B, V, J (ou 1 à 4 selon la position).
- Table de Schulte : la consigne « Touche le 7 » reste affichée ; une erreur ajoute 1 s.

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

## Rappel quotidien

Sans serveur, une PWA ne peut pas déclencher une notification à heure fixe de façon fiable.
Dans le navigateur, le rappel prend la forme d'un **bandeau sur l'accueil** à partir de l'heure
choisie ; l'appli Android programme une **vraie notification locale**.

## Voix

La reconnaissance vocale (Web Speech) est **désactivée par défaut** : sur Chrome, l'audio est
analysé par un service en ligne, ce qui ne colle pas avec « aucun pistage ». L'option l'explique.
