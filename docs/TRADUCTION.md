# Version anglaise : règles et glossaire

L'interface existe en français (langue de référence) et en anglais. La langue se choisit dans
les réglages (« Auto » suit la langue du téléphone). Ce document fixe la façon de traduire, pour
que tout le code reste cohérent.

## Règles techniques

1. **Texte bilingue en place** : `tr('Réglages', 'Settings')` (import depuis `src/core/lang.ts`).
   Le français reste **strictement identique** à l'existant ; l'anglais l'accompagne.
2. **Jamais de `tr()` au chargement d'un module** (constante, objet ou tableau calculé à
   l'import) : le texte resterait figé dans la langue du démarrage. Utiliser une fonction, un
   accesseur (`get name() { return tr('…', '…'); }`) ou un composant. Les objets de données
   peuvent porter les deux langues (`{ fr: '…', en: '…' }`) et choisir au moment de l'affichage.
3. **Pluriels** : `tr(plural(n, 'partie'), plural(n, 'game'))` — `plural` applique la règle de la
   langue en cours (français : 0 et 1 au singulier ; anglais : seulement 1).
4. **Dates et nombres** : les fonctions de `src/core/format.ts` suivent la langue
   (`formatSeconds`, `formatOneDecimal`, `formatLongDay`…). Pas de `'fr-FR'` en dur : `locale()`.
5. **Typographie** : le français garde ses espaces insécables avant `: ; ! ?` (` ` dans les
   chaînes, `&nbsp;` dans le JSX) ; l'anglais n'en met pas (« Settings: », « Ready? »).
6. **Contenus propres à la langue** (listes de mots, catégories, phrases, noms de couleurs) : une
   version par langue, choisie à l'usage (`lang()`), jamais traduite mot à mot quand le jeu en
   dépend (une anagramme anglaise doit être un mot anglais courant).
7. Les identifiants techniques (ids de jeux, routes `#/…`, clés de stockage, classes CSS) ne
   changent pas.
8. Les tests existants (en français) doivent continuer de passer tels quels ; ajouter des tests
   pour les contenus anglais (unicité, format).

## Ton

Anglais américain simple et chaleureux, tutoiement → « you », phrases courtes, comme le
français. Pas de jargon. « âge cérébral : indicateur ludique, pas une mesure médicale » →
« brain age: a playful indicator, not a medical measure » (à garder visible partout où le
français l'affiche).

## Glossaire

| Français | English |
| --- | --- |
| Esprit Vif (nom de l'appli) | Esprit Vif (inchangé) |
| Vif (la mascotte) | Vif |
| Accueil / Entraînement / Progrès / Réglages | Home / Training / Progress / Settings |
| Test du jour | Daily test |
| Séance du jour | Daily session |
| Marathon | Marathon |
| Duel à deux | Two-player duel |
| Mode fête | Party mode |
| Défis entre amies | Friend challenges |
| Bilan de départ | Starting assessment |
| Essai guidé | Guided practice |
| âge cérébral | brain age |
| niveau / étoile / médaille | level / star / medal |
| bronze, argent, or, platine | bronze, silver, gold, platinum |
| série / jour de repos | streak / rest day |
| trophée / XP / rang | trophy / XP / rank |
| compagnon | companion |
| Le mot du coach | Coach's tip |
| Rappel quotidien | Daily reminder |
| Transférer / Envoyer / Recevoir | Transfer / Send / Receive |
| Le pavé / Le doigt | Keypad / Finger |
| Défi de la semaine | Weekly challenge |
| record | best score (« Nouveau record ! » → « New best! ») |

### Domaines

Calcul → Math · Mémoire → Memory · Attention → Attention · Vitesse → Speed · Langage → Language ·
Logique → Logic

### Compagnons

Vif → Vif · Pomme → Apple · Orange → Orange · Citron → Lemon · Fraise → Strawberry ·
Raisin → Grape · Poire → Pear · Pastèque → Watermelon

### Jeux

| id | Français | English |
| --- | --- | --- |
| calcul | Calcul éclair | Flash Math |
| stroop | Couleurs piégées | Color Trap |
| schulte | Table de Schulte | Schulte Table |
| matrice | Matrice | Grid Memory |
| nback | Double retour | Look Back |
| total | Total cumulé | Running Total |
| intrus | L’intrus | Odd One Out |
| anagrammes | Anagrammes | Anagrams |
| boutique | La boutique | The Shop |
| diable | Calcul du diable | Tricky Sums |
| ordre | Du plus petit au plus grand | Smallest to Largest |
| monnaie | Monnaie | Small Change |
| pluie | Pluie de calculs | Number Rain |
| correspondance | Correspondance express | Quick Match |
| fleches | Flèches | Arrows |
| reflexe | Réflexe | Reflex |
| rotation | Rotation mentale | Mental Rotation |
| sudoku | Mini-sudoku | Mini Sudoku |
| balance | Balance | Scales |
| horloges | Horloges | Clocks |
| mots | Mots à retenir | Word Recall |
| lettre | Lettre manquante | Missing Letter |
| categories | Catégories | Categories |
| paires | Paires | Pairs |
| coupdoeil | Coup d’œil | At a Glance |
| quiestqui | Qui est qui ? | Who's Who? |
| lecture | Lecture éclair | Speed Reading |
| itineraire | Itinéraire | Route Finder |
| filature | Filature | Keep Track |
| lucioles | Lucioles | Fireflies |
| contraires | Contraires | Opposites |
