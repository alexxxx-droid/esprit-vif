# Espagnol, allemand, italien, portugais : consignes et glossaire

Esprit Vif est une appli d'entraînement cérébral (React 19 + TypeScript, PWA + APK Android) :
31 mini-jeux en 6 domaines, 50 niveaux par jeu, un test du jour, une mascotte « Vif » (un petit
personnage bleu) qu'on habille de chapeaux gagnés avec des « étincelles », un Premium à vie.
Le **français fait foi** ; l'anglais existe déjà partout. On ajoute :

| code | langue | locale | adresse au joueur |
| --- | --- | --- | --- |
| es | espagnol d'Espagne | es-ES | tú |
| de | allemand | de-DE | du (minuscule) |
| it | italien | it-IT | tu |
| pt | portugais du Brésil | pt-BR | você |

Méthode : `node scripts/i18n.mjs todo <langue> 120` (textes manquants, numérotés), un lot
`{ "<numéro>": "<traduction>" }`, `node scripts/i18n.mjs merge <langue> lot.json` (refuse ce qui
casse), puis `check`. Ne jamais relancer `extract` pendant qu'un lot est en cours : il renumérote.
Contenu des jeux : `src/core/content/<langue>.ts` (spécification en JSDoc de `LangContent`),
validé par `content.test.ts` et `contraires.test.ts`. Une langue n'entre dans `PUBLISHED_LANGS`
(`src/core/lang.ts`) qu'une fois les deux complets.

## Ton

Simple, chaleureux, phrases courtes, comme le français. Pas de jargon. Jamais de promesse
médicale : l'« âge cérébral » est un indicateur ludique, pas une mesure médicale. L'appli tient
sur un téléphone de 360 px de large : boutons, puces, titres et onglets COURTS (surtout en
allemand : préférer un mot court à un composé de 20 lettres). Orthographe soignée, accents justes.

## Typographie

- Pas d'espace avant `: ; ! ?` (usage français seulement). Espagnol : `¿…?` et `¡…!`.
- Guillemets : es « … », de „…“, it « … », pt “…”.
- Apostrophe typographique `’` dans le texte (italien : l’intruso, dell’app…), jamais `'`.
- Nombres : ne change jamais un nombre. Les fonctions de format du code gèrent les séparateurs.

## Glossaire imposé

### Noms des jeux (exactement ainsi, majuscule initiale seulement)

| id | Français | es | de | it | pt |
| --- | --- | --- | --- | --- | --- |
| calcul | Calcul éclair | Cálculo relámpago | Blitzrechnen | Calcolo lampo | Cálculo relâmpago |
| stroop | Couleurs piégées | Colores trampa | Farbfalle | Colori trappola | Cores traiçoeiras |
| schulte | Table de Schulte | Tabla de Schulte | Schulte-Tabelle | Tabella di Schulte | Tabela de Schulte |
| matrice | Matrice | Matriz | Rastergedächtnis | Matrice | Matriz |
| nback | Double retour | Doble eco | Rückblick | Sguardo indietro | Olhar para trás |
| total | Total cumulé | Total acumulado | Laufende Summe | Somma continua | Total acumulado |
| intrus | L’intrus | El intruso | Was passt nicht? | L’intruso | O intruso |
| anagrammes | Anagrammes | Anagramas | Anagramme | Anagrammi | Anagramas |
| boutique | La boutique | La tienda | Der Laden | La bottega | A loja |
| diable | Calcul du diable | Cálculo endiablado | Knifflige Summen | Calcolo diabolico | Cálculo diabólico |
| ordre | Du plus petit au plus grand | De menor a mayor | Vom Kleinsten zum Größten | Dal più piccolo al più grande | Do menor ao maior |
| monnaie | Monnaie | Monedero | Kleingeld | Spiccioli | Troco |
| pluie | Pluie de calculs | Lluvia de cálculos | Zahlenregen | Pioggia di calcoli | Chuva de contas |
| correspondance | Correspondance express | Coincidencia exprés | Schneller Vergleich | Abbinamento rapido | Combina rápido |
| fleches | Flèches | Flechas | Pfeile | Frecce | Setas |
| reflexe | Réflexe | Reflejos | Reflex | Riflessi | Reflexo |
| rotation | Rotation mentale | Rotación mental | Mentale Rotation | Rotazione mentale | Rotação mental |
| sudoku | Mini-sudoku | Minisudoku | Mini-Sudoku | Mini sudoku | Mini sudoku |
| balance | Balance | Balanza | Waage | Bilancia | Balança |
| horloges | Horloges | Relojes | Uhren | Orologi | Relógios |
| mots | Mots à retenir | Palabras en mente | Wörter merken | Parole da ricordare | Palavras na memória |
| lettre | Lettre manquante | Letra perdida | Fehlender Buchstabe | Lettera mancante | Letra que falta |
| categories | Catégories | Categorías | Kategorien | Categorie | Categorias |
| paires | Paires | Parejas | Paare | Coppie | Pares |
| coupdoeil | Coup d’œil | De un vistazo | Auf einen Blick | Colpo d’occhio | De relance |
| quiestqui | Qui est qui ? | ¿Quién es quién? | Wer ist wer? | Chi è chi? | Quem é quem? |
| lecture | Lecture éclair | Lectura relámpago | Blitzlesen | Lettura lampo | Leitura relâmpago |
| itineraire | Itinéraire | Itinerario | Wegfinder | Itinerario | Itinerário |
| filature | Filature | Seguimiento | Verfolgung | Pedinamento | De olho |
| lucioles | Lucioles | Luciérnagas | Glühwürmchen | Lucciole | Vaga-lumes |
| contraires | Contraires | Contrarios | Gegenteile | Contrari | Opostos |
| suites | Suites logiques | Series lógicas | Zahlenreihen | Serie logiche | Sequências lógicas |
| compte | Le compte est bon | Cuenta exacta | Zielzahl | Conto esatto | Conta certa |

### Domaines

| Français | es | de | it | pt |
| --- | --- | --- | --- | --- |
| Calcul | Cálculo | Rechnen | Calcolo | Cálculo |
| Mémoire | Memoria | Gedächtnis | Memoria | Memória |
| Attention | Atención | Aufmerksamkeit | Attenzione | Atenção |
| Vitesse | Velocidad | Tempo | Velocità | Velocidade |
| Langage | Lenguaje | Sprache | Linguaggio | Linguagem |
| Logique | Lógica | Logik | Logica | Lógica |

### Autres termes

| Français | es | de | it | pt |
| --- | --- | --- | --- | --- |
| Esprit Vif (nom de l'appli) | Esprit Vif | Esprit Vif | Esprit Vif | Esprit Vif |
| Vif (la mascotte) | Vif | Vif | Vif | Vif |
| étincelles (monnaie du jeu) | chispas | Funken | scintille | faíscas |
| vestiaire (les chapeaux de Vif) | vestidor | Garderobe | guardaroba | guarda-roupa |
| Test du jour | Test del día | Tagestest | Test del giorno | Teste do dia |
| âge cérébral | edad cerebral | Gehirnalter | età cerebrale | idade cerebral |
| Premium | Premium | Premium | Premium | Premium |
| compagnons : Pomme, Orange, Citron, Fraise, Raisin, Poire, Pastèque, Kiwi, Ananas, Myrtille | Manzana, Naranja, Limón, Fresa, Uva, Pera, Sandía, Kiwi, Piña, Arándano | Apfel, Orange, Zitrone, Erdbeere, Traube, Birne, Wassermelone, Kiwi, Ananas, Heidelbeere | Mela, Arancia, Limone, Fragola, Uva, Pera, Anguria, Kiwi, Ananas, Mirtillo | Maçã, Laranja, Limão, Morango, Uva, Pera, Melancia, Kiwi, Abacaxi, Mirtilo |

### Couleurs (Couleurs piégées) et formes (Réflexe, Balance, Paires…)

Les mots isolés `'rouge'`, `'étoile'`… du dictionnaire : au singulier, sans article, en minuscules
(les noms allemands gardent leur majuscule). Le contenu des jeux (grammaire, raccourcis clavier)
dépend de ces mots exacts.

| Français | es | de | it | pt |
| --- | --- | --- | --- | --- |
| rouge, bleu, vert, jaune, orange, violet, rose, blanc | rojo, azul, verde, amarillo, naranja, morado, rosa, blanco | rot, blau, grün, gelb, orange, lila, rosa, weiß | rosso, blu, verde, giallo, arancione, viola, rosa, bianco | vermelho, azul, verde, amarelo, laranja, roxo, rosa, branco |
| rond, carré, triangle, étoile, losange, croix | círculo, cuadrado, triángulo, estrella, rombo, cruz | Kreis, Quadrat, Dreieck, Stern, Raute, Kreuz | cerchio, quadrato, triangolo, stella, rombo, croce | círculo, quadrado, triângulo, estrela, losango, cruz |
| hexagone, octogone, pentagone, cœur, lune, drapeau | hexágono, octógono, pentágono, corazón, luna, bandera | Sechseck, Achteck, Fünfeck, Herz, Mond, Fahne | esagono, ottagono, pentagono, cuore, luna, bandiera | hexágono, octógono, pentágono, coração, lua, bandeira |

Pour le reste (paliers Débutant / Confirmé / Expert / Maître / Légende, maîtrise, Défi Légende,
saison de défis, objectifs, série, trophées…) : le dictionnaire de ta langue en contient déjà une
partie (es, it, pt) ; garde les termes déjà choisis s'ils sont bons, et reste cohérent partout
(cherche dans ton dictionnaire avant de choisir un terme).
