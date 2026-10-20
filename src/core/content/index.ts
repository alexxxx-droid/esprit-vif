import { lang, type ExtraLang, type Lang } from '../lang';
import type { WordFamily } from '../games/contraires-words';
import type { SentencePair } from '../games/lecture';
import type { Category } from '../games/lexique';
import type { ReflexeFill } from '../games/reflexe';
import type { ShapeCard, ShapeKind } from '../games/shapes';
import type { StroopColor } from '../games/stroop';

/**
 * Contenus des jeux propres à chaque langue : ce qui ne se traduit pas phrase à phrase (listes de
 * mots, idées vraies ou fausses, prénoms, conseils) et la petite grammaire des formes. Les textes
 * de l'interface, eux, viennent des dictionnaires `src/i18n/<langue>.json` (voir `tr`).
 *
 * Le français et l'anglais gardent leurs tables dans les modules des jeux (`WORDS`, `CATEGORIES_EN`…).
 * Chaque autre langue a son module `src/core/content/<langue>.ts` (`es`, `de`, `it`, `pt`), qui
 * exporte par défaut un `LangContent` et s'enregistre tout seul (`MODULES`, en bas de ce fichier).
 * Règle de chaque accesseur (`byLang`) : français → tables françaises, anglais → tables anglaises,
 * autre langue → son module, ou les tables anglaises tant qu'elle n'en a pas.
 *
 * Un module de langue n'importe que des types (`import type`) et, s'il veut, les outils de
 * `./helpers` : jamais une valeur d'un jeu ni de ce fichier, sinon les imports tourneraient en rond.
 *
 * Validation : `npx vitest run src/core/content/content.test.ts` contrôle les règles ci-dessous et
 * fait tourner chaque jeu de langage aux 50 niveaux, dans chaque langue qui a son contenu.
 */
export interface LangContent {
  /** Anagrammes : retrouver le mot dont les lettres sont mélangées (avec, plus haut, des lettres en trop). */
  anagrams: {
    /**
     * Les réponses des niveaux 1 à 50 : des mots de 5, 6 ou 7 lettres.
     *
     * - Format : MAJUSCULES de A à Z, rien d'autre. Un mot dont l'orthographe correcte porte un
     *   accent, une cédille, un tréma, un Ñ ou un ß n'entre pas (ni ARBOL pour « árbol », ni
     *   STRASSE) : le joueur verrait un mot mal écrit. Pas de translittération (AE pour Ä…).
     * - Des mots courants qu'un adulte connaît sans hésiter. Formes du dictionnaire de préférence
     *   (nom au singulier, verbe à l'infinitif, adjectif au masculin singulier). Ni nom propre, ni
     *   sigle, ni abréviation, ni mot familier ou grossier, ni mot d'une seule région : l'orthographe
     *   de la locale (es-ES, de-DE, it-IT, pt-BR).
     * - Taille : au moins 100 jeux de lettres différents pour chaque longueur (5, 6 et 7) : un niveau
     *   tire 40 mots d'une même longueur, jamais deux anagrammes l'un de l'autre dans une partie.
     * - Sans doublon, ni dans la liste ni avec `longWords`.
     * - Anagrammes complètes : quand deux mots courants ont les mêmes lettres (fr CHIEN / NICHE,
     *   en HEART / EARTH), les deux sont dans la liste. Toute réponse de la liste est acceptée, et
     *   le mélange évite tous les mots de la liste : un vrai mot absent pourrait s'afficher comme
     *   « mélange », et être refusé si le joueur le tape. Cela vaut aussi pour les mots (sans
     *   accent, hors noms propres) de `categories` et de `knownWords` : s'ils ont les lettres d'un
     *   mot de la liste, ajoutez-les.
     */
    words: readonly string[];
    /**
     * Les mots de 8 lettres, réponses supplémentaires des niveaux 21 à 50 (liste à part : le tirage
     * des niveaux 1 à 20 ne bouge pas). Mêmes règles que `words`, au moins 200 mots.
     */
    longWords: readonly string[];
    /**
     * Les lettres en trop (« leurres ») des niveaux qui n'annoncent pas de « leurres sosies » : les
     * lettres les plus fréquentes de la langue, de la plus à la moins fréquente. MAJUSCULES A à Z,
     * de 10 à 16 lettres, sans doublon (fr `EASITNRULODCMP`, en `ETAOINSRHLDCUM`). Un leurre doit
     * avoir l'air d'appartenir au mot : une lettre rare (K, W, X en français) se repérerait d'un
     * coup d'œil. (Les « leurres sosies » des niveaux avancés copient des lettres du mot.)
     */
    decoyLetters: string;
  };
  /** Lettre manquante : « Fruit : CER_SE », choisir la lettre (ou les lettres) qui complète le mot. */
  lettre: {
    /**
     * Les consonnes leurres : un blanc sur une consonne propose d'autres consonnes de cette liste
     * (un blanc sur une voyelle, d'autres voyelles parmi AEIOUY, commun à toutes les langues).
     * MAJUSCULES A à Z, sans voyelle ni doublon, au moins 10 : les consonnes courantes de la langue
     * (fr `BCDFGLMNPRSTV`, en `BCDFGHKLMNPRSTVW`). Pas de lettre rare : « CHEXAL » se rejetterait
     * sans même lire le mot.
     */
    consonants: string;
    /**
     * Facultatif : remplace la table commune des lettres sosies (`LOOKALIKES` dans lettre.ts : M / N,
     * B / P / D, C / S / K, F / V…), utilisée aux niveaux à « leurres sosies » : pour chaque lettre,
     * celles qu'on confond avec elle à l'œil ou à l'oreille dans cette langue (en espagnol, B et V se
     * prononcent pareil). Clés : une lettre A à Z ; valeurs : des lettres A à Z, voyelle pour voyelle
     * et consonne pour consonne (Y compte comme voyelle), jamais la lettre elle-même.
     */
    lookalikes?: Readonly<Record<string, string>>;
  };
  /**
   * Autres mots courants de la langue, jamais des réponses : ils servent seulement à vérifier
   * qu'aucun leurre de Lettre manquante ne forme un vrai mot (en anglais, « WAS_ » ne propose
   * jamais H : WASH est un mot). Les mots des Anagrammes et des catégories comptent déjà ; ajoutez
   * surtout des mots courants de 4 à 13 lettres, quelques centaines si la langue a beaucoup de mots
   * voisins (l'anglais en a près de 1 300). MAJUSCULES, accents permis : dans les autres langues que le
   * français et l'anglais, les mots se comparent aussi sans accents (un leurre qui forme PAPA est
   * refusé quand PAPÁ est connu). Peut être vide.
   */
  knownWords: readonly string[];
  /**
   * Suites de lettres grossières qu'un mélange d'Anagrammes ou un leurre de Lettre manquante ne doit
   * jamais afficher, même au milieu d'autres lettres (recherche par sous-chaîne : FUCK refuse aussi
   * XFUCKA). MAJUSCULES A à Z, 3 lettres au moins. Visez ce qui choque vraiment (insultes, sexe,
   * racisme, excréments) : une suite trop banale bloquerait trop de tirages pour rien.
   */
  rude: readonly string[];
  /**
   * Le lexique par catégorie : Catégories (trouver l'intrus parmi des mots d'une même catégorie),
   * Mots à retenir (une liste à mémoriser, puis des pièges de la même catégorie) et Lettre manquante
   * (la catégorie sert d'indice). `C(id, label, plural, family, 'mot mot…')` de `./helpers` en
   * construit une.
   *
   * - Les 34 catégories du français, avec les mêmes `id`, la même `family` et dans le même ordre :
   *   recopiez la structure de `CATEGORIES_EN` (lexique.ts) et choisissez des mots courants dans la
   *   langue (pas une traduction mot à mot).
   * - `label` : la catégorie au singulier, majuscule initiale, sans point (« Fruit », « Animal de la
   *   ferme », « Farm animal ») ; elle s'affiche en indice au-dessus du mot à trou. Unique.
   * - `plural` : la catégorie au pluriel, glissée dans la phrase qui rappelle l'intrus précédent :
   *   « Avant : « radis » au milieu des fruits » (fr, `plural` = « des fruits », article compris),
   *   « Previous: “radish” among fruits » (en, `plural` = « fruits »). Écrivez la forme qui complète
   *   la traduction de cette phrase dans votre dictionnaire (clé
   *   `` `Avant : « ${q.words[q.answer]} » au milieu ${q.main.plural}` ``), avec l'article, la
   *   préposition contractée ou le cas qu'elle demande. Sans majuscule initiale (sauf un nom
   *   allemand), sans point. Unique.
   * - `words` : au moins 16 mots par catégorie (20 conseillés : Catégories en montre jusqu'à 11 à la
   *   fois, Mots à retenir en pioche 9). Écrits comme dans un texte : en minuscules, sauf ce que la
   *   langue écrit avec une majuscule (noms de pays et de planètes ; jours et mois en anglais ; tous
   *   les noms en allemand) ; seule l'initiale (de chaque partie d'un mot composé) peut être en
   *   majuscule. Accents permis. Des lettres et des traits d'union seulement : ni espace, ni
   *   apostrophe, ni chiffre (« arc-en-ciel » oui, « pomme de terre » non).
   * - Règle d'or : un mot n'appartient qu'à une seule catégorie (comparaison sans tenir compte des
   *   majuscules), et sans double sens : ni « orange » (fruit ou couleur ?), ni « avocat », ni
   *   « rose » ; en anglais ni « bat », ni « date », ni « seal ». Sinon l'intrus devient discutable.
   *   Même chose entre catégories jumelles (`TWIN_CATEGORIES` dans categories.ts : fruits / légumes,
   *   outils / ustensiles…) : elles se ressemblent exprès, mais aucun mot ne doit pouvoir passer de
   *   l'une à l'autre (la tomate ? ni l'une ni l'autre).
   * - Lettre manquante n'utilise que les mots écrits de A à Z (sans accent ni trait d'union), mis
   *   en majuscules : il en faut au moins 30 dans chaque fourchette de longueur des niveaux (de 4 à
   *   5 lettres au niveau 1, jusqu'à 9 à 13 lettres) : des mots courts ET des mots longs sans accent.
   * - Grilles camouflées (Catégories, niveaux 31 à 50) : les mots y vont par paires de même
   *   initiale, et de longueur voisine au palier Légende. Dans chaque catégorie, plusieurs initiales
   *   doivent être partagées par deux mots ou plus (au moins 5 paires d'initiale par catégorie).
   */
  categories: readonly Category[];
  /**
   * Lecture éclair : une phrase, vraie ou fausse ? Cinq paliers de 40 idées, chaque idée en deux
   * versions `[vraie, fausse]`. Chaque idée sort une fois par tour, dans une version tirée au sort :
   * on ne peut pas retenir « cette phrase est fausse ».
   *
   * 1. Phrases courtes et évidentes (« La neige est froide. » / « La neige est brûlante. »), 15 à
   *    30 caractères.
   * 2. Plus longues, avec des comparaisons (« Un éléphant est bien plus lourd qu’une souris. »).
   * 3. Négations et petits raisonnements, à lire jusqu'au bout (« Les oiseaux ne savent pas tous
   *    voler. »).
   * 4. Phrases à rallonge : l'erreur se cache souvent tout au bout. De 60 à 130 caractères, en
   *    moyenne au moins 20 de plus qu'au palier 2 et 15 de plus qu'au palier 3.
   * 5. De la logique : « aucun », « au moins », « si… alors », doubles négations, petits calculs.
   *    130 caractères au plus.
   *
   * Les deux versions d'une idée se ressemblent (même sujet, petite différence) et ont à peu près
   * la même longueur : sur un palier, les phrases fausses ne doivent pas être plus longues ou plus
   * courtes que les vraies (écart des moyennes sous 10 %), sinon la longueur trahirait la réponse
   * (au palier Légende, la phrase s'efface au bout d'un temps proportionnel à sa longueur).
   * Partez des idées françaises ou anglaises, mais adaptez celles qui tombent à plat dans la langue.
   * Vérité indiscutable pour un adulte, sans piège culturel ni fait qui vieillit.
   * Format : une phrase affirmative, majuscule initiale, finie par un point ; au moins 10
   * caractères ; apostrophe typographique ’ (jamais ') ; pas d'espace avant : ; ! ? (c'est
   * l'usage français seulement) ; les 400 phrases toutes différentes.
   */
  sentences: readonly (readonly SentencePair[])[];
  /**
   * Qui est qui ? : les prénoms donnés aux visages. Au moins 60 prénoms courants dans le pays de la
   * langue, filles et garçons, de 2 à 8 lettres, majuscule initiale puis minuscules (accents permis,
   * ni trait d'union, ni espace, ni apostrophe), tous différents. Aux niveaux « prénoms proches », le
   * jeu prend deux ou trois initiales et des prénoms qui commencent pareil (Léa, Léo, Lina, Lou…) :
   * il faut au moins 6 initiales portées chacune par 5 prénoms ou plus (le français en a 11, de 5 à
   * 8 prénoms). L'initiale est le premier caractère exact (É et E font deux groupes).
   */
  quiNames: readonly string[];
  /**
   * Le mot du coach, un par jour : exactement autant de conseils que `COACH_TIPS` (coach.ts, 50),
   * dans le même ordre : le conseil n° i adapte le conseil français n° i (le conseil du jour est le
   * même dans toutes les langues). Bienveillants, jamais de promesse médicale. Adaptez ce qui
   * dépend de la langue : le numéro de téléphone découpé à la façon du pays, les groupes de lettres
   * courants des Anagrammes. Un conseil sur un jeu commence par le nom du jeu exactement comme dans
   * votre dictionnaire, suivi de deux-points (« Color Trap: … »). Format : majuscule initiale (ou
   * chiffre, ¿, ¡), fini par . ! ? … ou ) ; apostrophe typographique ’ ; pas d'espace avant
   * : ; ! ? (usage français seulement) ; tous différents.
   */
  coachTips: readonly string[];
  /**
   * Contraires : un mot, « le contraire de » ou « le même sens que », quatre propositions ; au
   * palier Légende, deux mots à juger (contraires, même sens ou sans rapport). La liste est écrite
   * dans la langue, jamais traduite mot à mot, au format de `WORDS_FR` / `WORDS_EN`
   * (contraires-words.ts, à lire en entier) : `adj(…)`, `verbe(…)`, `nom(…)` de `./helpers`.
   *
   * - Une famille = un même champ de sens (la température, la taille, l'argent…) et une même
   *   nature. Trois chaînes par famille, une par registre : très courant (Débutant, Confirmé),
   *   courant, puis soutenu (Maître, Légende) ; une chaîne peut être vide (`''`).
   * - Dans une chaîne, des paires séparées par des espaces : `a/b` contraires, `a=b` même sens.
   *   `_` tient lieu d'espace (« se_taire », es « darse_prisa »). Adjectifs au masculin singulier,
   *   verbes à l'infinitif, noms sans article. Mots en minuscules (accents permis), sauf les noms
   *   allemands, qui gardent leur majuscule (`nom('Anfang/Ende')`).
   * - Règle d'or : les mots d'une famille ne servent jamais de leurres les uns pour les autres, et
   *   les leurres viennent d'autres familles. Donc un mot n'appartient qu'à UNE famille ; deux mots
   *   qui pourraient passer pour contraires ou synonymes vont dans la même famille (fusionnez deux
   *   champs voisins plutôt que de les séparer). Un mot à plusieurs sens éloignés n'entre pas.
   * - Pas de contradiction : dans une famille, les mots se rangent en deux camps (même sens d'un
   *   côté, contraires en face) ; jamais `a/b` et `a=b` à la fois, ni une chaîne qui rend un mot
   *   contraire à lui-même. Pas de paire en double (`a/b` puis `b/a`).
   * - Quantités : au moins 120 paires de contraires et 80 de même sens (visez 200 et 170, comme le
   *   français et l'anglais) ; dans chaque lien, au moins 50 paires très courantes ou courantes et
   *   30 soutenues. Chaque nature (adjectif, verbe, nom) et chaque registre doit réunir des mots
   *   d'au moins 5 familles différentes (pour tirer trois leurres de familles distinctes).
   * - Les pièges (palier Expert) : un mot qui a à la fois un contraire et un synonyme. Donnez des
   *   synonymes aux mots les plus courants (`grand=immense` à côté de `grand/petit`).
   *
   * Validation : `npx vitest run src/core/games/contraires.test.ts` (listes, puis parties aux 50
   * niveaux dans chaque langue qui a son contenu).
   */
  contraires: readonly WordFamily[];
  /** Couleurs piégées : les identifiants des couleurs restent en français (`rouge`, `bleu`…). */
  stroop: {
    /**
     * Raccourcis clavier des six couleurs de base `rouge bleu vert jaune orange violet` (en plus des
     * chiffres 1 à 8) : une lettre minuscule de a à z par couleur, chaque couleur une fois. De
     * préférence l'initiale du nom de la couleur, tel que l'affiche votre dictionnaire (en : r b g
     * y o p pour Red, Blue, Green, Yellow, Orange, Purple). Si deux noms commencent pareil, une autre
     * lettre du nom : le français prend le i de vIolet, le v étant à vert. La lettre fait partie du
     * nom affiché, sinon personne ne la devine.
     */
    keys: Readonly<Record<string, StroopColor>>;
    /**
     * Réponse à la voix : les mots que la reconnaissance vocale peut renvoyer pour chacune des 8
     * couleurs (`rouge bleu vert jaune orange violet rose blanc`) → l'identifiant de la couleur. Le
     * nom de la couleur, ses formes accordées (genre, nombre) et les homophones fréquents (fr verre,
     * vers pour vert ; en read pour red, blew pour blue). Clés en minuscules de a à z seulement : la
     * transcription est mise en minuscules et privée de ses accents (ß devient ss) avant la recherche,
     * donc écrivez weiss, rosa, azul, amarelo. Un mot ne désigne qu'une couleur ; un homophone qui
     * est aussi un mot courant (fr verre) n'entre que si la reconnaissance le renvoie vraiment pour
     * la couleur.
     */
    spoken: Readonly<Record<string, StroopColor>>;
  };
  /** La grammaire des formes (Réflexe, Balance, Paires, Correspondance express, libellés). */
  grammar: LangGrammar;
  /** Les animations qui montrent la règle de chaque jeu de langage, avant la partie. */
  demos: DemoContent;
}

/**
 * Une forme citée dans une règle de Réflexe : son identifiant, son nom (singulier, tel que le
 * donne `SHAPE_NAMES` : le dictionnaire, ou l'anglais s'il manque) et le remplissage exigé.
 */
export interface RuleShape {
  shape: ShapeKind;
  name: string;
  /** `filled` (plein), `hollow` (creux) ou `null` : peu importe. */
  fill: ReflexeFill | null;
}

/**
 * Ce que l'ordre des mots, les articles, les accords et les pluriels d'une langue ne permettent pas
 * de traduire phrase à phrase. Des fonctions TypeScript pures, écrites dans le module de la langue.
 * Les noms des formes (`SHAPE_NAMES`) viennent du dictionnaire, au singulier et sans article :
 * `name` ; `shape` (identifiant anglais : circle, square, triangle, star, diamond, cross, hexagon,
 * octagon, pentagon, heart, moon, flag) sert à connaître le genre ou le pluriel irrégulier. Jamais
 * de chaîne vide, ni d'espace en trop, ni de point final.
 */
export interface LangGrammar {
  /**
   * L'adjectif de remplissage accordé : fr plein / pleine / pleins / pleines, creux / creuse… ;
   * en filled / hollow (invariable). `plural` : accordé au pluriel.
   */
  fillWord(shape: ShapeKind, filled: boolean, plural: boolean): string;
  /**
   * Le nom avec son article défini, au singulier, tel qu'on le dit en sujet ou après « C'était… »
   * (Balance : « C’était le rond », « l’étoile pèse plus que la croix ») : fr le rond, l’étoile,
   * la croix ; en the circle.
   */
  theShape(shape: ShapeKind, name: string): string;
  /**
   * Une carte décrite pour les lecteurs d'écran (Paires, Correspondance express), sans article :
   * fr « étoile creuse », « drapeau plein, tourné de 90° » ; en « hollow star », « filled flag,
   * rotated 90° ». `card.rotation` : 0, 90, 180 ou 270 (0 : ne rien dire de la rotation).
   */
  describeShape(card: ShapeCard, name: string): string;
  /** Plusieurs exemplaires d'une forme (Balance), `count` de 2 à 6 : fr « 3 triangles », « 2 croix » ; en « 2 crosses ». */
  countShapes(shape: ShapeKind, name: string, count: number): string;
  /**
   * La règle de Réflexe en une phrase impérative (même registre que le dictionnaire : tutoiement en
   * français), formes au pluriel avec leur article, remplissage accordé, dans l'ordre donné :
   * fr « Touche les ronds pleins », « Touche les ronds creux et les carrés pleins », « Touche tout,
   * sauf les étoiles » ; en « Tap the filled circles », « Tap everything except the stars ».
   * `inverted` : toucher tout SAUF ces formes. Deux règles différentes donnent deux phrases
   * différentes.
   */
  describeRule(parts: readonly RuleShape[], inverted: boolean): string;
  /** Une énumération : [a] → « a », [a, b] → « a et b », [a, b, c] → « a, b et c » (en : « a, b and c »). */
  list(items: readonly string[]): string;
}

/**
 * Les démos des jeux de langage. Les légendes (« Quelle lettre manque ? », « un intrus : le
 * violon ! », « Faux : elle est salée »…) viennent du dictionnaire : ces contenus doivent leur
 * correspondre.
 */
export interface DemoContent {
  /**
   * Anagrammes : exactement 5 tuiles (une lettre majuscule chacune), mélangées, et `order`, l'ordre
   * où on les touche (une permutation de 0 à 4) : les tuiles prises dans cet ordre forment un mot de
   * `anagrams.words` ; mélangées, elles ne forment aucun mot de la liste (fr H C I N E → CHIEN).
   */
  anagram: { tiles: readonly string[]; order: readonly number[] };
  /**
   * Mots à retenir : trois mots courants à retenir (fr vélo, pomme, violon), `seen` l'un d'eux
   * (pomme : « Vu ! ») et `unseen` un quatrième mot absent de la liste (lion : « Pas vu ! »).
   * Écrits comme dans `categories`.
   */
  mots: { words: readonly string[]; seen: string; unseen: string };
  /**
   * Lettre manquante : `hint`, le `label` de la catégorie du mot (« Animal de la ferme ») ; `word`,
   * un mot de cette catégorie en MAJUSCULES A à Z (CHEVAL) ; `position`, la place de la lettre qui
   * manque (à partir de 0) et `letter`, cette lettre ; `guess`, les lettres hésitées, dont la bonne,
   * les autres ne formant aucun mot (« B, V ou R… ») ; `answer`, la réponse et le mot complet
   * (« V : CHEVAL »).
   */
  lettre: { hint: string; word: string; position: number; letter: string; guess: string; answer: string };
  /**
   * Catégories : quatre mots, trois fruits et, en troisième place, le violon (la légende dit « un
   * intrus : le violon ! ») : le mot violon de la catégorie `instruments`, et trois mots de `fruits`.
   */
  categories: readonly string[];
  /** Qui est qui ? : trois prénoms de `quiNames` ; le premier est celui qu'on cherche (fr Léa, Hugo, Nina). */
  qui: readonly [string, string, string];
  /**
   * Lecture éclair : `[vraie, fausse]`, les versions de « Un chat a quatre pattes. » (vraie) et de
   * « La mer est sucrée. » (fausse ; la légende dit « Faux : elle est salée »), de préférence prises
   * dans le palier 1 de `sentences`.
   */
  lecture: readonly [truth: string, lie: string];
}

/** Les contenus enregistrés, par langue. */
const registry = new Map<ExtraLang, LangContent>();

/** Calculs faits une fois par langue de contenu (lexiques, index d'anagrammes…), voir `memoByLang`. */
const memo = new Map<string, unknown>();

/**
 * Enregistre le contenu d'une langue (`null` : le retire, la langue retombe sur l'anglais). Les
 * modules `src/core/content/<langue>.ts` s'enregistrent tout seuls ; les tests s'en servent aussi.
 */
export function registerContent(target: ExtraLang, content: LangContent | null) {
  if (content) registry.set(target, content);
  else registry.delete(target);
  // Les lexiques déjà calculés pour cette langue sont à refaire.
  for (const key of [...memo.keys()]) if (key.endsWith(`:${target}`)) memo.delete(key);
}

/** Le contenu enregistré pour une langue, ou `null`. */
export function contentOf(target: ExtraLang): LangContent | null {
  return registry.get(target) ?? null;
}

/** Le contenu de la langue en cours, si c'est une autre langue que le français et l'anglais et qu'elle en a un. */
export function extraContent(): LangContent | null {
  const current = lang();
  return current === 'fr' || current === 'en' ? null : contentOf(current);
}

/** La langue dont viennent les contenus : la langue en cours, ou l'anglais pour une langue encore sans contenu. */
export function contentLang(): Lang {
  const current = lang();
  return current === 'fr' || current === 'en' || registry.has(current) ? current : 'en';
}

/** La donnée de la langue en cours : la française, l'anglaise, ou celle du contenu de l'autre langue (repli : l'anglaise). */
export function byLang<T>(fr: T, en: T, extra: (content: LangContent) => T): T {
  const current = lang();
  if (current === 'fr') return fr;
  if (current === 'en') return en;
  const content = contentOf(current);
  return content ? extra(content) : en;
}

/** La grammaire de l'autre langue en cours ; `null` en français et en anglais (et en repli sur l'anglais). */
export function extraGrammar(): LangGrammar | null {
  return extraContent()?.grammar ?? null;
}

/** Un calcul fait une fois par langue de contenu : `memoByLang('anagrammes', () => …)`. */
export function memoByLang<T>(name: string, build: () => T): T {
  const key = `${name}:${contentLang()}`;
  if (!memo.has(key)) memo.set(key, build());
  return memo.get(key) as T;
}

/** Les modules de langue présents, enregistrés au chargement (un module absent est simplement ignoré). */
const MODULES = import.meta.glob<LangContent>(['./es.ts', './de.ts', './it.ts', './pt.ts'], { eager: true, import: 'default' });
for (const [path, content] of Object.entries(MODULES)) registerContent(path.slice(2, -3) as ExtraLang, content);
