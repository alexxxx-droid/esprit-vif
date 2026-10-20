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

const shop = (id: HatId, fr: string, en: string, price: number): HatDef => ({ id, name: { fr, en }, price });
const prestige = (id: HatId, fr: string, en: string, rule: Translations, value: Prestige['value'], target: number): HatDef => ({
  id,
  name: { fr, en },
  prestige: { rule, value, target },
});
const premiumHat = (id: HatId, fr: string, en: string): HatDef => ({ id, name: { fr, en }, premium: true });
const has = (condition: boolean) => (condition ? 1 : 0);

/** Les paliers de niveaux, du plus simple au plus difficile (voir `TIERS`). */
const TIER_START = { expert: 21, maitre: 31, legende: 41 } as const;

export const HATS: readonly HatDef[] = [
  shop('casquette', 'Casquette', 'Cap', 40),
  shop('fleur', 'Fleur des champs', 'Wildflower', 40),
  shop('noeud', 'Nœud', 'Bow', 50),
  shop('bonnet', 'Bonnet de laine', 'Wool beanie', 60),
  shop('bob', 'Bob', 'Bucket hat', 60),
  shop('lunettes', 'Lunettes rondes', 'Round glasses', 70),
  shop('paille', 'Chapeau de paille', 'Straw hat', 80),
  shop('bandana', 'Bandana', 'Bandana', 80),
  shop('fete', 'Chapeau de fête', 'Party hat', 90),
  shop('chantier', 'Casque de chantier', 'Hard hat', 100),
  shop('chat', 'Oreilles de chat', 'Cat ears', 100),
  shop('antennes', 'Antennes', 'Antennae', 120),
  shop('couronne-fleurs', 'Couronne de fleurs', 'Flower crown', 120),
  shop('melon', 'Chapeau melon', 'Bowler hat', 130),
  shop('fez', 'Fez', 'Fez', 130),
  shop('cowboy', 'Chapeau de cow-boy', 'Cowboy hat', 150),
  shop('pirate', 'Tricorne de pirate', 'Pirate hat', 150),
  shop('casque-audio', 'Casque audio', 'Headphones', 160),
  shop('sombrero', 'Sombrero', 'Sombrero', 180),
  shop('viking', 'Casque viking', 'Viking helmet', 200),
  prestige(
    'beret',
    'Béret d’artiste',
    'Artist’s beret',
    { fr: 'Ouvrir le palier Expert (niveau 21) d’un jeu', en: 'Open the Expert tier (level 21) in a game' },
    (c) => c.maxUnlocked,
    TIER_START.expert,
  ),
  prestige(
    'magicien',
    'Chapeau de magicien',
    'Wizard hat',
    { fr: 'Ouvrir le palier Maître (niveau 31) d’un jeu', en: 'Open the Master tier (level 31) in a game' },
    (c) => c.maxUnlocked,
    TIER_START.maitre,
  ),
  prestige(
    'couronne',
    'Couronne royale',
    'Royal crown',
    { fr: 'Ouvrir le palier Légende (niveau 41) d’un jeu', en: 'Open the Legend tier (level 41) in a game' },
    (c) => c.maxUnlocked,
    TIER_START.legende,
  ),
  prestige('laurier', 'Couronne de laurier', 'Laurel wreath', { fr: 'Gagner une médaille de platine', en: 'Earn a platinum medal' }, (c) => has(medalsAtLeast(c, 'platine') > 0), 1),
  prestige('diademe', 'Diadème', 'Tiara', { fr: 'Gagner une médaille de diamant', en: 'Earn a diamond medal' }, (c) => has(medalsAtLeast(c, 'diamant') > 0), 1),
  prestige('bonnet-nuit', 'Bonnet de nuit étoilé', 'Starry nightcap', { fr: 'Tenir une série de 7 jours', en: 'Keep a 7-day streak' }, (c) => c.streak, 7),
  prestige('aviateur', 'Casque d’aviateur', 'Aviator cap', { fr: 'Tenir une série de 30 jours', en: 'Keep a 30-day streak' }, (c) => c.streak, 30),
  prestige('toque', 'Toque de chef', 'Chef’s hat', { fr: 'Relever 5 défis de la semaine', en: 'Complete 5 weekly challenges' }, (c) => c.weeklies, 5),
  prestige('haut-de-forme', 'Haut-de-forme', 'Top hat', { fr: 'Atteindre le niveau 10 de joueur', en: 'Reach player level 10' }, (c) => c.rank, 10),
  prestige('mortier', 'Mortier de diplômé', 'Graduation cap', { fr: 'Atteindre le niveau 25 de joueur', en: 'Reach player level 25' }, (c) => c.rank, 25),
  prestige('aureole', 'Auréole', 'Halo', { fr: 'Atteindre le niveau 50 de joueur', en: 'Reach player level 50' }, (c) => c.rank, MAX_LEVEL),
  ...([
    ['bandeau-maitre', 'Bandeau de maître', 'Master’s headband', 5],
    ['heaume', 'Heaume de chevalier', 'Knight’s helm', 10],
    ['couronne-cristal', 'Couronne de cristal', 'Crystal crown', 15],
    ['chapeau-sage', 'Chapeau du grand sage', 'Grand sage’s hat', 20],
    ['couronne-solaire', 'Couronne solaire', 'Sun crown', 25],
  ] as const).map(([id, fr, en, n]) =>
    prestige(id, fr, en, { fr: `Maîtriser ${n} jeux (Maîtrise V)`, en: `Master ${n} games (Mastery V)` }, (c) => c.mastered, n),
  ),
  premiumHat('astronaute', 'Casque d’astronaute', 'Space helmet'),
  premiumHat('licorne', 'Corne de licorne', 'Unicorn horn'),
  premiumHat('mousquetaire', 'Chapeau de mousquetaire', 'Musketeer hat'),
  premiumHat('couronne-etoilee', 'Couronne étoilée', 'Starry crown'),
  premiumHat('lapin', 'Oreilles de lapin', 'Bunny ears'),
  premiumHat('dragon', 'Capuche de dragon', 'Dragon hood'),
  premiumHat('arc-en-ciel', 'Arc-en-ciel', 'Rainbow'),
  premiumHat('pharaon', 'Coiffe de pharaon', 'Pharaoh headdress'),
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
