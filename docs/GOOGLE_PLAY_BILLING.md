# Premium à vie : Google Play Billing

Esprit Vif vend **un seul produit** : *Esprit Vif Premium*, un achat unique non consommable,
sans abonnement, uniquement dans l'appli installée depuis Google Play. Le site (PWA) ne vend rien
et garde tout ce qui est gratuit. Aucune publicité, nulle part.

Le code est prêt ; **rien n'est encore créé dans la Play Console**. Tant que les étapes ci-dessous
ne sont pas faites, l'écran Premium dit « Premium arrive bientôt » et rien ne peut être acheté.

## Ce que Premium apporte (déjà construit)

| Avantage | Où | Code |
| --- | --- | --- |
| 3 thèmes exclusifs : Aurore boréale, Sakura (pétales), Encre (noir et blanc, vrai noir en sombre) | Réglages → Apparence | `src/core/themes.ts` |
| Historique détaillé par jeu : courbe de tous les scores, meilleur score par niveau, tendance (score, précision, temps de réaction) | Progrès → Records → icône courbe | `HistoryScreen.tsx`, `gameHistory` |
| 8 chapeaux Premium qui scintillent (astronaute, licorne, mousquetaire, couronne étoilée, lapin, dragon, arc-en-ciel, pharaon) | Vestiaire → Collection Premium | `core/wardrobe.ts`, `hats.tsx` |
| 3 compagnons exclusifs : Kiwi, Ananas, Myrtille | Réglages → Joueur | `core/characters.ts`, `Mascot.tsx` |
| Bilan du mois : carte illustrée (parties, jours, temps, jeu préféré, plus beau progrès, records, objectifs, domaines), à partager | Progrès → Bilan du mois | `MonthScreen.tsx`, `monthlyReport` |
| Soutien au développeur | — | — |

**Essayer avant d'acheter** (« donner envie », demande d'Alex du 20-10) : l'écran Premium est une vitrine
où tout s'essaie. Les thèmes s'appliquent en direct à toute l'appli le temps de l'aperçu
(`theme-preview.ts`), Vif essaie les chapeaux, les compagnons s'animent, et les vraies données du joueur
(courbe du jeu le plus joué, bilan du mois) apparaissent floutées. Même chose ailleurs : un chapeau
Premium s'essaie sur Vif au vestiaire, un compagnon Premium se montre dans le choix du compagnon,
l'historique et le bilan verrouillés laissent deviner les vrais chiffres. Rien n'est inventé ; l'écran
ne s'ouvre jamais tout seul.

Tout le reste est gratuit et le restera (`premiumBenefits()` dans `src/premium/catalog.ts` est la
seule liste affichée aux joueurs : n'y ajouter qu'une fonction réellement construite).

## Architecture

| Couche | Fichier | Rôle |
| --- | --- | --- |
| Catalogue | `src/premium/catalog.ts` | identifiant du produit, avantages affichés |
| Client de facturation | `src/premium/billing.ts` | interface `BillingBackend` : Google Play, site (rien), mode test |
| Module natif | `android/…/PlayBillingPlugin.java` | Play Billing Library 9.1 : prix, achat, achats détenus, vérification de signature, confirmation (acknowledge) |
| Droits | `src/premium/premium.ts`, `entitlement.ts` | Premium = un achat **terminé** et **vérifié** du bon produit ; cache local pour le hors-ligne |
| Interface | `PremiumScreen.tsx`, Réglages → Esprit Vif Premium | présentation, prix réel, achat, restauration, états |

- **Vérification** : chaque achat renvoyé par Google Play est vérifié sur l'appareil avec la clé
  publique de licence de la Play Console (signature RSA de l'achat). Sans clé dans l'APK, aucun achat
  ne peut être accordé.
- **Confirmation** : un achat valide est confirmé (« acknowledge ») auprès de Google aussitôt ; sans
  cela, Google le rembourse au bout de trois jours.
- **En attente** (paiement en espèces, accord parental) : Premium n'est **pas** accordé ; il
  s'active à la vérification suivante, quand Google Play confirme le paiement.
- **Restauration** : « Restaurer mes achats » (écran Premium et Réglages) redemande les achats à
  Google Play ; un achat déjà détenu lors d'une nouvelle tentative est restauré automatiquement.
  Premium suit le compte Google, sur tous ses appareils Android, après réinstallation comprise.
- **Remboursement, annulation** : à chaque lancement, l'appli redemande les achats ; un achat
  remboursé n'est plus renvoyé par Google Play et Premium disparaît (un thème Premium choisi
  retombe sur « Auto », sans rien effacer).
- **Hors ligne** : le dernier achat vérifié est gardé sur l'appareil (`esprit-vif:premium`) et vaut
  jusqu'à la prochaine réponse de Google Play. Les jeux n'en dépendent jamais.
- **Limite assumée** : sans serveur, la vérification se fait sur l'appareil. Un téléphone modifié
  (root, appli recompilée depuis le dépôt public) peut la contourner. C'est la bonne pratique sans
  serveur, pas une protection complète. Si un jour la fraude coûte plus qu'un petit serveur, la
  vérification se déplacera vers l'API Google Play Developer (côté serveur).

## À faire dans la Play Console (propriétaire du compte)

1. **Profil de paiement** : Play Console → Paramètres → *Profil de paiement* : créer le profil
   marchand (nom légal, adresse, compte bancaire, informations fiscales). Sans lui, aucun produit
   payant ne peut être créé.
2. **Publier une première version** sur un canal de test (Tests → *Tests internes*) avec l'AAB
   qui contient la facturation (`com.android.vending.BILLING` est ajouté par la bibliothèque) :
   les produits ne se créent qu'une fois une version avec cette permission envoyée.
3. **Créer le produit** : Monétiser → Produits → *Produits intégrés à l'application* →
   *Créer un produit* :
   - ID du produit : **`premium_lifetime`** (exactement, il ne pourra plus changer) ;
   - Nom : *Esprit Vif Premium* ; description : *Thèmes exclusifs et historique détaillé de chaque
     jeu. Achat unique, sans abonnement.* (+ version anglaise) ;
   - Prix par défaut : **8,99 €** conseillé (fourchette de la mission : 7,99 à 12,99 €), puis
     *Mettre à jour les prix locaux* ;
   - **Activer** le produit.
4. **Clé publique** : Monétiser → *Configuration de la monétisation* → *Licences* → copier la clé
   publique RSA (encodée en Base64, une longue ligne).
   - en local : `export PLAY_BILLING_PUBLIC_KEY="MIIBIjANBgkq…"` avant `./gradlew bundleRelease` ;
   - en CI : secret GitHub `PLAY_BILLING_PUBLIC_KEY` (déjà lu par `.github/workflows/android.yml`).
   La clé est publique : elle peut figurer dans l'APK, elle ne permet que de vérifier.
5. **Testeurs** : Paramètres → *Tests de licence* : ajouter les adresses Gmail des testeurs (achats
   de test sans débit, avec les cartes « Toujours approuver », « Toujours refuser », « Lent »…), et
   les inscrire au canal de test interne. Installer l'appli **depuis le lien du canal de test** :
   un APK installé à la main (release GitHub) n'est pas reconnu par la facturation tant que la
   signature d'application par Google Play réécrit la clé.
6. **Fiche et questionnaires** à mettre à jour (voir `store/PLAY_STORE.md`) : la fiche affichera
   « Achats via l'application » ; le questionnaire de classification passe à *achats numériques :
   oui* ; la section *Sécurité des données* reste « aucune donnée collectée par l'appli » (le paiement
   est traité par Google Play) — à confirmer en remplissant le formulaire.

## Tester

| Quoi | Comment |
| --- | --- |
| Logique (sans téléphone) | `npm test` : `src/premium/premium.test.ts` couvre achat annulé, en attente puis confirmé, valide, déjà détenu, restauration sans achat, remboursement, erreur réseau, site, APK sans clé, Google Play injoignable |
| Écran et parcours (sans Google) | `npx vite build --mode billingtest --outDir dist-test` puis `npx vite preview --outDir dist-test` : l'écran Premium montre un panneau **MODE TEST — aucun achat réel** pour choisir la réponse (réussi, en attente, annulé, erreur, déjà acheté, rembourser). Aussi avec `npm run dev`. Jamais dans le site publié |
| APK de test (à distribuer à la main, jamais dans la release publique) | `VITE_BILLING_TEST=1 npm run build:android` puis `./gradlew assembleRelease` : même appli, boutique simulée (le mode test passe avant Google Play). Penser à refaire `npm run build:android` sans la variable avant l'APK publié |
| Vraie facturation | canal de test interne + compte testeur de licence : acheter avec « Toujours approuver », vérifier Premium ; « Lent » pour l'achat en attente ; rembourser depuis la Play Console (Gestion des commandes) puis relancer l'appli : Premium doit disparaître ; désinstaller, réinstaller, « Restaurer mes achats » |

## Mise à jour de la bibliothèque

Play Billing Library **9.1.0** (juin 2026). Google exige une version de moins de deux ans environ :
surveiller la page *Play Billing Library release notes* et monter de version avant l'échéance
affichée dans la Play Console. Le module compile aussi avec la 8.3.0 (même API).
