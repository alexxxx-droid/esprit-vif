# Audit produit et technique (20 octobre 2026, v2.8.2)

Point de départ de la mission « produit ludique, fidélisant et monétisable ». Ce qui suit a été
vérifié dans le code et en lançant l'appli, pas déduit de la description.

## Pile et état du build

- **React 19 + Vite 8 + TypeScript 6**, PWA (Workbox) et APK **Capacitor 8** (minSdk 24, target 36).
  Ce n'est pas une appli Android native : tout l'écran est du web, les modules natifs sont en Java
  (`android/app/src/main/java/…` : widget, Google Drive).
- Stockage **IndexedDB** (`idb`), une base par joueur (profils famille), derrière l'interface
  `Storage` ; version mémoire pour les tests et en secours.
- Aucun backend, aucun SDK tiers, aucune donnée envoyée (sauf Google Drive, facultatif et caché tant
  que l'identifiant OAuth n'existe pas).
- **État initial** : lint propre, types propres, **432 tests passent** (2 ignorés), build OK.
  Aucune erreur préexistante.

## Ce qui existe et fonctionne

| Mission | Existant | Verdict |
|---|---|---|
| 4 onglets | Accueil, Entraînement, Progrès, Réglages (`TabBar`), routage par `#/…` | ✅ cohérent |
| Catalogue | 28 jeux, 6 domaines, 50 niveaux en 5 paliers, étoiles 60/80/95, médailles | ✅ riche |
| Déblocages | 1re étoile = niveau suivant ; tous les **jeux** sont ouverts d'emblée | ✅ rien à verrouiller |
| Défi quotidien | **Test du jour** : 3 jeux, graine datée, un seul officiel par jour, âge cérébral | ⚠ 2 jeux sur 3 identiques chaque jour |
| XP / niveau joueur | XP par partie + bonus, rangs à courbe douce, 9 titres | ✅ recalculé de l'historique |
| Objectifs | **Défi de la semaine** (1 par semaine) | ⚠ rien au quotidien |
| Badges | **46 trophées**, dont 4 de saison | ✅ |
| Série | 1 jour de repos pardonné par semaine, jamais de perte | ✅ déjà « saine » |
| Récompenses | Confettis, rang, médailles | ⚠ rien à **gagner et choisir** (chapeaux : demandé le 20-10) |
| Progrès | Résumé, trophées, records, courbe d'âge cérébral, carte du cerveau, constats | ⚠ ni temps de jeu, ni activité récente, ni bilan de la semaine, ni historique par jeu |
| Rappels | Notification locale opt-in dans l'APK (heure choisie, 14 jours max), bandeau dans la PWA | ✅ conforme |
| Monétisation | Aucune | ➜ Premium à vie (décision du 20-10) |
| Mesures | Aucune | ➜ journal local + Play Console (décision du 20-10) |

## Modèle de données et sauvegarde

- `plays` (une ligne par partie, gardées toutes), `tests`, et un magasin clé-valeur : `settings`,
  `games` (niveau conseillé + meilleur score par niveau), `extras` (séances, marathons, duels, défis).
- **Tout le reste se déduit de l'historique** (`src/core/progression.ts`) : XP, rang, étoiles,
  médailles, trophées, défi de la semaine. Conséquence heureuse : une récompense ne peut pas être
  versée deux fois, elle est recalculée. Les nouvelles récompenses suivront la même règle.
- Lecture tolérante (`normalize`) : un champ manquant prend sa valeur par défaut, une ligne illisible
  est écartée. Pas de **numéro de schéma** dans la base (seulement `format: 1` dans les exports).
- Volume : ~300 octets par partie, soit environ 1 Mo pour 3 000 parties (un an de jeu assidu).
  Garder tout l'historique est nécessaire, puisque tout en dépend ; pas de purge.

## Risques relevés

1. **Écriture en deux temps** : `recordPlay` écrit la partie, puis les meilleurs scores ; le test du
   jour ajoute ensuite son résultat. Une appli tuée entre deux écritures laisse une partie sans son
   meilleur score, ou un test sans son résultat. Rare, mais réel → réconcilier au chargement.
2. **Pas de version de schéma** : les futures évolutions (récompenses, achats) ont besoin d'une
   migration versionnée et testée sur d'anciennes sauvegardes.
3. **Test du jour répétitif** : Calcul éclair et Couleurs piégées tous les jours.
4. **Accueil long** (≈ 1 700 px sur 360 px de large) : un test fait, la prochaine action se perd ;
   pas de « reprendre le dernier jeu », pas d'accès direct aux thèmes.
5. **Durée des parties non enregistrée** : le temps de jeu cumulé est impossible à calculer pour
   les parties passées ; il le sera à partir de la v2.9 (sans rien inventer pour avant).
6. **Statistiques hétérogènes** : la précision n'existe que pour les jeux qui comptent bonnes
   réponses et erreurs (`correct`/`errors`), le temps de réaction pour Flèches et Réflexe.
7. **Promesse publique** : README et fiche Play disent « sans publicité, sans pistage » ; l'achat
   Premium doit garder cette promesse (aucune pub, aucune collecte) et la fiche Play devra déclarer
   les achats intégrés.
8. **Dépôt public** : un droit Premium vérifié sur l'appareil seul peut être contourné par qui
   recompile l'appli. C'est assumé (sans serveur, aucune protection n'est complète) et documenté.

## Interface (captures 360 × 740, thème sombre)

- Identité solide : surfaces différenciées, couleur par domaine, cartes arrondies, Vif animé.
- Marges système gérées (`env(safe-area-inset-*)`, `viewport-fit=cover`), barre d'onglets
  flottante sans recouvrement : le bas de chaque page laisse la place de la barre.
- Accessibilité déjà présente : taille du texte, contraste renforcé, temps généreux, gaucher,
  réduction des animations (suivie par les confettis et Vif).
- Défaut vu : le prénom par défaut (« Esprit Vif ») est tronqué dans l'en-tête quand la série
  s'affiche.

## Plan

Voir [`ROADMAP.md`](ROADMAP.md) : fondations → test du jour, objectifs, récompenses, accueil →
Progrès → Premium → mesures et lancement.
