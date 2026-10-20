# Publier Esprit Vif sur le Play Store

Tout ce qu'il faut pour remplir la Play Console : textes de la fiche, réponses aux
questionnaires, visuels. Les captures et l'image de présentation sont dans `store/images/`.

## À faire par le propriétaire du compte

1. Créer un compte développeur Google Play (frais unique de 25 $) sur
   <https://play.google.com/console>, avec vérification d'identité.
2. **Créer une application** : nom « Esprit Vif », langue par défaut Français, type « Jeu »,
   gratuite (avec un achat intégré : Premium à vie, voir `docs/GOOGLE_PLAY_BILLING.md`).
   Accepter les règles du programme.
3. Remplir les sections ci-dessous (copier-coller).
4. Téléverser le paquet `esprit-vif.aab` (je le fabrique : même clé que l'APK actuel) dans
   **Tests → Tests internes**, puis **Production**.
5. Activer la **signature d'application par Google Play** (proposée au premier envoi) ; ensuite,
   ajouter l'empreinte SHA-1 de la clé de signature Google Play dans le projet Google Cloud
   (voir `docs/GOOGLE_DRIVE.md`, étape 4) pour que la sauvegarde Drive marche dans l'appli
   installée depuis le Play Store.

## Fiche principale

| Champ | Français | English |
| --- | --- | --- |
| Nom (30 car. max) | Esprit Vif – Jeux cérébraux | Esprit Vif – Brain Games |
| Description courte (80 max) | 28 jeux, 1 400 niveaux, un défi chaque jour. Sans pub ni compte. | 28 games, 1,400 levels, a daily challenge. No ads, no account. |

### Description complète (français)

> Quelques minutes par jour pour garder l’esprit vif.
>
> **28 mini-jeux, 1 400 niveaux** répartis en six domaines : calcul, mémoire, attention,
> vitesse, langage et logique. Chaque jeu monte en difficulté sur 50 niveaux et 5 paliers,
> de Débutant à Légende : de quoi progresser pendant des mois.
>
> **Le test du jour** : trois jeux, cinq minutes, et ton âge cérébral (un indicateur ludique,
> pas une mesure médicale) pour suivre tes progrès dans le temps.
>
> **Des façons de jouer pour tous les jours**
> • Séance du jour sur mesure, qui cible tes domaines les plus fragiles
> • Marathon : tous les jeux d’un domaine à la suite
> • Duel à deux sur le même téléphone, mode fête jusqu’à quatre joueurs
> • Défis entre amies : envoie un lien, comparez vos scores par catégorie
>
> **Pensée pour toi**
> • Réponses au doigt dans les jeux de nombres
> • Étoiles, médailles, trophées, série qui pardonne un jour de repos
> • Un compagnon à choisir, en thème clair ou sombre
> • Accessibilité : grand texte, contraste renforcé, temps généreux, mode gaucher
> • Widget d’écran d’accueil et rappel quotidien
> • Profils pour toute la famille, en français ou en anglais
>
> **Chaque jour, une raison de revenir**
> • Trois objectifs du jour, des étincelles à gagner et 31 chapeaux pour habiller Vif
> • Des thèmes de saison (neige, pétales, feuilles…) et des thèmes à débloquer
> • Tes progrès en clair : ta semaine, ta précision, tes records
>
> **Respect total** : aucune publicité, aucun pistage, aucun compte obligatoire. Tout reste
> sur ton appareil ; si tu le souhaites, sauvegarde facultative dans ton propre Google Drive
> pour retrouver ta progression sur ta tablette.
>
> **Gratuit, pour de vrai** : tous les jeux et tous les niveaux sont gratuits. Esprit Vif
> Premium, facultatif et payé une seule fois (pas d’abonnement), ajoute trois thèmes exclusifs
> et l’historique détaillé de chaque jeu.

### Full description (English)

> A few minutes a day to keep your mind sharp.
>
> **28 mini-games, 1,400 levels** across six areas: math, memory, attention, speed, language
> and logic. Every game gets harder over 50 levels and 5 tiers, from Beginner to Legend:
> enough to keep improving for months.
>
> **The daily test**: three games, five minutes, and your brain age (a playful indicator, not
> a medical measure) to follow your progress over time.
>
> **Ways to play every day**
> • A daily session made for you, aimed at your weaker areas
> • Marathon: every game of one area in a row
> • Two-player duel on one phone, party mode for up to four players
> • Friend challenges: send a link and compare scores by category
>
> **Made for you**
> • Write your answers with your finger in number games
> • Stars, medals, trophies, and a streak that forgives a rest day
> • Pick a companion, light or dark theme
> • Accessibility: larger text, high contrast, extra time, left-handed mode
> • Home-screen widget and daily reminder
> • Profiles for the whole family, in English or French
>
> **A reason to come back every day**
> • Three daily goals, sparks to earn and 31 hats to dress up Vif
> • Seasonal themes (snow, petals, leaves…) and themes to unlock
> • Your progress made clear: your week, your accuracy, your best scores
>
> **Total respect**: no ads, no tracking, no mandatory account. Everything stays on your
> device; if you like, an optional backup to your own Google Drive lets you continue on your
> tablet.
>
> **Truly free**: every game and every level is free. Esprit Vif Premium, optional and paid
> once (no subscription), adds three exclusive themes and a detailed history for every game.

## Catégorie et coordonnées

- Application ou jeu : **Jeu**, catégorie **Réflexion** (Puzzle).
- Tags : Entraînement cérébral, Mémoire, Calcul mental, Logique.
- Site web : <https://alexxxx-droid.github.io/esprit-vif/>
- Politique de confidentialité : <https://alexxxx-droid.github.io/esprit-vif/confidentialite.html>
- Adresse e-mail de contact : celle du compte développeur (obligatoire, affichée sur la fiche).

## Contenu de l'application (questionnaires)

| Section | Réponse |
| --- | --- |
| Accès à l'application | Toutes les fonctionnalités sont accessibles sans identifiants. |
| Annonces | Non, l'application ne contient pas d'annonces. |
| Classification du contenu | Questionnaire IARC, catégorie « Jeu » : aucune violence, peur, sexualité, langage grossier, jeu d'argent, drogue ; interaction entre utilisateurs : **non** (les défis passent par les applis de partage du téléphone) ; partage de position : non ; achats numériques : **oui** (Premium à vie, achat intégré). Résultat attendu : PEGI 3 / Tout public. |
| Public cible | 13 ans et plus (l'appli convient à tous, mais viser les moins de 13 ans impose le programme Familles : à faire plus tard si souhaité). |
| Application d'actualités | Non. |
| Applications de santé | Non : l'âge cérébral est présenté comme un indicateur ludique, pas une mesure médicale. |
| Gouvernement, finances, VPN | Non. |

### Sécurité des données (Data safety)

- **Collecte de données : Non.** Aucune donnée n'est collectée ni transmise à un serveur du
  développeur. (La sauvegarde Drive facultative envoie les données du joueur vers son propre
  compte Google, à sa demande : ce n'est pas une collecte par le développeur au sens de Google
  Play, qui exclut les transferts initiés par l'utilisateur vers un service de son choix.)
- **Partage de données : Non.**
- Chiffrement en transit : sans objet (pas de collecte) ; les échanges avec Google Drive sont en
  HTTPS.
- Suppression des données : l'utilisateur efface tout dans Réglages → Mes données → Tout
  effacer.
- **Achats** : le paiement de Premium est traité par Google Play ; l'appli ne transmet rien au
  développeur (elle demande seulement à Google Play si le compte possède Premium). À confirmer
  en remplissant le formulaire : Google précise quelles données de facturation déclarer.
- **Journal d'utilisation** : gardé sur l'appareil, jamais envoyé (pas une collecte).

### Autorisations déclarées dans l'APK

| Autorisation | Pourquoi |
| --- | --- |
| `INTERNET` | Défis par lien, sauvegarde Google Drive facultative. |
| `CAMERA` (facultative) | Lire les QR codes du transfert, à la demande du joueur. |
| `POST_NOTIFICATIONS` | Rappel quotidien, si le joueur l'active. |
| `com.android.vending.BILLING` | Achat de Premium par Google Play (ajoutée par la bibliothèque de facturation). |

## Visuels (dans `store/images/`)

| Visuel | Format demandé |
| --- | --- |
| Icône | 512 × 512 PNG (`public/pwa-512x512.png`) |
| Image de présentation | 1024 × 500 PNG ou JPEG |
| Captures téléphone | 2 à 8, 1080 × 1920 (9:16) |
| Captures tablette 7" et 10" | 2 à 8 chacune, recommandées |
