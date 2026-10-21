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
4. Téléverser le paquet `esprit-vif.aab` (je le fabrique : même clé que l'APK actuel ; dernier en
   date : `android/app/build/outputs/bundle/release/app-release.aab`) dans **Tests → Tests internes**,
   puis **Production**.
5. Activer la **signature d'application par Google Play** (proposée au premier envoi) ; ensuite,
   ajouter l'empreinte SHA-1 de la clé de signature Google Play dans le projet Google Cloud
   (voir `docs/GOOGLE_DRIVE.md`, étape 4) pour que la sauvegarde Drive marche dans l'appli
   installée depuis le Play Store.

## Fiche principale

| Champ | Français | English |
| --- | --- | --- |
| Nom (30 car. max) | Esprit Vif – Jeux cérébraux | Esprit Vif – Brain Games |
| Description courte (80 max) | 47 jeux, 2 350 niveaux, un défi chaque jour. Sans pub ni compte. | 47 games, 2,350 levels, a daily challenge. No ads, no account. |

### Description complète (français)

> Quelques minutes par jour pour garder l’esprit vif.
>
> **47 mini-jeux, 2 350 niveaux** répartis en six domaines : calcul, mémoire, attention,
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
> • Profils pour toute la famille, en six langues
>
> **Chaque jour, une raison de revenir**
> • Trois objectifs du jour, des étincelles à gagner et 36 chapeaux pour habiller Vif
> • Après le niveau 50 : la maîtrise, le Défi Légende du jour et des saisons de défis en histoires
> • Des thèmes de saison (neige, pétales, feuilles…) et des thèmes à débloquer
> • Tes progrès en clair : ta semaine, ta précision, tes records
>
> **Respect total** : aucune publicité, aucun pistage, aucun compte obligatoire. Tout reste
> sur ton appareil ; si tu le souhaites, sauvegarde facultative dans ton propre Google Drive
> pour retrouver ta progression sur ta tablette.
>
> **Gratuit, pour de vrai** : tous les jeux et tous les niveaux sont gratuits. Esprit Vif
> Premium, facultatif et payé une seule fois (pas d’abonnement), ajoute trois thèmes exclusifs,
> huit chapeaux qui scintillent, trois compagnons (Kiwi, Ananas, Myrtille), l’historique détaillé
> de chaque jeu et un bilan illustré chaque mois. Tout s’essaie avant d’acheter.

### Full description (English)

> A few minutes a day to keep your mind sharp.
>
> **47 mini-games, 2,350 levels** across six areas: math, memory, attention, speed, language
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
> • Profiles for the whole family, in six languages
>
> **A reason to come back every day**
> • Three daily goals, sparks to earn and 36 hats to dress up Vif
> • Beyond level 50: mastery, the daily Legend challenge and story-driven challenge seasons
> • Seasonal themes (snow, petals, leaves…) and themes to unlock
> • Your progress made clear: your week, your accuracy, your best scores
>
> **Total respect**: no ads, no tracking, no mandatory account. Everything stays on your
> device; if you like, an optional backup to your own Google Drive lets you continue on your
> tablet.
>
> **Truly free**: every game and every level is free. Esprit Vif Premium, optional and paid
> once (no subscription), adds three exclusive themes, eight sparkling hats, three companions
> (Kiwi, Pineapple, Blueberry), a detailed history for every game and an illustrated monthly
> recap. Try everything before you buy.

## Fiches traduites (espagnol, allemand, italien, portugais du Brésil)

Dans la Play Console : **Présence sur le Store → Fiche principale → Gérer les traductions →
Ajouter vos propres traductions**, cocher es-ES, de-DE, it-IT et pt-BR, puis coller ces textes.

| Langue | Nom (30 car. max) | Description courte (80 max) |
| --- | --- | --- |
| es-ES | Esprit Vif – Juegos mentales | 47 juegos, 2350 niveles y un reto cada día. Sin anuncios ni cuenta. |
| de-DE | Esprit Vif – Gehirnjogging | 47 Spiele, 2350 Level, jeden Tag eine Challenge. Ohne Werbung, ohne Konto. |
| it-IT | Esprit Vif – Allena la mente | 47 giochi, 2350 livelli, una sfida ogni giorno. Senza pubblicità né account. |
| pt-BR | Esprit Vif – Jogos cerebrais | 47 jogos, 2.350 níveis e um desafio por dia. Sem anúncios e sem conta. |

### Descripción completa (español)

> Unos minutos al día para mantener la mente despierta.
>
> **47 minijuegos, 2350 niveles** repartidos en seis áreas: cálculo, memoria, atención,
> velocidad, lenguaje y lógica. Cada juego sube de dificultad a lo largo de 50 niveles y
> 5 etapas, de Principiante a Leyenda: para seguir progresando durante meses.
>
> **El test del día**: tres juegos, cinco minutos, y tu edad cerebral (un indicador lúdico,
> no una medida médica) para seguir tus progresos con el tiempo.
>
> **Formas de jugar para cada día**
> • Una sesión del día a tu medida, centrada en tus áreas más flojas
> • Maratón: todos los juegos de un área seguidos
> • Duelo a dos en el mismo móvil, modo fiesta hasta cuatro jugadores
> • Retos entre amigas: envía un enlace y comparad vuestras puntuaciones por categoría
>
> **Pensada para ti**
> • Respuestas escritas con el dedo en los juegos de números
> • Estrellas, medallas, trofeos y una racha que perdona un día de descanso
> • Un compañero a elegir, con tema claro u oscuro
> • Accesibilidad: texto grande, contraste alto, tiempo extra, modo zurdo
> • Widget en la pantalla de inicio y recordatorio diario
> • Perfiles para toda la familia, en seis idiomas
>
> **Cada día, una razón para volver**
> • Tres objetivos del día, chispas que ganar y 36 sombreros para vestir a Vif
> • Después del nivel 50: la maestría, el Reto Leyenda del día y temporadas de retos contadas
> como historias
> • Temas de temporada (nieve, pétalos, hojas…) y temas por desbloquear
> • Tus progresos, claros: tu semana, tu precisión, tus récords
>
> **Respeto total**: sin publicidad, sin rastreo, sin cuenta obligatoria. Todo se queda en tu
> dispositivo; si quieres, una copia opcional en tu propio Google Drive te permite seguir en
> tu tableta.
>
> **Gratis de verdad**: todos los juegos y todos los niveles son gratis. Esprit Vif Premium,
> opcional y de pago único (sin suscripción), añade tres temas exclusivos, ocho sombreros que
> brillan, tres compañeros (Kiwi, Piña, Arándano), el historial detallado de cada juego y un
> resumen ilustrado cada mes. Pruébalo todo antes de comprar.

### Vollständige Beschreibung (Deutsch)

> Ein paar Minuten am Tag, damit dein Kopf fit bleibt.
>
> **47 Minispiele, 2350 Level** in sechs Bereichen: Rechnen, Gedächtnis, Aufmerksamkeit,
> Tempo, Sprache und Logik. Jedes Spiel wird über 50 Level und 5 Stufen schwieriger, von
> Anfänger bis Legende: genug, um monatelang besser zu werden.
>
> **Der Tagestest**: drei Spiele, fünf Minuten, und dein Gehirnalter (ein spielerischer
> Richtwert, keine medizinische Messung), um deine Fortschritte im Blick zu behalten.
>
> **Spielarten für jeden Tag**
> • Ein Tagestraining nach Maß, das deine schwächeren Bereiche übt
> • Marathon: alle Spiele eines Bereichs am Stück
> • Duell zu zweit auf einem Handy, Partymodus für bis zu vier Spieler
> • Freundinnen-Challenge: Link verschicken und Ergebnisse nach Kategorie vergleichen
>
> **Für dich gemacht**
> • Antworten mit dem Finger schreiben in den Zahlenspielen
> • Sterne, Medaillen, Trophäen und eine Serie, die einen Ruhetag verzeiht
> • Ein Begleiter nach Wahl, helles oder dunkles Design
> • Barrierefreiheit: große Schrift, hoher Kontrast, mehr Zeit, Linkshändermodus
> • Widget für den Startbildschirm und tägliche Erinnerung
> • Profile für die ganze Familie, in sechs Sprachen
>
> **Jeden Tag ein Grund wiederzukommen**
> • Drei Tagesziele, Funken zum Sammeln und 36 Hüte, um Vif einzukleiden
> • Nach Level 50: die Meisterstufen, die tägliche Legenden-Challenge und Challenge-Saisons
> als Geschichten
> • Saisonale Designs (Schnee, Blüten, Blätter …) und Designs zum Freischalten
> • Deine Fortschritte auf einen Blick: deine Woche, deine Genauigkeit, deine Rekorde
>
> **Volle Rücksicht**: keine Werbung, kein Tracking, kein Pflichtkonto. Alles bleibt auf
> deinem Gerät; wenn du möchtest, kannst du mit einer freiwilligen Sicherung in deinem eigenen
> Google Drive auf deinem Tablet weiterspielen.
>
> **Wirklich kostenlos**: Alle Spiele und alle Level sind kostenlos. Esprit Vif Premium,
> freiwillig und nur einmal bezahlt (kein Abo), bringt drei exklusive Designs, acht glitzernde
> Hüte, drei Begleiter (Kiwi, Ananas, Heidelbeere), den genauen Verlauf jedes Spiels und jeden
> Monat einen illustrierten Rückblick. Alles lässt sich vor dem Kauf ausprobieren.

### Descrizione completa (italiano)

> Pochi minuti al giorno per mantenere la mente sveglia.
>
> **47 minigiochi, 2350 livelli** divisi in sei aree: calcolo, memoria, attenzione, velocità,
> linguaggio e logica. Ogni gioco diventa più difficile in 50 livelli e 5 fasce, da
> Principiante a Leggenda: c’è da migliorare per mesi.
>
> **Il test del giorno**: tre giochi, cinque minuti, e la tua età cerebrale (un indicatore
> ludico, non una misura medica) per seguire i tuoi progressi nel tempo.
>
> **Modi di giocare per ogni giorno**
> • Una sessione del giorno su misura, che punta sulle tue aree più deboli
> • Maratona: tutti i giochi di un’area di fila
> • Duello a due sullo stesso telefono, modalità festa fino a quattro giocatori
> • Sfide tra amiche: invia un link e confrontate i punteggi per categoria
>
> **Pensata per te**
> • Risposte scritte col dito nei giochi di numeri
> • Stelle, medaglie, trofei e una serie che perdona un giorno di riposo
> • Un compagno a scelta, con tema chiaro o scuro
> • Accessibilità: testo grande, contrasto elevato, tempo extra, modalità mancini
> • Widget per la schermata Home e promemoria quotidiano
> • Profili per tutta la famiglia, in sei lingue
>
> **Ogni giorno, un motivo per tornare**
> • Tre obiettivi del giorno, scintille da guadagnare e 36 cappelli per vestire Vif
> • Dopo il livello 50: la maestria, la Sfida Leggenda del giorno e stagioni di sfide raccontate
> come storie
> • Temi di stagione (neve, petali, foglie…) e temi da sbloccare
> • I tuoi progressi in chiaro: la tua settimana, la tua precisione, i tuoi record
>
> **Rispetto totale**: nessuna pubblicità, nessun tracciamento, nessun account obbligatorio.
> Tutto resta sul tuo dispositivo; se vuoi, un backup facoltativo nel tuo Google Drive ti
> permette di continuare sul tablet.
>
> **Gratis davvero**: tutti i giochi e tutti i livelli sono gratuiti. Esprit Vif Premium,
> facoltativo e pagato una volta sola (nessun abbonamento), aggiunge tre temi esclusivi, otto
> cappelli scintillanti, tre compagni (Kiwi, Ananas, Mirtillo), la cronologia dettagliata di
> ogni gioco e un resoconto illustrato ogni mese. Puoi provare tutto prima di acquistare.

### Descrição completa (português do Brasil)

> Alguns minutos por dia para manter a mente afiada.
>
> **47 minijogos, 2.350 níveis** em seis áreas: cálculo, memória, atenção, velocidade,
> linguagem e lógica. Cada jogo fica mais difícil ao longo de 50 níveis e 5 patamares, de
> Iniciante a Lenda: dá para evoluir por meses.
>
> **O teste do dia**: três jogos, cinco minutos, e a sua idade cerebral (um indicador lúdico,
> não uma medida médica) para acompanhar seu progresso ao longo do tempo.
>
> **Jeitos de jogar todo dia**
> • Uma sessão do dia sob medida, focada nas suas áreas mais fracas
> • Maratona: todos os jogos de uma área em sequência
> • Duelo a dois no mesmo celular, modo festa para até quatro jogadores
> • Desafios entre amigas: envie um link e comparem as pontuações por categoria
>
> **Feito para você**
> • Respostas escritas com o dedo nos jogos de números
> • Estrelas, medalhas, troféus e uma sequência que perdoa um dia de descanso
> • Um companheiro à sua escolha, com tema claro ou escuro
> • Acessibilidade: texto grande, contraste reforçado, tempo extra, modo canhoto
> • Widget na tela inicial e lembrete diário
> • Perfis para toda a família, em seis idiomas
>
> **Todo dia, um motivo para voltar**
> • Três objetivos do dia, faíscas para ganhar e 36 chapéus para vestir o Vif
> • Depois do nível 50: a maestria, o Desafio Lenda do dia e temporadas de desafios contadas
> como histórias
> • Temas de estação (neve, pétalas, folhas…) e temas para desbloquear
> • Seu progresso bem claro: sua semana, sua precisão, seus recordes
>
> **Respeito total**: sem anúncios, sem rastreamento, sem conta obrigatória. Tudo fica no seu
> aparelho; se quiser, um backup opcional no seu próprio Google Drive permite continuar no
> tablet.
>
> **Grátis de verdade**: todos os jogos e todos os níveis são grátis. O Esprit Vif Premium,
> opcional e pago uma única vez (sem assinatura), traz três temas exclusivos, oito chapéus que
> brilham, três companheiros (Kiwi, Abacaxi, Mirtilo), o histórico detalhado de cada jogo e um
> resumo ilustrado todo mês. Experimente tudo antes de comprar.

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
| Captures téléphone | 2 à 8, 1080 × 1920 (9:16) : `phone-<langue>-1…7.png` en fr, en, es, de, it et pt (v2.12) — accueil, bilan du test, une partie (Rotation mentale), vestiaire, Progrès, Entraînement, objectifs du jour |
| Captures tablette 7" et 10" | 2 à 8 chacune, recommandées |
