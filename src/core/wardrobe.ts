import { localized, tr, type Translations } from './lang';
import { MAX_LEVEL } from './levels';
import { achievements, medalsAtLeast, type AchievementContext, type ProgressionInput } from './progression';
import { sparksEarned } from './objectives';
import { isSeasonHatId, type SeasonHatId } from './seasons';

/**
 * Le vestiaire de Vif : des chapeaux à acheter avec les étincelles gagnées en jouant, et des
 * chapeaux de prestige qui ne s'achètent pas, réservés aux exploits. Purement décoratif : aucun
 * chapeau ne change un score, une difficulté ou un déblocage. Rien ne s'achète avec de l'argent.
 */

export type HatId =
  | 'casquette'
  | 'fleur'
  | 'noeud'
  | 'bonnet'
  | 'bob'
  | 'lunettes'
  | 'paille'
  | 'bandana'
  | 'fete'
  | 'chantier'
  | 'chat'
  | 'antennes'
  | 'couronne-fleurs'
  | 'melon'
  | 'fez'
  | 'cowboy'
  | 'pirate'
  | 'casque-audio'
  | 'sombrero'
  | 'viking'
  | 'beret'
  | 'magicien'
  | 'couronne'
  | 'laurier'
  | 'diademe'
  | 'bonnet-nuit'
  | 'aviateur'
  | 'toque'
  | 'haut-de-forme'
  | 'mortier'
  | 'aureole'
  | 'astronaute'
  | 'licorne'
  | 'mousquetaire'
  | 'couronne-etoilee'
  | 'lapin'
  | 'dragon'
  | 'arc-en-ciel'
  | 'pharaon'
  | 'bandeau-maitre'
  | 'heaume'
  | 'couronne-cristal'
  | 'chapeau-sage'
  | 'couronne-solaire';

interface Prestige {
  rule: Translations;
  value: (c: AchievementContext) => number;
  target: number;
}

interface HatDef {
  id: HatId;
  name: Translations;
  /** Prix en étincelles (chapeaux de la boutique). */
  price?: number;
  /** Condition d'obtention (chapeaux de prestige). */
  prestige?: Prestige;
  /** Collection Premium : à toi avec Esprit Vif Premium, jamais contre des étincelles. */
  premium?: true;
}

const shop = (id: HatId, name: Translations, price: number): HatDef => ({ id, name, price });
const prestige = (id: HatId, name: Translations, rule: Translations, value: Prestige['value'], target: number): HatDef => ({
  id,
  name,
  prestige: { rule, value, target },
});
const premiumHat = (id: HatId, name: Translations): HatDef => ({ id, name, premium: true });
const has = (condition: boolean) => (condition ? 1 : 0);

/** Les paliers de niveaux, du plus simple au plus difficile (voir `TIERS`). */
const TIER_START = { expert: 21, maitre: 31, legende: 41 } as const;

export const HATS: readonly HatDef[] = [
  shop('casquette', { fr: 'Casquette', en: 'Cap' }, 40),
  shop('fleur', { fr: 'Fleur des champs', en: 'Wildflower' }, 40),
  shop('noeud', { fr: 'Nœud', en: 'Bow' }, 50),
  shop('bonnet', { fr: 'Bonnet de laine', en: 'Wool beanie' }, 60),
  shop('bob', { fr: 'Bob', en: 'Bucket hat' }, 60),
  shop('lunettes', { fr: 'Lunettes rondes', en: 'Round glasses' }, 70),
  shop('paille', { fr: 'Chapeau de paille', en: 'Straw hat' }, 80),
  shop('bandana', { fr: 'Bandana', en: 'Bandana' }, 80),
  shop('fete', { fr: 'Chapeau de fête', en: 'Party hat' }, 90),
  shop('chantier', { fr: 'Casque de chantier', en: 'Hard hat' }, 100),
  shop('chat', { fr: 'Oreilles de chat', en: 'Cat ears' }, 100),
  shop('antennes', { fr: 'Antennes', en: 'Antennae' }, 120),
  shop('couronne-fleurs', { fr: 'Couronne de fleurs', en: 'Flower crown' }, 120),
  shop('melon', { fr: 'Chapeau melon', en: 'Bowler hat' }, 130),
  shop('fez', { fr: 'Fez', en: 'Fez' }, 130),
  shop('cowboy', { fr: 'Chapeau de cow-boy', en: 'Cowboy hat' }, 150),
  shop('pirate', { fr: 'Tricorne de pirate', en: 'Pirate hat' }, 150),
  shop('casque-audio', { fr: 'Casque audio', en: 'Headphones' }, 160),
  shop('sombrero', { fr: 'Sombrero', en: 'Sombrero' }, 180),
  shop('viking', { fr: 'Casque viking', en: 'Viking helmet' }, 200),
  prestige(
    'beret',
    { fr: 'Béret d’artiste', en: 'Artist’s beret' },
    { fr: 'Ouvrir le palier Expert (niveau 21) d’un jeu', en: 'Open the Expert tier (level 21) in a game' },
    (c) => c.maxUnlocked,
    TIER_START.expert,
  ),
  prestige(
    'magicien',
    { fr: 'Chapeau de magicien', en: 'Wizard hat' },
    { fr: 'Ouvrir le palier Maître (niveau 31) d’un jeu', en: 'Open the Master tier (level 31) in a game' },
    (c) => c.maxUnlocked,
    TIER_START.maitre,
  ),
  prestige(
    'couronne',
    { fr: 'Couronne royale', en: 'Royal crown' },
    { fr: 'Ouvrir le palier Légende (niveau 41) d’un jeu', en: 'Open the Legend tier (level 41) in a game' },
    (c) => c.maxUnlocked,
    TIER_START.legende,
  ),
  prestige('laurier', { fr: 'Couronne de laurier', en: 'Laurel wreath' }, { fr: 'Gagner une médaille de platine', en: 'Earn a platinum medal' }, (c) => has(medalsAtLeast(c, 'platine') > 0), 1),
  prestige('diademe', { fr: 'Diadème', en: 'Tiara' }, { fr: 'Gagner une médaille de diamant', en: 'Earn a diamond medal' }, (c) => has(medalsAtLeast(c, 'diamant') > 0), 1),
  prestige('bonnet-nuit', { fr: 'Bonnet de nuit étoilé', en: 'Starry nightcap' }, { fr: 'Tenir une série de 7 jours', en: 'Keep a 7-day streak' }, (c) => c.streak, 7),
  prestige('aviateur', { fr: 'Casque d’aviateur', en: 'Aviator cap' }, { fr: 'Tenir une série de 30 jours', en: 'Keep a 30-day streak' }, (c) => c.streak, 30),
  prestige('toque', { fr: 'Toque de chef', en: 'Chef’s hat' }, { fr: 'Relever 5 défis de la semaine', en: 'Complete 5 weekly challenges' }, (c) => c.weeklies, 5),
  prestige('haut-de-forme', { fr: 'Haut-de-forme', en: 'Top hat' }, { fr: 'Atteindre le niveau 10 de joueur', en: 'Reach player level 10' }, (c) => c.rank, 10),
  prestige('mortier', { fr: 'Mortier de diplômé', en: 'Graduation cap' }, { fr: 'Atteindre le niveau 25 de joueur', en: 'Reach player level 25' }, (c) => c.rank, 25),
  prestige('aureole', { fr: 'Auréole', en: 'Halo' }, { fr: 'Atteindre le niveau 50 de joueur', en: 'Reach player level 50' }, (c) => c.rank, MAX_LEVEL),
  ...([
    ['bandeau-maitre', { fr: 'Bandeau de maître', en: 'Master’s headband' }, 5],
    ['heaume', { fr: 'Heaume de chevalier', en: 'Knight’s helm' }, 10],
    ['couronne-cristal', { fr: 'Couronne de cristal', en: 'Crystal crown' }, 15],
    ['chapeau-sage', { fr: 'Chapeau du grand sage', en: 'Grand sage’s hat' }, 20],
    ['couronne-solaire', { fr: 'Couronne solaire', en: 'Sun crown' }, 25],
  ] as const).map(([id, name, n]) =>
    prestige(id, name, { fr: `Maîtriser ${n} jeux (Maîtrise V)`, en: `Master ${n} games (Mastery V)` }, (c) => c.mastered, n),
  ),
  premiumHat('astronaute', { fr: 'Casque d’astronaute', en: 'Space helmet' }),
  premiumHat('licorne', { fr: 'Corne de licorne', en: 'Unicorn horn' }),
  premiumHat('mousquetaire', { fr: 'Chapeau de mousquetaire', en: 'Musketeer hat' }),
  premiumHat('couronne-etoilee', { fr: 'Couronne étoilée', en: 'Starry crown' }),
  premiumHat('lapin', { fr: 'Oreilles de lapin', en: 'Bunny ears' }),
  premiumHat('dragon', { fr: 'Capuche de dragon', en: 'Dragon hood' }),
  premiumHat('arc-en-ciel', { fr: 'Arc-en-ciel', en: 'Rainbow' }),
  premiumHat('pharaon', { fr: 'Coiffe de pharaon', en: 'Pharaoh headdress' }),
];

export const isPremiumHat = (id: WornHat) => HATS.some((h) => h.id === id && h.premium);

/** Un chapeau de la collection Premium ne se porte qu'avec Premium (le choix est gardé, pas effacé). */
export function hatWearable(id: WornHat, premium: boolean): boolean {
  return premium || !isPremiumHat(id);
}

export const isHatId = (value: unknown): value is HatId => HATS.some((h) => h.id === value);

/** Ce qu'un compagnon peut porter : un chapeau du vestiaire, ou un chapeau de saison gagné. */
export type WornHat = HatId | SeasonHatId;

export const isWornHat = (value: unknown): value is WornHat => isHatId(value) || isSeasonHatId(value);

export function hatName(id: HatId): string {
  return localized(HATS.find((h) => h.id === id)?.name ?? { fr: id, en: id });
}

/** Un achat du vestiaire : le prix payé est gardé, pour que le solde ne bouge pas si les prix changent. */
export interface WardrobeEntry {
  id: HatId;
  cost: number;
  day: string;
}

export interface HatStatus {
  id: HatId;
  name: string;
  kind: 'shop' | 'prestige' | 'premium';
  owned: boolean;
  price: number;
  /** Prestige : la condition, et où en est le joueur. */
  rule: string;
  progress: [number, number] | null;
}

export interface Wardrobe {
  earned: number;
  spent: number;
  balance: number;
  hats: HatStatus[];
  /** Le prochain chapeau de la boutique (le moins cher pas encore acheté). */
  nextShop: HatStatus | null;
  /** Le chapeau de prestige le plus proche. */
  nextPrestige: HatStatus | null;
}

export function wardrobe(input: ProgressionInput, entries: readonly WardrobeEntry[], earned = sparksEarned(input), premium = false): Wardrobe {
  const context = achievements(input);
  const bought = new Set(entries.map((e) => e.id));
  const spent = entries.reduce((sum, e) => sum + e.cost, 0);
  const hats = HATS.map((def): HatStatus => {
    if (def.prestige) {
      const value = def.prestige.value(context);
      return {
        id: def.id,
        name: localized(def.name),
        kind: 'prestige',
        owned: value >= def.prestige.target,
        price: 0,
        rule: localized(def.prestige.rule),
        progress: def.prestige.target > 1 ? [Math.min(value, def.prestige.target), def.prestige.target] : null,
      };
    }
    if (def.premium) {
      return { id: def.id, name: localized(def.name), kind: 'premium', owned: premium, price: 0, rule: tr('Collection Premium', 'Premium collection'), progress: null };
    }
    return { id: def.id, name: localized(def.name), kind: 'shop', owned: bought.has(def.id), price: def.price ?? 0, rule: '', progress: null };
  });
  const ratio = (h: HatStatus) => (h.progress ? h.progress[0] / h.progress[1] : 0);
  return {
    earned,
    spent,
    balance: earned - spent,
    hats,
    nextShop: hats.filter((h) => h.kind === 'shop' && !h.owned).sort((a, b) => a.price - b.price)[0] ?? null,
    nextPrestige: hats.filter((h) => h.kind === 'prestige' && !h.owned).sort((a, b) => ratio(b) - ratio(a))[0] ?? null,
  };
}

/** Pourquoi un achat est refusé (null : il est possible). */
export function purchaseBlocker(status: Wardrobe, id: HatId): string | null {
  const hat = status.hats.find((h) => h.id === id);
  if (hat?.kind === 'premium') return tr('Réservé à Esprit Vif Premium.', 'Included with Esprit Vif Premium.');
  if (!hat || hat.kind !== 'shop') return tr('Ce chapeau ne s’achète pas.', 'This hat can’t be bought.');
  if (hat.owned) return tr('Déjà dans le vestiaire.', 'Already in the wardrobe.');
  if (status.balance < hat.price) return tr(`Encore ${hat.price - status.balance} étincelles`, `${hat.price - status.balance} more sparks`);
  return null;
}
