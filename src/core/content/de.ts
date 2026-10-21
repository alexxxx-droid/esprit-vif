import type { ShapeCard, ShapeKind } from '../games/shapes';
import { adj, C, nom, verbe, wordList } from './helpers';
import type { LangContent, LangGrammar, RuleShape } from './index';

/**
 * Contenus des jeux en allemand (de-DE, « du » en minuscule). Écrits pour l'allemand, pas traduits
 * mot à mot ; les règles de chaque champ sont dans `LangContent` (index.ts).
 *
 * Les noms allemands gardent leur majuscule (catégories, Contraires). Les mots avec Ä, Ö, Ü ou ß
 * n'entrent pas dans les listes A à Z des Anagrammes (ni AE, OE, UE, SS en remplacement).
 */

// ─── Grammaire des formes ────────────────────────────────────────────────────────────────────────

type Gender = 'm' | 'f' | 'n';

/** Genre et pluriel de chaque forme, pour les noms du dictionnaire (Kreis, Raute, Herz…). */
const SHAPE_FORMS: Record<ShapeKind, { name: string; gender: Gender; plural: string }> = {
  circle: { name: 'Kreis', gender: 'm', plural: 'Kreise' },
  square: { name: 'Quadrat', gender: 'n', plural: 'Quadrate' },
  triangle: { name: 'Dreieck', gender: 'n', plural: 'Dreiecke' },
  star: { name: 'Stern', gender: 'm', plural: 'Sterne' },
  diamond: { name: 'Raute', gender: 'f', plural: 'Rauten' },
  cross: { name: 'Kreuz', gender: 'n', plural: 'Kreuze' },
  hexagon: { name: 'Sechseck', gender: 'n', plural: 'Sechsecke' },
  octagon: { name: 'Achteck', gender: 'n', plural: 'Achtecke' },
  pentagon: { name: 'Fünfeck', gender: 'n', plural: 'Fünfecke' },
  heart: { name: 'Herz', gender: 'n', plural: 'Herzen' },
  moon: { name: 'Mond', gender: 'm', plural: 'Monde' },
  flag: { name: 'Fahne', gender: 'f', plural: 'Fahnen' },
};

const ARTICLES: Record<Gender, string> = { m: 'der', f: 'die', n: 'das' };
/** Terminaisons de l'adjectif sans article, au nominatif singulier (« ausgefüllter Kreis »). */
const STRONG_ENDINGS: Record<Gender, string> = { m: 'er', f: 'e', n: 'es' };

/** Le pluriel du nom : celui de la table, ou une règle simple si le dictionnaire dit autre chose. */
function pluralOf(shape: ShapeKind, name: string): string {
  const form = SHAPE_FORMS[shape];
  if (name === form.name) return form.plural;
  return name.endsWith('e') ? `${name}n` : `${name}e`;
}

/** Le datif pluriel (« außer den Kreisen ») : -n, sauf après -n ou -s. */
const dativePlural = (plural: string): string => (/[ns]$/.test(plural) ? plural : `${plural}n`);

/** Le radical du remplissage : « ausgefüllt » (plein) ou « leer » (creux). */
const fillStem = (filled: boolean): string => (filled ? 'ausgefüllt' : 'leer');

const list = (items: readonly string[]): string =>
  items.length > 1 ? `${items.slice(0, -1).join(', ')} und ${items[items.length - 1]}` : (items[0] ?? '');

const grammar: LangGrammar = {
  // Sans article, au nominatif : « ausgefüllter Kreis », « leere Raute », « ausgefüllte Kreise ».
  fillWord: (shape: ShapeKind, filled: boolean, plural: boolean): string =>
    `${fillStem(filled)}${plural ? 'e' : STRONG_ENDINGS[SHAPE_FORMS[shape].gender]}`,
  theShape: (shape: ShapeKind, name: string): string => `${ARTICLES[SHAPE_FORMS[shape].gender]} ${name}`,
  describeShape: (card: ShapeCard, name: string): string => {
    const base = `${grammar.fillWord(card.shape, card.filled, false)} ${name}`;
    return card.rotation ? `${base}, um ${card.rotation}° gedreht` : base;
  },
  countShapes: (shape: ShapeKind, name: string, count: number): string => `${count} ${pluralOf(shape, name)}`,
  // « Tippe auf die ausgefüllten Kreise », « Tippe auf alles außer den Sternen ».
  describeRule: (parts: readonly RuleShape[], inverted: boolean): string => {
    const items = parts.map(({ shape, name, fill }) => {
      const plural = pluralOf(shape, name);
      const adjective = fill ? `${fillStem(fill === 'filled')}en ` : '';
      return inverted ? `den ${adjective}${dativePlural(plural)}` : `die ${adjective}${plural}`;
    });
    return inverted ? `Tippe auf alles außer ${list(items)}` : `Tippe auf ${list(items)}`;
  },
  list,
};

// ─── Le contenu ──────────────────────────────────────────────────────────────────────────────────

const content: LangContent = {
  anagrams: {
    words: wordList(`
      ABEND ACKER ADLER ALARM ALBUM AMPEL ANKER APFEL ARENA ARMUT ATLAS BADEN BAGEL BANDE BAUEN
      BETEN BIRNE BLATT BLICK BLITZ BLOCK BLUES BLUME BLUSE BODEN BOHNE BRAUT BRIEF CHAOS CLOWN
      DACHS DAMPF DATUM DECKE DEICH DRAHT EBENE EICHE EIMER EISIG EKELN ENGEL ENKEL ERBIN ERNST
      ERNTE FABEL FADEN FAHNE FALKE FALTE FARBE FEDER FOLIE FRAGE FUCHS GABEL GEHEN GEIGE GLATT
      GRILL GRUBE GURKE HAFEN HAGEL HALLE HECKE HEGEN HOLEN HONIG HUMOR JACKE KABEL KAKAO KAMEL
      KAMIN KANAL KANNE KARTE KASSE KATER KATZE KERZE KETTE KISTE KLANG KLEID KNOPF KREIS KRISE
      KRONE KRUMM KURVE LACHS LADEN LAGER LAMPE LASCH LEBEN LEDER LEGEN LEISE LESEN LILIE LINIE
      MAGEN MAKEL MALEN MANGO MAPPE MARKT MAUER METER MILCH MINZE MITTE MONAT MOTOR MUSIK NACHT
      NADEL NEBEL NELKE NUDEL ONKEL OPFER ORGEL PALME PAUSE PERLE PFEIL PFERD PILOT PIRAT PIZZA
      PLATZ POKAL POLKA PREIS PRISE PUPPE QUARK RADIO RAUPE REGAL REICH RENTE ROBBE ROLLE RUDER
      RUFEN RUHIG SAGEN SALAT SAMEN SAUER SCHAF SCHAL SCHUH SEHEN SEHNE SEIFE SEITE SICHT SIRUP
      SOCKE SONNE SPATZ SPECK SPIEL STADT STARK STAUB STERN STICH STIFT STILL STOFF STROM STUHL
      STURM SUPPE TAFEL TASSE TAUBE TEICH TIGER TISCH TRAUM VOGEL WAAGE WAGEN WANGE WANNE WEBEN
      WEICH WEISE WELLE WESPE WIESE WOLKE WOLLE WURST ZEBRA ZWERG

      ANANAS ARBEIT AUSTER BAGGER BALKON BALLON BANANE BANDIT BECHER BESUCH BILLIG BOHRER BONBON
      BRAUSE BRUDER BUTTER CHANCE DECKEL DOKTOR DONNER DRACHE DUSCHE EHRUNG ERFOLG FAHREN FALSCH
      FALTER FAULEN FEHLEN FELSEN FILTER FINDEN FINGER FLEHEN FLIESE FORSCH FRAGEN FREUND FRISCH
      FROSCH GARAGE GARTEN GEFAHR GERADE GESUND GLOCKE GOLFER GRENZE GRUPPE HAMMER HAUFEN HEILEN
      HEIMAT HELFEN HERBST HIMMEL HOCKEN HOCKER HOFFEN HUNGER HUSTEN INHALT JAGUAR KAFFEE KAKTUS
      KAMERA KAMMER KANONE KARTON KAUFEN KELLER KESSEL KIRCHE KISSEN KLINGE KOCHEN KOFFER KORKEN
      KRAGEN KUCHEN LACHEN LAGUNE LAUFEN LEGUAN LEHRER LEICHT LEIHEN LEITER LERNEN LUSTIG MAGNET
      MANDEL MANTEL MARMOR MENTAL MESSER MINUTE MONTAG MORGEN MUSKEL MUTTER NACKEN NICHTE NISTEN
      NORDEN NUMMER ORDNEN PALAST PAPIER PARADE PFANNE PINSEL PLAKAT PLANET PULVER RABATT RAHMEN
      RAKETE RITTER ROLLER ROSINE SALBEI SALZIG SATTEL SAUBER SCHALE SCHARF SCHATZ SCHERE SCHIFF
      SCHILD SCHLAF SCHMAL SCHNEE SCHULE SCHWER SEGELN SENIOR SESSEL SILBER SINGEN SOMMER SONNIG
      SPATEN SPECHT SPINAT SPINNE SPRUNG STEHEN STRAND STREIT STUNDE TACKER TALENT TANZEN TELLER
      TEMPEL TENNIS TOMATE TRAGEN TRAUBE TREPPE TUNNEL TURNEN WAFFEL WALZER WARTEN WASSER WECKER
      WESTEN WETTER WINDIG WINKEL WINTER WIRBEL WOHNEN WUNSCH ZAHLEN ZAUBER ZEIGEN ZIMMER ZIRKUS
      ZUCKER

      ADRESSE AMULETT ANTWORT AUSFLUG BAHNHOF BALLETT BESTECK BRINGEN BRUNNEN DAMPFER DIAMANT
      DRUCKER DURSTIG EHRLICH EINKAUF EISBERG ELEFANT ERDNUSS FAHRRAD FAMILIE FEBRUAR FENSTER
      FLIEGEN FORELLE FREITAG FRIEDEN FRISEUR GARDINE GEBIRGE GEDICHT GESICHT GEWICHT GIRAFFE
      GITARRE GLAUBEN GORILLA HAMSTER HEIZUNG HUNGRIG JOGHURT KAMERAD KAMILLE KAROTTE KARPFEN
      KATALOG KELLNER KETCHUP KIRSCHE KLAVIER KLINGEL KLOSTER KNOCHEN KOMMODE KOMPASS KONZERT
      KORALLE KRANICH LAKRITZ LANGSAM LATERNE LEOPARD LIBELLE MAESTRO MALERIN MATROSE MESSING
      MILLION MINERAL MONSTER MUSCHEL NACHBAR NASHORN NEUJAHR OKTOBER OSTEREI PALETTE PANTHER
      PAPAGEI PFEFFER PFEIFEN PFLAUME PINGUIN PLATANE POLIZEI PORTION PROBLEM PUDDING RATHAUS
      RECHNEN RICHTIG ROBOTER SAMSTAG SANDALE SCHAUEN SCHNELL SCHRANK SCHWACH SCHWAMM SCHWEIN
      SEEHUND SEKUNDE SKELETT SONNTAG SPARGEL SPIEGEL SPIELEN SPIRALE STEMPEL STIEFEL STRAUCH
      STRUDEL STRUMPF TABLETT TAUCHER TELEFON TEPPICH TERMITE THEATER TOASTER TORNADO TRAKTOR
      TRAURIG TRINKEN TROMMEL TROPFEN UNIFORM VANILLE VERBAND VERKEHR VORHANG WACHSEN WALNUSS
      WANDERN WARNUNG WASCHEN WICHTIG WISCHEN WOHNUNG ZAHNRAD ZEICHEN ZEITUNG ZENTRUM ZITRONE
      ZWIEBEL
    `),
    longWords: wordList(`
      ABENDROT ABSCHIED ANTILOPE ANZIEHEN APOTHEKE APRIKOSE AQUARIUM AUTOBAHN BACKOFEN BADEHOSE
      BANKNOTE BAUMHAUS BAUSTEIN BEGINNEN BEISPIEL BERGWERK BESUCHEN BEZAHLEN BILLIGEN BIRNBAUM
      CHAMPION COMPUTER DAMPFLOK DIENSTAG DIRIGENT DUSCHGEL EICHHORN EIDECHSE ELEKTRIK ERDBEBEN
      ERDBEERE ERDKUGEL ERFINDER ERHOLUNG ESSTISCH FAHRGAST FAHRPLAN FAULTIER FEIERTAG FELDHASE
      FELDMAUS FELSWAND FERNGLAS FESTIVAL FLAMINGO FLUGZEUG FORSCHER FREIHEIT FREIZEIT FREUNDIN
      FRIEDHOF GEDANKEN GEDULDIG GEMEINDE GESCHENK GESPENST GEWINNEN GEWINNER GEWITTER GOLDRING
      GRASHALM HALSTUCH HANDBALL HANDTUCH HANDWERK HAUSARZT HAUSBOOT HAUSHOCH HAUSTIER HERBERGE
      HERRLICH HIMBEERE HOCHHAUS HOCHZEIT HOLUNDER HOLZHAUS HOLZWURM HUFEISEN JONGLEUR KALENDER
      KARAWANE KARNEVAL KASSETTE KASTANIE KAUFHAUS KINDHEIT KLARHEIT KLEIDUNG KLETTERN KOCHBUCH
      KOCHKURS KOCHTOPF KONDITOR KOPFTUCH KRAWATTE KREUZUNG KRISTALL KROKODIL LAKRITZE LANDHAUS
      LANDWIRT LAUFBAND LAUFSTEG LEBENDIG LEHRBUCH LEHRERIN LEINWAND LESEBUCH LICHTUNG LIEBLING
      LIMONADE LUTSCHER MAISFELD MARATHON MARKTTAG MARZIPAN MASCHINE MATRATZE MAULTIER MAULWURF
      MEDAILLE MINIGOLF MITTWOCH MOTORRAD MUSIKANT NACHTZUG NILPFERD NOVEMBER OBSTBAUM PARADIES
      PARKBANK PERSONAL PFIRSICH PFLASTER PICKNICK POSTBOTE PROGRAMM PULLOVER RASIERER RECHNUNG
      RENNBAHN RINGBUCH ROSMARIN RUCKSACK SAMMLUNG SANDBURG SATELLIT SCHATTEN SCHAUFEL SCHAUKEL
      SCHENKEN SCHINKEN SCHLAGEN SCHLANGE SCHLAUFE SCHNABEL SCHNECKE SCHRAUBE SCHULHOF SCHULTAG
      SCHULTER SCHULWEG SCHUSTER SCHWALBE SEEHAFEN SEELACHS SEESTERN SEILBAHN SELLERIE SPANNEND
      SPARDOSE SPORTLER SPRINGEN STREITEN STRICKEN STROHHUT TAGEBUCH TANZKURS TEEKANNE TEELICHT
      TELESKOP TERRASSE TIERARZT TIERHEIM TIERPARK TISCHLER TOILETTE TRICHTER TROMPETE UMSCHLAG
      UNWETTER URLAUBER VERSTECK VOLLMOND WAHRHEIT WALDRAND WEINBERG WEINGLAS WEISHEIT WERKBANK
      WERKZEUG WETTLAUF WINDHUND ZAHNARZT ZAUBERER ZEICHNEN ZEITLUPE ZUCCHINI ZUGVOGEL ZWILLING
    `),
    // Les lettres les plus fréquentes de l'allemand, de la plus à la moins fréquente.
    decoyLetters: 'ENISRATDHULCGMO',
  },

  lettre: {
    consonants: 'BCDFGHKLMNPRSTWZ',
    // Sosies à l'allemande : B / P et D / T (durcissement final), F / V / W, G / K, S / Z, ai / ei…
    lookalikes: {
      A: 'EO',
      E: 'AI',
      I: 'EU',
      O: 'AU',
      U: 'OI',
      Y: 'IU',
      B: 'PD',
      C: 'KZ',
      D: 'TB',
      F: 'VW',
      G: 'KC',
      H: 'NK',
      J: 'G',
      K: 'GC',
      L: 'RT',
      M: 'NW',
      N: 'MH',
      P: 'BF',
      Q: 'KG',
      R: 'LN',
      S: 'ZC',
      T: 'DK',
      V: 'FW',
      W: 'VM',
      X: 'KS',
      Z: 'SC',
    },
  },

  // Mots courants qui ne sont jamais des réponses : aucun leurre de Lettre manquante ne doit en former un.
  knownWords: [
    ...wordList(`
    ABER AFFE ALLE ALSO ALTER AMME ARME ARMUT ASCHE AUCH BABY BACH BAHN BALD BALL BAND BANK BART
    BAUCH BAUM BEET BEIN BERG BETT BEUTE BIER BILD BISS BITTE BLAU BLEI BLIND BLUT BOCK BOOT BRAV
    BROT BUCH BUND BUNT BURG BUSCH CHEF CHOR DACH DAME DANK DEIN DICH DICK DIENST DING DORF DORN
    DOSE DREI DUFT DUMM DUNST ECHT ECKE EHRE EILE EINS ENDE ENGE ENTE ERBE ERDE ESEL ETWA EULE
    FACH FADE FALL FARN FASS FAUL FEIN FELD FELL FELS FERN FEST FETT FEUER FILM FINK FIRMA FLACH
    FLUG FLUR FLUSS FORM FOTO FRAU FREI FROH FUND FUNK GANS GANZ GAST GELB GELD GENAU GERN GIFT
    GLAS GOLD GOLF GOTT GRAB GRAS GRAU GRUND GURT GUSS HAAR HAHN HAKEN HALB HALS HAND HART HASE
    HAUS HAUT HEFT HEIL HELD HELL HEMD HERD HERR HERZ HEUTE HIER HOCH HOHL HOLZ HORN HOSE HUHN
    HUND HUPE IDEE IGEL IMMER JAHR JEDE JETZT JUNG KAHN KALB KALT KAMM KANTE KARO KAUF KEIL KERN
    KIND KINN KINO KLAR KLEE KLUG KNIE KOCH KOHL KOPF KORB KORN KOST KRAN KRANK KREBS KUNST KURS
    KURZ KUSS LACK LAGE LAHM LAMM LAND LANG LAST LAUB LAUF LAUNE LAUT LEER LEHM LEHRE LEIB LEID
    LEIM LIEB LIED LINKS LIST LOCH LOCKE LOHN LUFT LUST MAHL MAIS MANN MARK MAST MATTE MAUS MEER
    MEHL MEHR MEIN MENGE MIETE MILD MOND MOOS MORD MOST MOTTE MUND MUSE NABEL NACKT NAHT NAME
    NARBE NASE NASS NEST NETT NETZ NEUN NICHT NOCH NOTE NUSS OBEN OBST OFEN OHNE OPER PAAR PACK
    PAKET PARK PASS PECH PELZ PFAD PILZ PLAN POST PULT PUMA RABE RAND RAST RAUCH RAUM REGEN REIF
    REIS RIESE RIND RING RIFF ROCK ROHR ROSA ROSE ROST RUCK RUDEL RUHE RUHM RUND SAAL SACK SAFT
    SAGE SAAT SALZ SAND SATT SATZ SAUM SEELE SEGEN SEHR SEIL SEIN SENF SIEB SIEG SINN SITZ SOFA
    SOHN SPORT STAB STALL STAMM STAR STEG STIL STOCK STOLZ STROH STUFE STUMM SUCHE SUMME SUMPF
    TABAK TAKT TANK TANZ TAXI TEIG TEIL TEST THEMA TIEF TIER TINTE TOLL TOPF TREU TROG TUCH TULPE
    TURM UFER VASE VIEL VIER VOLK VOLL WACH WAHL WAHR WALD WAND WARE WARM WEIN WEIT WELT WERT WEST
    WILD WIND WITZ WOCHE WOHL WOLF WORT WUNDE WURM ZAHL ZAHM ZAHN ZART ZAUN ZEHN ZEIT ZELT ZIEL
    ZINK ZOLL ZUNGE ZWEI ARZT AXT BÄR BÖSE BRÜCKE BÜRO DÜNN FÜNF FÜR GRÜN GRÖSSE HÖHE KÄSE KÖNIG
    KÜCHE LÖWE MÖHRE MÜDE MÜHLE RÜBE SÄGE SCHÖN SÜSS TÜR ÜBER WÄRME ZÄHNE
    ALTEN BIEGEN BIETEN BINDEN BITTEN BLEIBEN BRATEN BRAUCHEN BRENNEN DANKEN DECKEN DENKEN EILEN
    ENDEN ERBEN ESSEN FALLEN FANGEN FASSEN FEHLEN FEIERN FLIEHEN FOLGEN FRESSEN FRIEREN GEBEN
    GELTEN GRABEN GREIFEN HABEN HALTEN HASSEN HEBEN HEIZEN HUPEN JAGEN KAUEN KENNEN KLAGEN KOMMEN
    KOSTEN LASSEN LEHREN LEITEN LIEBEN LIEGEN LOBEN MEINEN MESSEN MIETEN NEHMEN NENNEN NICKEN
    PACKEN PASSEN PFLEGEN PLANEN PUTZEN RATEN RAUBEN REDEN REGNEN REISEN RENNEN RETTEN RIECHEN
    RUHEN SAMMELN SCHIEBEN SCHLAGEN SENDEN SETZEN SINKEN SOLLEN SPAREN SPRECHEN STEIGEN STELLEN
    STERBEN SUCHEN TEILEN TREFFEN WACHSEN WECKEN WEINEN WERDEN WERFEN WETTEN WISSEN WOLLEN ZIEHEN
    FÜHLEN FÜHREN FÜLLEN HÖREN LÖSEN MÖGEN MÜSSEN NÄHEN ÖFFNEN WÄHLEN ZÄHLEN KÖNNEN DRÜCKEN
    EINFACH GLEICH HÜBSCH NAHE OFFEN REIN SANFT SCHLANK SCHLECHT STEIF TROCKEN
  `),
    // Formes fléchies et mots voisins qu'un leurre formerait en changeant une ou deux lettres d'un
    // mot des catégories (relevés dans une liste de fréquence de l'allemand, noms propres écartés).
    ...wordList(`
    ABZUG ACHSE ACHT ACHTE AFFEN AKTE AKTEN ALLEM ALLEN ALLER ALLES ALTAR ALTE ALTES ANFALL ANGEL
    ANRUF ANTUN ARMER ARTEN ATME BACKE BACKEN BANGE BANKEN BARS BASE BASS BAUT BEIDE BEIDEN BEIM
    BEINE BEINEN BERGE BESSER BESTE BESTER BETA BETE BIBEL BIEG BIETE BILDER BINDE BINGO BISHER
    BIST BITT BLASE BLASEN BLASS BLEIB BLUTE BOGEN BOHNEN BOHREN BOMBE BORD BOTEN BOXER BRAUNE
    BRAVER BREIT BRILLE BRUST BUCHEN BUDE BULLE BUMM BURSCHE BUTLER CAMP CENT CLEVER COACH CODE
    COME COOL COPS DACHT DACHTE DACHTEN DAHER DAHIN DAMM DANKE DANN DARAN DARF DARIN DASS DATEN
    DAUER DEAL DECK DEGEN DEINE DEINEN DEINER DEINS DENEN DENK DENKST DENN DEREN DESSEN DESTO
    DEUTEN DICHT DICHTE DICHTER DICKE DICKEN DICKER DIEB DIEBE DIENE DIENSTEN DIES DIESE DINGE
    DINGEN DINGER DINNER DINO DOCH DOCK DOLCH DOLLAR DOOF DORT DRAUF DRAUS DREHE DROHT DUMMEN
    DUMMER DUMMES EBEN ECHTE ECHTER EDEL EDLE EGAL EHER EINE ELEGANT ENDET ERST ERSTE ERSTEN ERSTER
    ERSTES ERTRAGEN ESSE EURE EURO FAHR FAHRE FAHRER FALLE FAND FANDEN FANG FANGE FANS FARM FARMER
    FASSE FAST FAUCHEN FEDERN FEGEN FEHLER FEIER FEIGE FEINE FERNE FESTE FESTER FETTE FIEL FIES
    FIGUR FILME FIND FINDE FINDET FING FINGEN FISCH FISCHE FLOG FLOSS FLUCH FLURS FOLGE FOLTER
    FORMEL FORMEN FORT FRAGT FRESSE FREU FREUTE FRIST FROHE FRONT FUCK FUHREN FUTTER GABE GABEN
    GALERIE GANG GANGE GANZE GANZER GAUNER GEBE GEBET GEBT GEGEN GEHT GEIL GEILE GELITTEN GELL
    GENIE GENUG GERING GERNE GESTE GEWISSER GIBT GIER GILT GING GINGE GINGEN GITTER GLAUBE GREIF
    GRIPPE GROSSE GUCK GUCKE GUCKEN GUCKT GUTE GUTER HABE HABS HABT HACH HACKEN HACKER HAFT HAGEN
    HALBE HALF HALL HALLO HALT HALTE HAMBURGER HANDEL HANG HARTE HARTEN HARTER HASEN HASS HASSE
    HAST HATS HATTE HAUBE HAUCH HAUEN HAUSE HAUTE HEBEL HEBT HEER HEGT HEILE HEIM HEIMWEG HELFE
    HELFT HELLER HELM HENKER HERDE HERZEN HEUT HEXE HEXEN HIEB HILF HILFE HING HINTER HIRN HITZE
    HOFE HOFFE HOHE HOHEN HOHER HOHES HOLE HOLT HOLTE HOPP HOSEN HUMMER HUNDE HURRA INDEM INNEN
    IRGEND IRIS IRRE JACKEN JAGD JAGT JAHRE JAMMER JEDEM JEDEN JEDER JEDES JENE JENER JUBEL JUCKT
    JUHU JUNGE JUNGER JURY KAHL KAISER KALTE KAMEN KAMPF KANN KARRE KASSIEREN KAUFE KAUM KEHREN
    KEIN KEINE KEINEN KEINER KEINS KEKSE KENN KENNE KENNST KERL KERLE KERZEN KIDS KILLER KILO
    KINDER KIPPE KLAPPE KLARER KLASSE KLEBEN KLEIN KLEINE KLETTERT KLUGE KNEIPE KOCHE KOCHT KOHLE
    KOHLEN KOKS KOMA KOMM KRASSE KREISE KREISEN KREUZ KUGELN KUMMER KUMPEL KUNDE KUNDEN KURZE
    KURZEN KURZER LABEL LACH LACHE LACHER LACHT LADE LAGEN LANDEN LANDES LANDET LANGE LANGER LANZE
    LASS LASSE LASTER LAUFE LAUFT LAUTE LAUTEN LAUTER LEBE LEBER LEBT LEBTE LECK LECKEN LECKER
    LEGAL LEGT LEGTE LEIBE LEIDE LEIDEN LEIDER LEINE LEISER LEITE LEITET LERNE LERNTE LESE LETZTER
    LEUTE LEUTEN LEVEL LICHT LICHTER LIEBE LIEF LIEGE LIES LIGA LINK LINKE LISTE LITER LOCKEN
    LOCKER LORD LOSE LOTTE LUNGE MACH MACHE MACHEN MACHS MACHT MACHTE MACHTEN MAGER MAJOR MALE MAMI
    MANGEL MANNES MARKE MARSCH MASKE MASTER MATHE MAUL MEILE MEILEN MEINE MEINER MEINS MENSCH MERK
    MERKE MERKEN MESSE MICH MIENE MIES MIESE MINUS MISCH MIST MITTAG MITTEL MITTEN MOCHTE MODE
    MODEL MORDE MOTEL MOTTO MUMM MUNTER MUSS MUSTER MUTTI NACH NAGEL NAHM NAHMEN NAIV NAJA NARBEN
    NARR NARREN NATUR NEBEN NEHME NEIGE NEIN NENN NENNE NENNST NETTE NETTEN NETTER NEUER NICH NIERE
    NIMM NOBEL NONNE NOTEN NUDELN NULL ORDEN ORGAN ORTE ORTEN OSTEN PACKE PAKETE PANIK PANNE PANZER
    PAPA PAPI PAPS PARKEN PARTNER PASSE PASSIEREN PATER PENG PENNER PEST PFUND PIER PILLE PINK POOL
    PREISE PRESSE PROST PULS PUMPE PUPPEN QUER RACHE RACHEN RANG RANGER RASCH RASEN RATE RATTE RAUB
    RAUCHEN RAUF RAUS RECHT RECHTE RECHTEN RECHTER REDE REDET REDETE REGEL REGELN REIBEN REIFE
    REIFEN REIHE REIHEN REINE REINEN REINER REISE REITE REITER REITET REIZE REIZEN RENN REST RESTE
    RETTE RICHTE RICHTEN RICHTET RIEF RINGE RIPPE RISS ROCH ROCKEN ROLLEN ROSEN ROTE ROTEN ROTER
    ROTES ROUTE ROUTINE RUFE RUFT RUMMEL RUMPF RUNDE RUNTER RUTSCHE SACHE SACHEN SACHTE SAGT SAGTE
    SAMT SANG SARG SATAN SCHADE SCHAFE SCHAFF SCHALTEN SCHALTER SCHALTET SCHARFE SCHAUTE SCHEIBE
    SCHEINE SCHERZE SCHICK SCHIRM SCHISS SCHLACHT SCHLAG SCHLICHT SCHLIMMEN SCHLIMMER SCHLIMMES
    SCHLUCK SCHLUCKT SCHMERZ SCHMUCK SCHNEID SCHNEIDEN SCHNEIDET SCHON SCHREI SCHREIB SCHREIBEN
    SCHREIBER SCHREIN SCHREIT SCHRIE SCHUHE SCHULDEN SCHULDET SCHWANZ SCHWARM SCHWARZE SCHWEBEN
    SCHWEIG SCHWEIZER SCHWEREN SCHWERER SCHWERES SCHWERT SCHWERTER SCHWIMMER SCHWUL SECHS SEGEL
    SEHN SEHT SEID SEIDE SEIEN SEINE SEINEN SEINER SEIT SEITEN SENDER SETZ SHIRT SICH SICHER SIEGE
    SIEH SIND SING SINGE SINNE SITZE SOCKEN SODA SOLCH SOLL SOLLE SOMIT SONG SORG SORGE SORGEN
    SORTE SPANIER SPITZ SPRANG SPRITZE SPUREN STAHL STARB STARS START STATION STATT STECKE STECKT
    STEHE STEHT STELL STELLE STERBE STERNE STIEG STIEL STILLE STIRB STOPP STRANG STRENG STURZ SUCH
    SUCHT SUCHTE SUCHTEN SULTAN SUMMEN SUMMT SURREN TAGE TAGEN TAGES TANGO TANZE TASTE TATEN TAUB
    TAUFE TEAMS TEILCHEN TEILE TERMINE TESTE TEUER TEURE TEXT TIEFE TIERE TIMER TIPP TIPPE TITEL
    TODE TOLLE TOLLEN TOLLER TOLLES TONNE TONNEN TORE TOTAL TOTE TOTEN TOTER TOUR TRAFEN TRAGE TRAU
    TRAUT TRAUTE TREFFER TRETE TROST TROTTEL TURN TUST UNSER UNTER VATI VERMUTE VERSE VIEH VIELE
    VIRUS VOLLE VOLLEN VOLLER VORHER VORM VORN VORNE WACHE WACHEN WACHS WACHT WAFFE WAFFEN WAGE
    WAGT WAHN WAHRE WAHRER WANN WARD WARF WARME WARNE WARNEN WART WARTE WEDER WEGEN WEHEN WEHREN
    WEHTUN WEIB WEIBER WEIDE WEIL WEILCHEN WEILE WEINE WEIS WEISEN WEITE WEITEN WEITER WELCH WELCHE
    WELPE WENDE WENN WERD WERDE WERFE WERK WERTE WESEN WESSEN WETTE WIESO WILDE WILDEN WILDER WILL
    WILLE WINDE WIRD WIRF WIRKE WIRKEN WIRKUNG WIRT WISCH WITZE WOCHEN WODKA WOHN WOHNE WOMIT WORTE
    WUCHS WUCHT WUND WUNDER WURDE WURDEN WURF ZACK ZAHLE ZEHEN ZEIG ZEIGE ZEILE ZEITEN ZELLE ZEUGE
    ZIEH ZIEHE ZIELE ZIGARRE ZISCH ZOGEN ZONE
  `),
  ],

  // Suites de lettres qui choquent vraiment (insultes, sexe, racisme, excréments).
  rude: wordList(`
    ARSCH BASTARD BUMS FICK FOTZE FUCK HITLER HURE KACK NAZI NEGER NUTTE PENIS PIMMEL PISS PORN
    SCHEISS SCHLAMPE SEX SHIT SPAST TITTE TUNTE WICHS
  `),

  categories: [
    C('fruits', 'Obst', 'Früchten', 'nourriture', 'Apfel Birne Kirsche Erdbeere Banane Aprikose Ananas Mango Pflaume Traube Zitrone Himbeere Heidelbeere Wassermelone Johannisbeere Mandarine Pfirsich Litschi Papaya Brombeere Stachelbeere Granatapfel Nektarine Grapefruit Quitte Mirabelle Limette'),
    C('legumes', 'Gemüse', 'Gemüsesorten', 'nourriture', 'Karotte Lauch Radieschen Kohl Zucchini Aubergine Spinat Brokkoli Sellerie Artischocke Gurke Spargel Zwiebel Pastinake Blumenkohl Rosenkohl Kartoffel Erbse Kürbis Bohne Kohlrabi Wirsing Rotkohl Mangold Rettich Linse'),
    C('desserts', 'Dessert', 'Desserts', 'nourriture', 'Kuchen Torte Pfannkuchen Pudding Sorbet Keks Brownie Muffin Waffel Tiramisu Strudel Baiser Makrone Kompott Mousse Eisbecher Milchreis Windbeutel Götterspeise Lebkuchen Donut Zimtschnecke Streuselkuchen Parfait Crumble'),
    C('boissons', 'Getränk', 'Getränken', 'nourriture', 'Kaffee Tee Milch Limonade Saft Wasser Sirup Cola Kakao Schorle Smoothie Milchshake Eistee Espresso Cappuccino Sprudel Kräutertee Apfelsaft Buttermilch Punsch Bier Wein Sekt Mineralwasser Brause'),
    C('sauvages', 'Wildtier', 'Wildtieren', 'animaux', 'Löwe Tiger Bär Wolf Fuchs Giraffe Zebra Elefant Affe Hirsch Wildschwein Panther Nilpferd Nashorn Känguru Gorilla Dachs Biber Eichhörnchen Igel Gepard Luchs Leopard Koala Waschbär Elch Reh Krokodil Otter'),
    C('ferme', 'Bauernhoftier', 'Bauernhoftieren', 'animaux', 'Kuh Schwein Schaf Ziege Pferd Esel Kaninchen Stier Kalb Lamm Pony Maultier Ochse Ferkel Fohlen Hengst Stute Zicklein Widder Rind Alpaka'),
    C('oiseaux', 'Vogel', 'Vögeln', 'animaux', 'Spatz Taube Amsel Adler Eule Krähe Rabe Meise Rotkehlchen Schwan Papagei Falke Pelikan Flamingo Pinguin Geier Möwe Kolibri Specht Pfau Storch Reiher Elster Habicht Fink Kuckuck Kranich Uhu Lerche Schwalbe Nachtigall Bussard'),
    C('poissons', 'Fisch', 'Fischen', 'animaux', 'Lachs Thunfisch Forelle Hai Sardine Karpfen Hecht Dorade Hering Aal Makrele Schwertfisch Kabeljau Zander Rochen Wels Goldfisch Sprotte Seelachs Heilbutt Steinbutt Sardelle Piranha Stör Seeteufel Flunder Dorsch Seezunge'),
    C('insectes', 'Insekt', 'Insekten', 'animaux', 'Biene Ameise Schmetterling Mücke Wespe Marienkäfer Libelle Heuschrecke Grille Käfer Floh Zikade Hornisse Termite Hummel Gottesanbeterin Glühwürmchen Motte Kakerlake Wanze Laus Schabe Mistkäfer Hirschkäfer Stechmücke'),
    C('meubles', 'Möbelstück', 'Möbelstücken', 'objets', 'Tisch Stuhl Schrank Bett Sofa Sessel Kommode Regal Hocker Kleiderschrank Couch Truhe Nachttisch Bücherregal Schreibtisch Liegestuhl Vitrine Schaukelstuhl Hochbett Sitzbank Etagenbett Ohrensessel Barhocker Esstisch Wiege'),
    C('cuisine', 'Küchenutensil', 'Küchenutensilien', 'objets', 'Topf Pfanne Schöpfkelle Schneebesen Pfannenwender Sieb Löffel Gabel Messer Schüssel Reibe Trichter Teekanne Wasserkocher Sparschäler Korkenzieher Wok Nudelholz Kochlöffel Schneidebrett Bräter Mixer Backblech Teesieb Dosenöffner Knoblauchpresse'),
    C('outils', 'Werkzeug', 'Werkzeugen', 'objets', 'Hammer Schraubenzieher Säge Zange Bohrmaschine Schaufel Rechen Axt Hobel Meißel Maurerkelle Spaten Hacke Schraubenschlüssel Feile Spitzhacke Brecheisen Schraubstock Wasserwaage Zollstock Bohrer Akkuschrauber Beil Heugabel Gartenschere Lötkolben Schubkarre'),
    C('instruments', 'Musikinstrument', 'Musikinstrumenten', 'objets', 'Klavier Geige Gitarre Flöte Trompete Harfe Trommel Cello Saxofon Klarinette Akkordeon Oboe Xylofon Banjo Kontrabass Ukulele Orgel Mandoline Posaune Tuba Mundharmonika Tamburin Fagott Querflöte Blockflöte Bratsche Schlagzeug Pauke Dudelsack Zither Triangel'),
    C('vetements', 'Kleidungsstück', 'Kleidungsstücken', 'objets', 'Hemd Hose Rock Kleid Mantel Jacke Pullover Socke Schal Weste Latzhose Regenmantel Strumpfhose Anorak Anzug Strickjacke Bluse Jeans Schlafanzug Unterhemd Badeanzug Bademantel Overall Krawatte Handschuh Mütze Gürtel Blazer Sakko Poncho'),
    C('arbres', 'Baum', 'Bäumen', 'nature', 'Eiche Tanne Buche Birke Ahorn Pappel Platane Esche Zeder Olivenbaum Palme Kastanie Kirschbaum Apfelbaum Walnussbaum Akazie Ulme Linde Fichte Lärche Eibe Erle Zypresse Mammutbaum Eukalyptus'),
    C('fleurs', 'Blume', 'Blumen', 'nature', 'Tulpe Gänseblümchen Margerite Mohnblume Sonnenblume Lilie Orchidee Narzisse Maiglöckchen Lavendel Pfingstrose Jasmin Dahlie Geranie Kornblume Vergissmeinnicht Hortensie Gladiole Rose Veilchen Krokus Schneeglöckchen Begonie Petunie Butterblume Löwenzahn Aster Primel Stiefmütterchen Ringelblume Seerose Edelweiß'),
    C('meteo', 'Wetter', 'Wetterwörtern', 'nature', 'Regen Schnee Wind Gewitter Wolke Nebel Hagel Donner Sonnenschein Glatteis Sturm Regenbogen Nieselregen Schauer Frost Orkan Tornado Hitzewelle Blitz Raureif Platzregen Schneesturm Brise Wolkenbruch Graupel Unwetter Wirbelsturm'),
    C('metiers', 'Beruf', 'Berufen', 'societe', 'Bäcker Arzt Feuerwehrmann Briefträger Klempner Friseur Krankenpfleger Pilot Koch Gärtner Schreiner Zahnarzt Architekt Elektriker Polizist Tierarzt Journalist Kellner Maurer Buchhändler Apotheker Bauer Metzger Astronaut Lehrer Anwalt Mechaniker Kassierer Richter Fotograf Schneider Dachdecker Maler'),
    C('sports', 'Sportart', 'Sportarten', 'societe', 'Fußball Tennis Rugby Schwimmen Judo Skifahren Golf Boxen Fechten Radsport Basketball Volleyball Handball Rudern Surfen Karate Klettern Leichtathletik Badminton Reiten Tauchen Eiskunstlauf Turnen Hockey Baseball Segeln Bogenschießen Tischtennis Eishockey'),
    C('transports', 'Verkehrsmittel', 'Verkehrsmitteln', 'societe', 'Auto Fahrrad Zug Flugzeug Boot Bus Lastwagen U-Bahn Straßenbahn Motorrad Roller Hubschrauber Taxi Rakete Schiff Traktor Fähre Segelboot Kutsche Lieferwagen Krankenwagen Wohnmobil Seilbahn Moped Tretroller Kreuzfahrtschiff U-Boot'),
    C('batiments', 'Gebäude', 'Gebäuden', 'societe', 'Haus Schule Kirche Burg Rathaus Krankenhaus Bahnhof Fabrik Museum Theater Stadion Leuchtturm Windmühle Hütte Garage Scheune Gefängnis Kino Schwimmbad Kaserne Bibliothek Hochhaus Kathedrale Hotel Turm Supermarkt Lagerhalle Palast Moschee Tempel Bauernhaus'),
    C('famille', 'Familie', 'Familienmitgliedern', 'societe', 'Vater Mutter Bruder Schwester Onkel Tante Cousin Cousine Neffe Nichte Sohn Tochter Pate Patin Opa Oma Großvater Großmutter Ehemann Ehefrau Schwiegersohn Schwiegertochter Enkel Enkelin Stiefvater Schwager Schwägerin'),
    C('corps', 'Körperteil', 'Körperteilen', 'divers', 'Arm Bein Hand Fuß Kopf Knie Ellbogen Schulter Finger Nase Mund Ohr Auge Knöchel Handgelenk Hals Rücken Bauch Stirn Kinn Wange Zeh Hüfte Nacken Daumen Ferse Lippe Zunge Zahn Augenbraue'),
    C('pays', 'Land', 'Ländern', 'divers', 'Frankreich Spanien Italien Japan Brasilien Kanada Marokko China Indien Mexiko Peru Ägypten Schweden Griechenland Portugal Norwegen Kenia Argentinien Irland Australien Deutschland Belgien Schweiz Österreich Polen Dänemark Finnland Türkei'),
    C('couleurs', 'Farbe', 'Farben', 'divers', 'Rot Blau Grün Gelb Schwarz Weiß Grau Lila Beige Türkis Indigo Purpur Ocker Cyan Magenta Braun Rosa Violett Khaki Scharlachrot Himmelblau Olivgrün Dunkelblau Hellgrün Marineblau Mintgrün'),
    C('epices', 'Gewürz oder Kraut', 'Gewürzen oder Kräutern', 'nourriture', 'Zimt Vanille Safran Kreuzkümmel Curry Muskat Ingwer Kurkuma Thymian Basilikum Petersilie Schnittlauch Rosmarin Oregano Estragon Koriander Dill Salbei Kardamom Anis Pfeffer Kümmel Majoran Minze Lorbeer Liebstöckel Kerbel Kresse'),
    C('fromages', 'Käse', 'Käsesorten', 'nourriture', 'Camembert Brie Roquefort Emmentaler Mozzarella Parmesan Feta Cheddar Gouda Mascarpone Ricotta Gorgonzola Edamer Tilsiter Bergkäse Limburger Harzer Butterkäse Gruyère Appenzeller Halloumi Pecorino Manchego Frischkäse Hüttenkäse Ziegenkäse'),
    C('ecole', 'Schulbedarf', 'Schulsachen', 'objets', 'Bleistift Heft Radiergummi Kugelschreiber Füller Federmäppchen Schulranzen Ordner Filzstift Textmarker Anspitzer Tafel Kreide Taschenrechner Lineal Zirkel Geodreieck Buntstift Kleber Klebestift Notizblock Zeichenblock Malkasten Locher Schnellhefter Karteikarte'),
    C('jouets', 'Spielzeug', 'Spielsachen', 'objets', 'Puppe Ball Kreisel Teddybär Puzzle Jo-Jo Murmel Domino Marionette Kaleidoskop Bauklotz Plüschtier Puppenhaus Spielzeugauto Bumerang Trampolin Roboter Schaukelpferd Kuscheltier Steckenpferd Hüpfball Seifenblase Knete Wasserpistole'),
    C('paysages', 'Landschaft', 'Landschaften', 'nature', 'Berg Hügel Tal Ebene Klippe Vulkan Wüste Wald See Fluss Ozean Insel Wasserfall Düne Schlucht Sumpf Wiese Strand Höhle Bucht Gletscher Moor Lagune Steppe Heide Oase Fjord Canyon Halbinsel Bach Meer Küste Savanne'),
    C('espace', 'Weltall', 'Wörtern rund ums Weltall', 'nature', 'Planet Komet Galaxie Asteroid Satellit Meteorit Mond Universum Sternbild Sonnenfinsternis Umlaufbahn Krater Jupiter Saturn Venus Neptun Uranus Mars Merkur Milchstraße Sonnensystem Raumstation Sternschnuppe Mondfinsternis Weltraum Raumfahrt Astronomie'),
    C('formes', 'Form', 'Formen', 'divers', 'Kreis Quadrat Dreieck Rechteck Raute Oval Trapez Sechseck Fünfeck Achteck Würfel Kugel Pyramide Parallelogramm Halbkreis Prisma Ellipse Viereck Quader Spirale Kegel'),
    C('calendrier', 'Tag oder Monat', 'Tagen oder Monaten', 'divers', 'Montag Dienstag Mittwoch Donnerstag Freitag Samstag Sonntag Januar Februar März April Mai Juni Juli September Oktober November Dezember'),
    C('emotions', 'Gefühl', 'Gefühlen', 'divers', 'Freude Traurigkeit Wut Angst Überraschung Ekel Stolz Scham Eifersucht Langeweile Zärtlichkeit Dankbarkeit Heimweh Schreck Begeisterung Schüchternheit Einsamkeit Neid Zorn Hoffnung Sehnsucht Zufriedenheit Mitleid Nervosität'),
  ],

  sentences: [
    // Palier 1 : des phrases courtes.
    [
      ['Schnee ist kalt.', 'Schnee ist heiß.'],
      ['Feuer ist heiß.', 'Feuer ist eiskalt.'],
      ['Eine Katze hat vier Beine.', 'Eine Katze hat sechs Beine.'],
      ['Vögel haben Federn.', 'Vögel haben Schuppen.'],
      ['Milch ist weiß.', 'Milch ist grün.'],
      ['Eine Woche hat sieben Tage.', 'Eine Woche hat zehn Tage.'],
      ['Fische leben im Wasser.', 'Fische leben auf Bäumen.'],
      ['Zitronen sind gelb.', 'Zitronen sind blau.'],
      ['Ein Auto hat Räder.', 'Ein Auto hat Flügel.'],
      ['Das Gras ist grün.', 'Das Gras ist lila.'],
      ['Wir schlafen im Bett.', 'Wir schlafen im Backofen.'],
      ['Das Meer ist salzig.', 'Das Meer ist süß.'],
      ['Ein Quadrat hat vier Seiten.', 'Ein Quadrat hat drei Seiten.'],
      ['Kühe geben Milch.', 'Kühe geben Wolle.'],
      ['Ein Jahr hat zwölf Monate.', 'Ein Jahr hat acht Monate.'],
      ['Wir trinken aus Gläsern.', 'Wir trinken aus Gabeln.'],
      ['Eis schmilzt in der Sonne.', 'Eis wird in der Sonne hart.'],
      ['Der Hund bellt.', 'Der Hund miaut.'],
      ['Bienen machen Honig.', 'Bienen machen Milch.'],
      ['Ein Dreieck hat drei Ecken.', 'Ein Dreieck hat fünf Ecken.'],
      ['Bücher kann man lesen.', 'Bücher kann man trinken.'],
      ['Der Apfel ist eine Frucht.', 'Der Apfel ist ein Werkzeug.'],
      ['Das Klavier ist ein Instrument.', 'Das Klavier ist ein Tier.'],
      ['Berlin liegt in Deutschland.', 'Berlin liegt in Spanien.'],
      ['Eine Hand hat fünf Finger.', 'Eine Hand hat sieben Finger.'],
      ['Wir sehen mit den Augen.', 'Wir sehen mit den Ohren.'],
      ['Wir hören mit den Ohren.', 'Wir hören mit den Knien.'],
      ['Ein junger Hund heißt Welpe.', 'Ein junger Hund heißt Küken.'],
      ['Erdbeeren sind rot.', 'Erdbeeren sind schwarz.'],
      ['Schafe haben Wolle.', 'Schafe haben Federn.'],
      ['Zwei und zwei ist vier.', 'Zwei und zwei ist fünf.'],
      ['Züge fahren auf Schienen.', 'Züge fahren auf dem Wasser.'],
      ['Ein Fahrrad hat zwei Räder.', 'Ein Fahrrad hat fünf Räder.'],
      ['Der Löwe ist ein Tier.', 'Der Löwe ist eine Pflanze.'],
      ['Regen macht nass.', 'Regen macht trocken.'],
      ['Bäume haben Blätter.', 'Bäume haben Zähne.'],
      ['Montag kommt nach Sonntag.', 'Montag kommt nach Mittwoch.'],
      ['Zucker ist süß.', 'Zucker ist salzig.'],
      ['Wir schreiben mit einem Stift.', 'Wir schreiben mit einer Gabel.'],
      ['Enten können schwimmen.', 'Enten können stricken.'],
    ],
    // Palier 2 : plus longues, avec des comparaisons.
    [
      ['Ein Elefant ist viel schwerer als eine Maus.', 'Eine Maus ist viel schwerer als ein Elefant.'],
      ['Wasser gefriert, wenn es sehr kalt ist.', 'Wasser gefriert, wenn es sehr heiß ist.'],
      ['Eine Stunde hat sechzig Minuten.', 'Eine Stunde hat hundert Minuten.'],
      ['Eisbären leben in kalten Gegenden.', 'Eisbären leben in heißen Wüsten.'],
      ['Die Sonne geht im Osten auf.', 'Die Sonne geht im Westen auf.'],
      ['Die Giraffe hat einen sehr langen Hals.', 'Die Giraffe hat einen sehr kurzen Hals.'],
      ['Der Februar ist der kürzeste Monat des Jahres.', 'Der Februar ist der längste Monat des Jahres.'],
      ['Bei Regen spannt man einen Schirm auf.', 'Mit einem Schirm schneidet man Brot.'],
      ['Ein Dutzend Eier sind zwölf Eier.', 'Ein Dutzend Eier sind zwanzig Eier.'],
      ['Das Herz pumpt das Blut durch den Körper.', 'Die Haare pumpen das Blut durch den Körper.'],
      ['Ein Kilometer ist länger als ein Meter.', 'Ein Meter ist länger als ein Kilometer.'],
      ['Aus Raupen werden Schmetterlinge.', 'Aus Raupen werden später Vögel.'],
      ['Brot wird aus Mehl gebacken.', 'Brot wird aus Sand gebacken.'],
      ['Am Nordpol ist es sehr kalt.', 'Am Nordpol ist es sehr heiß.'],
      ['Die Schildkröte ist langsamer als der Hase.', 'Die Schildkröte ist schneller als das Pferd.'],
      ['Der Zahnarzt kümmert sich um die Zähne.', 'Der Zahnarzt repariert die Autos.'],
      ['Pflanzen brauchen Licht zum Wachsen.', 'Pflanzen wachsen am besten im Dunkeln.'],
      ['Aus Milch kann man Käse machen.', 'Aus Orangensaft macht man Käse.'],
      ['Eine Minute hat sechzig Sekunden.', 'Eine Minute hat zehn Sekunden.'],
      ['Ein Flugzeug fliegt durch die Luft.', 'Ein Flugzeug fährt unter dem Meer.'],
      ['Die Erde dreht sich um die Sonne.', 'Die Sonne dreht sich um die Erde.'],
      ['Der Bäcker backt Brot und Brötchen.', 'Der Bäcker repariert Autos und Lastwagen.'],
      ['Delfine tauchen zum Atmen an die Oberfläche.', 'Delfine müssen niemals Luft atmen.'],
      ['Im Herbst verlieren viele Bäume ihre Blätter.', 'Im Frühling verlieren alle Bäume ihre Blätter.'],
      ['Ein Korken schwimmt auf dem Wasser.', 'Ein Eisenschlüssel schwimmt auf dem Wasser.'],
      ['Eulen jagen meistens in der Nacht.', 'Eulen jagen meistens zur Mittagszeit.'],
      ['Zehn ist eine größere Zahl als sieben.', 'Sieben ist eine größere Zahl als zehn.'],
      ['Der Briefträger bringt Briefe in die Briefkästen.', 'Der Briefträger bringt Briefe in die Flüsse.'],
      ['Schnecken kriechen sehr langsam.', 'Schnecken sind schneller als ein Auto.'],
      ['Nudeln kocht man in heißem Wasser.', 'Nudeln kocht man in eiskaltem Wasser.'],
      ['Das Zebra hat schwarze und weiße Streifen.', 'Das Zebra hat rote und grüne Punkte.'],
      ['Der Mittag liegt in der Mitte des Tages.', 'Die Mitternacht liegt in der Mitte des Tages.'],
      ['Ein Orchester macht zusammen Musik.', 'Ein Orchester spielt zusammen Fußball.'],
      ['Der Mond kreist um die Erde.', 'Die Erde kreist um den Mond.'],
      ['Ein Liter Wasser wiegt etwa ein Kilo.', 'Ein Liter Wasser wiegt etwa zehn Kilo.'],
      ['Aus den Wolken fällt der Regen.', 'Aus den Bergen fällt der Regen.'],
      ['Ein Jahrhundert dauert hundert Jahre.', 'Ein Jahrhundert dauert zehn Jahre.'],
      ['Die Feuerwehr löscht Brände.', 'Die Feuerwehr legt Brände.'],
      ['Spinnen haben acht Beine.', 'Spinnen haben zwei Beine.'],
      ['In Deutschland ist der Winter meist kälter als der Sommer.', 'In Deutschland ist der Sommer meist kälter als der Winter.'],
    ],
    // Palier 3 : des négations et de petits raisonnements, à lire jusqu'au bout.
    [
      ['Ein Fisch überlebt nicht lange ohne Wasser.', 'Ein Fisch braucht nie Wasser zum Leben.'],
      ['Es stimmt nicht, dass Katzen bellen.', 'Es stimmt, dass Katzen bellen.'],
      ['Schlangen haben keine Beine.', 'Schlangen haben vier Beine.'],
      ['Eine Woche hat nicht acht Tage.', 'Eine Woche hat nicht sieben Tage.'],
      ['Eis ist nicht heiß.', 'Eis ist nicht kalt.'],
      ['Nicht alle Hunde sind schwarz.', 'Alle Hunde ohne Ausnahme sind schwarz.'],
      ['Kein Dreieck hat vier Seiten.', 'Manche Dreiecke haben vier Seiten.'],
      ['Wenn alle Katzen Tiere sind, ist meine Katze ein Tier.', 'Wenn alle Katzen Tiere sind, sind alle Tiere Katzen.'],
      ['Es ist falsch, dass ein Quadrat fünf Seiten hat.', 'Es ist falsch, dass ein Quadrat vier Seiten hat.'],
      ['Nicht alle Vögel können fliegen.', 'Alle Vögel ohne Ausnahme können fliegen.'],
      ['Weder Löwen noch Tiger fressen nur Gras.', 'Löwen und Tiger fressen nur Gras.'],
      ['Eine Minute ist nicht länger als eine Stunde.', 'Eine Stunde ist nicht länger als eine Minute.'],
      ['Ohne Wasser welken Pflanzen irgendwann.', 'Ohne Wasser wachsen Pflanzen schneller.'],
      ['Niemand kann ohne Ausrüstung unter Wasser atmen.', 'Jeder kann ohne Ausrüstung unter Wasser atmen.'],
      ['Kein einziger Monat hat vierzig Tage.', 'Mindestens ein Monat hat vierzig Tage.'],
      ['Mit den Füßen schreibt man normalerweise nicht.', 'Mit den Händen schreibt man normalerweise nicht.'],
      ['Eine gerade Zahl ist nie ungerade.', 'Eine gerade Zahl ist manchmal ungerade.'],
      ['Es ist nicht unmöglich, den Mond am Tag zu sehen.', 'Es ist unmöglich, den Mond am Tag zu sehen.'],
      ['Sieben ist keine gerade Zahl.', 'Acht ist keine gerade Zahl.'],
      ['Direkt vor Dienstag kommt Montag, nicht Mittwoch.', 'Direkt vor Dienstag kommt Mittwoch, nicht Montag.'],
      ['Eine Ameise ist nicht größer als ein Hund.', 'Ein Hund ist nicht größer als eine Ameise.'],
      ['Das Gegenteil von „heiß“ ist nicht „warm“.', 'Das Gegenteil von „heiß“ ist nicht „kalt“.'],
      ['Das Wort „Hund“ enthält kein O.', 'Das Wort „Hund“ enthält kein U.'],
      ['Zehn minus drei ist nicht acht.', 'Zehn minus drei ist nicht sieben.'],
      ['Ist Paul größer als Lea und ich größer als Paul, bin ich größer als Lea.', 'Ist Paul größer als Lea und ich größer als Paul, ist Lea größer als ich.'],
      ['Nicht alle Rosen sind rot.', 'Alle Rosen ohne Ausnahme sind rot.'],
      ['Ein Kind ist nie älter als seine Eltern.', 'Ein Kind ist immer älter als seine Eltern.'],
      ['Den Wecker stellt man zum Aufstehen, nicht zum Schlafengehen.', 'Den Wecker stellt man zum Schlafengehen, nicht zum Aufstehen.'],
      ['Das Wort „Sonne“ beginnt nicht mit dem Buchstaben L.', 'Das Wort „Sonne“ beginnt nicht mit dem Buchstaben S.'],
      ['Auf einer Tanne wachsen keine Äpfel.', 'Auf einer Tanne wachsen oft Äpfel.'],
      ['Eine Zahl über zehn ist nie kleiner als fünf.', 'Eine Zahl über zehn ist manchmal kleiner als fünf.'],
      ['Gelb und Rot gemischt ergibt kein Blau.', 'Gelb und Rot gemischt ergibt kein Orange.'],
      ['Nach Donnerstag kommt nicht Samstag, sondern Freitag.', 'Nach Donnerstag kommt nicht Freitag, sondern Samstag.'],
      ['Ein Würfel hat keine runde Fläche.', 'Ein Würfel hat keine quadratische Fläche.'],
      ['Eine Hälfte ist nicht kleiner als ein Viertel.', 'Ein Viertel ist nicht kleiner als eine Hälfte.'],
      ['Das Doppelte von vier ist nicht sechs.', 'Das Doppelte von vier ist nicht acht.'],
      ['Wenn morgen Samstag ist, ist heute nicht Montag.', 'Wenn morgen Samstag ist, ist heute Montag.'],
      ['Ein Monat hat nicht mehr Tage als ein Jahr.', 'Ein Monat hat mehr Tage als ein Jahr.'],
      ['Wenn es friert, wird das Wasser im See nicht wärmer.', 'Wenn es friert, wird das Wasser im See kochend heiß.'],
      ['Nicht die Kuh legt Eier, sondern das Huhn.', 'Nicht das Huhn legt Eier, sondern die Kuh.'],
    ],
    // Palier 4 : des phrases à rallonge, l'erreur peut se cacher tout au bout.
    [
      ['Katzen schlafen oft am Tag, und im Halbdunkel sehen sie besser als wir Menschen.', 'Katzen schlafen oft am Tag, und im Halbdunkel sehen sie schlechter als wir Menschen.'],
      ['Die Sonne geht im Osten auf, steht gegen Mittag am höchsten und geht im Westen unter.', 'Die Sonne geht im Osten auf, steht gegen Mittag am höchsten und geht im Osten unter.'],
      ['Ein Jahr hat zwölf Monate, und die meisten Monate haben dreißig oder einunddreißig Tage.', 'Ein Jahr hat zwölf Monate, und die meisten Monate haben zwanzig oder einundzwanzig Tage.'],
      ['Für ein Rührei schlägt man Eier auf, verquirlt sie und brät sie dann in einer Pfanne.', 'Für ein Rührei schlägt man Eier auf, verquirlt sie und gart sie dann im Gefrierschrank.'],
      ['Bienen fliegen von Blüte zu Blüte und tragen Pollen, was den Pflanzen hilft, Früchte zu bilden.', 'Bienen fliegen von Blüte zu Blüte und tragen Pollen, was die Pflanzen daran hindert, Früchte zu bilden.'],
      ['Mischt man blaue und gelbe Farbe, erhält man Grün, die Farbe des Grases im Frühling.', 'Mischt man blaue und gelbe Farbe, erhält man Rot, die Farbe von reifen Tomaten im Sommer.'],
      ['Wale leben im Meer, müssen aber zum Atmen immer wieder an die Wasseroberfläche kommen.', 'Wale leben im Meer und atmen unter Wasser die ganze Zeit durch Kiemen, genau wie Fische.'],
      ['In Deutschland beginnt der Winter im Dezember, und der Frühling beginnt im März.', 'In Deutschland beginnt der Winter im Dezember, und der Frühling beginnt im Juli.'],
      ['Brot macht man aus Mehl, Wasser, Salz und Hefe, und dann wird es im Ofen gebacken.', 'Brot macht man aus Mehl, Wasser, Salz und Hefe, und dann wird es im Kühlschrank gebacken.'],
      ['Auf einer Uhr zeigt der kleine Zeiger die Stunden und der große Zeiger die Minuten.', 'Auf einer Uhr zeigt der große Zeiger die Stunden und der kleine Zeiger die Minuten.'],
      ['Über die Straße geht man bei Grün, und vorher schaut man noch einmal nach beiden Seiten.', 'Über die Straße geht man bei Rot, und man rennt einfach los, ohne nach links zu schauen.'],
      ['Frösche beginnen ihr Leben als Kaulquappen, die im Wasser leben, bis ihr Schwanz verschwindet.', 'Frösche beginnen ihr Leben als Kaulquappen, die im Wasser leben, bis ihnen Federn wachsen.'],
      ['Aus Kuhmilch macht man Butter, Sahne, Joghurt und viele verschiedene Sorten Käse.', 'Aus Kuhmilch macht man Butter, Sahne, Joghurt und viele verschiedene Sorten Marmelade.'],
      ['Der Dezember endet am Einunddreißigsten, und der Tag danach ist der erste Januar.', 'Der Dezember endet am Einunddreißigsten, und der Tag danach ist der erste Februar.'],
      ['Die Milchzähne fallen in der Kindheit aus und machen Platz für die bleibenden Zähne.', 'Die bleibenden Zähne fallen in der Kindheit aus und machen Platz für die Milchzähne.'],
      ['Ein Thermometer misst die Temperatur, und eine Waage zeigt an, wie schwer etwas ist.', 'Ein Thermometer misst die Temperatur, und eine Waage zeigt an, wie spät es gerade ist.'],
      ['Auf Meereshöhe kocht Wasser bei hundert Grad Celsius, und bei minus zehn Grad ist es gefroren.', 'Auf Meereshöhe kocht Wasser bei hundert Grad Celsius, und bei plus fünfzig Grad ist es gefroren.'],
      ['Wenn in Deutschland Nacht ist, ist auf der anderen Seite der Erde oft gerade Tag.', 'Wenn in Deutschland Nacht ist, ist überall sonst auf der Erde gerade auch Nacht.'],
      ['Das Herz schlägt schneller, wenn man rennt, und langsamer, wenn man sich ausruht.', 'Das Herz schlägt schneller, wenn man sich ausruht, und langsamer, wenn man rennt.'],
      ['Ein Regenbogen erscheint oft, wenn die Sonne scheint, während es noch regnet.', 'Ein Regenbogen erscheint oft mitten in der Nacht, ohne Sonne und ohne Regen.'],
      ['Der Mond leuchtet nachts, weil er das Licht der Sonne zu uns zurückwirft.', 'Der Mond leuchtet nachts, weil er sein eigenes Licht erzeugt, wie eine Lampe.'],
      ['Im Sommer sind die Blätter grün, und im Herbst werden viele gelb und fallen ab.', 'Im Sommer sind die Blätter grün, und im Frühling werden viele gelb und fallen ab.'],
      ['Fledermäuse schlafen tagsüber kopfüber und jagen in der Nacht nach Insekten.', 'Fledermäuse schlafen nachts kopfüber und jagen am hellen Mittag nach Insekten.'],
      ['Ein Kilo Federn wiegt genauso viel wie ein Kilo Blei, auch wenn es mehr Platz braucht.', 'Ein Kilo Federn wiegt viel weniger als ein Kilo Blei, weil Federn ja so leicht sind.'],
      ['Ein Dreieck hat drei Seiten, ein Quadrat hat vier, und ein Sechseck hat sechs.', 'Ein Dreieck hat drei Seiten, ein Quadrat hat vier, und ein Sechseck hat acht.'],
      ['Grüne Pflanzen brauchen Licht, Wasser und Luft, um ihre eigene Nahrung herzustellen.', 'Grüne Pflanzen brauchen Licht, Wasser und Puderzucker, um ihre eigene Nahrung herzustellen.'],
      ['Ein Schachbrett hat acht Reihen mit je acht hellen und dunklen Feldern, also vierundsechzig Felder.', 'Ein Schachbrett hat acht Reihen mit je acht hellen und dunklen Feldern, also achtzig Felder.'],
      ['Schnecken tragen ihr Haus auf dem Rücken und hinterlassen eine glänzende Spur.', 'Schnecken tragen ihr Haus auf dem Rücken und hinterlassen kleine Fußspuren.'],
      ['Ein Klavier hat weiße und schwarze Tasten, und man spielt es mit den Fingern.', 'Ein Klavier hat weiße und schwarze Tasten, und man spielt es, indem man hineinbläst.'],
      ['Der Atlantik liegt zwischen Europa und Amerika, und ein Flugzeug überquert ihn in einigen Stunden.', 'Der Atlantik liegt zwischen Europa und Amerika, und man überquert ihn in einigen Stunden zu Fuß.'],
      ['Wenn man Fieber hat, steigt die Temperatur des Körpers über den normalen Wert.', 'Wenn man Fieber hat, sinkt die Temperatur des Körpers weit unter den normalen Wert.'],
      ['Junge Kängurus wachsen mehrere Monate lang im Beutel ihrer Mutter heran.', 'Junge Kängurus wachsen mehrere Monate lang in einem Nest hoch oben im Baum heran.'],
      ['Ein Wörterbuch ordnet die Wörter alphabetisch, vom Buchstaben A bis zum Buchstaben Z.', 'Ein Wörterbuch ordnet die Wörter alphabetisch, vom Buchstaben Z bis zum Buchstaben A.'],
      ['Beim Fußball darf nur der Torwart den Ball während des Spiels mit den Händen fangen.', 'Beim Fußball dürfen alle Spieler den Ball während des Spiels mit den Händen fangen.'],
      ['Der Nil ist ein sehr langer Fluss in Afrika, der durch Ägypten bis ins Meer fließt.', 'Der Nil ist ein sehr langer Fluss in Afrika, der durch Norwegen bis ins Meer fließt.'],
      ['Wenn eine Schildkröte Angst hat, zieht sie oft Kopf und Beine in ihren Panzer ein.', 'Wenn eine Schildkröte Angst hat, lässt sie ihren Panzer liegen und rennt schnell davon.'],
      ['Ein Elektroauto lädt man auf, indem man es an eine Steckdose anschließt, ähnlich wie ein Handy.', 'Ein Elektroauto lädt man auf, indem man seinen Tank mit Wasser füllt, ähnlich wie eine Gießkanne.'],
      ['Die Giraffe ist das Tier mit dem längsten Hals, und sie frisst die Blätter hoch oben in den Bäumen.', 'Die Giraffe ist das Tier mit dem längsten Hals, und sie frisst die Fische ganz unten in den Flüssen.'],
      ['Der Frühling kommt nach dem Winter, dann folgen Sommer und Herbst und schließlich wieder der Winter.', 'Der Frühling kommt nach dem Sommer, dann folgen Winter und Herbst und schließlich wieder der Sommer.'],
      ['Eine Sanduhr misst die Zeit mit Sand, der langsam von oben nach unten rieselt.', 'Eine Sanduhr misst die Zeit mit Sand, der langsam von unten nach oben rieselt.'],
    ],
    // Palier 5 : de la logique (« kein », « mindestens », « wenn… dann », doubles négations, petits calculs).
    [
      ['Wenn alle Vögel Federn haben und die Amsel ein Vogel ist, dann hat die Amsel Federn.', 'Wenn alle Vögel Federn haben und die Katze kein Vogel ist, dann hat die Katze Federn.'],
      ['Es ist nicht falsch, dass zwei plus zwei vier ergibt.', 'Es ist nicht falsch, dass zwei plus zwei fünf ergibt.'],
      ['Kein Monat des Jahres hat weniger als achtundzwanzig Tage.', 'Mindestens ein Monat des Jahres hat weniger als achtundzwanzig Tage.'],
      ['Wenn Lea vor Tom geboren ist, dann ist Tom nicht älter als Lea.', 'Wenn Lea vor Tom geboren ist, dann ist Tom älter als Lea.'],
      ['Am selben Ort ist es nie zugleich Mittag und Mitternacht.', 'Am selben Ort ist es manchmal zugleich Mittag und Mitternacht.'],
      ['Alle Quadrate sind Rechtecke, aber nicht alle Rechtecke sind Quadrate.', 'Alle Rechtecke sind Quadrate, aber nicht alle Quadrate sind Rechtecke.'],
      ['Wenn heute Mittwoch ist, dann ist übermorgen Freitag.', 'Wenn heute Mittwoch ist, dann ist übermorgen Samstag.'],
      ['Wenn gestern Sonntag war, dann ist morgen Dienstag.', 'Wenn gestern Sonntag war, dann ist morgen Montag.'],
      ['Drei mal vier ist zwölf, und das ist mehr als zehn.', 'Drei mal vier ist zwölf, und das ist weniger als zehn.'],
      ['Die Hälfte von zwanzig ist zehn, und das Doppelte von zehn ist zwanzig.', 'Die Hälfte von zwanzig ist zehn, und das Doppelte von zehn ist dreißig.'],
      ['Hat Paul mehr Murmeln als Zoe und Zoe mehr als Max, dann hat Max weniger als Paul.', 'Hat Paul mehr Murmeln als Zoe und Zoe mehr als Max, dann hat Max mehr als Paul.'],
      ['Das Wort „Ananas“ enthält dreimal den Buchstaben A.', 'Das Wort „Ananas“ enthält nur zweimal den Buchstaben A.'],
      ['Das Wort „Rentner“ liest sich von rechts nach links genauso wie von links nach rechts.', 'Das Wort „Rechner“ liest sich von rechts nach links genauso wie von links nach rechts.'],
      ['Es stimmt nicht, dass kein Tier im Meer lebt.', 'Es stimmt, dass kein einziges Tier im Meer lebt.'],
      ['Weder Katzen noch Hunde legen Eier.', 'Katzen und Hunde legen Eier, genau wie Hühner.'],
      ['Nur gerade Zahlen lassen sich ohne Rest durch zwei teilen, und die Sieben gehört nicht dazu.', 'Nur gerade Zahlen lassen sich ohne Rest durch zwei teilen, und die Neun gehört dazu.'],
      ['Nimmt man aus einem Korb mit fünf Äpfeln einen heraus, bleiben vier übrig.', 'Nimmt man aus einem Korb mit fünf Äpfeln einen heraus, bleiben sechs übrig.'],
      ['Ein Monat mit einunddreißig Tagen ist länger als vier Wochen.', 'Ein Monat mit einunddreißig Tagen ist kürzer als vier Wochen.'],
      ['Ein Jahrhundert ist länger als zehn Jahre, aber kürzer als tausend Jahre.', 'Ein Jahrhundert ist länger als tausend Jahre, aber kürzer als zehn Jahre.'],
      ['Wenn alle Türen geschlossen sind, dann ist keine Tür offen.', 'Wenn alle Türen geschlossen sind, dann ist mindestens eine Tür offen.'],
      ['Es ist falsch, dass sich die Sonne um den Mond dreht.', 'Es ist wahr, dass sich die Sonne um den Mond dreht.'],
      ['Zwölf ist zugleich größer als zehn und kleiner als fünfzehn.', 'Zwölf ist zugleich größer als fünfzehn und kleiner als zehn.'],
      ['Ist ein Hund schwerer als eine Katze, dann ist diese Katze nicht schwerer als der Hund.', 'Ist ein Hund schwerer als eine Katze, dann ist diese Katze schwerer als der Hund.'],
      ['Ein Montag folgt nie direkt auf einen Dienstag.', 'Manchmal folgt ein Montag direkt auf einen Dienstag.'],
      ['Niemand kann zugleich größer und kleiner als dieselbe Person sein.', 'Manche Menschen sind zugleich größer und kleiner als dieselbe Person.'],
      ['Kommt Anna vor Jonas an und Jonas vor Ida, dann kommt Ida nicht als Erste an.', 'Kommt Anna vor Jonas an und Jonas vor Ida, dann kommt Ida als Erste an.'],
      ['Es ist nicht selten, im Winter Schnee in den Bergen zu sehen.', 'Es ist unmöglich, im Winter Schnee in den Bergen zu sehen.'],
      ['Ein Tier, das fliegt, ist nicht unbedingt ein Vogel, wie die Biene zeigt.', 'Ein Tier, das fliegt, ist immer ein Vogel, sogar die Biene.'],
      ['Zehn minus vier ist sechs, und sechs plus vier ergibt wieder zehn.', 'Zehn minus vier ist sechs, und sechs plus vier ergibt zwölf.'],
      ['Im Wort „Kokos“ kommt der Buchstabe O zweimal vor.', 'Im Wort „Kokos“ kommt der Buchstabe O dreimal vor.'],
      ['Wenn die Ampel rot ist, müssen Autos anhalten und nicht beschleunigen.', 'Wenn die Ampel rot ist, müssen Autos beschleunigen und nicht anhalten.'],
      ['Der Februar hat weniger Tage als der März, auch in einem Schaltjahr.', 'Der Februar hat mehr Tage als der März, außer in einem Schaltjahr.'],
      ['Eine Zahl, die mit einer Null endet, ist immer durch zehn teilbar.', 'Eine Zahl, die mit einer Fünf endet, ist immer durch zehn teilbar.'],
      ['Wenn der große Zeiger einer Uhr einmal ganz herumläuft, ist eine Stunde vergangen.', 'Wenn der große Zeiger einer Uhr einmal ganz herumläuft, ist eine Minute vergangen.'],
      ['Wenn alle Murmeln im Beutel rot sind, ist die Murmel, die ich ziehe, sicher rot.', 'Wenn alle Murmeln im Beutel rot sind, kann die Murmel, die ich ziehe, blau sein.'],
      ['Vier ist die Hälfte von acht, und acht ist das Doppelte von vier.', 'Vier ist das Doppelte von acht, und acht ist die Hälfte von vier.'],
      ['Keiner der Wochentage beginnt mit dem Buchstaben Z.', 'Einer der Wochentage beginnt mit dem Buchstaben Z.'],
      ['Wenn ich um acht Uhr losfahre und die Fahrt zwei Stunden dauert, komme ich um zehn Uhr an.', 'Wenn ich um acht Uhr losfahre und die Fahrt zwei Stunden dauert, komme ich um elf Uhr an.'],
      ['Fünfzehn Minuten sind eine Viertelstunde, und dreißig Minuten sind eine halbe Stunde.', 'Fünfzehn Minuten sind eine halbe Stunde, und dreißig Minuten sind eine Viertelstunde.'],
      ['Alles, was länger als ein Meter ist, ist auch länger als ein Zentimeter.', 'Alles, was länger als ein Zentimeter ist, ist auch länger als ein Meter.'],
    ],
  ],

  quiNames: wordList(`
    Lena Lea Leon Lukas Lina Laura Lisa Luis Leonie Linus
    Mia Max Marie Moritz Maja Mila Martin Monika Markus
    Emma Emil Elias Ella Elena Erik Eva
    Jonas Julia Jan Johanna Jakob Jana Julian
    Felix Finn Frieda Fabian Franz Fiona
    Hanna Hugo Helena Hans Heike Holger
    Sophie Sarah Simon Stefan Sandra Sven Sabine
    Anna Anton Amelie Alina Andreas
    Paul Paula Peter Petra Pia
    Noah Nina Niklas Nele Nora
    Tim Tom Theo Tobias Thomas
    Karl Klaus Karin Katja Kai
    Ben Bruno Clara
  `),

  // Un conseil par conseil français (coach.ts), dans le même ordre.
  coachTips: [
    'Fünf Minuten jeden Tag sind besser als eine Stunde am Sonntag: Regelmäßigkeit zählt mehr als Dauer.',
    'Schlaf hilft, das am Tag Gelernte zu festigen. Eine gute Nacht ist auch Training.',
    'Zwanzig Minuten Spazierengehen tun den Beinen gut… und dem Kopf.',
    'Um dir eine Liste zu merken, erfinde eine kleine Geschichte, die alle Dinge miteinander verbindet.',
    'Eine Nummer merkt man sich besser in Häppchen: 0171 234 56 78 statt 01712345678.',
    'Etwas Neues lernen (ein Rezept, eine Sprache, ein Instrument) fordert den Kopf anders als die Gewohnheit.',
    'Ein Glas Wasser vor dem Spielen? Wer genug trinkt, bleibt leichter konzentriert.',
    'Du kommst bei einem Problem nicht weiter? Eine kurze Pause schafft oft Klarheit.',
    'Zehn Minuten Lesen am Tag erweitern den Wortschatz, ganz nebenbei.',
    'Das Gehirn liebt Neues: Nimm zum Einkaufen mal einen anderen Weg.',
    'Kopfrechnen: erst runden, dann korrigieren. 49 × 3 ist 50 × 3 − 3, also 147.',
    'Drei langsame Atemzüge vor dem Start helfen, die Aufmerksamkeit zu sammeln.',
    'Eins nach dem anderen: Mehrere Dinge gleichzeitig zu tun, ermüdet mehr, als man denkt.',
    'Mit Freunden zu plaudern ist ein echtes Rundum-Training: zuhören, verstehen, antworten.',
    'Gesellschaftsspiele verbinden Gedächtnis, Logik und Aufmerksamkeit… und man lacht dabei.',
    'Um dir einen Namen zu merken, wiederhole ihn im Gespräch, sobald du ihn hörst.',
    'Eine misslungene Runde ist nur eine Runde: Laune und Müdigkeit beeinflussen die Ergebnisse stark.',
    'In Ruhe verbraucht das Gehirn allein etwa ein Fünftel der Energie des Körpers.',
    'Abwechslung bei den Übungen macht mehr Spaß und trainiert vielseitiger, als immer dieselbe zu wiederholen.',
    'Mit der Hand zu schreiben hilft oft, sich Dinge besser zu merken als Tippen.',
    'Sich selbst abzufragen hilft beim Merken mehr als bloßes Wiederlesen. Genau das tust du hier!',
    'Wiederholungen über die Zeit zu verteilen hilft, länger zu behalten, als alles in letzter Minute zu pauken.',
    'Jemand anderem etwas zu erklären ist eine hervorragende Art, es selbst gut zu verstehen.',
    'Singen oder Musizieren beansprucht Gedächtnis, Aufmerksamkeit und Koordination zugleich.',
    'Ab und zu ein paar Minuten ohne Bildschirm entspannen die Augen und die Aufmerksamkeit.',
    'Lernen kann man in jedem Alter: Neugier hat kein Verfallsdatum.',
    'Einen Weg in Gedanken Straße für Straße nachzugehen, trainiert das Ortsgedächtnis.',
    'Lachen entspannt und weckt die Aufmerksamkeit. Fehler im Spiel sind erlaubt, sogar lustig.',
    'Eine Liste zu schreiben entlastet das Gedächtnis, damit du an anderes denken kannst.',
    'Eine Serie von Tagen am Stück motiviert: Schon eine einzige Runde hält die Flamme am Leben.',
    'Farbfalle: Schau auf die Mitte des Wortes und achte auf seine Farbe, nicht auf die Buchstaben.',
    'Schulte-Tabelle: Halte den Blick in der Mitte des Rasters und lass dein Randsehen suchen.',
    'Rastergedächtnis: Stell dir die Form vor, die die Abfolge zeichnet, wie ein Sternbild.',
    'Rückblick: Sag dir die letzten Buchstaben leise vor, wie ein kleines Lied.',
    'Laufende Summe: Behalte nur die Summe im Kopf, nie die Liste der Zahlen.',
    'Anagramme: Such zuerst nach häufigen Buchstabengruppen (SCH, CH, EI, IE, EN…).',
    'Blitzrechnen: Um eine Zahl mit 9 zu multiplizieren, nimm sie mal 10 und zieh sie einmal ab.',
    'Der Laden: Zähl die Kunden, die hineingehen, und die, die herauskommen, getrennt und bilde dann die Differenz.',
    'Paare: Dreh zuerst die Karten um, die du noch nie gesehen hast.',
    'Wörter merken: Verbinde jedes Wort mit einem etwas verrückten Bild, dann bleibt es hängen.',
    'Mini-Sudoku: Fang mit der Zeile, der Spalte oder dem Block an, der am vollsten ist.',
    'Mentale Rotation: Such dir ein kleines Detail der Form und folge ihm, während sie sich dreht.',
    'Waage: Ordne die Dinge im Kopf auf einer Linie an, vom leichtesten bis zum schwersten.',
    'Uhren: Zähl zuerst die vollen Stunden, dann addiere die Minuten.',
    'Pfeile: Schau nur auf den mittleren Pfeil, die anderen wollen dich nur ablenken.',
    'Reflex: Nicht hetzen! Ein Fehlalarm kostet mehr als eine kleine Verzögerung.',
    'Zahlenregen: Fang immer mit dem untersten Tropfen an.',
    'Knifflige Summen: Behalte das Ergebnis im Kopf, nicht die Rechnung.',
    'Kleingeld: Zähl zuerst die Scheine zusammen, vom größten zum kleinsten, dann die Münzen.',
    'Positive Gefühle helfen beim Merken: Hab Spaß, genau dafür ist das hier da!',
  ],

  contraires: [
    // Adjectifs. La température.
    adj('heiß/kalt warm/kühl', 'eisig/glühend heiß=glühend kalt=eisig', 'frostig=eisig sengend=glühend tropisch/arktisch'),
    // La taille (« dünn » et « schmal » se touchent).
    adj(
      'groß/klein lang/kurz hoch/niedrig dick/dünn breit/schmal groß=riesig klein=winzig',
      'riesig/winzig tief/flach gewaltig=riesig dünn=schmal',
      'geräumig/beengt gigantisch/mikroskopisch gigantisch=gewaltig winzig=mikroskopisch kolossal=gigantisch',
    ),
    // La vitesse et l'heure.
    adj('schnell/langsam früh/spät', 'zügig/gemächlich schnell=rasch spät=verspätet', 'hastig/bedächtig flink=rasch zeitig=früh rasant=schnell'),
    // L'âge et la nouveauté.
    adj('jung/alt neu/alt', 'modern/altmodisch alt=betagt jung=jugendlich', 'zeitgemäß/überholt veraltet=überholt neuartig=innovativ bejahrt=betagt'),
    // L'eau.
    adj('nass/trocken', 'feucht/trocken nass=klatschnass', 'durchnässt=klatschnass ausgedörrt=trocken'),
    // La propreté.
    adj('sauber/schmutzig', 'schmutzig=dreckig sauber=rein', 'makellos/verdreckt verdreckt=dreckig blitzblank=makellos'),
    // Plein, vide, libre ou occupé (« ein freier Platz » est vide).
    adj('voll/leer frei/besetzt', 'überfüllt/menschenleer voll=gefüllt', 'unbesetzt=frei verwaist=menschenleer randvoll=gefüllt'),
    // Le calme, le bruit et le courage (« ruhig » est à la fois calme et silencieux).
    adj(
      'ruhig/unruhig laut/leise mutig/ängstlich geduldig/ungeduldig ruhig=still',
      'entspannt/nervös tapfer/feige leise=still mutig=tapfer ängstlich=furchtsam ruhig=gelassen',
      'gelassen/aufgeregt kühn/zaghaft besonnen=gelassen kühn=mutig verzagt=zaghaft ohrenbetäubend=laut',
    ),
    // L'humeur.
    adj(
      'froh/traurig glücklich/unglücklich zufrieden/unzufrieden fröhlich=froh',
      'lustig/traurig glücklich=froh traurig=betrübt',
      'heiter/trübsinnig vergnügt=heiter niedergeschlagen=betrübt schwermütig=trübsinnig',
    ),
    // Le caractère, l'obéissance, la générosité et l'argent (« frech » et « unhöflich » se touchent).
    adj(
      'nett/gemein freundlich/unfreundlich höflich/unhöflich reich/arm teuer/billig brav/frech',
      'großzügig/geizig gehorsam/ungehorsam nett=freundlich gemein=fies reich=wohlhabend teuer=kostspielig brav=artig',
      'gütig/boshaft wohlhabend/bedürftig kostspielig/preiswert freigebig=großzügig geizig=knauserig höflich=zuvorkommend gehorsam=folgsam aufsässig=ungehorsam',
    ),
    // L'intelligence et le savoir.
    adj('klug/dumm', 'schlau=klug klug=intelligent gebildet/ungebildet', 'scharfsinnig/einfältig gelehrt=gebildet töricht=dumm'),
    // La force.
    adj('stark/schwach', 'kräftig=stark stabil/zerbrechlich', 'robust/gebrechlich robust=stabil schwach=kraftlos zerbrechlich=fragil'),
    // Le poids, la difficulté et la dureté (« schwer » et « leicht » ont les deux sens).
    adj(
      'schwer/leicht einfach/schwierig weich/hart',
      'schwer=schwierig leicht=einfach kompliziert=schwierig mühelos/mühsam glatt/rau streng/nachsichtig',
      'simpel=einfach beschwerlich=mühsam biegsam/starr geschmeidig=biegsam rigoros=streng',
    ),
    // Le vrai, le faux et la franchise.
    adj(
      'wahr/falsch richtig/falsch ehrlich/unehrlich',
      'echt/gefälscht richtig=korrekt ehrlich=aufrichtig treu/untreu',
      'aufrichtig/heuchlerisch authentisch=echt loyal=treu verlogen=unehrlich',
    ),
    adj('anwesend/abwesend'),
    // La distance.
    adj('nah/fern', 'fern=entfernt nah=benachbart', 'abgelegen=entfernt'),
    // Le goût.
    adj('', 'schmackhaft/fade lecker=köstlich schmackhaft=lecker', 'würzig/fade köstlich/ungenießbar fade=geschmacklos'),
    // Le danger et la santé.
    adj('', 'gefährlich/harmlos gesund/krank gefährlich=riskant krank=erkrankt', 'schädlich/unschädlich bedrohlich=gefährlich unschädlich=harmlos'),
    // Le soin.
    adj('', 'sorgfältig/nachlässig ordentlich/unordentlich ordentlich=aufgeräumt', 'gründlich/oberflächlich gewissenhaft=sorgfältig akribisch=gewissenhaft'),
    // L'utilité et l'importance.
    adj(
      'nützlich/nutzlos',
      'wichtig/unwichtig wichtig=bedeutend nötig=notwendig',
      'überflüssig/unentbehrlich unentbehrlich=unverzichtbar nutzlos=überflüssig wesentlich=wichtig',
    ),
    // Le possible et le certain.
    adj('möglich/unmöglich', 'wahrscheinlich/unwahrscheinlich gewiss/ungewiss möglich=machbar', 'plausibel/unglaubwürdig glaubhaft=plausibel unbestreitbar=unstrittig'),
    // La beauté.
    adj('schön/hässlich schön=hübsch', 'hübsch/hässlich schön=herrlich', 'anmutig/plump scheußlich=hässlich prächtig=herrlich'),
    // Le travail.
    adj('fleißig/faul', 'aktiv/passiv faul=träge', 'tatkräftig/untätig emsig=fleißig untätig=passiv'),
    // L'habituel, le rare et le pareil.
    adj(
      'normal/seltsam gleich/verschieden',
      'häufig/selten ähnlich/unterschiedlich gewöhnlich/ungewöhnlich seltsam=merkwürdig gleich=identisch',
      'alltäglich/außergewöhnlich kurios=merkwürdig verschieden=unterschiedlich rar=selten',
    ),
    // Ce qui se voit.
    adj('sichtbar/unsichtbar', 'auffällig/unauffällig', 'unscheinbar=unauffällig offenkundig=offensichtlich'),
    // La fierté.
    adj('', 'bescheiden/eingebildet eingebildet=arrogant', 'demütig/hochmütig hochmütig=überheblich bescheiden=demütig'),
    // La loi.
    adj('erlaubt/verboten', 'legal/illegal verboten=untersagt', 'zulässig/unzulässig rechtmäßig=legal'),
    adj('', 'waagerecht/senkrecht'),
    adj('lebendig/tot', 'lebend=lebendig', 'verstorben=tot'),
    // La lumière.
    adj('hell/dunkel', 'dunkel=finster', 'düster=finster'),

    // Verbes. Monter, grandir, accélérer.
    verbe(
      'steigen/sinken heben/senken zunehmen/abnehmen wachsen/schrumpfen',
      'verlängern/verkürzen vergrößern/verkleinern beschleunigen/bremsen erhöhen/verringern verringern=reduzieren',
      'anschwellen/abschwellen verstärken/abschwächen expandieren/schrumpfen vermehren=vergrößern verringern=vermindern',
    ),
    // Venir, partir, apparaître.
    verbe('kommen/gehen ankommen/abfahren erscheinen/verschwinden', 'betreten/verlassen auftauchen=erscheinen', 'auswandern/einwandern entschwinden=verschwinden'),
    // Ouvrir, fermer, commencer, finir (« schließen » et « abschließen » ont les deux sens).
    verbe(
      'öffnen/schließen anfangen/aufhören beginnen/beenden anfangen=beginnen',
      'aufmachen/zumachen öffnen=aufmachen schließen=zumachen starten=beginnen beenden=abschließen',
      'einleiten/abschließen entriegeln/verriegeln vollenden=beenden',
    ),
    verbe('einschalten/ausschalten', 'anmachen/ausmachen einschalten=anmachen', 'aktivieren/deaktivieren'),
    // Gagner, perdre, trouver.
    verbe('gewinnen/verlieren finden/verlieren', 'siegen=gewinnen schaffen/scheitern', 'triumphieren=siegen versagen=scheitern'),
    // Donner, acheter, accepter, avouer.
    verbe(
      'geben/nehmen kaufen/verkaufen annehmen/ablehnen',
      'zugeben/leugnen zustimmen/widersprechen ablehnen=zurückweisen',
      'bestätigen/dementieren erwerben=kaufen leugnen=bestreiten gewähren=bewilligen verweigern=ablehnen',
    ),
    verbe('angreifen/verteidigen', 'verteidigen=schützen angreifen=attackieren', 'überfallen=angreifen beschützen=schützen'),
    verbe('bauen/zerstören', 'aufbauen/abreißen errichten=bauen', 'vernichten=zerstören demolieren=zerstören'),
    verbe('füllen/leeren', 'auffüllen=füllen', 'entleeren=leeren'),
    verbe('lieben/hassen', 'bewundern/verachten hassen=verabscheuen', 'verehren/verachten vergöttern=anbeten'),
    verbe('lachen/weinen', 'weinen=heulen', 'schluchzen=weinen kichern=lachen'),
    // La voix.
    verbe('reden/schweigen flüstern/schreien schreien=brüllen', 'sprechen=reden murmeln=flüstern', 'tuscheln=flüstern grölen=brüllen'),
    // Lier et séparer.
    verbe('verbinden/trennen', 'anbinden/losbinden mischen/sortieren vereinen=verbinden', 'verschmelzen/spalten fusionieren=verschmelzen verknüpfen=verbinden'),
    verbe('vergessen/sich_erinnern', 'sich_merken/vergessen', 'sich_entsinnen=sich_erinnern'),
    verbe('verstecken/zeigen', 'verbergen/enthüllen verstecken=verbergen', 'offenbaren=enthüllen verheimlichen=verbergen'),
    verbe('leben/sterben', 'überleben/umkommen', 'sterben=entschlafen'),
    verbe('', 'wärmen/kühlen einfrieren/auftauen', 'erwärmen=wärmen abkühlen=kühlen'),
    verbe('ermutigen/entmutigen', 'ermutigen=motivieren', 'abschrecken=entmutigen anspornen=ermutigen'),
    verbe('loben/tadeln', 'loben/kritisieren kritisieren=tadeln', 'rühmen=loben bemängeln=kritisieren'),
    verbe('sparen/ausgeben', 'sparen/verschwenden', 'vergeuden=verschwenden'),
    verbe('ziehen/drücken'),
    verbe('hinzufügen/entfernen', 'entfernen=beseitigen', 'ergänzen=hinzufügen tilgen=beseitigen'),
    verbe('fragen/antworten', '', 'erwidern=antworten'),
    verbe('einschlafen/aufwachen', '', 'erwachen=aufwachen'),
    verbe('erlauben/verbieten', 'gestatten=erlauben', 'untersagen=verbieten'),
    verbe('werfen/fangen'),

    // Noms (avec leur majuscule). Le temps.
    nom('Tag/Nacht Morgen/Abend Sommer/Winter Anfang/Ende', 'Vergangenheit/Zukunft Anfang=Beginn Ende=Schluss', 'Morgengrauen/Abenddämmerung Prolog/Epilog Morgengrauen=Tagesanbruch'),
    // Les gens.
    nom('Freund/Feind Sieger/Verlierer', 'Jugend/Alter Feind=Gegner Freund=Kumpel Sieger=Gewinner', 'Rivale=Gegner Kontrahent=Rivale Gefährte=Freund'),
    // La guerre, la paix et le bruit (« Ruhe » est aussi le silence).
    nom('Krieg/Frieden Stille/Lärm', 'Streit/Versöhnung Krieg=Konflikt Streit=Zank Lärm=Krach Stille=Ruhe', 'Eintracht/Zwietracht Lärm=Getöse'),
    // Les émotions.
    nom('Freude/Trauer Liebe/Hass Glück/Unglück', 'Vergnügen/Schmerz Trauer=Kummer Schmerz=Leid', 'Wonne=Freude Gram=Kummer'),
    // Le courage et la force.
    nom('', 'Mut/Feigheit Kraft/Schwäche Angst=Furcht Kraft=Stärke', 'Tapferkeit=Mut Entsetzen=Grauen'),
    nom('Licht/Schatten', 'Licht/Dunkelheit', 'Dunkelheit=Finsternis'),
    // La richesse, le manque, la victoire.
    nom(
      'Sieg/Niederlage',
      'Reichtum/Armut Überfluss/Mangel Gewinn/Verlust Erfolg/Misserfolg Mangel=Knappheit Sieg=Triumph Reichtum=Wohlstand',
      'Wohlstand/Elend Profit=Gewinn Elend=Armut Fiasko=Misserfolg',
    ),
    nom('Wahrheit/Lüge'),
    nom('Frage/Antwort'),
    nom('Eingang/Ausgang Abfahrt/Ankunft'),
    // Ce qui monte et ce qui descend.
    nom('', 'Anstieg/Rückgang Aufstieg/Abstieg', 'Blüte/Niedergang Gipfel=Spitze'),
    nom('Arbeit/Freizeit', 'Erholung=Entspannung', 'Mühsal=Plackerei'),
    nom('', 'Vorteil/Nachteil Tugend/Laster', 'Vorzug=Vorteil Manko=Nachteil'),
    nom('Ordnung/Unordnung', 'Unordnung=Durcheinander', 'Chaos=Durcheinander'),
    nom('Stadt/Land'),
    nom('', 'Anwesenheit/Abwesenheit Maximum/Minimum'),
    nom('Himmel/Hölle'),
    nom('Hitze/Kälte'),
    nom('Norden/Süden Osten/Westen'),
    nom('Lehrer/Schüler'),
    nom('', 'Gast/Gastgeber'),
  ],

  stroop: {
    // r b g e o l : Rot, Blau, Grün, gElb (le g est à Grün), Orange, Lila.
    keys: { r: 'rouge', b: 'bleu', g: 'vert', e: 'jaune', o: 'orange', l: 'violet' },
    spoken: {
      rot: 'rouge',
      rote: 'rouge',
      roter: 'rouge',
      rotes: 'rouge',
      roten: 'rouge',
      rotem: 'rouge',
      blau: 'bleu',
      blaue: 'bleu',
      blauer: 'bleu',
      blaues: 'bleu',
      blauen: 'bleu',
      blauem: 'bleu',
      grun: 'vert',
      grune: 'vert',
      gruner: 'vert',
      grunes: 'vert',
      grunen: 'vert',
      grunem: 'vert',
      gruen: 'vert',
      gelb: 'jaune',
      gelbe: 'jaune',
      gelber: 'jaune',
      gelbes: 'jaune',
      gelben: 'jaune',
      gelbem: 'jaune',
      orange: 'orange',
      orangene: 'orange',
      orangener: 'orange',
      orangenes: 'orange',
      orangenen: 'orange',
      lila: 'violet',
      violett: 'violet',
      violette: 'violet',
      violetter: 'violet',
      violettes: 'violet',
      violetten: 'violet',
      rosa: 'rose',
      pink: 'rose',
      weiss: 'blanc',
      weisse: 'blanc',
      weisser: 'blanc',
      weisses: 'blanc',
      weissen: 'blanc',
      weissem: 'blanc',
    },
  },

  grammar,

  demos: {
    anagram: { tiles: ['G', 'T', 'I', 'R', 'E'], order: [1, 2, 0, 4, 3] }, // T I G E R
    mots: { words: ['Fahrrad', 'Apfel', 'Geige'], seen: 'Apfel', unseen: 'Löwe' },
    lettre: { hint: 'Bauernhoftier', word: 'PFERD', position: 3, letter: 'R', guess: 'L, R oder N…', answer: 'R: PFERD' },
    categories: ['Apfel', 'Birne', 'Geige', 'Kirsche'],
    qui: ['Lena', 'Lukas', 'Mia'],
    lecture: ['Eine Katze hat vier Beine.', 'Das Meer ist süß.'],
  },
};

export default content;
