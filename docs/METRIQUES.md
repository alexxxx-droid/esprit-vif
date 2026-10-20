# Indicateurs après publication

Décision d'Alex (20-10-2026) : **aucun SDK d'analytics, aucune collecte**. Les chiffres viennent de
deux sources, et d'aucune autre :

1. **La Play Console** (gratuite, sans rien ajouter à l'appli) : installations, désinstallations,
   rétention des nouveaux installateurs, notes et avis, plantages, commandes et revenus.
2. **Le journal local** de chaque appareil (`src/analytics/journal.ts`) : jamais envoyé ; utile pour
   vérifier un parcours sur son propre téléphone ou celui d'un testeur volontaire qui le copie
   (Réglages → Mes données → Copier le journal).

Rien n'est inventé : un indicateur qu'aucune de ces sources ne donne est marqué « non mesurable ».

## Définitions

| Indicateur | Définition | Cohorte, période, dénominateur | Source |
| --- | --- | --- | --- |
| Acquisition | nouveaux installateurs | par jour ou semaine | Play Console → Statistiques |
| Rétention J1 / J7 / J30 | part des nouveaux installateurs d'un jour donné qui ont encore l'appli installée N jours après | cohorte = jour d'installation ; dénominateur = installateurs de ce jour | Play Console → Acquisition des utilisateurs → *Installateurs conservés* (J1, J7, J15, J30) — mesure l'appli **installée**, pas **ouverte** |
| Utilisateurs actifs | appareils actifs sur 30 jours | Google Play les compte s'ils ont ouvert l'appli | Play Console → Statistiques (métriques d'utilisateurs actifs, si disponibles pour le compte) |
| Activation | part des installateurs qui terminent une première partie | — | **non mesurable à distance** ; localement : événement `first_game_done` |
| Sessions par utilisateur actif | nombre de parties ou d'ouvertures par utilisateur | — | **non mesurable à distance** ; localement : `game_started` par jour |
| Défis quotidiens terminés | tests du jour terminés | — | **non mesurable à distance** ; localement : `daily_test_done` |
| Taux d'achèvement des parties | parties terminées ÷ parties commencées | par appareil | localement : `game_done` ÷ `game_started` |
| Conversion Premium | acheteurs ÷ utilisateurs actifs de la même période | ne jamais diviser par les installations ni par les sessions | acheteurs : Play Console → Commandes ; dénominateur : utilisateurs actifs Play Console |
| ARPU | revenu net ÷ utilisateurs actifs de la période | mois civil | revenus : Play Console → Rapports financiers |
| ARPPU | revenu net ÷ acheteurs de la période | mois civil | Play Console |
| Retour après achat | acheteurs encore actifs N jours après l'achat | — | **non mesurable à distance** sans collecte |
| Remboursements | commandes remboursées ÷ commandes | mois | Play Console → Gestion des commandes |
| Qualité | taux de plantages et d'ANR | 28 jours glissants | Play Console → Android vitals |

## Événements du journal local

`first_open`, `first_game_done` (une fois par appareil), `game_started`, `game_done`,
`daily_test_started`, `daily_test_done`, `level_unlocked`, `record`, `objective_done`,
`premium_viewed`, `purchase_started`, `purchase_confirmed`, `purchase_pending`, `purchase_cancelled`,
`purchase_failed`, `restore`, `reminder_enabled`. Propriétés : identifiant du jeu, niveau, mode,
score, sorte d'objectif. Jamais de prénom ni d'identifiant d'appareil. 500 événements au plus.

## Ce qu'il faudrait pour mesurer davantage

Mesurer l'activation, les sessions ou le retour après achat de **tous** les joueurs demanderait
d'envoyer des données : un serveur (ou un SDK), un consentement, une politique de confidentialité
et une fiche « Sécurité des données » à refaire. À n'envisager que si les chiffres de la Play
Console ne suffisent plus à décider, et avec l'accord d'Alex.

## À observer les premières semaines

1. **Installateurs conservés J1 et J7** : la promesse « une raison de revenir chaque jour »
   tient-elle ? Repère du marché pour les jeux de réflexion : J1 autour de 25-35 %, J7 autour de
   10-15 % (ordres de grandeur publics, à prendre avec prudence).
2. **Notes et avis** : ce que les joueurs disent des jeux, du test du jour, de Premium.
3. **Android vitals** : plantages et ANR (la facturation et le widget sont les parties natives).
4. **Commandes Premium et remboursements** : un taux de remboursement élevé signalerait une
   promesse mal comprise sur l'écran Premium.
