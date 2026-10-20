import { describe, expect, it } from 'vitest';
import { masteryTempo, MAX_LEVEL, passScore, playedLevel, starsFor } from './levels';
import {
  gameStars,
  masteryOf,
  medalFor,
  playXp,
  progressionDelta,
  rankFor,
  nextTitle,
  levelSparks,
  LEVEL_SPARKS,
  AURAS,
  titleFor,
  totalXp,
  trophyStatuses,
  unlockedLevel,
  xpToReach,
  type ProgressionInput,
  type ProgressionPlay,
} from './progression';

const empty: ProgressionInput = { plays: [], tests: [], bests: {}, sessions: [], marathons: 0, duels: 0, challenges: 0 };
const bestsUpTo = (top: number, score = 70) => Object.fromEntries(Array.from({ length: top }, (_, i) => [i + 1, { score }]));

describe('étoiles et niveaux débloqués', () => {
  it('donne 1 étoile dès 60, 2 dès 80, 3 dès 95', () => {
    expect([0, 59, 60, 79, 80, 94, 95, 100].map(starsFor)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });

  it('débloque le niveau qui suit le plus haut niveau réussi', () => {
    expect(unlockedLevel(undefined)).toBe(1);
    expect(unlockedLevel({ 1: { score: 50 } })).toBe(1);
    expect(unlockedLevel({ 1: { score: 60 }, 2: { score: 90 } })).toBe(3);
    // Le niveau 50 réussi ouvre la maîtrise (51) ; Maîtrise X (60) est le dernier cran.
    expect(unlockedLevel(bestsUpTo(MAX_LEVEL))).toBe(MAX_LEVEL + 1);
    expect(unlockedLevel({ ...bestsUpTo(MAX_LEVEL), 51: { score: 63 } })).toBe(MAX_LEVEL + 1);
    expect(unlockedLevel({ ...bestsUpTo(MAX_LEVEL), 51: { score: 64 } })).toBe(MAX_LEVEL + 2);
    expect(unlockedLevel(bestsUpTo(MAX_LEVEL + 10, 100))).toBe(MAX_LEVEL + 10);
    expect(gameStars({ 50: { score: 96 }, 51: { score: 96 } })).toBe(3);
    expect(gameStars({ 1: { score: 60 }, 2: { score: 96 } })).toBe(4);
  });

  it('attribue les médailles selon le niveau réussi', () => {
    expect(medalFor(bestsUpTo(4))).toBeNull();
    expect(medalFor(bestsUpTo(5))).toBe('bronze');
    expect(medalFor(bestsUpTo(12))).toBe('argent');
    expect(medalFor(bestsUpTo(15))).toBe('or');
    expect(medalFor(bestsUpTo(20))).toBe('or');
    expect(medalFor(bestsUpTo(20, 97))).toBe('platine');
  });
});

describe('XP et rang', () => {
  const play = (score: number, level: number, at: string, gameId: ProgressionPlay['gameId'] = 'calcul'): ProgressionPlay => ({
    gameId,
    level,
    score,
    at,
    day: at.slice(0, 10),
  });

  it('rapporte plus d’XP pour un meilleur score et un niveau plus élevé', () => {
    expect(playXp(0, 1)).toBe(5);
    expect(playXp(100, 1)).toBe(50);
    expect(playXp(100, 20)).toBeGreaterThan(playXp(100, 10));
  });

  it('ajoute les bonus d’étoiles une seule fois par niveau', () => {
    const once = totalXp({ ...empty, plays: [play(96, 1, '2026-10-01T10:00:00Z')] });
    const twice = totalXp({ ...empty, plays: [play(96, 1, '2026-10-01T10:00:00Z'), play(96, 1, '2026-10-02T10:00:00Z')] });
    expect(once).toBe(playXp(96, 1) + 30);
    expect(twice).toBe(2 * playXp(96, 1) + 30);
  });

  it('compte tests, séances, marathons, duels et défis entre amies', () => {
    const xp = totalXp({
      ...empty,
      tests: [{ day: '2026-10-01', official: true, done: true, brainAge: 40, startedAt: '2026-10-01T08:00:00Z' }],
      sessions: ['2026-10-01'],
      marathons: 1,
      duels: 1,
      challenges: 2,
    });
    expect(xp).toBe(40 + 30 + 30 + 10 + 2 * 20);
  });

  it('demande 100 XP pour le niveau 2, puis 25 de plus à chaque palier', () => {
    expect(xpToReach(1)).toBe(0);
    expect(xpToReach(2)).toBe(100);
    expect(xpToReach(3)).toBe(225);
    expect(rankFor(0).level).toBe(1);
    expect(rankFor(99).level).toBe(1);
    expect(rankFor(100).level).toBe(2);
    expect(rankFor(xpToReach(30)).level).toBe(30);
  });

  it('donne un titre tous les 5 niveaux', () => {
    expect(titleFor(1)).toBe('Esprit curieux');
    expect(titleFor(7)).toBe('Esprit éveillé');
    expect(titleFor(15)).toBe('Esprit vif');
    expect(titleFor(55)).toBe('Esprit légendaire');
    expect(titleFor(80)).toBe('Esprit cosmique');
  });
});

describe('trophées', () => {
  it('ne débloque rien sans aucune partie', () => {
    expect(trophyStatuses(empty).filter((t) => t.unlocked)).toEqual([]);
  });

  it('débloque les premiers trophées et suit la progression des compteurs', () => {
    const statuses = trophyStatuses({
      ...empty,
      plays: [
        { gameId: 'calcul', level: 1, score: 100, at: '2026-10-01T10:00:00Z', day: '2026-10-01' },
        { gameId: 'stroop', level: 1, score: 70, at: '2026-10-02T10:00:00Z', day: '2026-10-02' },
        { gameId: 'stroop', level: 2, score: 70, at: '2026-10-03T10:00:00Z', day: '2026-10-03' },
      ],
      bests: { calcul: { 1: { score: 100 } }, stroop: { 1: { score: 70 }, 2: { score: 70 } } },
    });
    const byId = Object.fromEntries(statuses.map((s) => [s.id, s]));
    expect(byId['premiers-pas'].unlocked).toBe(true);
    expect(byId['sans-faute'].unlocked).toBe(true);
    expect(byId['serie-3'].unlocked).toBe(true);
    expect(byId['serie-7'].progress).toEqual([3, 7]);
    expect(byId['etoiles-50'].progress).toEqual([5, 50]);
    expect(byId['age-20'].unlocked).toBe(false);
  });
});

describe('ce qu’une partie fait gagner', () => {
  it('détecte XP, étoiles, médaille, niveau débloqué et nouveaux trophées', () => {
    const before = { ...empty, bests: { calcul: bestsUpTo(4) } };
    const play = { gameId: 'calcul' as const, level: 5, score: 96, at: '2026-10-19T10:00:00Z', day: '2026-10-19' };
    const after = { ...before, plays: [play], bests: { calcul: { ...bestsUpTo(4), 5: { score: 96 } } } };
    const delta = progressionDelta(before, after, 'calcul', 5);
    expect(delta.xpGained).toBe(playXp(96, 5) + 30);
    expect(delta.starsBefore).toBe(0);
    expect(delta.starsAfter).toBe(3);
    expect(delta.medalBefore).toBeNull();
    expect(delta.medalAfter).toBe('bronze');
    expect(delta.unlockedNext).toBe(true);
    expect(delta.newTrophies.map((t) => t.id)).toContain('premiers-pas');
    expect(delta.newTrophies.map((t) => t.id)).toContain('bronze');
  });
});

describe('rang sans fin', () => {
  it('donne un titre tous les 10 niveaux au-delà de 50, puis des chiffres romains', () => {
    expect(titleFor(55)).toBe('Esprit légendaire');
    expect(titleFor(60)).toBe('Esprit céleste');
    expect(titleFor(100)).toBe('Esprit éternel');
    expect(titleFor(109)).toBe('Esprit éternel');
    expect(titleFor(110)).toBe('Esprit éternel II');
    expect(titleFor(130)).toBe('Esprit éternel IV');
    expect(nextTitle(58)).toEqual([60, 'Esprit céleste']);
    expect(nextTitle(104)).toEqual([110, 'Esprit éternel II']);
  });

  it('offre des étincelles à chaque niveau au-delà de 50, et des auras à 60, 75 et 100', () => {
    expect(levelSparks(50)).toBe(0);
    expect(levelSparks(53)).toBe(3 * LEVEL_SPARKS);
    expect(AURAS.map((a) => a.level)).toEqual([60, 75, 100]);
  });
});

describe('maîtrise (niveaux 51 à 60)', () => {
  it('demande 64 points pour Maîtrise I, 4 de plus à chaque cran, 100 pour X, et accélère l’affichage', () => {
    expect(passScore(50)).toBe(60);
    expect(passScore(51)).toBe(64);
    expect(passScore(55)).toBe(80);
    expect(passScore(60)).toBe(100);
    expect(masteryTempo(50)).toBe(1);
    expect(masteryTempo(60)).toBeCloseTo(0.8);
    expect(playedLevel(57)).toBe(50);
  });

  it('compte le cran atteint, sans étoiles en plus', () => {
    const bests = { ...bestsUpTo(MAX_LEVEL), 51: { score: 70 }, 52: { score: 70 }, 53: { score: 70 } };
    expect(masteryOf(bests)).toBe(2);
    expect(gameStars(bests)).toBe(gameStars(bestsUpTo(MAX_LEVEL)));
  });
});

