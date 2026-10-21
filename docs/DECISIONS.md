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

- **Trois jeux de trois domaines différents, qui changent chaque jour** (choix d'Alex, 20-10-2026 ;
  jusqu'à la v2.8, *Calcul éclair* et *Couleurs piégées* revenaient tous les jours). `dailyGames`
  (`src/core/daily.ts`) déduit tout de la date : les 20 trios de domaines défilent dans un ordre
  mélangé (chaque domaine revient un jour sur deux), et dans un domaine on fait le tour de ses jeux
  avant d'en revoir un, jamais le même deux jours de suite. Tous les jeux y participent
  (`DAILY_POOL`), tous sont ouverts dès le départ. Les tests passés gardent leurs jeux.
- L'âge cérébral reste la moyenne des trois scores au niveau du test : il varie un peu plus d'un
  jour à l'autre, puisque les jeux changent ; la courbe de l'onglet Progrès lisse cet effet.
- **Date et fuseau** : le jour est celui du téléphone (`dayKey`, heure locale). Changer de fuseau
  ou avancer l'horloge montre le test de cette date-là, mais ne rapporte rien de plus : un seul test
  officiel compte par date, et les bonus se recalculent depuis les dates enregistrées. Revenir en
  arrière ne permet pas de rejouer un test officiel déjà fait ce jour-là. Sans serveur, rien ne
  garantit l'heure : c'est une limite assumée d'une appli sans compte.
- Les jeux du test se jouent à **niveau fixe** (`dailyLevel`) : N = 2 pour le Double retour,
  niveau 1 ailleurs. Le test officiel utilise une **graine dérivée de la date** : tout le monde
  a le même test un jour donné, et une partie se rejoue à l'identique.
- **Un seul test officiel par jour** : le premier test *terminé* de la journée. Les suivants sont
  marqués « pour le plaisir » et n'entrent ni dans la courbe ni dans la comparaison.
- Un test commencé reste à « Continuer » jusqu'à minuit ; en relancer un abandonne l'ancien.
- Le test du jour ne fait pas bouger les niveaux d'entraînement, mais ses scores comptent
  pour les records et pour le profil par domaine.

## Niveaux, étoiles et progression

- **50 niveaux par jeu** (`MAX_LEVEL`, `src/core/levels.ts`) en **5 paliers** de 10 : Débutant
  (1-10), Confirmé (11-20), Expert (21-30), Maître (31-40), Légende (41-50) (`TIERS`, `tierOf`).
  Le niveau 1 reprend la spec ; chaque jeu décrit ses niveaux dans une table (`*_LEVELS` dans
  `src/core/games/`) et l'intro affiche ce qui change (« 6 × 6 brouillée », « 2 lettres
  manquantes »…), avec la pastille du palier. Le choix du niveau sépare les paliers par leur nom,
  et le résultat annonce « Nouveau palier » quand on en ouvre un.
- **Étoiles** : 1 dès 60 pts, 2 dès 80, 3 dès 95 (`STAR_THRESHOLDS`). La première étoile
  **débloque le niveau suivant** ; on rejoue librement tout niveau débloqué.
- Difficulté adaptative en entraînement libre : score ≥ 60 → niveau + 1, score < 40 → niveau − 1
  (`LEVEL_UP_AT`, `LEVEL_DOWN_BELOW`), sans jamais dépasser le niveau débloqué.
- **Médailles par jeu** : bronze au niveau 5 réussi, argent au 10, or au 15, platine avec
  3 étoiles au 20, diamant au 35, légende avec 3 étoiles au 50.
- **XP** : `round((5 + 0,45 × score) × (1 + 5 % par niveau au-delà du 1er, plafonné au 30e))` par partie, plus des
  bonus (test du jour 40, étoile 10, séance 30, marathon 30, duel 10 : `XP_BONUS`). Rang n :
  `100(n−1) + 25(n−1)(n−2)/2` XP ; titres d'« Esprit curieux » à « Esprit légendaire ».
- **Tout se déduit de l'historique** (parties, tests, meilleurs scores) : rangs, médailles et
  46 trophées sont recalculés, rien ne peut se désynchroniser. Seuls séances, marathons et duels
  ont leur petite mémoire (`extras`), exportée avec le reste.

## Fin de jeu : maîtrise, rang sans fin (v2.10, demande d'Alex du 20-10-2026)

« Une fois les 50 niveaux faits, il arrête ? » Ce qui s'ajoute pour les joueurs qui ont tout fini :

- **Maîtrise** (`MASTERY_LEVELS`, `src/core/levels.ts`) : dix crans après le niveau 50, « Maîtrise I à
  X » (niveaux 51 à 60 dans les données). Chaque cran rejoue la partie du niveau 50 (`playedLevel`) et
  demande un meilleur score pour passer (`passScore` : 64 pour I, 4 de plus à chaque cran, 100 pour X) ;
  dans les 16 jeux à fenêtres d'affichage, celles-ci raccourcissent de 2 % par cran (`masteryTempo`,
  via `slow`). Choix générique et honnête : il marche pour les 28 jeux sans inventer 280 niveaux
  bancals, et chaque cran est vraiment plus exigeant. Les crans ne donnent pas d'étoiles (elles
  restent sur 50 niveaux) ; une couronne I-X s'affiche sur la carte du jeu. Un jeu est « maîtrisé » à
  Maîtrise V : un chapeau de prestige tous les 5 jeux maîtrisés (bandeau de maître, heaume, couronne
  de cristal, chapeau du grand sage, couronne solaire). Les niveaux 1 à 50 ne bougent pas.
- **Rang sans fin** : un titre tous les 10 niveaux de joueur après 50 (céleste, stellaire, cosmique,
  infini, éternel, puis « Esprit éternel II, III… »), 20 étincelles par niveau au-delà de 50
  (`levelSparks`), et trois auras pour Vif aux niveaux 60, 75 et 100 (argent, or, arc-en-ciel), à
  choisir au vestiaire.
- **Défi Légende du jour** (`src/core/legend.ts`, `#/legende`) : ouvert quand un jeu atteint le palier
  Légende (niveau 41). Chaque jour, un des jeux du joueur de niveau Expert ou plus (21+), à son plus haut
  niveau ouvert, maîtrise comprise, avec la même graine toute la journée. Tout se calcule sur les parties
  d'avant la journée : le défi ne change pas si l'on progresse dans la journée. On peut le retenter ; la
  première partie du jour rapporte 15 étincelles et 25 XP (une seule fois), le meilleur score du jour
  s'affiche sur l'accueil. Le niveau du jeu ne bouge pas (comme au test du jour).
- **Saisons de défis** (`src/core/seasons.ts`, `#/saison`) : quatre semaines qui racontent une histoire
  (six histoires qui tournent : expédition polaire, voyage en mer, forêt enchantée, désert des mirages,
  cité des étoiles, cœur du volcan), une semaine = un chapitre, validé par le défi de la semaine. Trois
  chapitres sur quatre suffisent pour gagner le chapeau de la saison et 40 étincelles : manquer une semaine
  ne fait rien perdre. Première saison : 19 octobre 2026 (`SEASONS_EPOCH`). Quand une histoire revient,
  son chapeau revient dans une nouvelle édition, d'une autre teinte (`editionHue`) : une collection qui
  ne s'arrête jamais, gardée au vestiaire (« Chapeaux de saison »). L'accueil montre la saison et le
  chapitre de la semaine au-dessus du défi de la semaine.

## Premium à vie (v2.9, décision d'Alex du 20-10-2026)

Le cahier des charges disait « sans publicité » et la fiche Play « achats numériques : non ». Alex a
choisi : **un Premium à vie, zéro publicité**, vendu seulement dans l'appli Google Play, qui
n'ajoute que du nouveau. Détails techniques et étapes de la Play Console : `docs/GOOGLE_PLAY_BILLING.md`.

- **Un produit** (`premium_lifetime`), achat unique non consommable ; prix conseillé 8,99 €.
- **Ce qu'il apporte, et rien d'autre** : trois thèmes exclusifs et l'historique détaillé de chaque
  jeu. Les 28 jeux, les 1 400 niveaux, le test du jour, les objectifs, le vestiaire, les thèmes
  gagnés, les statistiques et les sauvegardes restent gratuits. Aucune fonction existante n'a été
  retirée de la version gratuite.
- **Le site ne vend rien** : l'écran Premium y explique que l'achat se fait dans l'appli Android.
- **Discret** : l'écran Premium ne s'ouvre jamais tout seul ; on y arrive par Réglages, par un
  thème verrouillé ou par l'historique d'un jeu. Pas de compte à rebours, pas de promotion.
- **Droit = achat vérifié** : terminé (pas « en attente »), signature vérifiée, bon produit ; gardé
  sur l'appareil pour le hors-ligne, revérifié à chaque lancement (remboursement compris).
- **Mode test** explicite (`--mode billingtest`, `npm run dev`, ou `VITE_BILLING_TEST=1` pour un APK de
  test), avec un bandeau, jamais publié.
- **« Donner envie »** (Alex, 20-10 soir) : plus de contenu Premium, toujours nouveau (8 chapeaux qui
  scintillent, 3 compagnons exclusifs, bilan du mois) et une vitrine où tout s'essaie (thèmes en direct,
  chapeaux sur Vif, vraies données floutées). Pas d'étincelles en plus pour les acheteurs : Premium ne
  touche ni aux scores ni à la progression. Les compagnons Premium restent hors de « Qui est qui ? »
  (ses parties ne changent pas). Sans Premium (remboursement), un compagnon ou un chapeau Premium choisi
  redevient Vif ou tête nue à l'écran, sans que le choix soit effacé. Le bilan du mois ne compare que
  dans le bon sens (« 10 parties de plus que le mois d'avant »), jamais pour culpabiliser.

## Mesures (v2.9, décision d'Alex du 20-10-2026)

Aucun SDK d'analytics. Un **journal local** (`src/analytics/journal.ts`, 500 événements au plus)
note les étapes clés sur l'appareil, sans prénom ni contenu ; il n'est jamais envoyé, et se copie
ou s'efface dans Réglages → Mes données. Les indicateurs de tous les joueurs (installations,
rétention, achats) viennent de la Play Console : voir `docs/METRIQUES.md`.

## Objectifs, étincelles et vestiaire (v2.9)

Quatre systèmes, chacun avec un seul rôle : les **niveaux** d'un jeu règlent sa difficulté ; les
**étoiles** ouvrent le niveau suivant et donnent les médailles ; l'**XP** fait monter le niveau de
joueur (titres, chapeaux de prestige) ; les **étincelles** habillent Vif. Rien ne s'achète avec de
l'argent, rien ne se perd, et tout se recalcule depuis l'historique : une récompense ne peut pas être
versée deux fois, même si l'on rejoue, ferme l'appli ou recharge une sauvegarde.

- **Objectifs du jour** (`src/core/objectives.ts`) : trois par jour, un de volume (2-3 parties),
  un de variété (2-3 domaines, un thème, ou un jeu laissé de côté depuis 7 jours), un d'exploit (test
  du jour, 80 points, battre un record, 2 étoiles). Tirés de la date et des parties d'**avant** la
  journée : ils ne changent pas en cours de route. Moins de 10 parties jouées : objectifs de débutant
  (2 parties, 2 domaines ou un thème, test du jour ou 60 points), jamais de record à battre. Chaque
  objectif rapporte **15 XP et 5 étincelles** ; ils comptent à partir du 20-10-2026 (`OBJECTIVES_START`),
  pour ne pas faire bondir d'un coup le niveau des joueurs existants. Une partie jouée dans le test
  du jour compte aussi pour les objectifs. Un « record » demande d'avoir battu un score existant au
  même niveau : une première partie n'en est pas un.
- **Étincelles** : 1 à 5 par partie selon le score (`1 + score ÷ 25`), **plafonnées à 25 par jour**
  pour les parties (enchaîner ne sert à rien au-delà d'une dizaine), plus 10 pour le test du jour
  officiel, 5 par objectif, 20 par défi de la semaine. Les parties d'avant la v2.9 comptent : un joueur
  fidèle retrouve d'emblée de quoi habiller Vif. Solde = gagné − dépensé.
- **Vestiaire** (`src/core/wardrobe.ts`, `#/vestiaire`) : 20 chapeaux à acheter (40 à 200 étincelles,
  soit deux mois de jeu régulier pour tout avoir) et 11 chapeaux de **prestige** qui ne s'achètent
  pas : paliers Expert, Maître et Légende ouverts dans un jeu, médailles de platine et de diamant,
  séries de 7 et 30 jours, 5 défis de la semaine, niveaux de joueur 10, 25 et 50. Les conditions ne
  peuvent que progresser : un chapeau gagné reste gagné. Le prix payé est enregistré avec l'achat
  (`extras.wardrobe`) : changer un prix plus tard ne touche pas aux soldes. Le chapeau porté
  (`settings.hat`) remplace l'accessoire de saison ; sous un chapeau, la pointe du haut de Vif s'efface.
- **Résultat** : les objectifs remplis par la partie et les étincelles gagnées s'affichent avec l'XP.

## Vif vivant et thèmes (v2.9, demande d'Alex du 20-10-2026)

- **Vif guide** (`VifGuide.tsx`) : au premier passage sur l'accueil après le lancement, il arrive en se
  dandinant (1,9 s), se pose sur le bouton principal et le montre du doigt (humeur `point`) ; ensuite
  il y attend directement. On peut le toucher. Il ne cache aucune commande : une marge est réservée
  au-dessus du bouton.
- **Au résultat**, il bondit près du score : bouche bée puis saut de joie pour un grand moment
  (record, trois étoiles, médaille, nouveau rang), sinon l'humeur du score. **Au vestiaire**, il fait un
  petit bond et salue à chaque chapeau essayé. **Jamais pendant une partie** (choix d'Alex : ça
  distrairait et fausserait les scores chronométrés). Rien de tout ça avec « moins d'animations ».
- **Thèmes** (`src/core/themes.ts`) : un accent et une teinte de fond, en clair et en sombre ; les
  couleurs des domaines ne changent jamais (validées pour le daltonisme), et **Vif garde son indigo**
  (`--vif-color`) pour rester reconnaissable. « Auto » (par défaut) suit la saison de l'année : hiver
  (neige), printemps (pétales), été (lucioles qui montent), automne (feuilles) ; le décor passe
  derrière les écrans à onglets, jamais dans les jeux, et disparaît avec « moins d'animations ».
  Couper « Thèmes de saison » ramène au thème classique. Six thèmes se gagnent au niveau de joueur
  (Océan 5, Forêt 10, Corail 15, Lavande 20, Nuit étoilée 30, Or 40) ; trois sont réservés à Premium
  (Aurore boréale, Sakura avec ses pétales, Encre en noir et blanc, vrai noir en sombre). Un thème
  devenu inaccessible retombe sur « Auto » sans effacer le choix. Contrastes vérifiés (au moins
  5,4:1 pour le texte sur l'accent) ; le contraste renforcé garde ses propres couleurs.

## Progrès (v2.9)

- **Prochaines récompenses** : le prochain titre, le prochain thème, le chapeau de prestige le plus
  proche et le prochain chapeau de la boutique ; Vif les montre du doigt.
- **Ta semaine** (`src/core/summary.ts`) : parties, jours actifs, temps de jeu et score moyen depuis
  lundi, comparés à la semaine d'avant. Une seule partie suffit pour lancer le bilan.
- **En chiffres** : parties terminées, temps de jeu, précision et temps de réaction. Chaque chiffre
  ne porte que sur les parties qui le mesurent, et le dit : la durée n'existe que depuis la v2.9 ; la
  précision vient des jeux qui comptent bonnes réponses et erreurs (`correct`, `errors`) ; le temps de
  réaction, de Flèches et Réflexe (`meanRt`). Rien n'est estimé pour les parties qui n'ont pas la mesure.
- **Activité récente** : les six dernières parties. Le reste ne bouge pas (constats, âge cérébral,
  carte du cerveau, domaines, calendrier). Corrigé : les records annonçaient « x/20 ouverts ».
- **Série masquable** (`showStreak`) : la mission demande de pouvoir couper la série ; masquée, elle
  disparaît de l'accueil, des Progrès et du widget, mais continue d'être comptée (trophées, chapeaux).
- Ces chiffres décrivent des parties, jamais une intelligence : aucun texte ne parle de QI ni
  d'amélioration générale.

## Accueil (v2.9)

Dans l'ordre, sur téléphone : salutation et niveau ; **le test du jour** (ses trois jeux et le dernier
âge cérébral, ou, une fois fait, le score du jour, l'âge et les trois scores, chaque jeu se rejouant
en entraînement libre sans toucher aux récompenses du test) ; le bouton principal (commencer,
continuer le test, ou l'entraînement conseillé) ; les objectifs du jour et le vestiaire ; la semaine
(7 jours + défi de la semaine) ; reprendre le dernier jeu libre ; les six thèmes ; la séance du jour ;
la saison ; le mot du coach. La série se résume à la flamme et son nombre, pour laisser la place au
prénom. Le bilan du test donne le **score du jour** (moyenne des trois) et la formule de l'âge
cérébral ; chaque jeu s'y compare à sa dernière apparition dans un test.

## 50 niveaux et 5 paliers (v2.8)

Demande d'Alex : « beaucoup de niveaux et de difficultés pour ne pas faire le tour en une
semaine ». Les niveaux 1 à 20 n'ont **pas bougé** : mêmes parties pour une même graine, mêmes
barèmes, mêmes libellés (des tests d'empreinte `levels-*.test.ts` le vérifient, jeu par jeu, en
français et en anglais). Chaque palier ajoute une **nouvelle façon de jouer**, pas seulement plus
de vitesse ; la consigne, le libellé du niveau et la démo de l'intro suivent.

| Jeu | Expert (21-30) | Maître (31-40) | Légende (41-50) |
|---|---|---|---|
| Calcul éclair | grands facteurs, centaines | centaines × chiffre, parenthèses | deux chiffres × deux chiffres, carrés jusqu'à 99 |
| Total cumulé | totaux jusqu'à 199 | nombres barrés à ignorer | des ×2 et ×3, totaux jusqu'à 999 |
| Calcul du diable | centaines | 1 à 3 calculs en arrière, variable | jusqu'à 5 en arrière, calcul effacé |
| Monnaie | jusqu'à 200 € | panier avec quantités | bons de réduction, piles cachées |
| Pluie de calculs | averses (deux gouttes) | gouttes piégées, brouillard | tout ensemble, calculs de légende |
| Matrice | 6 × 6 à l'envers | sens donné après coup, cases pièges | plus vite |
| Double retour | 5 en arrière | 6 en arrière, pièges | lettres et positions, pièges |
| Du plus petit… | centaines en grille 6 × 6 | nombres barrés | nombres très proches, un par un |
| Mots à retenir | un mot à la fois | mots barrés à oublier | temps de réponse limité |
| Paires | formes proches | cartes baladeuses | recachées de plus en plus vite |
| Qui est qui ? | un visage à la fois | prénoms échangés à chaque manche | 12 visages |
| Couleurs piégées | mot, encre ou **cadre** | 7-8 couleurs, mot éclair | temps limité par mot |
| L'intrus | couleurs trompeuses | familles mêlées | symboles qui tournent, miroirs |
| La boutique | question surprise | boulangerie voisine (distraction) | deux magasins à suivre |
| Flèches | la **couleur** dit quelle flèche suivre | flèche **encadrée** = sens inverse | flèche **barrée** = ne rien toucher, voisines mobiles |
| Table de Schulte | 7 × 7 | leurres orange à ignorer | deux suites croisées (Gorbov), brouillée et mouvante |
| Correspondance | flèches orientées | il y a trois cartes | pièges |
| Réflexe | ronds creux | formes changeantes | deux règles en alternance |
| Coup d'œil | écarts plus fins | points gris à ignorer | « plus ou moins » |
| Anagrammes | 8 lettres | leurres | leurres sosies |
| Lettre manquante | leurres sosies | sans indice | 4 lettres manquantes |
| Catégories | intrus tout proches | paires d'initiales | intrus camouflés (initiale, longueur) |
| Lecture éclair | phrases à rallonge | logique | phrases qui s'effacent |
| Rotation mentale | pièces de 9-10 carrés, vues de biais | pièces **en relief** (cubes isométriques) | 8-10 cubes, 5 reflets pièges |
| Balance | balances inutiles, chaînes | plusieurs exemplaires d'un objet | 9 objets, chaînes de 8 étapes |
| Horloges | heure d'avant, chiffres romains | horloge vue dans un **miroir** | durées sur 24 h (matin, après-midi, soir) |
| Mini-sudoku | 6 × 6 presque vide, puis 8 × 8 | 8 × 8 dépouillé, puis 9 × 9 | 9 × 9, jusqu'à 14 étapes de déduction |
| Itinéraire | **rochers** qui arrêtent | **diagonales** | les deux, jusqu'à 4 cases par flèche |

- Chaque nouvelle grille de sudoku se résout pas à pas sans deviner (donc solution unique) ; la
  durée annoncée suit le niveau (`durationAt` : « ≈ 1 min » au début, « ≈ 16 min » au 50).
- Les écrans restent jouables sur 360 px de large : grilles d'itinéraire de 7 colonnes au plus,
  pavé du sudoku sur deux rangées en 8 × 8 et 9 × 9, mots longs rapetissés sans coupure
  (`fit-text.ts`). Un robot parcourt les niveaux 21, 31, 41 et 50 de chaque jeu sur 360 × 740.
- Couleurs piégées : le score tient compte de la justesse à **tous** les niveaux ; toucher au
  hasard très vite ne rapporte plus rien (la faille existait aux niveaux 1 à 20). Rien ne change
  pour qui fait moins de 4 erreurs sur 20.
- Pluie de calculs : le libellé du niveau montre un exemple de calcul (« ex. 347 × 6 ») ; sans
  lui, un niveau aux calculs plus durs mais plus lents avait l'air plus facile.

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

## Le 5e pack (v2.5)

Quatre jeux de plus, un par domaine qui en manquait le plus, tous en **entiers et sans saisie** :

- **Coup d'œil** (Vitesse, `coupdoeil.ts`) : deux nuées mêlées, bleue et orange (teintes que les
  daltoniens distinguent), montrées un instant. Le rapport entre les nuées descend de 2 à 1,1 et
  l'affichage de 1,5 s à 0,45 s. Une fois sur deux, la nuée la plus nombreuse a les plus petits
  points : la surface d'encre ne dit rien de la réponse (test : moins de 75 % de « bons indices »).
  Barème : bonnes réponses moins erreurs, le hasard rapporte 0.
- **Qui est qui ?** (Mémoire, `quiestqui.ts`) : des compagnons (fruit × couleur de fond) et leurs
  prénoms, 3 manches. Plus haut : jusqu'à 10 visages, le même fruit sur plusieurs fonds, des
  prénoms à la même initiale, et la question inverse (« Quel est son prénom ? »). Aucun fruit
  sur un fond où il se verrait mal (`CLASHING_COLORS`). Barème : part de bonnes réponses.
- **Lecture éclair** (Langage, `lecture.ts`) : 120 idées écrites à la main, chacune en version
  vraie et fausse (on ne peut pas retenir « cette phrase est fausse »), en trois paliers :
  courtes, longues, puis négations et petits raisonnements. Pas de tournure ambiguë (« Tous les
  chiens ne sont pas noirs » est devenu « Les chiens ne sont pas tous noirs »). Barème : bonnes
  réponses moins erreurs.
- **Itinéraire** (Logique, `itineraire.ts`) : une suite de flèches sur une grille, qui disparaît ;
  toucher la case d'arrivée. Jamais de demi-tour immédiat (il annulerait le pas précédent) ni
  d'arrivée sur le départ. Dès le niveau 10, les flèches défilent une par une. Après une erreur,
  le bon trajet est tracé. Barème : trajets retrouvés sur 8.

## Le 6e pack (v2.10)

Trois jeux de plus, un pour chacun des domaines qui n'en avaient que quatre (Attention, Vitesse,
Langage), construits comme les autres : 50 niveaux en 5 paliers, une nouvelle façon de jouer à chaque
palier, la maîtrise ensuite, en français et en anglais.

- **Filature** (Attention, `filature.ts`) : suivi d'objets multiples, avec des noms et des visuels
  maison. Quelques disques sont signalés 1,8 s, puis tous, identiques, bougent 4 à 6 s (rebonds sur les
  bords et entre eux) ; à l'arrêt, on touche les disques suivis. 6 essais. Le mouvement est simulé à pas
  fixe à partir de la graine : même graine, mêmes trajectoires sur tous les appareils. Le temps généreux
  et la maîtrise ne jouent que sur le signalement : raccourcir le suivi le rendrait plus facile. Paliers :
  2 à 3 disques à suivre (1-10), jusqu'à 4 parmi 10 (11-20), nuages sous lesquels les disques passent
  cachés (21-30), à-coups de vitesse et de direction (31-40), leurres qui clignotent comme un
  signalement (41-50). Barème : 100 × (justes − ½ faux) / (disques à suivre × 6).
- **Lucioles** (Vitesse, `lucioles.ts`) : on touche les lucioles d'une grille avant qu'elles
  s'éteignent, pendant 60 s. Paliers : grille 3 × 3 puis 4 × 4 (1-10), paires (11-20), rouges à éviter
  marquées d'une croix (21-30), voyageuses qui sautent dans une case voisine (31-40), dorées à deux
  appuis marquées « 2 », grille 5 × 5 (41-50). La forme distingue les sortes, pas la couleur seule.
  L'objectif pour 100 points suit le rythme d'un joueur très rapide ; une ratée retire une demi-luciole,
  un mauvais appui une entière. Le temps de réaction alimente les Progrès.
- **Contraires** (Langage, `contraires.ts`, `contraires-words.ts`) : un mot, une consigne en badge
  (« Le contraire de » ↔, « Le même sens que » =), quatre propositions ; 60 s, bonnes réponses moins
  erreurs. Paliers : contraires courants sans piège (1-10), consigne qui alterne contraire / même sens
  (11-20), pièges (un synonyme quand on demande le contraire, et inversement, 21-30), mots rares et
  soutenus (31-40), puis deux mots à juger, contraires, même sens ou sans rapport, avant la fin d'une
  mèche (41-50). Les listes sont écrites pour chaque langue et rangées en familles de sens : un mot
  n'appartient qu'à une famille et les leurres viennent toujours d'autres familles, si bien qu'aucun ne
  peut passer pour une bonne réponse. 245 contraires et 203 synonymes en français, 219 et 187 en
  anglais. Les autres langues jouent en anglais tant qu'elles n'ont pas leur liste.
- Les trois jeux entrent dans le test du jour (tous les jeux y participent) et dans les marathons de
  leur domaine. Contrôlés au toucher réel : un appui, une réponse.

## Contenu et prise en main (v2.6)

- **Mots** : 648 mots pour les Anagrammes (275 avant), tous sans accent ni cédille dans leur
  orthographe correcte (« ECOLE » n'y est pas, il s'écrit « école »), sans mots-outils comme
  « autre » ou « avant ». Toute réponse de la liste est acceptée : plus elle est riche, moins on
  entend « mais c'est un vrai mot ! ».
- **Catégories** : 34 au lieu de 25 (épices et herbes, fromages, fournitures scolaires, jouets,
  paysages, espace, formes, jours et mois, émotions). Écartés parce qu'ils rendraient une énigme
  de Catégories ambiguë : « ciseaux » et « compas » (des outils ?), « robot » (un ustensile de
  cuisine ?), les animaux marins (un requin en est un aussi).
- **Essai guidé** (Double retour, `GAME_TUTORIALS`) : sans chrono, l'historique affiché et
  l'élément « d'il y a N coups » entouré pendant 3 essais, l'historique seul pendant 3 autres,
  puis plus rien. Deux boutons « Pareil / Différent » pour apprendre à décider, puis le rappel
  qu'en vrai on ne touche que quand c'est pareil. À 2 en arrière, un piège voulu : la lettre du
  coup d'avant. Proposé en avant tant qu'on n'a jamais joué au jeu.

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

## Écriture au doigt

Dans les six jeux de nombres, on peut écrire sa réponse chiffre par chiffre au lieu de toucher le
pavé (réglage `handwriting`, aussi proposé à l'intro du jeu). La reconnaissance se fait **sur
l'appareil** (`src/core/handwriting.ts`) par la méthode du nuage de points (Vatavu, Anthony &
Wobbrock, 2012, dite $P) : le tracé est rééchantillonné en 32 points, mis à l'échelle en gardant
ses proportions, centré, puis comparé à 32 modèles dessinés en code (plusieurs façons d'écrire
chaque chiffre : 1 à drapeau, 4 ouvert ou fermé, 7 barré…). Ni le sens ni l'ordre des traits ne
comptent. Pas de réseau de neurones : il aurait fallu l'entraîner sur des données tierces, à la
licence incertaine, et l'embarquer.

- Le chiffre est lu après **420 ms** sans nouveau trait (le temps de barrer un 7, de finir un 4).
- Mesures (tests) : 99 % de bonnes lectures sur des chiffres tracés autrement que les modèles,
  penchés, étirés et tremblés ; une partie complète de Calcul éclair écrite au doigt par le robot
  de test : 20 sur 20. Au-delà d'une distance de **1,9**, le tracé est refusé (« Pas reconnu ») :
  les vrais chiffres restent sous 1,6, traits et gribouillis dépassent 2.
- Le barème ne change pas : écrire est plus lent que toucher, c'est un choix de confort.

## Fiabilité de la sauvegarde (v2.9)

- **Les parties font foi.** Une partie s'écrit en deux temps (la partie, puis les meilleurs scores ;
  au test du jour, encore le résultat du test). Si l'appli est tuée entre deux, le chargement suivant
  complète ce qui manque depuis les parties (`reconcile` dans `src/store/progress.ts`) : meilleur
  score retrouvé, test du jour terminé avec son âge cérébral. Comme tout le reste (XP, trophées…) se
  recalcule depuis l'historique, aucune récompense ne peut être perdue ni comptée deux fois.
- **Numéro de schéma** (`SCHEMA_VERSION`, clé `schema` de la base) : une base plus ancienne est lue,
  complétée par des valeurs par défaut, puis réécrite une fois au format actuel. Une base venue d'une
  version plus récente n'est jamais réécrite. Historique des versions en tête de `progress.ts`.
- **Durée des parties** (`durationMs`) : mesurée par le déroulé commun, du « partez » au résultat
  (ni l'intro ni le 3-2-1). Elle n'existe pas pour les parties d'avant la v2.9 : le temps de jeu
  des Progrès le dit, il n'invente rien pour elles. Une durée de plus de 2 h est écartée.

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
  une image reconnaissable ; ici 28 dessins originaux, deux encres sur la couleur du domaine.
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

## Version anglaise (v2.7)

- **Choix** dans les réglages (Apparence) : Auto (la langue du téléphone : français s'il est en
  français, anglais sinon), Français ou English. Le réglage est propre à chaque joueur.
- **Technique** (`src/core/lang.ts`, détail dans `docs/TRADUCTION.md`) : chaque texte s'écrit à
  côté de sa traduction, `tr('Réglages', 'Settings')`, le français faisant foi. Les tables de
  textes (jeux, trophées, saisons…) passent par des accesseurs, jamais figées au chargement. Au
  changement de langue, l'appli repart d'un écran neuf (`LanguageRoot`), sans recharger la page.
- **Contenus propres à la langue**, pas traduits mot à mot : 829 mots pour les Anagrammes,
  34 catégories anglaises (sans mot à double sens : ni « orange », ni « bat »…), 120 paires de
  phrases pour Speed Reading, noms de couleurs (et reconnaissance vocale) pour Color Trap, formes,
  conseils du coach, prénoms de Who's Who?. Dates et nombres suivent la langue (Intl).
- **Hors de l'appli** : le widget affiche les textes que l'appli lui confie dans sa langue ; les
  raccourcis de l'icône et la fiche du widget suivent la langue du téléphone (`values-en`).
- **Vérifié** : un robot parcourt en anglais tous les écrans, les intros et les 28 jeux en cours
  de partie et cherche les restes de français (aucun) ; les robots français repassent à
  l'identique ; la bascule de langue tient au rechargement.
- Un score déjà enregistré garde le résumé (« headline ») de la langue où il a été joué.

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

## Raccourcis et widget (Android)

- **Liens `espritvif://…`** : `espritvif://seance` ouvre `#/seance`, etc. (`openAppLink` dans
  `src/native.ts`, au lancement comme appli déjà ouverte). `#/test-du-jour` commence ou reprend
  le test du jour, ou montre son bilan s'il est déjà fait.
- **Raccourcis de l'icône** (appui long, `res/xml/shortcuts.xml`) : Test du jour, Séance du jour,
  Entraînement, Défis entre amies, avec les pictogrammes de l'appli. La PWA a les mêmes dans son
  manifeste (avec Progrès à la place d'Entraînement).
- **Widget** (`EspritWidget.java`, 4 × 2) : la série, le test du jour (à faire, ou fait avec
  l'âge cérébral) et deux boutons (Test ou Entraînement, Séance). L'appli lui confie ses données
  par un petit module maison (`WidgetBridge.java`) à chaque changement ; le widget compare
  seulement les dates : la série s'affiche tant qu'elle tient (`streakHorizon`, jour de repos
  compris), le test redevient « à faire » le lendemain sans ouvrir l'appli. Le prénom n'y figure
  que s'il a été choisi (ou s'il y a plusieurs joueurs). Les réglages proposent de l'ajouter.

## Transfert par QR code

Changer de téléphone, ou passer du site à l'appli, sans compte ni serveur (`src/core/transfer.ts`,
`TransferScreen.tsx`, `#/transfert`) :

- **Le code** : la sauvegarde habituelle et le profil (prénom, couleur, compagnon), compressés
  (`deflate-raw`), écrits en **base 32**. Majuscules et chiffres tiennent dans le mode
  alphanumérique des QR codes, environ 20 % plus dense que le texte ordinaire.
- **Les images** : 700 caractères par QR code (environ 85 × 85 modules, lisibles sur un écran),
  « EV1:ID:rang:total:… », qui défilent toutes les 300 ms. Le récepteur les ramasse dans
  n'importe quel ordre et repart de zéro si un autre transfert commence. Mesures : 9 images pour
  100 parties, 39 pour 500, 114 pour 1 500 (cas défavorable).
- **La lecture** : le détecteur du navigateur s'il lit les QR codes, sinon jsQR, chargé à la
  demande. Tout l'écran est chargé à part (31 Ko), l'appli principale ne grossit pas.
- **Copier-coller** du code entier : un téléphone ne peut pas scanner son propre écran, or c'est
  le cas du passage du site à l'appli sur un même téléphone.
- **À l'arrivée**, rien n'est écrasé sans le dire : « Ajouter comme nouveau joueur » (tant qu'il
  reste une place sur les 4) ou « Remplacer la progression de … ».
- L'APK demande l'appareil photo seulement au moment du scan (`CAMERA`, matériel facultatif).
- Vérifié : bout en bout avec une caméra simulée qui filme les codes de l'autre appareil (5 s
  pour 12 images, avec des images ratées), copier-coller, autorisation et caméra dans l'APK.

## Sauvegarde Google Drive (décision d'Alex, 20-10-2026)

Le cahier des charges disait « Pas de backend, pas de compte ». Alex a choisi d'ajouter une
sauvegarde par compte Google pour passer du téléphone à la tablette ; version retenue, qui garde
l'esprit de la règle :

- **Facultative** et **sans serveur à nous** : l'appli parle directement à l'API du Drive avec le
  jeton du joueur ; rien n'est collecté, rien n'est visible par le développeur.
- **Un seul droit**, `drive.appdata` : le dossier caché de l'appli sur le Drive du joueur, jamais
  ses fichiers.
- **Fusion sans perte** (`src/store/merge.ts`) : parties et tests réunis par identifiant, meilleur
  niveau et meilleurs scores par jeu, compteurs au maximum ; commutative et idempotente (deux
  synchros de suite ne réécrivent rien). Les réglages restent ceux de l'appareil.
- **Quand** : à l'ouverture, 4 s après une partie, en quittant ; une seule à la fois.
- **Connexion** : Google Identity Services sur le site (chargé seulement si le joueur s'en sert),
  un module natif dans l'APK (`GoogleDrivePlugin.java`, services Google du téléphone), car Google
  interdit sa page de connexion dans une vue web.
- Masquée tant que l'identifiant OAuth n'est pas configuré (`VITE_GOOGLE_CLIENT_ID`, voir
  `docs/GOOGLE_DRIVE.md`). Vérifiée avec un faux Drive (tests et robot), pas encore avec Google.

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

## Six langues (v2.11)

- Le français fait foi et l'anglais est écrit dans le code (`tr('…', '…')`). L'espagnol,
  l'allemand, l'italien et le portugais du Brésil viennent des dictionnaires `src/i18n/<langue>.json`,
  greffés au build ; leurs jeux de langage ont leur propre contenu (`src/core/content/<langue>.ts`),
  écrit dans la langue et jamais traduit mot à mot. Méthode et glossaire : `TRADUCTION_LANGUES.md`.
- Une langue n'est proposée (`PUBLISHED_LANGS`) qu'avec 100 % de ses textes et son contenu de jeux :
  `lang.test.ts` le vérifie.
- `${NBSP}` est libre dans une traduction (typographie française) ; tout autre `${…}` doit être
  repris à l'identique. Un mot caché dans une variable ne se traduit pas : chaque morceau de
  texte passe par son propre `tr`.
- Deux sens pour un même mot français (« Orange » le fruit et la couleur) : la clé du dictionnaire
  est le texte source exact, guillemets compris ; le compagnon s'écrit donc entre backticks.
- Mots longs (allemand, portugais) : les onglets prennent au moins la largeur de leur nom, les
  mots trop longs passent à la ligne, avec césure en allemand.

## Durée des jeux rapides

Demande d'Alex du 21-10 : certaines parties de 60 s paraissaient longues. Coup d'œil et Pluie de
calculs passent à 45 s ; Lecture éclair, Contraires et Lucioles à 40 s. Les objectifs restent
écrits pour 60 s dans les tableaux (les niveaux restent distincts) et sont ramenés au prorata :
scores, étoiles et âge cérébral restent comparables. Monnaie, Rotation mentale et Horloges gardent
60 s : chaque question s'y réfléchit, et à 30 s leur objectif tomberait à deux réponses (un score
de pile ou face). Pluie reste à 45 s pour garder au moins 8 gouttes à résoudre sur les niveaux à pièges.

## Parties d'une minute au plus (v2.12)

Demande d'Alex (21-10-2026) : « que les jeux durent entre 30 secondes et 1 min max » (Monnaie à
60 s était « très long »). Trois choix d'Alex : le Mini-sudoku reste une exception à durée libre
(un casse-tête), les jeux chronométrés passent à 45 s, les jeux annoncés « ≈ 1 min » (Matrice,
Total cumulé, Anagrammes, La boutique, Calcul du diable, Du plus petit…, Balance) ne bougent pas.

- Monnaie, Rotation mentale, Horloges, Lettre manquante et Catégories : 45 s. Les objectifs restent
  écrits pour 60 s et sont ramenés au prorata, avec un plancher de 3 réponses pour Monnaie et de 4
  pour Rotation (en dessous, une seule erreur coûterait toutes les étoiles) : les quelques niveaux
  concernés deviennent un peu plus exigeants.
- Moins de manches : Filature 4 essais (6 avant), Itinéraire 5 trajets (8), Qui est qui ? 2 manches
  (3) et 8 questions par manche au plus.
- Mots à retenir : la liste à retenir ne change pas, mais le test n'en redemande que 8, avec autant
  de mots nouveaux (dont des mots barrés au prorata aux niveaux Maître et Légende).
- Paires : 12 paires et une minute au plus (20 s + 3,5 s par paire, ou le temps fixé par le
  niveau). Les grands jeux de 14 à 20 paires disparaissent ; la difficulté des niveaux 21 à 50 vient
  des cartes vite recachées (jamais sous 0,4 s), des cartes baladeuses et du temps (de 58 à 36 s
  pour 12 paires). Un test vérifie que la difficulté ne recule jamais d'un niveau au suivant.
- Lecture éclair affichait « 60 s » alors que la partie dure 40 s depuis la 2.11 : corrigé.
- Les empreintes des niveaux 1 à 20 de ces jeux sont relevées à nouveau.

## Huit nouveaux jeux (v2.13)

Choix d'Alex (21-10-2026) parmi mes propositions de mécaniques très jouées dans le genre (Peak,
Elevate, Lumosity, NeuroNation), toutes peu coûteuses : il a tout coché. Noms, règles et visuels
restent originaux ; chaque partie tient en une minute au plus.

- **Suites logiques** (Logique, 45 s, pavé numérique) : le nombre qui manque dans une suite
  d'entiers de 1 à 999. Débutant : le nombre suivant d'une suite qui monte, puis qui descend.
  Confirmé : le nombre manquant peut être au milieu, des suites × 2 et × 3. Expert : deux suites
  mêlées, un nombre sur deux. Maître : des écarts qui grandissent, ou qui montent et descendent tour
  à tour. Légende : des carrés (parfois décalés) et des suites où chaque nombre est la somme des
  deux d'avant. Le premier nombre reste toujours visible, et chaque règle montre assez de nombres
  pour être retrouvée (6 sur 7 pour deux suites mêlées).
- **Le compte est bon** (Calcul, 45 s) : atteindre une cible en combinant les plaques deux à
  deux (plaque, signe, plaque ; le résultat devient une plaque, et reste choisi pour enchaîner).
  Que des entiers positifs : une soustraction qui donnerait zéro ou moins, une division qui ne
  tombe pas juste sont refusées, sans pénalité. On peut annuler un pas ou passer le tirage. Chaque
  tirage est construit à partir d'une vraie solution, et la cible ne s'atteint jamais en moins
  d'opérations que prévu (recherche exhaustive). Débutant : 3 plaques, + ou −. Confirmé : 4 plaques,
  2 opérations, ×. Expert : 3 opérations et ÷. Maître : une grande plaque (25 à 100) parmi 5.
  Légende : chaque signe une seule fois par tirage. Objectifs de 8 à 3 comptes.
- Textes des nouveaux jeux : français et anglais d'abord (Alex : « on s'occupera des traductions
  plus tard, français en prio ») ; leurs noms sont traduits, le reste s'affiche en anglais dans les
  quatre autres langues. `PENDING_FILES` (`lang.test.ts`) liste ces fichiers, à vider ensuite.
- **Écho** (Mémoire, une minute au plus) : façon Simon, des touches de couleur (chacune sa note et
  sa forme, pour les daltoniens) ; la même suite s'allonge à chaque tour, ce qui le distingue de
  Matrice (une nouvelle séquence de cases par manche). Deux erreurs et c'est fini ; après une
  erreur le tour se rejoue en entier. Confirmé : 6 touches ; Expert : les touches changent de place ;
  Maître : seule la nouvelle note est jouée ; Légende : deux notes de plus par tour. 100 pts à
  8 notes (9 aux deux derniers paliers) : un test vérifie qu'un joueur rapide y arrive en 55 s.
- **Miroir** (Vitesse, 45 s) : compléter le reflet d'une figure de l'autre côté du trait ; la
  figure se valide d'elle-même au bon nombre de cases (une case touchée se retire d'un appui).
  Débutant : 4 × 4, trait vertical ; Confirmé : 6 × 6 ; Expert : trait parfois horizontal ; Maître :
  la diagonale fait miroir (ses cases, hachurées, ne comptent pas) ; Légende : le demi-tour autour
  du centre.
- **Code secret** (Logique, une minute au plus) : un petit Mastermind aux couleurs et formes
  d'Écho. Trois codes par partie (deux aux deux derniers paliers) ; chaque code vaut 100 pts s'il
  est trouvé en autant d'essais qu'un bon joueur (`par`), moins ensuite, 0 s'il ne l'est pas ou si
  la minute s'achève ; le score est la moyenne. Débutant : 3 pions, un indice par pion (✓ bien
  placé, • ailleurs) ; Confirmé : 4 pions ; Expert : couleurs répétées ; Maître : indices comptés
  seulement (● bien placés, ○ mal placés) ; Légende : comptés et répétés.
- **Combien de cubes ?** (Vitesse, 45 s, pavé numérique) : des piles de cubes en relief (le dessin
  de Rotation mentale, `ui/games/iso.ts`) sur un sol quadrillé. Un cube repose toujours sur le sol
  ou sur un autre : une pile se compte jusqu'en bas, et le dessus de chaque pile reste visible
  (`visibleFaces` dans `cubes.ts`), sans quoi sa hauteur ne se devinerait pas. Confirmé : sol de
  3 × 3 ; Expert : combien en manque-t-il pour remplir le pavé ; Maître : deux tas, combien de plus
  à gauche ; Légende : combien de cubes sont tout à fait cachés.
- **Mots mêlés** (Langage, 45 s) : quelques mots d'une même famille du lexique de la langue du
  joueur, cachés dans une grille (capitales sans accents ni ligatures, ß → SS) ; on touche la
  première lettre puis la dernière, dans un sens ou dans l'autre. Pas de mot dans un autre, chaque
  mot ne se lit qu'une fois (le remplissage, pris dans les lettres de la famille, est vérifié).
  Confirmé : diagonales ; Expert : mots à l'envers ; Maître : liste cachée (la famille et le nombre
  de mots seulement) ; Légende : 8 × 8, les huit directions.
- **Aiguillages** (Attention, ≈ 45 s) : des trains de couleur descendent un réseau en arbre ; on
  touche les aiguillages pour envoyer chacun à la gare de sa couleur, un train suivant l'aiguillage
  tel qu'il est quand il l'atteint. Un nombre fixe de trains par partie (de 28 à 48 s, vérifié par
  un test). Confirmé : 4 gares ; Expert : plusieurs trains à la fois ; Maître : 8 gares ; Légende :
  des trains express (cerclés de pointillés) presque deux fois plus rapides. Huit couleurs et huit
  formes (deux de plus qu'Écho, `echo-shapes.tsx`), pour les daltoniens.
- Avec ces huit jeux : 39 jeux, 1 950 niveaux (README et fiche Play Store mis à jour).

## Huit autres petits jeux (v2.14)

Nouveau choix d'Alex (21-10-2026), tout coché à nouveau : Symboles, Changement de règle, Le plus
grand ?, Qui manque ?, Pendu express, Taquin express, Labyrinthe éclair, Tours de Hanoï. Même
méthode : un jeu à la fois, un APK à chaque jeu, textes en français et anglais d'abord.

- **Symboles** (Vitesse, 45 s) : le codage des tests de vitesse classiques ; une table forme →
  chiffre, on touche le chiffre de chaque forme, une erreur retire un point (au hasard : 0).
  Confirmé : 6 symboles ; Expert : la table change toutes les 12 à 8 réponses (au moins la moitié
  des chiffres bougent) ; Maître : la table se cache après 8 à 5 s, un coup d'œil coûte 2 s ;
  Légende : 8 symboles, touches dans le désordre, puis table cachée.
