import { addDays, dayIndex } from './daily';
import { challengeProgress, weekStart, weeklyChallenge, type EventPlay } from './events';
import { localized, tr, type Translations } from './lang';

/**
 * Les saisons de défis : quatre semaines qui racontent une petite histoire. Chaque semaine est un
 * chapitre, validé par le défi de la semaine. Trois chapitres sur quatre suffisent pour gagner le
 * chapeau de la saison : on peut manquer une semaine sans tout perdre. Six histoires tournent ; à
 * chaque retour, leur chapeau revient dans une nouvelle édition (une autre couleur), pour une
 * collection qui ne s'arrête jamais. Tout se déduit de l'historique.
 */

export type StoryId = 'polaire' | 'mer' | 'foret' | 'desert' | 'etoiles' | 'volcan';

interface Chapter {
  title: Translations;
  line: Translations;
}

interface Story {
  id: StoryId;
  name: Translations;
  hat: Translations;
  chapters: readonly [Chapter, Chapter, Chapter, Chapter];
}

const ch = (title: Translations, line: Translations): Chapter => ({ title, line });

export const STORIES: readonly Story[] = [
  {
    id: 'polaire',
    name: { fr: 'L’expédition polaire', en: 'The Polar Expedition' },
    hat: { fr: 'Chapka polaire', en: 'Polar trapper hat' },
    chapters: [
      ch({ fr: 'Le camp de base', en: 'Base camp' }, { fr: 'Vif boucle son sac : cap sur le Grand Nord !', en: 'Vif packs up: next stop, the far North!' }),
      ch({ fr: 'Le col des glaces', en: 'The Ice Pass' }, { fr: 'Le vent souffle fort, mais chaque défi relevé ouvre la voie.', en: 'The wind is fierce, but every challenge clears the way.' }),
      ch({ fr: 'Les aurores', en: 'The Northern Lights' }, { fr: 'Le ciel s’illumine de vert et de violet.', en: 'The sky lights up in green and violet.' }),
      ch({ fr: 'Le sommet blanc', en: 'The White Summit' }, { fr: 'Encore un effort : le drapeau t’attend au sommet !', en: 'One last push: the flag awaits at the top!' }),
    ],
  },
  {
    id: 'mer',
    name: { fr: 'Le grand voyage en mer', en: 'The Great Sea Voyage' },
    hat: { fr: 'Casquette de capitaine', en: 'Captain’s cap' },
    chapters: [
      ch({ fr: 'Le port', en: 'The Harbor' }, { fr: 'Le navire largue les amarres.', en: 'The ship casts off.' }),
      ch({ fr: 'La tempête', en: 'The Storm' }, { fr: 'Les vagues grondent : tiens bon la barre !', en: 'The waves roar: hold the wheel!' }),
      ch({ fr: 'L’île aux perroquets', en: 'Parrot Island' }, { fr: 'Une escale colorée, pleine de bavards à plumes.', en: 'A colorful stop, full of feathered chatterboxes.' }),
      ch({ fr: 'Le trésor', en: 'The Treasure' }, { fr: 'La carte mène à un coffre… qui brille déjà !', en: 'The map leads to a chest… already shining!' }),
    ],
  },
  {
    id: 'foret',
    name: { fr: 'La forêt enchantée', en: 'The Enchanted Forest' },
    hat: { fr: 'Chapeau champignon', en: 'Mushroom cap' },
    chapters: [
      ch({ fr: 'L’orée du bois', en: 'The Forest’s Edge' }, { fr: 'Des lucioles montrent le chemin.', en: 'Fireflies light the way.' }),
      ch({ fr: 'Le pont des fées', en: 'The Fairy Bridge' }, { fr: 'Un pont de lianes, une énigme à chaque planche.', en: 'A vine bridge, a riddle on every plank.' }),
      ch({ fr: 'Le chêne qui parle', en: 'The Talking Oak' }, { fr: 'Le vieux chêne connaît tous les secrets.', en: 'The old oak knows every secret.' }),
      ch({ fr: 'La clairière', en: 'The Clearing' }, { fr: 'La fête des champignons commence !', en: 'The mushroom party begins!' }),
    ],
  },
  {
    id: 'desert',
    name: { fr: 'Le désert des mirages', en: 'The Desert of Mirages' },
    hat: { fr: 'Casque d’explorateur', en: 'Explorer’s helmet' },
    chapters: [
      ch({ fr: 'L’oasis', en: 'The Oasis' }, { fr: 'Dernière gorgée d’eau fraîche avant les dunes.', en: 'One last sip of cool water before the dunes.' }),
      ch({ fr: 'Les dunes', en: 'The Dunes' }, { fr: 'Le sable bouge : garde l’esprit clair !', en: 'The sand shifts: keep a clear head!' }),
      ch({ fr: 'Le mirage', en: 'The Mirage' }, { fr: 'Était-ce vraiment une ville au loin ?', en: 'Was that really a city on the horizon?' }),
      ch({ fr: 'Le temple caché', en: 'The Hidden Temple' }, { fr: 'Les portes de pierre s’ouvrent enfin.', en: 'The stone doors finally open.' }),
    ],
  },
  {
    id: 'etoiles',
    name: { fr: 'La cité des étoiles', en: 'The City of Stars' },
    hat: { fr: 'Chapeau planète', en: 'Planet hat' },
    chapters: [
      ch({ fr: 'Le décollage', en: 'Liftoff' }, { fr: '3, 2, 1… la fusée s’envole !', en: '3, 2, 1… the rocket takes off!' }),
      ch({ fr: 'La ceinture d’astéroïdes', en: 'The Asteroid Belt' }, { fr: 'Slalom entre les cailloux de l’espace.', en: 'Slaloming through space rocks.' }),
      ch({ fr: 'La lune bleue', en: 'The Blue Moon' }, { fr: 'On y marche en faisant des bonds.', en: 'You walk there in giant hops.' }),
      ch({ fr: 'La cité des étoiles', en: 'The City of Stars' }, { fr: 'Ses habitants t’accueillent comme un héros.', en: 'Its people welcome you as a hero.' }),
    ],
  },
  {
    id: 'volcan',
    name: { fr: 'Le cœur du volcan', en: 'The Heart of the Volcano' },
    hat: { fr: 'Couronne de flammes', en: 'Flame crown' },
    chapters: [
      ch({ fr: 'Le sentier fumant', en: 'The Smoking Trail' }, { fr: 'Le sol est chaud sous les pattes.', en: 'The ground is warm underfoot.' }),
      ch({ fr: 'La rivière de lave', en: 'The Lava River' }, { fr: 'On saute de pierre en pierre.', en: 'Hopping from stone to stone.' }),
      ch({ fr: 'La caverne de cristal', en: 'The Crystal Cave' }, { fr: 'Des cristaux géants scintillent dans le noir.', en: 'Giant crystals sparkle in the dark.' }),
      ch({ fr: 'Le cœur du volcan', en: 'The Heart of the Volcano' }, { fr: 'Une flamme dorée t’attend au centre.', en: 'A golden flame awaits at the center.' }),
    ],
  },
];

/** Lundi où commence la première saison (le 19 octobre 2026, semaine de la v2.10). */
export const SEASONS_EPOCH = '2026-10-19';
export const SEASON_WEEKS = 4;
/** Chapitres à valider pour gagner le chapeau de la saison. */
export const SEASON_REQUIRED = 3;

const mod = (n: number, m: number) => ((n % m) + m) % m;

export interface SeasonArc {
  /** Numéro de la saison depuis la première (peut être négatif avant). */
  arc: number;
  story: Story;
  /** Édition du chapeau : 1 la première fois que l'histoire passe, 2 la suivante… */
  edition: number;
  /** Les quatre lundis de la saison. */
  weeks: string[];
  /** Le chapitre de la semaine en cours (0 à 3). */
  chapter: number;
  start: string;
  end: string;
}

export function seasonArc(day: string): SeasonArc {
  const week = Math.floor((dayIndex(weekStart(day)) - dayIndex(SEASONS_EPOCH)) / 7);
  const arc = Math.floor(week / SEASON_WEEKS);
  const start = addDays(SEASONS_EPOCH, arc * SEASON_WEEKS * 7);
  const weeks = Array.from({ length: SEASON_WEEKS }, (_, i) => addDays(start, i * 7));
  return {
    arc,
    story: STORIES[mod(arc, STORIES.length)],
    edition: Math.floor(arc / STORIES.length) + 1,
    weeks,
    chapter: mod(week, SEASON_WEEKS),
    start,
    end: addDays(start, SEASON_WEEKS * 7 - 1),
  };
}

/** Identifiant du chapeau d'une saison : « saison-polaire-1 ». */
export type SeasonHatId = `saison-${StoryId}-${number}`;

export function seasonHatId(arc: SeasonArc): SeasonHatId {
  return `saison-${arc.story.id}-${arc.edition}`;
}

export function parseSeasonHat(id: string): { story: StoryId; edition: number } | null {
  const match = /^saison-([a-z]+)-(\d+)$/.exec(id);
  if (!match || !STORIES.some((s) => s.id === match[1])) return null;
  const edition = Number(match[2]);
  return edition >= 1 ? { story: match[1] as StoryId, edition } : null;
}

export const isSeasonHatId = (value: unknown): value is SeasonHatId => typeof value === 'string' && parseSeasonHat(value) !== null;

/** Nom d'un chapeau de saison : « Chapka polaire · édition 2 ». */
export function seasonHatName(id: SeasonHatId): string {
  const parsed = parseSeasonHat(id);
  const story = STORIES.find((s) => s.id === parsed?.story);
  if (!parsed || !story) return id;
  return parsed.edition > 1 ? tr(`${localized(story.hat)} · édition ${parsed.edition}`, `${localized(story.hat)} · edition ${parsed.edition}`) : localized(story.hat);
}

/** Teinte d'une édition : la première garde ses couleurs, les suivantes tournent sur le cercle des couleurs. */
export function editionHue(edition: number): number {
  return mod((edition - 1) * 55, 360);
}

export interface SeasonStatus {
  arc: SeasonArc;
  /** Chapitres validés (défi de leur semaine relevé). */
  done: boolean[];
  earned: boolean;
}

export function seasonStatus(arc: SeasonArc, plays: readonly EventPlay[], sessions: readonly string[]): SeasonStatus {
  const done = arc.weeks.map((week) => {
    const challenge = weeklyChallenge(week);
    return challengeProgress(challenge, plays, sessions) >= challenge.target;
  });
  return { arc, done, earned: done.filter(Boolean).length >= SEASON_REQUIRED };
}

/** Toutes les saisons réussies jusqu'à `today` : la collection de chapeaux de saison. */
export function seasonsEarned(plays: readonly EventPlay[], sessions: readonly string[], today: string): SeasonStatus[] {
  const days = [...plays.map((p) => p.day), ...sessions].filter((d) => d >= SEASONS_EPOCH && d <= today).sort();
  if (!days.length) return [];
  const first = seasonArc(days[0]).arc;
  const last = seasonArc(today).arc;
  const out: SeasonStatus[] = [];
  for (let arc = first; arc <= last; arc++) {
    const status = seasonStatus(seasonArc(addDays(SEASONS_EPOCH, arc * SEASON_WEEKS * 7)), plays, sessions);
    if (status.earned) out.push(status);
  }
  return out;
}
