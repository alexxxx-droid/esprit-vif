import { lang, tr } from '../lang';
import { pickLevel } from '../levels';
import type { Rng } from '../rng';
import { countScore } from '../scoring';

/**
 * Lecture éclair : une phrase, vraie ou fausse ? On lit vite, on juge aussitôt. Chaque idée existe
 * en deux versions (une vraie, une fausse) : on ne peut pas mémoriser « cette phrase est fausse ».
 * Cinq paliers : des phrases courtes, puis plus longues, puis des négations et de petits
 * raisonnements où il faut lire jusqu'au bout ; dès le niveau 21, des phrases à rallonge (l'erreur
 * se cache souvent à la fin), puis de la logique (« aucun », « au moins », « si… alors »). Au palier
 * Légende, la phrase s'efface au bout de quelques secondes.
 */

export const LECTURE_DURATION_MS = 60_000;

/** Une idée, en version vraie et en version fausse. */
export type SentencePair = readonly [truth: string, lie: string];

export const SENTENCES: readonly (readonly SentencePair[])[] = [
  // Palier 1 : des phrases courtes.
  [
    ['La neige est froide.', 'La neige est brûlante.'],
    ['Le feu est chaud.', 'Le feu est glacé.'],
    ['Un chat a quatre pattes.', 'Un chat a six pattes.'],
    ['Les oiseaux ont des plumes.', 'Les oiseaux ont des écailles.'],
    ['Le lait est blanc.', 'Le lait est vert.'],
    ['Une semaine a sept jours.', 'Une semaine a dix jours.'],
    ['Les poissons vivent dans l’eau.', 'Les poissons vivent dans les arbres.'],
    ['Le citron est jaune.', 'Le citron est bleu.'],
    ['Une voiture a des roues.', 'Une voiture a des ailes.'],
    ['L’herbe est verte.', 'L’herbe est violette.'],
    ['On dort dans un lit.', 'On dort dans un four.'],
    ['La mer est salée.', 'La mer est sucrée.'],
    ['Un carré a quatre côtés.', 'Un carré a trois côtés.'],
    ['Les vaches donnent du lait.', 'Les vaches donnent de la laine.'],
    ['Une année compte douze mois.', 'Une année compte huit mois.'],
    ['On boit dans un verre.', 'On boit dans une fourchette.'],
    ['La glace fond au soleil.', 'La glace durcit au soleil.'],
    ['Le chien aboie.', 'Le chien miaule.'],
    ['Les abeilles font du miel.', 'Les abeilles font du lait.'],
    ['Un triangle a trois côtés.', 'Un triangle a cinq côtés.'],
    ['On lit un livre.', 'On boit un livre.'],
    ['La pomme est un fruit.', 'La pomme est un outil.'],
    ['Le piano est un instrument.', 'Le piano est un animal.'],
    ['Paris est en France.', 'Paris est en Espagne.'],
    ['Une main a cinq doigts.', 'Une main a sept doigts.'],
    ['On voit avec les yeux.', 'On voit avec les oreilles.'],
    ['On entend avec les oreilles.', 'On entend avec les genoux.'],
    ['Le petit du chat est le chaton.', 'Le petit du chat est le poussin.'],
    ['La fraise est rouge.', 'La fraise est noire.'],
    ['Le mouton a de la laine.', 'Le mouton a des plumes.'],
    ['Deux et deux font quatre.', 'Deux et deux font cinq.'],
    ['Le train roule sur des rails.', 'Le train roule sur l’eau.'],
    ['Un vélo a deux roues.', 'Un vélo a cinq roues.'],
    ['Le lion est un animal.', 'Le lion est une plante.'],
    ['La pluie mouille.', 'La pluie sèche.'],
    ['Les arbres ont des feuilles.', 'Les arbres ont des dents.'],
    ['Lundi vient après dimanche.', 'Lundi vient après mercredi.'],
    ['Le sucre est sucré.', 'Le sucre est salé.'],
    ['On écrit avec un stylo.', 'On écrit avec une cuillère.'],
    ['Le canard sait nager.', 'Le canard sait tricoter.'],
  ],
  // Palier 2 : plus longues, avec des comparaisons.
  [
    ['Un éléphant est bien plus lourd qu’une souris.', 'Une souris est bien plus lourde qu’un éléphant.'],
    ['L’eau gèle quand il fait très froid.', 'L’eau gèle quand il fait très chaud.'],
    ['Une heure compte soixante minutes.', 'Une heure compte cent minutes.'],
    ['Les ours polaires vivent dans les régions froides.', 'Les ours polaires vivent dans les déserts brûlants.'],
    ['Le Soleil se lève à l’est.', 'Le Soleil se lève à l’ouest.'],
    ['La girafe a un cou très long.', 'La girafe a un cou très court.'],
    ['Février est le mois le plus court de l’année.', 'Février est le mois le plus long de l’année.'],
    ['On ouvre un parapluie quand il pleut.', 'On ouvre un parapluie pour couper le pain.'],
    ['Une douzaine d’œufs, cela fait douze œufs.', 'Une douzaine d’œufs, cela fait vingt œufs.'],
    ['Le cœur fait circuler le sang dans le corps.', 'Les cheveux font circuler le sang dans le corps.'],
    ['Un kilomètre est plus long qu’un mètre.', 'Un mètre est plus long qu’un kilomètre.'],
    ['Les chenilles deviennent des papillons.', 'Les chenilles deviennent des oiseaux.'],
    ['Le pain est fait avec de la farine.', 'Le pain est fait avec du sable.'],
    ['Le pôle Nord est une région très froide.', 'Le pôle Nord est une région très chaude.'],
    ['La tortue avance plus lentement que le lièvre.', 'La tortue court plus vite que le cheval.'],
    ['Le dentiste soigne les dents.', 'Le dentiste répare les voitures.'],
    ['Les plantes ont besoin de lumière pour pousser.', 'Les plantes poussent mieux dans le noir complet.'],
    ['Avec le lait, on peut faire du fromage.', 'Avec du jus d’orange, on fait du fromage.'],
    ['Il y a soixante secondes dans une minute.', 'Il y a dix secondes dans une minute.'],
    ['Un avion transporte des passagers dans les airs.', 'Un avion transporte des passagers sous la mer.'],
    ['La Terre tourne autour du Soleil.', 'Le Soleil tourne autour de la Terre.'],
    ['Le boulanger fait du pain et des croissants.', 'Le boulanger répare les voitures et les camions.'],
    ['Les dauphins remontent à la surface pour respirer.', 'Les dauphins n’ont jamais besoin de respirer de l’air.'],
    ['En automne, beaucoup d’arbres perdent leurs feuilles.', 'Au printemps, tous les arbres perdent leurs feuilles.'],
    ['Un bouchon de liège flotte sur l’eau.', 'Une clé en fer flotte sur l’eau.'],
    ['Le hibou chasse surtout la nuit.', 'Le hibou chasse surtout à midi.'],
    ['Le nombre dix est plus grand que le nombre sept.', 'Le nombre sept est plus grand que le nombre dix.'],
    ['Le facteur apporte le courrier dans les boîtes aux lettres.', 'Le facteur apporte le courrier dans les rivières.'],
    ['Les escargots avancent très lentement.', 'Les escargots avancent plus vite qu’une voiture.'],
    ['On fait cuire les pâtes dans de l’eau bouillante.', 'On fait cuire les pâtes dans de l’eau glacée.'],
    ['Le zèbre a des rayures noires et blanches.', 'Le zèbre a des taches rouges et vertes.'],
    ['Midi se trouve au milieu de la journée.', 'Minuit se trouve au milieu de la journée.'],
    ['Un orchestre joue de la musique ensemble.', 'Un orchestre joue au football ensemble.'],
    ['La Lune tourne autour de la Terre.', 'La Terre tourne autour de la Lune.'],
    ['Un litre d’eau pèse environ un kilo.', 'Un litre d’eau pèse environ dix kilos.'],
    ['Les nuages apportent la pluie.', 'Les montagnes apportent la pluie.'],
    ['Un siècle dure cent ans.', 'Un siècle dure dix ans.'],
    ['Le pompier éteint les incendies.', 'Le pompier allume les incendies.'],
    ['Les araignées ont huit pattes.', 'Les araignées ont deux pattes.'],
    ['L’hiver est en général plus froid que l’été en France.', 'L’été est en général plus froid que l’hiver en France.'],
  ],
  // Palier 3 : des négations et de petits raisonnements, à lire jusqu'au bout.
  [
    ['Un poisson ne survit pas longtemps hors de l’eau.', 'Un poisson n’a jamais besoin d’eau pour vivre.'],
    ['Il n’est pas vrai que les chats aboient.', 'Il est vrai que les chats aboient.'],
    ['Les serpents n’ont pas de pattes.', 'Les serpents ont quatre pattes.'],
    ['Une semaine ne compte pas huit jours.', 'Une semaine ne compte pas sept jours.'],
    ['La glace n’est pas chaude.', 'La glace n’est pas froide.'],
    ['Les chiens ne sont pas tous noirs.', 'Tous les chiens, sans exception, sont noirs.'],
    ['Aucun triangle n’a quatre côtés.', 'Certains triangles ont quatre côtés.'],
    ['Si tous les chats sont des animaux, alors mon chat est un animal.', 'Si tous les chats sont des animaux, alors tous les animaux sont des chats.'],
    ['Il est faux de dire qu’un carré a cinq côtés.', 'Il est faux de dire qu’un carré a quatre côtés.'],
    ['Les oiseaux ne savent pas tous voler.', 'Tous les oiseaux, sans exception, savent voler.'],
    ['Ni le lion ni le tigre ne mangent que de l’herbe.', 'Le lion et le tigre ne mangent que de l’herbe.'],
    ['Une minute n’est pas plus longue qu’une heure.', 'Une heure n’est pas plus longue qu’une minute.'],
    ['Sans eau, les plantes finissent par se faner.', 'Sans eau, les plantes poussent plus vite.'],
    ['Personne ne respire sous l’eau sans équipement.', 'Tout le monde respire sous l’eau sans équipement.'],
    ['Pas un seul mois de l’année n’a quarante jours.', 'Au moins un mois de l’année a quarante jours.'],
    ['Ce n’est pas avec les pieds qu’on écrit d’habitude.', 'Ce n’est pas avec les mains qu’on écrit d’habitude.'],
    ['Un nombre pair n’est jamais impair.', 'Un nombre pair est parfois impair.'],
    ['Il n’est pas impossible de voir la Lune en plein jour.', 'Il est impossible de voir la Lune en plein jour.'],
    ['Sept n’est pas un nombre pair.', 'Huit n’est pas un nombre pair.'],
    ['Juste avant mardi, il y a lundi, et non mercredi.', 'Juste avant mardi, il y a mercredi, et non lundi.'],
    ['Une fourmi n’est pas plus grosse qu’un chien.', 'Un chien n’est pas plus gros qu’une fourmi.'],
    ['Le contraire de « monter », ce n’est pas « grimper ».', 'Le contraire de « monter », ce n’est pas « descendre ».'],
    ['Le mot « chat » ne contient pas la lettre O.', 'Le mot « chat » ne contient pas la lettre A.'],
    ['Dix moins trois ne font pas huit.', 'Dix moins trois ne font pas sept.'],
    ['Si Paul est plus grand que Léa, et moi plus grand que Paul, je suis plus grand que Léa.', 'Si Paul est plus grand que Léa, et moi plus grand que Paul, Léa est plus grande que moi.'],
    ['Les roses ne sont pas toutes rouges.', 'Toutes les roses, sans exception, sont rouges.'],
    ['Un enfant n’est jamais plus âgé que ses parents.', 'Un enfant est toujours plus âgé que ses parents.'],
    ['On ne règle pas le réveil pour se coucher, mais pour se lever.', 'On règle le réveil pour se coucher, et non pour se lever.'],
    ['Le mot « soleil » ne commence pas par la lettre L.', 'Le mot « soleil » ne commence pas par la lettre S.'],
    ['Il ne pousse pas de pommes sur un sapin.', 'Les sapins donnent des pommes.'],
    ['Un nombre plus grand que dix n’est jamais plus petit que cinq.', 'Un nombre plus grand que dix est parfois plus petit que cinq.'],
    ['Du jaune mêlé à du rouge ne donne pas du bleu.', 'Du jaune mêlé à du rouge ne donne pas de l’orange.'],
    ['Après jeudi ne vient pas samedi, mais vendredi.', 'Après jeudi ne vient pas vendredi, mais samedi.'],
    ['Un cube n’a aucune face ronde.', 'Un cube n’a aucune face carrée.'],
    ['Une moitié n’est pas plus petite qu’un quart.', 'Un quart n’est pas plus petit qu’une moitié.'],
    ['Le double de quatre n’est pas six.', 'Le double de quatre n’est pas huit.'],
    ['Si demain est samedi, alors aujourd’hui n’est pas lundi.', 'Si demain est samedi, alors aujourd’hui est lundi.'],
    ['Il n’y a pas plus de jours dans un mois que dans une année.', 'Il y a plus de jours dans un mois que dans une année.'],
    ['Quand il gèle, l’eau du lac ne devient pas plus chaude.', 'Quand il gèle, l’eau du lac devient brûlante.'],
    ['Ce n’est pas la vache qui pond les œufs, mais la poule.', 'Ce n’est pas la poule qui pond les œufs, mais la vache.'],
  ],
  // Palier 4 : des phrases à rallonge, l'erreur peut se cacher tout au bout.
  [
    ['Le chat dort souvent pendant la journée, et il voit mieux que nous dans la pénombre.', 'Le chat dort souvent pendant la journée, et il voit moins bien que nous dans la pénombre.'],
    ['Le Soleil se lève à l’est, passe au plus haut vers midi et se couche à l’ouest.', 'Le Soleil se lève à l’est, passe au plus haut vers midi et se couche à l’est.'],
    ['Une année compte douze mois, et la plupart des mois ont trente ou trente et un jours.', 'Une année compte douze mois, et la plupart des mois ont vingt ou vingt et un jours.'],
    ['Pour faire une omelette, on casse des œufs, on les bat, puis on les fait cuire dans une poêle.', 'Pour faire une omelette, on casse des œufs, on les bat, puis on les fait cuire au congélateur.'],
    ['Les abeilles volent de fleur en fleur et transportent du pollen, ce qui aide les plantes à donner des fruits.', 'Les abeilles volent de fleur en fleur et transportent du pollen, ce qui empêche les plantes de donner des fruits.'],
    ['Quand on mélange du bleu et du jaune, on obtient du vert, la couleur de l’herbe au printemps.', 'Quand on mélange du bleu et du jaune, on obtient du rouge, la couleur des tomates bien mûres.'],
    ['La baleine vit dans la mer, mais elle doit remonter à la surface pour respirer.', 'La baleine vit dans la mer, et elle respire sous l’eau grâce à des branchies.'],
    ['En France, l’hiver commence en décembre et le printemps commence en mars.', 'En France, l’hiver commence en décembre et le printemps commence en juillet.'],
    ['Le pain se fait avec de la farine, de l’eau, du sel et de la levure, puis il cuit au four.', 'Le pain se fait avec de la farine, de l’eau, du sel et de la levure, puis il cuit au réfrigérateur.'],
    ['Sur une horloge, la petite aiguille montre les heures et la grande aiguille montre les minutes.', 'Sur une horloge, la grande aiguille montre les heures et la petite aiguille montre les minutes.'],
    ['Pour traverser la rue, on attend que le petit bonhomme passe au vert, puis on regarde des deux côtés.', 'Pour traverser la rue, on attend que le petit bonhomme passe au rouge, puis on traverse sans regarder.'],
    ['Les grenouilles naissent sous forme de têtards, qui vivent dans l’eau avant de perdre leur queue.', 'Les grenouilles naissent sous forme de têtards, qui vivent dans l’eau avant de se couvrir de plumes.'],
    ['Avec le lait de vache, on fait du beurre, de la crème, des yaourts et beaucoup de fromages.', 'Avec le lait de vache, on fait du beurre, de la crème, des yaourts et beaucoup de confitures.'],
    ['Le mois de décembre se termine le 31, et le lendemain, c’est le premier jour de janvier.', 'Le mois de décembre se termine le 31, et le lendemain, c’est le premier jour de février.'],
    ['Les dents de lait tombent pendant l’enfance et laissent la place aux dents définitives.', 'Les dents définitives tombent pendant l’enfance et laissent la place aux dents de lait.'],
    ['Un thermomètre mesure la température, et une balance indique combien pèse un objet.', 'Un thermomètre mesure la température, et une balance indique quelle heure il est.'],
    ['Au niveau de la mer, l’eau bout à cent degrés et elle gèle à zéro degré.', 'Au niveau de la mer, l’eau bout à cent degrés et elle gèle à cinquante degrés.'],
    ['Quand il fait nuit en France, il fait souvent jour de l’autre côté de la Terre.', 'Quand il fait nuit en France, il fait nuit aussi partout ailleurs sur la Terre.'],
    ['Le cœur bat plus vite quand on court, et il ralentit quand on se repose.', 'Le cœur bat plus vite quand on se repose, et il ralentit quand on court.'],
    ['Un arc-en-ciel apparaît souvent quand le soleil brille alors qu’il pleut encore.', 'Un arc-en-ciel apparaît souvent en pleine nuit, quand il n’y a ni soleil ni pluie.'],
    ['La Lune brille la nuit parce qu’elle renvoie la lumière du Soleil.', 'La Lune brille la nuit parce qu’elle fabrique sa propre lumière, comme une lampe.'],
    ['Les feuilles sont vertes en été, puis beaucoup jaunissent et tombent en automne.', 'Les feuilles sont vertes en été, puis beaucoup jaunissent et tombent au printemps.'],
    ['Les chauves-souris dorment le jour, la tête en bas, et chassent des insectes la nuit.', 'Les chauves-souris dorment la nuit, la tête en bas, et chassent des insectes en plein midi.'],
    ['Un kilo de plumes pèse autant qu’un kilo de plomb, même s’il prend beaucoup plus de place.', 'Un kilo de plumes pèse bien moins qu’un kilo de plomb, parce que les plumes sont légères.'],
    ['Un triangle a trois côtés, un carré en a quatre, et un hexagone en a six.', 'Un triangle a trois côtés, un carré en a quatre, et un hexagone en a huit.'],
    ['Les plantes vertes ont besoin de lumière, d’eau et d’air pour fabriquer leur nourriture.', 'Les plantes vertes ont besoin de lumière, d’eau et de sucre en poudre pour fabriquer leur nourriture.'],
    ['Dans un jeu de cartes classique, il y a des cœurs, des carreaux, des trèfles et des piques.', 'Dans un jeu de cartes classique, il y a des cœurs, des carreaux, des trèfles et des étoiles.'],
    ['Les escargots portent leur coquille sur le dos et laissent une trace brillante derrière eux.', 'Les escargots portent leur coquille sur le dos et laissent des traces de pattes derrière eux.'],
    ['Le piano a des touches blanches et des touches noires, et on en joue avec les doigts.', 'Le piano a des touches blanches et des touches noires, et on en joue en soufflant dedans.'],
    ['L’océan Atlantique sépare l’Europe de l’Amérique, et un avion le traverse en quelques heures.', 'L’océan Atlantique sépare l’Europe de l’Amérique, et on le traverse à pied en quelques heures.'],
    ['Quand on a de la fièvre, la température du corps monte au-dessus de la normale.', 'Quand on a de la fièvre, la température du corps descend bien au-dessous de la normale.'],
    ['Les bébés kangourous grandissent plusieurs mois dans la poche de leur mère.', 'Les bébés kangourous grandissent plusieurs mois dans un nid, en haut des arbres.'],
    ['Un dictionnaire range les mots dans l’ordre alphabétique, de la lettre A jusqu’à la lettre Z.', 'Un dictionnaire range les mots dans l’ordre alphabétique, de la lettre Z jusqu’à la lettre A.'],
    ['Au football, seul le gardien peut attraper le ballon avec les mains pendant le jeu.', 'Au football, tous les joueurs peuvent attraper le ballon avec les mains pendant le jeu.'],
    ['Le Nil est un très long fleuve d’Afrique qui traverse l’Égypte avant de se jeter dans la mer.', 'Le Nil est un très long fleuve d’Afrique qui traverse la Norvège avant de se jeter dans la mer.'],
    ['Quand une tortue a peur, elle rentre souvent la tête et les pattes dans sa carapace.', 'Quand une tortue a peur, elle sort de sa carapace et la laisse derrière elle pour courir plus vite.'],
    ['Une voiture électrique se recharge en se branchant sur une prise, un peu comme un téléphone.', 'Une voiture électrique se recharge en remplissant son réservoir d’eau, un peu comme un arrosoir.'],
    ['La girafe est l’animal le plus haut sur terre, et elle mange les feuilles en haut des arbres.', 'La girafe est l’animal le plus haut sur terre, et elle mange les poissons au fond des rivières.'],
    ['Le printemps vient après l’hiver, puis viennent l’été et l’automne, avant un nouvel hiver.', 'Le printemps vient après l’été, puis viennent l’hiver et l’automne, avant un nouvel été.'],
    ['Un sablier mesure le temps grâce au sable qui coule doucement du haut vers le bas.', 'Un sablier mesure le temps grâce au sable qui remonte doucement du bas vers le haut.'],
  ],
  // Palier 5 : de la logique (« aucun », « au moins », « si… alors », doubles négations, petits calculs).
  [
    ['Si tous les oiseaux ont des plumes et que le merle est un oiseau, alors le merle a des plumes.', 'Si tous les oiseaux ont des plumes et que le chat n’est pas un oiseau, alors le chat a des plumes.'],
    ['Il n’est pas faux de dire que deux et deux font quatre.', 'Il n’est pas faux de dire que deux et deux font cinq.'],
    ['Aucun mois de l’année ne compte moins de vingt-huit jours.', 'Au moins un mois de l’année compte moins de vingt-huit jours.'],
    ['Si Léa est née avant Tom, alors Tom n’est pas plus âgé que Léa.', 'Si Léa est née avant Tom, alors Tom est plus âgé que Léa.'],
    ['Il n’est jamais à la fois midi et minuit au même endroit.', 'Il est parfois à la fois midi et minuit au même endroit.'],
    ['Tous les carrés sont des rectangles, mais les rectangles ne sont pas tous des carrés.', 'Tous les rectangles sont des carrés, mais les carrés ne sont pas tous des rectangles.'],
    ['Si aujourd’hui est mercredi, alors après-demain sera vendredi.', 'Si aujourd’hui est mercredi, alors après-demain sera samedi.'],
    ['Si hier était dimanche, alors demain sera mardi.', 'Si hier était dimanche, alors demain sera lundi.'],
    ['Trois fois quatre font douze, ce qui est plus que dix.', 'Trois fois quatre font douze, ce qui est moins que dix.'],
    ['La moitié de vingt est dix, et le double de dix est vingt.', 'La moitié de vingt est dix, et le double de dix est trente.'],
    ['Si Paul a plus de billes que Zoé et Zoé plus que Max, alors Max en a moins que Paul.', 'Si Paul a plus de billes que Zoé et Zoé plus que Max, alors Max en a plus que Paul.'],
    ['Le mot « ananas » contient trois fois la lettre A.', 'Le mot « ananas » contient deux fois la lettre A.'],
    ['Le mot « kayak » se lit de la même façon de gauche à droite et de droite à gauche.', 'Le mot « canard » se lit de la même façon de gauche à droite et de droite à gauche.'],
    ['Ce n’est pas vrai qu’aucun animal ne vit dans la mer.', 'Il est vrai qu’aucun animal ne vit dans la mer.'],
    ['Ni les chats ni les chiens ne pondent d’œufs.', 'Les chats comme les chiens pondent des œufs, à la manière des poules.'],
    ['Seuls les nombres pairs se divisent par deux sans reste, et sept n’en fait pas partie.', 'Seuls les nombres pairs se divisent par deux sans reste, et neuf en fait partie.'],
    ['Si on retire une pomme d’un panier de cinq pommes, il en reste quatre.', 'Si on retire une pomme d’un panier de cinq pommes, il en reste six.'],
    ['Un mois de trente et un jours dure plus longtemps que quatre semaines.', 'Un mois de trente et un jours dure moins longtemps que quatre semaines.'],
    ['Un siècle dure plus longtemps que dix ans, mais moins longtemps que mille ans.', 'Un siècle dure plus longtemps que mille ans, mais moins longtemps que dix ans.'],
    ['Si toutes les portes sont fermées, alors aucune porte n’est ouverte.', 'Si toutes les portes sont fermées, alors au moins une porte est ouverte.'],
    ['Il est faux que le Soleil tourne autour de la Lune.', 'Il est vrai que le Soleil tourne autour de la Lune.'],
    ['Douze est à la fois plus grand que dix et plus petit que quinze.', 'Douze est à la fois plus grand que quinze et plus petit que dix.'],
    ['Si un chien est plus lourd qu’un chat, ce chat n’est pas plus lourd que le chien.', 'Si un chien est plus lourd qu’un chat, ce chat est plus lourd que le chien.'],
    ['Un lundi ne tombe jamais juste après un mardi.', 'Il arrive qu’un lundi tombe juste après un mardi.'],
    ['Personne ne peut être à la fois plus grand et plus petit que la même personne.', 'Certaines personnes sont à la fois plus grandes et plus petites que la même personne.'],
    ['Si Anna arrive avant Jules et Jules avant Inès, alors Inès n’arrive pas la première.', 'Si Anna arrive avant Jules et Jules avant Inès, alors Inès arrive la première.'],
    ['Il n’est pas rare de voir de la neige en montagne pendant l’hiver.', 'Il est impossible de voir de la neige en montagne pendant l’hiver.'],
    ['Un animal qui vole n’est pas forcément un oiseau, comme le montre l’abeille.', 'Un animal qui vole est forcément un oiseau, même l’abeille.'],
    ['Dix moins quatre font six, et six plus quatre refont dix.', 'Dix moins quatre font six, et six plus quatre font douze.'],
    ['Dans le mot « bonjour », il y a deux fois la lettre O.', 'Dans le mot « bonjour », il y a trois fois la lettre O.'],
    ['Quand le feu est rouge, les voitures doivent s’arrêter, et non accélérer.', 'Quand le feu est rouge, les voitures doivent accélérer, et non s’arrêter.'],
    ['Février compte moins de jours que mars, même les années bissextiles.', 'Février compte plus de jours que mars, sauf les années bissextiles.'],
    ['Un nombre qui se termine par zéro se divise toujours par dix.', 'Un nombre qui se termine par cinq se divise toujours par dix.'],
    ['Quand la grande aiguille d’une horloge fait un tour complet, une heure s’est écoulée.', 'Quand la grande aiguille d’une horloge fait un tour complet, une minute s’est écoulée.'],
    ['Si toutes les billes du sac sont rouges, la bille que j’en tire est forcément rouge.', 'Si toutes les billes du sac sont rouges, la bille que j’en tire peut être bleue.'],
    ['Quatre est la moitié de huit, et huit est le double de quatre.', 'Quatre est le double de huit, et huit est la moitié de quatre.'],
    ['Aucun jour de la semaine ne commence par la lettre Z.', 'Un des jours de la semaine commence par la lettre Z.'],
    ['Si je pars à huit heures et que le trajet dure deux heures, j’arrive à dix heures.', 'Si je pars à huit heures et que le trajet dure deux heures, j’arrive à onze heures.'],
    ['Quinze minutes font un quart d’heure, et trente minutes une demi-heure.', 'Quinze minutes font une demi-heure, et trente minutes un quart d’heure.'],
    ['Un objet plus long qu’un mètre est forcément plus long qu’un centimètre.', 'Un objet plus long qu’un centimètre est forcément plus long qu’un mètre.'],
  ],
];

/** Les mêmes paliers en anglais : des phrases écrites pour l'anglais, simples et sans piège culturel. */
export const SENTENCES_EN: readonly (readonly SentencePair[])[] = [
  // Tier 1: short sentences.
  [
    ['Snow is cold.', 'Snow is boiling hot.'],
    ['Fire is hot.', 'Fire is icy cold.'],
    ['A cat has four legs.', 'A cat has six legs.'],
    ['Birds have feathers.', 'Birds have scales.'],
    ['Milk is white.', 'Milk is green.'],
    ['A week has seven days.', 'A week has ten days.'],
    ['Fish live in water.', 'Fish live in trees.'],
    ['A lemon is yellow.', 'A lemon is blue.'],
    ['A car has wheels.', 'A car has wings.'],
    ['Grass is green.', 'Grass is purple.'],
    ['We sleep in a bed.', 'We sleep in an oven.'],
    ['The sea is salty.', 'The sea is sugary.'],
    ['A square has four sides.', 'A square has three sides.'],
    ['Cows give milk.', 'Cows give wool.'],
    ['A year has twelve months.', 'A year has eight months.'],
    ['We drink from a glass.', 'We drink from a fork.'],
    ['Ice melts in the sun.', 'Ice hardens in the sun.'],
    ['Dogs bark.', 'Dogs meow.'],
    ['Bees make honey.', 'Bees make milk.'],
    ['A triangle has three sides.', 'A triangle has five sides.'],
    ['We read books.', 'We drink books.'],
    ['An apple is a fruit.', 'An apple is a tool.'],
    ['A piano is an instrument.', 'A piano is an animal.'],
    ['Paris is in France.', 'Paris is in Spain.'],
    ['A hand has five fingers.', 'A hand has seven fingers.'],
    ['We see with our eyes.', 'We see with our ears.'],
    ['We hear with our ears.', 'We hear with our knees.'],
    ['A baby cat is a kitten.', 'A baby cat is a chick.'],
    ['Strawberries are red.', 'Strawberries are black.'],
    ['Sheep have wool.', 'Sheep have feathers.'],
    ['Two and two make four.', 'Two and two make five.'],
    ['Trains run on rails.', 'Trains run on water.'],
    ['A bicycle has two wheels.', 'A bicycle has five wheels.'],
    ['A lion is an animal.', 'A lion is a plant.'],
    ['Rain makes things wet.', 'Rain makes things dry.'],
    ['Trees have leaves.', 'Trees have teeth.'],
    ['Monday comes after Sunday.', 'Monday comes after Wednesday.'],
    ['Sugar is sweet.', 'Sugar is salty.'],
    ['We write with a pen.', 'We write with a spoon.'],
    ['Ducks can swim.', 'Ducks can knit.'],
  ],
  // Tier 2: longer sentences, with comparisons.
  [
    ['An elephant is much heavier than a mouse.', 'A mouse is much heavier than an elephant.'],
    ['Water freezes when it is very cold.', 'Water freezes when it is very hot.'],
    ['An hour has sixty minutes.', 'An hour has a hundred minutes.'],
    ['Polar bears live in cold regions.', 'Polar bears live in hot deserts.'],
    ['The sun rises in the east.', 'The sun rises in the west.'],
    ['A giraffe has a very long neck.', 'A giraffe has a very short neck.'],
    ['February is the shortest month of the year.', 'February is the longest month of the year.'],
    ['We open an umbrella when it rains.', 'We open an umbrella to slice bread.'],
    ['A dozen eggs means twelve eggs.', 'A dozen eggs means twenty eggs.'],
    ['The heart pumps blood around the body.', 'The hair pumps blood around the body.'],
    ['A kilometer is longer than a meter.', 'A meter is longer than a kilometer.'],
    ['Caterpillars turn into butterflies.', 'Caterpillars turn into birds.'],
    ['Bread is made with flour.', 'Bread is made with sand.'],
    ['The North Pole is a very cold place.', 'The North Pole is a very hot place.'],
    ['A tortoise moves more slowly than a hare.', 'A tortoise runs faster than a horse.'],
    ['A dentist takes care of teeth.', 'A dentist repairs cars.'],
    ['Plants need light to grow.', 'Plants grow best in total darkness.'],
    ['Cheese can be made from milk.', 'Cheese is made from orange juice.'],
    ['There are sixty seconds in a minute.', 'There are ten seconds in a minute.'],
    ['A plane carries passengers through the air.', 'A plane carries passengers under the sea.'],
    ['The Earth goes around the sun.', 'The sun goes around the Earth.'],
    ['A baker makes bread and cakes.', 'A baker repairs cars and trucks.'],
    ['Dolphins come up to the surface to breathe.', 'Dolphins never need to breathe air.'],
    ['In the fall, many trees lose their leaves.', 'In the spring, all trees lose their leaves.'],
    ['A cork floats on water.', 'An iron key floats on water.'],
    ['Owls hunt mostly at night.', 'Owls hunt mostly at noon.'],
    ['Ten is a bigger number than seven.', 'Seven is a bigger number than ten.'],
    ['A mail carrier brings letters to mailboxes.', 'A mail carrier brings letters to rivers.'],
    ['Snails move very slowly.', 'Snails move faster than a car.'],
    ['We cook pasta in boiling water.', 'We cook pasta in icy water.'],
    ['A zebra has black and white stripes.', 'A zebra has red and green spots.'],
    ['Noon is in the middle of the day.', 'Midnight is in the middle of the day.'],
    ['An orchestra plays music together.', 'An orchestra plays soccer together.'],
    ['The moon goes around the Earth.', 'The Earth goes around the moon.'],
    ['A liter of water weighs about one kilogram.', 'A liter of water weighs about ten kilograms.'],
    ['Clouds bring rain.', 'Mountains bring rain.'],
    ['A century lasts one hundred years.', 'A century lasts ten years.'],
    ['Firefighters put out fires.', 'Firefighters start fires.'],
    ['Spiders have eight legs.', 'Spiders have two legs.'],
    ['Winter is usually colder than summer.', 'Summer is usually colder than winter.'],
  ],
  // Tier 3: negations and small reasonings, to read to the end.
  [
    ['A fish cannot survive long out of water.', 'A fish never needs water to live.'],
    ['It is not true that cats bark.', 'It is true that cats bark.'],
    ['Snakes have no legs.', 'Snakes have four legs.'],
    ['A week does not have eight days.', 'A week does not have seven days.'],
    ['Ice is not hot.', 'Ice is not cold.'],
    ['Not all dogs are black.', 'All dogs, without exception, are black.'],
    ['No triangle has four sides.', 'Some triangles have four sides.'],
    ['If all cats are animals, then my cat is an animal.', 'If all cats are animals, then all animals are cats.'],
    ['It is false to say that a square has five sides.', 'It is false to say that a square has four sides.'],
    ['Not all birds can fly.', 'All birds, without exception, can fly.'],
    ['Neither lions nor tigers eat only grass.', 'Lions and tigers eat only grass.'],
    ['A minute is not longer than an hour.', 'An hour is not longer than a minute.'],
    ['Without water, plants end up wilting.', 'Without water, plants grow faster.'],
    ['Nobody can breathe underwater without equipment.', 'Everybody can breathe underwater without equipment.'],
    ['Not a single month of the year has forty days.', 'At least one month of the year has forty days.'],
    ['We don’t usually write with our feet.', 'We don’t usually write with our hands.'],
    ['An even number is never odd.', 'An even number is sometimes odd.'],
    ['It is not impossible to see the moon in the daytime.', 'It is impossible to see the moon in the daytime.'],
    ['Seven is not an even number.', 'Eight is not an even number.'],
    ['Right before Tuesday comes Monday, not Wednesday.', 'Right before Tuesday comes Wednesday, not Monday.'],
    ['An ant is not bigger than a dog.', 'A dog is not bigger than an ant.'],
    ['Warm is not the opposite of hot.', 'Cold is not the opposite of hot.'],
    ['The word “cat” does not contain the letter O.', 'The word “cat” does not contain the letter A.'],
    ['Ten minus three is not eight.', 'Ten minus three is not seven.'],
    ['If Sam is taller than Mia and I am taller than Sam, I am taller than Mia.', 'If Sam is taller than Mia and I am taller than Sam, Mia is taller than me.'],
    ['Not all roses are red.', 'All roses, without exception, are red.'],
    ['A child is never older than their parents.', 'A child is always older than their parents.'],
    ['We set an alarm clock to wake up, not to go to bed.', 'We set an alarm clock to go to bed, not to wake up.'],
    ['The word “sun” does not start with the letter L.', 'The word “sun” does not start with the letter S.'],
    ['Apples don’t grow on pine trees.', 'Pine trees grow apples.'],
    ['A number greater than ten is never smaller than five.', 'A number greater than ten is sometimes smaller than five.'],
    ['Mixing yellow and red does not make blue.', 'Mixing yellow and red does not make orange.'],
    ['After Thursday comes Friday, not Saturday.', 'After Thursday comes Saturday, not Friday.'],
    ['A cube has no round faces.', 'A cube has no square faces.'],
    ['A half is not smaller than a quarter.', 'A quarter is not smaller than a half.'],
    ['Twice four is not six.', 'Twice four is not eight.'],
    ['If tomorrow is Saturday, then today is not Monday.', 'If tomorrow is Saturday, then today is Monday.'],
    ['A month does not have more days than a year.', 'A month has more days than a year.'],
    ['When it freezes, the water in a lake does not get warmer.', 'When it freezes, the water in a lake gets boiling hot.'],
    ['It is not the cow that lays eggs, but the hen.', 'It is not the hen that lays eggs, but the cow.'],
  ],
  // Tier 4: very long sentences, the mistake may hide at the very end.
  [
    ['Cats often sleep during the day, and they see better than we do in dim light.', 'Cats often sleep during the day, and they see worse than we do in dim light.'],
    ['The sun rises in the east, is highest in the sky around noon and sets in the west.', 'The sun rises in the east, is highest in the sky around noon and sets in the east.'],
    ['A year has twelve months, and most months have thirty or thirty-one days.', 'A year has twelve months, and most months have twenty or twenty-one days.'],
    ['To make scrambled eggs, you crack some eggs, beat them and then cook them in a pan.', 'To make scrambled eggs, you crack some eggs, beat them and then cook them in the freezer.'],
    ['Bees fly from flower to flower carrying pollen, which helps plants make fruit.', 'Bees fly from flower to flower carrying pollen, which stops plants from making fruit.'],
    ['When you mix blue and yellow paint, you get green, the color of grass in spring.', 'When you mix blue and yellow paint, you get red, the color of ripe tomatoes.'],
    ['Whales live in the sea, but they have to come up to the surface to breathe.', 'Whales live in the sea, and they breathe underwater through gills, like fish.'],
    ['North of the equator, winter starts in December and spring starts in March.', 'North of the equator, winter starts in December and spring starts in July.'],
    ['Bread is made from flour, water, salt and yeast, and then it is baked in an oven.', 'Bread is made from flour, water, salt and yeast, and then it is baked in a fridge.'],
    ['On a clock, the short hand shows the hours and the long hand shows the minutes.', 'On a clock, the long hand shows the hours and the short hand shows the minutes.'],
    ['To cross the street safely, you wait for the walk signal and then look both ways.', 'To cross the street safely, you wait for the don’t walk signal and then run without looking.'],
    ['Frogs start life as tadpoles, which live in water until they lose their tails.', 'Frogs start life as tadpoles, which live in water until they grow feathers.'],
    ['Cow’s milk is used to make butter, cream, ice cream and many kinds of cheese.', 'Cow’s milk is used to make butter, cream, ice cream and many kinds of jam.'],
    ['December ends on the thirty-first, and the next day is the first of January.', 'December ends on the thirty-first, and the next day is the first of February.'],
    ['Baby teeth fall out during childhood and make room for adult teeth.', 'Adult teeth fall out during childhood and make room for baby teeth.'],
    ['A thermometer measures temperature, and a scale tells you how much something weighs.', 'A thermometer measures temperature, and a scale tells you what time it is.'],
    ['At sea level, water boils at one hundred degrees Celsius and freezes at zero.', 'At sea level, water boils at one hundred degrees Celsius and freezes at fifty.'],
    ['When it is night in France, it is often daytime on the other side of the world.', 'When it is night in France, it is also night everywhere else in the world.'],
    ['Your heart beats faster when you run, and it slows down when you rest.', 'Your heart beats faster when you rest, and it slows down when you run.'],
    ['A rainbow often appears when the sun shines while it is still raining.', 'A rainbow often appears in the middle of the night, with no sun and no rain.'],
    ['The moon shines at night because it reflects light from the sun.', 'The moon shines at night because it makes its own light, like a lamp.'],
    ['Leaves are green in summer, then many turn yellow and drop off in the fall.', 'Leaves are green in summer, then many turn yellow and drop off in the spring.'],
    ['Most bats sleep upside down during the day and hunt insects at night.', 'Most bats sleep upside down at night and hunt insects at noon.'],
    ['A kilogram of feathers weighs as much as a kilogram of lead, even though it takes up more space.', 'A kilogram of feathers weighs much less than a kilogram of lead, because feathers are light.'],
    ['A triangle has three sides, a square has four, and a hexagon has six.', 'A triangle has three sides, a square has four, and a hexagon has eight.'],
    ['Green plants need light, water and air to make their own food.', 'Green plants need light, water and powdered sugar to make their own food.'],
    ['A standard deck of cards has hearts, diamonds, clubs and spades.', 'A standard deck of cards has hearts, diamonds, clubs and stars.'],
    ['Snails carry their shells on their backs and leave a shiny trail behind them.', 'Snails carry their shells on their backs and leave footprints behind them.'],
    ['A piano has white keys and black keys, and you play it with your fingers.', 'A piano has white keys and black keys, and you play it by blowing into it.'],
    ['The Atlantic Ocean lies between Europe and America, and a plane can cross it in a few hours.', 'The Atlantic Ocean lies between Europe and America, and you can walk across it in a few hours.'],
    ['When you have a fever, your body temperature rises above normal.', 'When you have a fever, your body temperature drops far below normal.'],
    ['Baby kangaroos spend several months growing inside their mother’s pouch.', 'Baby kangaroos spend several months growing in a nest at the top of a tree.'],
    ['A dictionary lists words in alphabetical order, from the letter A to the letter Z.', 'A dictionary lists words in alphabetical order, from the letter Z to the letter A.'],
    ['In soccer, only the goalkeeper may catch the ball with their hands during play.', 'In soccer, every player may catch the ball with their hands during play.'],
    ['The Nile is a very long river in Africa that flows through Egypt to the sea.', 'The Nile is a very long river in Africa that flows through Norway to the sea.'],
    ['When a turtle is scared, it often pulls its head and legs into its shell.', 'When a turtle is scared, it often leaves its shell behind to run away faster.'],
    ['Electric cars are recharged by plugging them in, a bit like a phone.', 'Electric cars are recharged by filling them with water, a bit like a watering can.'],
    ['The giraffe is the tallest land animal, and it eats leaves from the tops of trees.', 'The giraffe is the tallest land animal, and it eats fish from the bottom of rivers.'],
    ['Spring comes after winter, then come summer and fall, and then winter again.', 'Spring comes after summer, then come winter and fall, and then summer again.'],
    ['An hourglass measures time with sand that slowly flows from the top to the bottom.', 'An hourglass measures time with sand that slowly flows from the bottom to the top.'],
  ],
  // Tier 5: logic (“no”, “at least”, “if… then”, double negatives, small sums).
  [
    ['If all birds have feathers and a robin is a bird, then a robin has feathers.', 'If all birds have feathers and a cat is not a bird, then a cat has feathers.'],
    ['It is not false that two plus two equals four.', 'It is not false that two plus two equals five.'],
    ['No month of the year has fewer than twenty-eight days.', 'At least one month of the year has fewer than twenty-eight days.'],
    ['If Lea was born before Tom, then Tom is not older than Lea.', 'If Lea was born before Tom, then Tom is older than Lea.'],
    ['It is never both noon and midnight in the same place.', 'It is sometimes both noon and midnight in the same place.'],
    ['All squares are rectangles, but not all rectangles are squares.', 'All rectangles are squares, but not all squares are rectangles.'],
    ['If today is Wednesday, then the day after tomorrow is Friday.', 'If today is Wednesday, then the day after tomorrow is Saturday.'],
    ['If yesterday was Sunday, then tomorrow is Tuesday.', 'If yesterday was Sunday, then tomorrow is Monday.'],
    ['Three times four is twelve, which is more than ten.', 'Three times four is twelve, which is less than ten.'],
    ['Half of twenty is ten, and twice ten is twenty.', 'Half of twenty is ten, and twice ten is thirty.'],
    ['If Paul has more marbles than Zoe and Zoe has more than Max, then Max has fewer than Paul.', 'If Paul has more marbles than Zoe and Zoe has more than Max, then Max has more than Paul.'],
    ['The word “banana” contains the letter A three times.', 'The word “banana” contains the letter A only twice.'],
    ['The word “level” reads the same from left to right and from right to left.', 'The word “table” reads the same from left to right and from right to left.'],
    ['It is not true that no animals live in the sea.', 'It is true that no animals live in the sea.'],
    ['Neither cats nor dogs lay eggs.', 'Both cats and dogs lay eggs, just like hens.'],
    ['Only even numbers can be divided by two with nothing left over, and seven is not one of them.', 'Only even numbers can be divided by two with nothing left over, and nine is one of them.'],
    ['If you take one apple out of a basket of five apples, four are left.', 'If you take one apple out of a basket of five apples, six are left.'],
    ['A month with thirty-one days lasts longer than four weeks.', 'A month with thirty-one days lasts less than four weeks.'],
    ['A century is longer than ten years but shorter than a thousand years.', 'A century is longer than a thousand years but shorter than ten years.'],
    ['If all the doors are closed, then no door is open.', 'If all the doors are closed, then at least one door is open.'],
    ['It is false that the sun goes around the moon.', 'It is true that the sun goes around the moon.'],
    ['Twelve is both greater than ten and smaller than fifteen.', 'Twelve is both greater than fifteen and smaller than ten.'],
    ['If a dog is heavier than a cat, then that cat is not heavier than the dog.', 'If a dog is heavier than a cat, then that cat is heavier than the dog.'],
    ['A Monday never comes right after a Tuesday.', 'Sometimes a Monday comes right after a Tuesday.'],
    ['Nobody can be both taller and shorter than the same person.', 'Some people are both taller and shorter than the same person.'],
    ['If Ella arrives before Jack and Jack before Nina, then Nina does not arrive first.', 'If Ella arrives before Jack and Jack before Nina, then Nina arrives first.'],
    ['It is not unusual to see snow in the mountains in winter.', 'It is impossible to see snow in the mountains in winter.'],
    ['An animal that flies is not always a bird, as the bee shows.', 'An animal that flies is always a bird, even the bee.'],
    ['Ten minus four is six, and six plus four makes ten again.', 'Ten minus four is six, and six plus four makes twelve.'],
    ['The word “moon” contains the letter O twice.', 'The word “moon” contains the letter O three times.'],
    ['When the traffic light is red, cars must stop, not speed up.', 'When the traffic light is red, cars must speed up, not stop.'],
    ['February has fewer days than March, even in a leap year.', 'February has more days than March, except in a leap year.'],
    ['A number that ends in zero can always be divided by ten.', 'A number that ends in five can always be divided by ten.'],
    ['When the long hand of a clock goes all the way around, one hour has passed.', 'When the long hand of a clock goes all the way around, one minute has passed.'],
    ['If every marble in the bag is red, the marble I take out must be red.', 'If every marble in the bag is red, the marble I take out could be blue.'],
    ['Four is half of eight, and eight is twice four.', 'Four is twice eight, and eight is half of four.'],
    ['None of the days of the week starts with the letter Z.', 'One of the days of the week starts with the letter Z.'],
    ['If I leave at eight and the trip takes two hours, I arrive at ten.', 'If I leave at eight and the trip takes two hours, I arrive at eleven.'],
    ['Fifteen minutes is a quarter of an hour, and thirty minutes is half an hour.', 'Fifteen minutes is half an hour, and thirty minutes is a quarter of an hour.'],
    ['Anything longer than a meter is also longer than a centimeter.', 'Anything longer than a centimeter is also longer than a meter.'],
  ],
];

/** Les phrases de la langue en cours. */
export function sentences(): readonly (readonly SentencePair[])[] {
  return lang() === 'en' ? SENTENCES_EN : SENTENCES;
}

export type LectureTier = 1 | 2 | 3 | 4 | 5;

export interface LectureLevel {
  /** Paliers de phrases tirés à ce niveau (1 à 5). */
  tiers: readonly LectureTier[];
  /** Bonnes réponses moins erreurs en 60 s pour 100 pts (au hasard : 0). */
  target: number;
  /**
   * Phrase éclair (palier Légende) : la phrase s'efface après 0,6 s plus ce temps par caractère.
   * On peut toujours répondre, mais plus relire.
   */
  flashMsPerChar?: number;
}

const L = (tiers: LectureTier[], target: number, flashMsPerChar?: number): LectureLevel =>
  flashMsPerChar ? { tiers, target, flashMsPerChar } : { tiers, target };

/** Temps fixe d'une phrase éclair, avant le temps par caractère. */
const FLASH_BASE_MS = 600;

export const LECTURE_LEVELS: readonly LectureLevel[] = [
  L([1], 16),
  L([1], 17),
  L([1], 18),
  L([1], 19),
  L([1, 2], 16),
  L([1, 2], 17),
  L([2], 14),
  L([2], 15),
  L([2], 16),
  L([1, 2, 3], 13),
  L([2, 3], 12),
  L([2, 3], 13),
  L([2, 3], 14),
  L([3], 10),
  L([3], 11),
  L([3], 12),
  L([2, 3], 15),
  L([3], 13),
  L([3], 14),
  L([3], 15),
  // Expert : des phrases à rallonge.
  L([4], 11),
  L([3, 4], 13),
  L([4], 12),
  L([2, 4], 14),
  L([4], 13),
  L([3, 4], 14),
  L([4], 14),
  L([3, 4], 15),
  L([4], 15),
  L([3, 4], 16),
  // Maître : de la logique.
  L([5], 10),
  L([4, 5], 11),
  L([5], 11),
  L([3, 5], 13),
  L([5], 12),
  L([4, 5], 13),
  L([5], 13),
  L([3, 4, 5], 14),
  L([5], 14),
  L([4, 5], 15),
  // Légende : la phrase s'efface de plus en plus vite.
  L([4], 15, 60),
  L([5], 14, 60),
  L([3, 4, 5], 15, 55),
  L([4, 5], 15, 55),
  L([5], 15, 50),
  L([4], 16, 50),
  L([4, 5], 16, 45),
  L([5], 16, 45),
  L([3, 4, 5], 17, 40),
  L([4, 5], 17, 40),
];

export function lectureLevel(level: number): LectureLevel {
  return pickLevel(LECTURE_LEVELS, level);
}

/** Durée d'affichage d'une phrase éclair, ou `null` si elle reste à l'écran (niveaux sans éclair). */
export function lectureFlashMs(sentence: string, level: number): number | null {
  const { flashMsPerChar } = lectureLevel(level);
  return flashMsPerChar ? FLASH_BASE_MS + sentence.length * flashMsPerChar : null;
}

/** Règle des niveaux 21 et plus (à rallonge, logique, éclair) ; `null` : la règle classique. */
export function lectureRule(level: number): string | null {
  const c = lectureLevel(level);
  if (c.flashMsPerChar)
    return tr(
      'Lis vite : chaque phrase s’efface au bout de quelques secondes. Vraie ou fausse ? Tu peux encore répondre, mais plus relire. 60 secondes.',
      'Read fast: each sentence fades out after a few seconds. True or false? You can still answer, but not reread. 60 seconds.',
    );
  if (c.tiers.includes(5))
    return tr(
      'Lis chaque phrase jusqu’au bout et raisonne : vraie ou fausse ? Attention à « aucun », « au moins », « si… alors ». 60 secondes.',
      'Read each sentence to the end and think: true or false? Watch out for “no”, “at least”, “if… then”. 60 seconds.',
    );
  if (c.tiers.includes(4))
    return tr(
      'Des phrases à rallonge : l’erreur se cache parfois tout au bout. Vraie ou fausse ? 60 secondes.',
      'Very long sentences: the mistake sometimes hides at the very end. True or false? 60 seconds.',
    );
  return null;
}

const TIER_LABELS = {
  1: ['phrases courtes', 'short sentences'],
  2: ['phrases longues', 'long sentences'],
  3: ['négations', 'negations'],
  4: ['phrases à rallonge', 'very long sentences'],
  5: ['logique', 'logic'],
} as const;

export function lectureLevelLabel(level: number): string {
  const c = lectureLevel(level);
  const names = c.tiers.map((t) => tr(TIER_LABELS[t][0], TIER_LABELS[t][1]));
  // Les niveaux 1 à 20 gardent leur libellé (« … et … et … ») ; au-delà, une vraie énumération.
  const fr = c.tiers.some((t) => t > 3) && names.length > 2 ? `${names.slice(0, -1).join(', ')} et ${names.at(-1)}` : names.join(' et ');
  const tiers = tr(fr, names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0]);
  const flash = c.flashMsPerChar ? tr(' · phrases qui s’effacent', ' · sentences fade out') : '';
  return tr(`${tiers} · objectif ${c.target}${flash}`, `${tiers} · target ${c.target}${flash}`);
}

export interface LectureQuestion {
  sentence: string;
  truth: boolean;
}

/**
 * Une suite de phrases : chaque idée sort une fois, dans une version tirée au sort. Pour les plus
 * rapides, un second passage suit, mélangé autrement et avec des versions tirées à nouveau.
 */
export function generateLecture(rng: Rng, level: number): LectureQuestion[] {
  const all = sentences();
  const pool = lectureLevel(level).tiers.flatMap((t) => all[t - 1]);
  const pass = () => rng.shuffle(pool).map(([truth, lie]) => (rng.chance(0.5) ? { sentence: truth, truth: true } : { sentence: lie, truth: false }));
  return [...pass(), ...pass()];
}

export function scoreLecture(correct: number, errors: number, level: number): number {
  return countScore(correct - errors, 0, lectureLevel(level).target);
}
