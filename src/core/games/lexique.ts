import { lang } from '../lang';

/**
 * Mots rangés par catégorie, pour Catégories, Mots à retenir et Lettre manquante.
 * Règle d'or : un mot n'appartient qu'à une seule catégorie, sans double sens gênant
 * (pas d'« orange », d'« avocat » ni de « rose » : ils seraient à la fois deux choses).
 * Chaque langue a son lexique (`categories()` choisit celui de la langue en cours).
 */

export type Family = 'nourriture' | 'animaux' | 'objets' | 'nature' | 'societe' | 'divers';

export interface Category {
  id: string;
  /** « Fruit » : sert d'indice (Lettre manquante). */
  label: string;
  /** « des fruits » : pour les phrases (« les autres sont des fruits »). */
  plural: string;
  /** Les catégories d'une même famille se ressemblent : c'est là que l'intrus se cache le mieux. */
  family: Family;
  words: readonly string[];
}

const C = (id: string, label: string, plural: string, family: Family, words: string): Category => ({
  id,
  label,
  plural,
  family,
  words: words.split(' '),
});

export const CATEGORIES: readonly Category[] = [
  C('fruits', 'Fruit', 'des fruits', 'nourriture', 'pomme poire cerise fraise banane abricot ananas kiwi mangue prune raisin citron framboise myrtille melon pastèque figue groseille mandarine clémentine litchi papaye'),
  C('legumes', 'Légume', 'des légumes', 'nourriture', 'carotte poireau navet radis chou courgette aubergine épinard haricot brocoli céleri artichaut betterave concombre potiron laitue endive asperge oignon panais fenouil'),
  C('desserts', 'Dessert', 'des desserts', 'nourriture', 'gâteau tarte crêpe flan sorbet beignet biscuit brioche meringue compote macaron cookie tiramisu gaufre clafoutis profiterole madeleine crumble tartelette cannelé'),
  C('boissons', 'Boisson', 'des boissons', 'nourriture', 'café thé lait limonade sirop soda tisane eau cidre grenadine infusion jus citronnade milkshake smoothie orangeade'),
  C('sauvages', 'Animal sauvage', 'des animaux sauvages', 'animaux', 'lion tigre ours loup renard girafe zèbre éléphant singe cerf sanglier panthère hippopotame rhinocéros kangourou gorille blaireau castor écureuil hérisson guépard lynx'),
  C('ferme', 'Animal de la ferme', 'des animaux de la ferme', 'animaux', 'vache cochon mouton chèvre cheval âne lapin taureau veau agneau brebis bouc poney mulet bœuf porcelet'),
  C('oiseaux', 'Oiseau', 'des oiseaux', 'animaux', 'moineau pigeon merle aigle hibou chouette corbeau mésange rouge-gorge cygne perroquet hirondelle faucon pélican flamant autruche pingouin pinson colombe vautour'),
  C('poissons', 'Poisson', 'des poissons', 'animaux', 'saumon thon truite requin sardine carpe brochet dorade hareng anguille maquereau espadon mérou turbot cabillaud limande rouget sandre merlan barracuda'),
  C('insectes', 'Insecte', 'des insectes', 'animaux', 'abeille fourmi mouche papillon moustique guêpe coccinelle libellule sauterelle grillon criquet scarabée puce cigale frelon termite bourdon mante punaise luciole'),
  C('meubles', 'Meuble', 'des meubles', 'objets', 'table chaise armoire lit canapé fauteuil commode buffet étagère tabouret banc placard coffre pouf divan lampadaire'),
  C('cuisine', 'Ustensile de cuisine', 'des ustensiles de cuisine', 'objets', 'casserole poêle louche fouet spatule passoire cuillère fourchette couteau saladier râpe tamis marmite écumoire entonnoir théière cocotte'),
  C('outils', 'Outil', 'des outils', 'objets', 'marteau tournevis scie pince perceuse pelle râteau hache rabot burin truelle équerre ponceuse sécateur pioche maillet tenaille'),
  C('instruments', 'Instrument de musique', 'des instruments de musique', 'objets', 'piano violon guitare flûte trompette harpe tambour violoncelle saxophone clarinette accordéon hautbois xylophone banjo contrebasse ukulélé cymbale orgue mandoline'),
  C('vetements', 'Vêtement', 'des vêtements', 'objets', 'chemise pantalon jupe robe manteau veste pull chaussette écharpe gilet short blouson salopette pyjama imperméable débardeur collant anorak costume cardigan'),
  C('arbres', 'Arbre', 'des arbres', 'nature', 'chêne sapin hêtre bouleau érable saule peuplier platane frêne cèdre olivier palmier marronnier cerisier pommier noyer acacia orme baobab séquoia pin mélèze'),
  C('fleurs', 'Fleur', 'des fleurs', 'nature', 'tulipe marguerite coquelicot tournesol lys orchidée jonquille muguet lavande pivoine jasmin pâquerette dahlia géranium bleuet myosotis hortensia glaïeul œillet'),
  C('meteo', 'Météo', 'des mots de la météo', 'nature', 'pluie neige vent orage nuage brouillard grêle tonnerre soleil verglas tempête arc-en-ciel bruine averse givre rosée ouragan tornade canicule éclaircie'),
  C('metiers', 'Métier', 'des métiers', 'societe', 'boulanger médecin pompier facteur plombier coiffeur infirmier pilote cuisinier jardinier menuisier dentiste architecte électricien policier vétérinaire journaliste serveur maçon libraire pharmacien fermier boucher astronaute'),
  C('sports', 'Sport', 'des sports', 'societe', 'football tennis rugby natation judo ski golf boxe escrime cyclisme basketball volleyball handball aviron surf karaté escalade athlétisme badminton équitation plongée patinage'),
  C('transports', 'Transport', 'des moyens de transport', 'societe', 'voiture vélo train avion bateau bus camion métro tramway moto scooter hélicoptère taxi fusée péniche trottinette voilier paquebot tracteur'),
  C('batiments', 'Bâtiment', 'des bâtiments', 'societe', 'maison école église château mairie hôpital gare usine musée théâtre stade phare moulin cabane immeuble garage grange prison cinéma piscine caserne'),
  C('famille', 'Famille', 'des membres de la famille', 'societe', 'père mère frère sœur oncle tante cousin cousine neveu nièce fils fille parrain marraine grand-père grand-mère mari épouse gendre'),
  C('corps', 'Corps humain', 'des parties du corps', 'divers', 'bras jambe main pied tête genou coude épaule doigt nez bouche oreille œil cheville poignet cou dos ventre front menton joue orteil hanche nuque'),
  C('pays', 'Pays', 'des pays', 'divers', 'France Espagne Italie Japon Brésil Canada Maroc Chine Inde Mexique Pérou Égypte Suède Grèce Portugal Norvège Kenya Argentine Irlande Australie Allemagne Belgique Suisse'),
  C('couleurs', 'Couleur', 'des couleurs', 'divers', 'rouge bleu vert jaune noir blanc gris violet beige turquoise indigo pourpre écarlate ocre cyan magenta vermillon'),
  C('epices', 'Épice ou herbe', 'des épices ou des herbes', 'nourriture', 'cannelle vanille safran cumin curry paprika muscade gingembre curcuma thym basilic persil ciboulette romarin origan estragon coriandre aneth sauge cardamome'),
  C('fromages', 'Fromage', 'des fromages', 'nourriture', 'camembert brie roquefort emmental gruyère reblochon munster mozzarella parmesan feta beaufort morbier mimolette maroilles ricotta gorgonzola cheddar gouda mascarpone tomme livarot saint-nectaire'),
  C('ecole', 'Fourniture scolaire', 'des fournitures scolaires', 'objets', 'crayon cahier gomme stylo trousse cartable classeur feutre surligneur agrafeuse taille-crayon ardoise craie calculatrice buvard agenda'),
  C('jouets', 'Jouet', 'des jouets', 'objets', 'poupée ballon toupie peluche puzzle yoyo cerf-volant dînette billes dominos osselets marionnette hochet kaléidoscope bilboquet figurine maquette diabolo'),
  C('paysages', 'Paysage', 'des paysages', 'nature', 'montagne colline vallée plaine falaise volcan désert forêt lac rivière fleuve océan île cascade dune canyon marais prairie plage grotte golfe'),
  C('espace', 'Espace', 'des mots de l’espace', 'nature', 'planète étoile comète galaxie astéroïde satellite nébuleuse météorite lune univers constellation éclipse orbite cratère Jupiter Saturne Vénus Neptune Uranus'),
  C('formes', 'Forme', 'des formes', 'divers', 'cercle carré triangle rectangle losange ovale trapèze hexagone pentagone octogone cube sphère cylindre cône pyramide parallélogramme demi-cercle'),
  C('calendrier', 'Jour ou mois', 'des jours ou des mois', 'divers', 'lundi mardi mercredi jeudi vendredi samedi dimanche janvier février avril mai juin juillet août septembre octobre novembre décembre'),
  C('emotions', 'Émotion', 'des émotions', 'divers', 'joie tristesse colère peur surprise dégoût fierté honte jalousie ennui tendresse gratitude nostalgie frayeur enthousiasme timidité'),
];

/**
 * Le lexique anglais : mêmes identifiants et mêmes familles, des mots courants choisis pour l'anglais
 * (pas traduits mot à mot). Mêmes règles : pas de double sens qui rendrait l'intrus discutable
 * (ni « orange », « bat », « seal », « crane », « date », « trunk », « fan », « kite », « triangle »…).
 * `plural` se lit sans article : « Previous: “radish” among fruits ».
 */
export const CATEGORIES_EN: readonly Category[] = [
  C('fruits', 'Fruit', 'fruits', 'nourriture', 'apple pear banana pineapple mango grape lemon raspberry blueberry melon watermelon fig strawberry papaya lychee tangerine nectarine pomegranate grapefruit blackberry cranberry clementine guava'),
  C('legumes', 'Vegetable', 'vegetables', 'nourriture', 'carrot leek turnip radish cabbage zucchini eggplant spinach broccoli celery artichoke beet cucumber lettuce asparagus onion parsnip cauliflower kale potato pea shallot okra'),
  C('desserts', 'Dessert', 'desserts', 'nourriture', 'cake pie pancake sorbet donut cookie brownie muffin cupcake pudding custard tiramisu waffle meringue macaron cheesecake sundae eclair strudel crumble tart'),
  C('boissons', 'Drink', 'drinks', 'nourriture', 'coffee tea milk lemonade soda juice water smoothie milkshake cocoa latte espresso cappuccino cola tonic cider limeade eggnog'),
  C('sauvages', 'Wild animal', 'wild animals', 'animaux', 'lion tiger bear wolf fox giraffe zebra elephant monkey deer panther hippopotamus rhinoceros kangaroo gorilla badger beaver squirrel hedgehog cheetah lynx leopard koala raccoon moose'),
  C('ferme', 'Farm animal', 'farm animals', 'animaux', 'cow pig sheep goat horse donkey bull lamb ewe pony mule ox piglet heifer foal stallion mare colt hog alpaca llama'),
  C('oiseaux', 'Bird', 'birds', 'animaux', 'sparrow pigeon blackbird eagle owl crow swan parrot falcon pelican flamingo ostrich penguin vulture dove seagull hummingbird woodpecker peacock stork heron magpie hawk'),
  C('poissons', 'Fish', 'fish', 'animaux', 'tuna trout shark sardine carp cod herring eel mackerel swordfish halibut haddock anchovy catfish goldfish tilapia barracuda piranha minnow grouper sturgeon monkfish'),
  C('insectes', 'Insect', 'insects', 'animaux', 'bee ant butterfly mosquito wasp ladybug dragonfly grasshopper locust beetle flea cicada hornet termite bumblebee mantis firefly moth cockroach gnat'),
  C('meubles', 'Furniture', 'pieces of furniture', 'objets', 'table chair wardrobe bed sofa armchair dresser sideboard shelf stool bench cupboard ottoman futon bookcase nightstand recliner'),
  C('cuisine', 'Kitchen utensil', 'kitchen utensils', 'objets', 'saucepan skillet ladle whisk spatula colander spoon fork bowl grater sieve funnel teapot kettle peeler corkscrew wok strainer'),
  C('outils', 'Tool', 'tools', 'objets', 'hammer screwdriver saw pliers drill shovel rake axe chisel trowel wrench pickaxe mallet crowbar hacksaw clamp pitchfork'),
  C('instruments', 'Musical instrument', 'musical instruments', 'objets', 'piano violin guitar flute trumpet harp drum cello saxophone clarinet accordion oboe xylophone banjo ukulele cymbal mandolin trombone tuba harmonica tambourine bassoon'),
  C('vetements', 'Clothing', 'clothes', 'objets', 'shirt pants skirt dress coat jacket sweater sock scarf vest shorts overalls raincoat tights parka cardigan blouse jeans hoodie'),
  C('arbres', 'Tree', 'trees', 'nature', 'oak maple birch willow elm poplar cedar cypress sequoia redwood spruce fir larch beech holly baobab eucalyptus sycamore aspen linden alder acacia pine'),
  C('fleurs', 'Flower', 'flowers', 'nature', 'tulip daisy poppy sunflower lily orchid daffodil peony jasmine dahlia geranium cornflower forget-me-not hydrangea gladiolus carnation marigold crocus snowdrop begonia petunia buttercup dandelion'),
  C('meteo', 'Weather', 'weather words', 'nature', 'rain snow wind storm cloud fog hail thunder sunshine frost rainbow drizzle downpour dew hurricane tornado heatwave lightning blizzard breeze sleet mist'),
  C('metiers', 'Job', 'jobs', 'societe', 'baker doctor firefighter plumber hairdresser nurse pilot chef gardener carpenter dentist architect electrician veterinarian journalist waiter librarian pharmacist farmer butcher teacher lawyer mechanic florist cashier'),
  C('sports', 'Sport', 'sports', 'societe', 'soccer tennis rugby swimming judo skiing golf boxing cycling basketball volleyball handball rowing surfing karate climbing badminton diving skating archery hockey baseball wrestling gymnastics bowling'),
  C('transports', 'Transportation', 'means of transportation', 'societe', 'car bicycle train airplane boat bus truck subway tram motorcycle helicopter taxi ship tractor van ferry submarine ambulance sailboat'),
  C('batiments', 'Building', 'buildings', 'societe', 'house school church castle hospital factory museum stadium lighthouse windmill cabin garage barn prison library skyscraper palace cathedral hotel warehouse supermarket tower'),
  C('famille', 'Family', 'family members', 'societe', 'father mother brother sister uncle aunt cousin nephew niece son daughter godfather godmother grandfather grandmother husband wife son-in-law grandson granddaughter'),
  C('corps', 'Body part', 'body parts', 'divers', 'arm leg hand foot head knee elbow shoulder finger nose mouth ear eye ankle wrist neck belly forehead chin cheek toe hip thumb heel lip tongue tooth eyebrow'),
  C('pays', 'Country', 'countries', 'divers', 'France Spain Italy Japan Brazil Canada Morocco China India Mexico Peru Egypt Sweden Greece Portugal Norway Kenya Argentina Ireland Australia Germany Belgium Switzerland'),
  C('couleurs', 'Color', 'colors', 'divers', 'red blue green yellow black white purple beige turquoise indigo scarlet cyan magenta vermilion crimson maroon brown pink'),
  C('epices', 'Spice or herb', 'spices or herbs', 'nourriture', 'cinnamon vanilla saffron cumin curry paprika nutmeg turmeric thyme basil parsley chives rosemary oregano tarragon coriander dill cardamom clove anise'),
  C('fromages', 'Cheese', 'cheeses', 'nourriture', 'camembert brie roquefort emmental mozzarella parmesan feta cheddar gouda mascarpone ricotta gorgonzola stilton edam provolone halloumi manchego pecorino'),
  C('ecole', 'School supply', 'school supplies', 'objets', 'pencil notebook eraser pen backpack binder marker highlighter stapler sharpener chalk calculator crayon glue notepad folder protractor'),
  C('jouets', 'Toy', 'toys', 'objets', 'doll ball teddy puzzle yo-yo marbles dominoes puppet rattle kaleidoscope figurine dollhouse pinwheel robot jack-in-the-box boomerang trampoline'),
  C('paysages', 'Landscape', 'landscapes', 'nature', 'mountain hill valley cliff volcano desert forest lake river ocean island waterfall dune canyon marsh meadow beach cave glacier swamp lagoon'),
  C('espace', 'Space', 'space words', 'nature', 'planet star comet galaxy asteroid satellite nebula meteorite moon universe constellation eclipse orbit Jupiter Saturn Venus Neptune Uranus Mars'),
  C('formes', 'Shape', 'shapes', 'divers', 'circle square rectangle diamond rhombus oval trapezoid hexagon pentagon octagon cube sphere cylinder cone parallelogram semicircle prism'),
  C('calendrier', 'Day or month', 'days or months', 'divers', 'Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February April June July August September October November December'),
  C('emotions', 'Emotion', 'emotions', 'divers', 'joy sadness anger fear surprise disgust pride shame jealousy boredom tenderness gratitude nostalgia enthusiasm shyness happiness loneliness envy excitement anxiety'),
];

/** Les catégories de la langue en cours. */
export function categories(): readonly Category[] {
  return lang() === 'en' ? CATEGORIES_EN : CATEGORIES;
}

/** La catégorie d'un mot, dans le lexique de la langue en cours. */
export function categoryOf(word: string): Category | undefined {
  return categories().find((c) => c.words.includes(word));
}

/** Tous les mots de toutes les catégories. */
export const ALL_CATEGORY_WORDS: readonly string[] = CATEGORIES.flatMap((c) => c.words);
