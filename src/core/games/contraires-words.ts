/**
 * Les mots de Contraires, écrits pour chaque langue (jamais traduits mot à mot).
 *
 * Les mots sont rangés par familles : un même champ (la taille, le bruit, l'argent…) et une même
 * nature (adjectifs, verbes ou noms). Les mots d'une famille ne servent jamais de leurres les uns
 * pour les autres : « minuscule » ne peut pas se glisser parmi les propositions du « contraire de
 * grand ». Un mot n'appartient qu'à une famille ; quand un mot a deux sens proches de deux champs
 * (« calme » et « silencieux », « quiet » et « peaceful »), les deux champs forment une seule famille.
 *
 * Dans chaque famille, trois registres : très courant (Débutant), courant, puis soutenu (Maître et
 * Légende). « a/b » : des contraires ; « a=b » : le même sens ; « _ » tient lieu d'espace (« se_taire »).
 * Les adjectifs sont au masculin singulier, les verbes à l'infinitif, les noms sans article.
 *
 * Les autres langues écrivent leur liste dans leur module de contenu (`LangContent.contraires`).
 */
import { adj, nom, verbe } from '../content/helpers';

export type WordKind = 'adj' | 'verbe' | 'nom';

export interface WordFamily {
  kind: WordKind;
  /** Les paires de chaque registre : très courant, courant, soutenu. */
  pairs: readonly [common: string, usual: string, formal: string];
}

export const WORDS_FR: readonly WordFamily[] = [
  // Adjectifs. La température.
  adj('chaud/froid', 'brûlant/glacé chaud=brûlant froid=glacé', 'torride/glacial torride=caniculaire glacial=polaire'),
  // La taille et le poids.
  adj(
    'grand/petit long/court haut/bas lourd/léger gros/maigre gros=énorme petit=minuscule',
    'épais/mince immense/minuscule étroit/vaste immense=vaste',
    'exigu/spacieux ample/étriqué colossal/infime colossal=gigantesque minuscule=infime exigu=étriqué',
  ),
  // La vitesse et l'heure.
  adj('rapide/lent', 'précoce/tardif', 'prompt/tardif rapide=véloce rapide=prompt'),
  // L'âge et la nouveauté.
  adj('jeune/vieux neuf/usé nouveau/ancien', 'moderne/démodé récent/ancien vieux=âgé', 'archaïque/novateur désuet=démodé suranné=désuet'),
  // L'eau.
  adj('sec/mouillé mouillé=trempé', 'humide/sec', 'aride/fertile aride=desséché'),
  // La propreté.
  adj('propre/sale', 'sale=crasseux', 'immaculé/souillé souillé=maculé'),
  // Plein ou vide.
  adj('plein/vide plein=rempli', 'désert/bondé', 'vide=vacant bondé=comble'),
  // Le calme, le bruit et le courage (« calme », « silencieux » et « craintif » se touchent).
  adj(
    'calme/agité bruyant/silencieux courageux/peureux patient/impatient calme=tranquille',
    'détendu/nerveux brave/lâche silencieux=muet bruyant=tapageur courageux=brave peureux=craintif calme=paisible',
    'serein/anxieux placide/fébrile feutré/tonitruant intrépide/timoré tonitruant=assourdissant audacieux=intrépide timoré=pusillanime serein=placide',
  ),
  // L'humeur.
  adj('gai/triste heureux/malheureux content/mécontent gai=joyeux', 'joyeux/triste heureux=content', 'enjoué/morose jovial=enjoué morose=maussade mélancolique=triste'),
  // Le caractère, la générosité et l'argent.
  adj(
    'gentil/méchant poli/impoli riche/pauvre',
    'aimable/désagréable généreux/avare cher/abordable gentil=aimable méchant=cruel impoli=grossier riche=fortuné pauvre=démuni cher=coûteux',
    'bienveillant/malveillant affable/bourru opulent/indigent prodigue/avare modique/exorbitant poli=courtois affable=avenant avare=pingre onéreux=coûteux',
  ),
  // L'intelligence et le savoir.
  adj('intelligent/bête savant/ignorant', 'bête=stupide savant=instruit', 'perspicace/obtus érudit/inculte sagace=perspicace inculte=ignare'),
  // La force.
  adj('fort/faible solide/fragile', 'fort=puissant solide=robuste', 'vigoureux/chétif frêle=chétif vigoureux=robuste'),
  // La difficulté.
  adj('facile/difficile simple/compliqué', 'facile=aisé compliqué=complexe', 'élémentaire/complexe difficile=ardu'),
  // Le vrai, le faux et la franchise.
  adj(
    'vrai/faux honnête/malhonnête',
    'exact/erroné franc/hypocrite vrai=exact sincère=franc',
    'véridique/mensonger authentique/factice loyal/perfide intègre/corrompu fallacieux=mensonger perfide=fourbe',
  ),
  adj('allumé/éteint'),
  adj('présent/absent'),
  adj('libre/occupé', '', 'libre/captif'),
  // La distance.
  adj('proche/lointain', 'proche=voisin éloigné=lointain', 'lointain=reculé'),
  // La place et l'ordre.
  adj('premier/dernier intérieur/extérieur', 'supérieur/inférieur initial/final premier=initial dernier=final', 'antérieur/postérieur'),
  // Le goût.
  adj('sucré/salé', 'savoureux/fade délicieux/infect savoureux=délicieux', 'succulent/insipide fade=insipide'),
  // Le danger et la santé.
  adj('', 'dangereux/inoffensif sain/malade dangereux=risqué malade=souffrant', 'nocif/inoffensif salubre/malsain périlleux=dangereux nocif=néfaste'),
  // Le soin.
  adj('', 'soigneux/négligent ordonné/brouillon', 'méticuleux=soigneux ordonné=méthodique'),
  // L'utilité et l'importance.
  adj(
    'utile/inutile',
    'essentiel/accessoire important/secondaire nécessaire=indispensable important=essentiel',
    'superflu/indispensable inutile=superflu primordial=essentiel',
  ),
  // Le possible et le certain.
  adj('possible/impossible', 'certain/douteux possible=faisable impossible=irréalisable', 'plausible/invraisemblable plausible=vraisemblable indéniable=incontestable'),
  // La beauté.
  adj('beau/laid beau=joli', 'joli/affreux beau=magnifique', 'splendide/hideux magnifique=splendide affreux=hideux'),
  // Le travail.
  adj('travailleur/paresseux', 'actif/passif paresseux=fainéant', 'indolent/zélé oisif=désœuvré'),
  // L'habituel, le rare et le pareil.
  adj(
    'normal/bizarre pareil/différent',
    'fréquent/rare banal/original semblable/différent bizarre=étrange identique=pareil',
    'abondant/rare insolite=étrange abondant=foisonnant analogue=semblable',
  ),
  // Ce qui se voit.
  adj('visible/invisible', 'discret/voyant', 'ostentatoire=voyant'),
  // La fierté.
  adj('', 'modeste/prétentieux prétentieux=vaniteux', 'humble/orgueilleux orgueilleux=arrogant humble=modeste'),
  // La loi.
  adj('autorisé/interdit', 'légal/illégal interdit=défendu', 'licite/prohibé prohibé=interdit'),
  // La souplesse, au toucher et dans le caractère.
  adj('', 'lisse/rugueux souple/rigide mou/ferme sévère/indulgent souple=flexible sévère=strict', 'rêche=rugueux moelleux=mou indulgent=clément'),
  adj('', 'horizontal/vertical'),
  // L'obéissance.
  adj('obéissant/désobéissant', 'docile/rebelle obéissant=docile', 'rebelle=insoumis'),
  adj('vivant/mort'),
  adj('', '', 'tranchant/émoussé aiguisé=tranchant'),

  // Verbes. Monter, grandir, avancer, aller vite (« les prix montent », « le projet avance »).
  verbe(
    'monter/descendre lever/baisser augmenter/diminuer avancer/reculer monter=grimper',
    'allonger/raccourcir agrandir/rétrécir accélérer/ralentir progresser/régresser diminuer=réduire ralentir=freiner agrandir=élargir',
    'gravir/dévaler dilater/contracter amplifier/atténuer hâter/retarder gravir=escalader accroître=augmenter étirer=allonger avancer=progresser',
  ),
  // Entrer, partir, apparaître.
  verbe('entrer/sortir arriver/partir apparaître/disparaître', 'surgir=apparaître', 'émigrer/immigrer émerger=surgir'),
  verbe('ouvrir/fermer'),
  verbe('allumer/éteindre'),
  // Gagner et perdre.
  verbe('gagner/perdre réussir/échouer trouver/perdre', 'vaincre=gagner', 'triompher=vaincre'),
  // Donner, accepter, acheter, avouer.
  verbe(
    'donner/prendre donner/recevoir accepter/refuser acheter/vendre',
    'prêter/emprunter accorder/refuser avouer/nier affirmer/nier refuser=rejeter',
    'confirmer/démentir accorder=octroyer refuser=décliner acquérir=acheter nier=démentir',
  ),
  verbe('attaquer/défendre', 'défendre=protéger attaquer=agresser', 'assaillir=attaquer'),
  // Commencer et finir.
  verbe('commencer/finir finir=terminer', 'débuter/terminer commencer=débuter', 'entamer/achever terminer=achever commencer=entamer'),
  verbe('construire/détruire construire=bâtir', 'bâtir/démolir détruire=démolir', 'édifier=bâtir anéantir=détruire'),
  verbe('remplir/vider', '', 'combler=remplir'),
  verbe('aimer/détester aimer=adorer', 'détester=haïr', 'chérir/abhorrer abhorrer=exécrer'),
  verbe('rire/pleurer', 'pleurer=sangloter'),
  // La voix.
  verbe('parler/se_taire crier=hurler', 'chuchoter/crier', 'murmurer/vociférer murmurer=chuchoter vociférer=hurler'),
  // Lier et séparer, rapprocher et éloigner.
  verbe(
    'attacher/détacher réunir/séparer',
    'nouer/dénouer assembler/démonter rapprocher/éloigner mélanger/trier attacher=lier',
    'fusionner/scinder scinder=diviser écarter=éloigner ligoter=attacher',
  ),
  verbe('oublier/se_souvenir', 'se_souvenir=se_rappeler', 'omettre=oublier'),
  verbe('cacher/montrer', 'révéler/cacher cacher=dissimuler', 'dévoiler/dissimuler révéler=dévoiler'),
  verbe('vivre/mourir', 'naître/mourir', 'mourir=décéder mourir=périr'),
  verbe('', 'chauffer/refroidir geler/fondre'),
  verbe('', 'mouiller/sécher mouiller=tremper', 'humecter=mouiller'),
  verbe('obéir/désobéir', '', 'obtempérer=obéir'),
  verbe('', 'calmer/énerver calmer=apaiser', 'apaiser/irriter irriter=agacer'),
  verbe('encourager/décourager', 'encourager=motiver', 'inciter/dissuader inciter=exhorter'),
  verbe('', 'féliciter/critiquer critiquer=blâmer', 'encenser/dénigrer dénigrer=décrier'),
  verbe('', 'dépenser/économiser gaspiller/économiser', 'gaspiller=dilapider économiser=épargner'),
  verbe('pousser/tirer'),
  verbe('ajouter/enlever', 'enlever=retirer', 'ôter=enlever adjoindre=ajouter'),

  // Noms. Le temps.
  nom('jour/nuit matin/soir été/hiver début/fin', 'passé/avenir veille/lendemain avenir=futur début=commencement', 'aube/crépuscule prologue/épilogue aube=aurore'),
  // Les gens.
  nom('ami/ennemi enfant/adulte ami=copain', 'allié/adversaire jeunesse/vieillesse ennemi=adversaire', 'rival=adversaire enfant=bambin'),
  // La guerre, la paix et le bruit (« la paix et le silence »).
  nom('guerre/paix silence/bruit', 'entente/dispute guerre=conflit dispute=querelle bruit=vacarme', 'concorde/discorde vacarme=tintamarre'),
  // Les émotions.
  nom('joie/tristesse amour/haine bonheur/malheur', 'plaisir/douleur joie=gaieté tristesse=chagrin douleur=souffrance', 'allégresse=joie'),
  // Le courage et la force.
  nom('', 'courage/lâcheté force/faiblesse peur=crainte force=vigueur', 'bravoure=courage effroi=terreur'),
  nom('lumière/ombre', 'lumière/obscurité', 'obscurité=ténèbres'),
  // La richesse, le manque, la victoire (« faire fortune », « réussite »).
  nom(
    'victoire/défaite',
    'richesse/pauvreté abondance/pénurie gain/perte succès/échec pauvreté=misère manque=pénurie richesse=fortune victoire=triomphe réussite=succès',
    'opulence/indigence profusion/disette gain=bénéfice défaite=déroute',
  ),
  nom('vérité/mensonge'),
  nom('question/réponse'),
  nom('départ/arrivée entrée/sortie'),
  // Ce qui monte et ce qui descend.
  nom('', 'montée/descente hausse/baisse hausse=augmentation', 'essor/déclin sommet=cime'),
  nom('travail/repos', 'repos=détente', 'labeur=travail'),
  nom('qualité/défaut', 'vertu/vice avantage/inconvénient', 'défaut=imperfection atout=avantage'),
  nom('ordre/désordre', 'désordre=fouillis', 'désordre=chaos'),
  nom('ville/campagne'),
  nom('', 'présence/absence maximum/minimum'),
];

export const WORDS_EN: readonly WordFamily[] = [
  // Adjectives. Temperature.
  adj('hot/cold', 'boiling/freezing cold=chilly freezing=icy', 'scorching/frigid scorching=sweltering frigid=glacial'),
  // Size, weight and depth.
  adj(
    'big/small long/short tall/short heavy/light deep/shallow big=large small=little',
    'huge/tiny wide/narrow huge=enormous wide=broad',
    'spacious/cramped colossal/minuscule colossal=gigantic tiny=minuscule spacious=roomy deep=profound',
  ),
  // Speed and time.
  adj('fast/slow early/late quick=fast', 'prompt/late rapid=fast', 'hasty/leisurely swift=rapid tardy=late'),
  // Age.
  adj('young/old new/old', 'modern/ancient modern/outdated old=elderly', 'youthful/elderly antiquated=outdated'),
  // Water.
  adj('wet/dry wet=soaked', 'damp=moist', 'arid/humid arid=parched'),
  adj('clean/dirty', 'dirty=filthy', 'spotless/grimy immaculate=spotless'),
  adj('full/empty', 'crowded/deserted crowded=packed', 'empty=vacant'),
  // Calm, noise and courage (“quiet” and “peaceful”, “timid” and “nervous” overlap).
  adj(
    'calm/nervous loud/quiet noisy/silent brave/cowardly patient/impatient',
    'relaxed/tense bold/timid brave=courageous calm=peaceful noisy=rowdy impatient=restless',
    'serene/agitated hushed/deafening intrepid=fearless daring=bold placid=serene deafening=thunderous audacious=daring',
  ),
  // Mood.
  adj('happy/sad happy=glad', 'cheerful/gloomy sad=unhappy', 'elated/dejected jovial=cheerful morose=gloomy'),
  // Character, generosity and money (“kind” and “generous”, “cheap” and “stingy” overlap).
  adj(
    'kind/cruel polite/rude rich/poor cheap/expensive',
    'nice/nasty generous/stingy rich=wealthy rude=impolite expensive=costly kind=caring',
    'benevolent/malevolent affluent/destitute frugal/extravagant courteous=polite stingy=miserly wealthy=affluent',
  ),
  // Intelligence (no very common level: “slow” or “quick” could pass for an answer).
  adj('', 'clever/stupid wise/foolish knowledgeable/ignorant clever=smart', 'astute/obtuse shrewd=astute erudite=scholarly'),
  adj('strong/weak', 'sturdy/flimsy strong=powerful', 'robust/frail frail=feeble robust=sturdy'),
  adj('easy/hard simple/complicated', 'straightforward/complex hard=difficult complicated=complex', 'effortless/arduous arduous=strenuous'),
  // True, false and honest.
  adj('true/false right/wrong honest/dishonest', 'genuine/fake right=correct honest=sincere', 'truthful/deceitful loyal/treacherous authentic=genuine fake=counterfeit'),
  adj('present/absent'),
  adj('awake/asleep'),
  adj('alive/dead', 'alive=living', 'dead=deceased'),
  adj('near/far', 'near=nearby', 'remote/nearby far=remote'),
  adj('first/last', 'inner/outer initial/final first=initial last=final', 'preceding/subsequent'),
  adj('', 'tasty/bland delicious=tasty', 'delectable=delicious insipid=bland'),
  // Danger and health.
  adj('safe/dangerous healthy/ill', 'harmless/harmful dangerous=risky ill=unwell', 'perilous=dangerous noxious=harmful ailing=unwell'),
  adj('tidy/messy careful/careless', 'neat=tidy', 'orderly/chaotic meticulous=careful'),
  // Usefulness and importance.
  adj('useful/useless', 'important/trivial essential=vital', 'superfluous/indispensable crucial=vital indispensable=essential'),
  // Possible and certain (“doubtful” and “unlikely” overlap).
  adj('possible/impossible', 'likely/unlikely certain/doubtful certain=sure', 'plausible/far-fetched feasible=possible undeniable=indisputable'),
  adj('beautiful/ugly', 'attractive/ugly pretty=beautiful gorgeous=stunning', 'exquisite/hideous hideous=grotesque'),
  adj('', 'diligent/lazy active/passive lazy=idle', 'lethargic/energetic industrious=diligent energetic=dynamic'),
  // Normal, rare and alike.
  adj(
    'normal/strange same/different',
    'frequent/rare ordinary/unusual similar/different strange=weird same=identical',
    'scarce/plentiful abundant=plentiful peculiar=bizarre analogous=similar',
  ),
  adj('visible/invisible', 'obvious/subtle', 'blatant=flagrant obvious=evident'),
  adj('', 'modest/arrogant humble=modest', 'humble/haughty arrogant=conceited haughty=arrogant'),
  adj('allowed/forbidden', 'legal/illegal forbidden=banned permitted=allowed', 'lawful/illicit prohibited=banned'),
  // Smooth and stiff, to the touch and in character.
  adj('smooth/rough', 'rigid/flexible strict/lenient rigid=stiff', 'supple=flexible coarse=rough stern=strict'),
  adj('', 'horizontal/vertical'),
  adj('obedient/disobedient', 'rebellious/obedient', 'compliant=obedient unruly=rebellious'),

  // Verbs. Going up, growing, moving forward (“prices rise”, “things improve”).
  verbe(
    'rise/fall grow/shrink increase/decrease raise/lower',
    'ascend/descend lengthen/shorten advance/retreat improve/worsen decrease=reduce climb=ascend',
    'soar/plummet expand/contract enhance=improve deteriorate=worsen plummet=plunge dwindle=decrease retreat=withdraw',
  ),
  // Coming, going, appearing.
  verbe('arrive/leave come/go appear/disappear', 'enter/leave leave=depart vanish=disappear', 'emigrate/immigrate emerge=appear'),
  verbe('open/close'),
  verbe('win/lose find/lose succeed/fail', '', 'prevail=win'),
  // Giving, accepting, buying, admitting, allowing.
  verbe(
    'give/take give/receive accept/refuse buy/sell allow/forbid agree/disagree',
    'lend/borrow admit/deny refuse=reject permit=allow buy=purchase',
    'grant=bestow decline=refuse confess=admit prohibit=forbid concur=agree acquire=purchase',
  ),
  // Defending and saving (“save” also means “protect”).
  verbe('attack/defend spend/save', 'waste/save defend=protect attack=assault', 'shield=protect squander=waste'),
  verbe('start/finish start/stop begin=start', '', 'commence/conclude commence=begin'),
  verbe('build/destroy', 'construct/demolish build=construct', 'demolish=raze annihilate=obliterate'),
  verbe('', 'fill/drain'),
  verbe('love/hate', 'admire/despise adore=love hate=detest', 'cherish/loathe loathe=abhor'),
  // The voice (“cry” also means “shout”).
  verbe('laugh/cry whisper/shout shout=yell', 'cry=weep', 'murmur/bellow murmur=whisper sob=weep'),
  verbe('tie/untie join/separate', 'unite/divide attach/detach separate=split', 'merge/split fasten=attach'),
  verbe('remember/forget', 'recall=remember', 'recollect=recall'),
  verbe('hide/show', 'reveal/conceal hide=conceal', 'disclose=reveal'),
  verbe('live/die', '', 'survive/perish perish=die'),
  verbe('', 'freeze/melt freeze/thaw', 'thaw=defrost'),
  verbe('', 'hurry=rush delay=postpone', 'accelerate/decelerate hasten/delay hasten=hurry'),
  // Obeying and following (“follow the rules”).
  verbe('obey/disobey lead/follow', '', 'comply=obey'),
  verbe('', 'soothe/irritate annoy=irritate', 'pacify/provoke pacify=soothe'),
  verbe('encourage/discourage', 'motivate=encourage', 'deter=discourage'),
  verbe('', 'praise/blame', 'commend/condemn commend=praise'),
  verbe('push/pull'),
  verbe('add/remove', 'add/subtract include/exclude remove=delete', 'subtract=deduct'),

  // Nouns. Time.
  nom('day/night morning/evening summer/winter beginning/end', 'past/future dawn/dusk', 'prologue/epilogue dawn=daybreak dusk=twilight'),
  // People.
  nom('friend/enemy hero/villain winner/loser adult/child child=kid', 'ally/enemy enemy=foe', 'rival=adversary villain=scoundrel winner=victor'),
  // War, peace and noise (“peace and quiet”).
  nom('war/peace silence/noise', 'war=conflict quarrel=dispute', 'harmony/discord noise=din uproar=commotion'),
  nom('happiness/sadness', 'joy/sorrow pleasure/pain joy=delight', 'grief=sorrow agony=anguish'),
  nom('', 'courage/cowardice strength/weakness fear=dread', 'bravery=courage terror=dread'),
  // Wealth, want and victory (“fortune”, “success”).
  nom(
    'victory/defeat success/failure',
    'wealth/poverty abundance/scarcity profit/loss wealth=fortune shortage=scarcity victory=triumph',
    'glut/dearth dearth=shortage gain=profit failure=fiasco',
  ),
  nom('truth/lie'),
  nom('question/answer'),
  nom('entrance/exit', 'arrival/departure'),
  nom('top/bottom front/back', 'maximum/minimum', 'summit=peak'),
  nom('work/rest', '', 'leisure/toil toil=work'),
  nom('', 'virtue/vice advantage/drawback', 'drawback=downside asset=advantage'),
  nom('city/countryside'),
  nom('', 'presence/absence'),
];
