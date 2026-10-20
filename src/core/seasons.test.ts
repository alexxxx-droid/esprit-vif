import { describe, expect, it } from 'vitest';
import { addDays } from './daily';
import { weeklyChallenge, type EventPlay } from './events';
import { editionHue, isSeasonHatId, parseSeasonHat, seasonArc, seasonHatId, seasonsEarned, seasonStatus, SEASONS_EPOCH, STORIES } from './seasons';

describe('saisons de défis', () => {
  it('découpe le temps en saisons de quatre semaines, chaque semaine étant un chapitre', () => {
    const first = seasonArc(SEASONS_EPOCH);
    expect(first).toMatchObject({ arc: 0, chapter: 0, start: SEASONS_EPOCH, end: addDays(SEASONS_EPOCH, 27), edition: 1 });
    expect(first.story.id).toBe('polaire');
    expect(seasonArc(addDays(SEASONS_EPOCH, 9)).chapter).toBe(1);
    expect(seasonArc(addDays(SEASONS_EPOCH, 28)).story.id).toBe('mer');
    // Après les six histoires, la première revient dans une nouvelle édition.
    const back = seasonArc(addDays(SEASONS_EPOCH, 28 * STORIES.length));
    expect(back.story.id).toBe('polaire');
    expect(back.edition).toBe(2);
    expect(seasonHatId(back)).toBe('saison-polaire-2');
  });

  it('reconnaît les chapeaux de saison et teinte les éditions suivantes', () => {
    expect(parseSeasonHat('saison-mer-3')).toEqual({ story: 'mer', edition: 3 });
    expect(isSeasonHatId('saison-lune-1')).toBe(false);
    expect(isSeasonHatId('casquette')).toBe(false);
    expect(editionHue(1)).toBe(0);
    expect(editionHue(2)).not.toBe(0);
  });

  it('donne le chapeau avec 3 chapitres sur 4, pas avant', () => {
    const arc = seasonArc(SEASONS_EPOCH);
    // Défis « jours différents » ou « variété » : jouer chaque jour à un jeu différent les relève souvent ;
    // on fabrique des semaines qui remplissent le défi de chacune, quelle qu'en soit la sorte.
    const ids = ['calcul', 'stroop', 'schulte', 'matrice', 'nback', 'total', 'intrus', 'anagrammes', 'boutique', 'diable'] as const;
    const weekPlays = (week: string) => {
      const c = weeklyChallenge(week);
      const plays: EventPlay[] = [];
      for (let d = 0; d < 7; d++) for (let k = 0; k < 2; k++) plays.push({ gameId: c.gameId ?? ids[(d * 2 + k) % ids.length], score: 99, day: addDays(week, d) });
      if (c.domain) for (let k = 0; k < 8; k++) plays.push({ gameId: 'calcul', score: 99, day: week });
      return plays;
    };
    const sessions = arc.weeks.flatMap((w) => [0, 1, 2].map((d) => addDays(w, d)));
    const three = arc.weeks.slice(0, 3).flatMap(weekPlays);
    const status = seasonStatus(arc, three, sessions.slice(0, 9));
    expect(status.done.filter(Boolean).length).toBeGreaterThanOrEqual(2);
    const all = arc.weeks.flatMap(weekPlays);
    expect(seasonsEarned([], [], arc.end)).toEqual([]);
    expect(seasonStatus(arc, [], []).earned).toBe(false);
    expect(seasonStatus(arc, all, sessions).done.filter(Boolean).length).toBeGreaterThanOrEqual(3);
  });
});
