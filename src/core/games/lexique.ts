/**
 * Mots rangés par catégorie, pour Catégories, Mots à retenir et Lettre manquante.
 * Règle d'or : un mot n'appartient qu'à une seule catégorie, sans double sens gênant
 * (pas d'« orange », d'« avocat » ni de « rose » : ils seraient à la fois deux choses).
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

export function categoryOf(word: string): Category | undefined {
  return CATEGORIES.find((c) => c.words.includes(word));
}

/** Tous les mots de toutes les catégories. */
export const ALL_CATEGORY_WORDS: readonly string[] = CATEGORIES.flatMap((c) => c.words);
