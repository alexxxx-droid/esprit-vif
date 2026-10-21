import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CHARACTERS, characterName } from './characters';
import { decodeChallenge } from './challenges';
import { addDays } from './daily';
import { SEASONS, weeklyChallenge } from './events';
import { NBSP } from './format';
import { formatClock, formatDuration, generateHorloges } from './games/horloges';
import { DIRS } from './games/itineraire';
import { denominationLabel, formatEuros } from './games/monnaie';
import { generateQui, QUI_NAMES_EN, quiLevel } from './games/quiestqui';
import { describeRule } from './games/reflexe';
import { DOMAIN_ORDER, DOMAINS, GAME_ORDER, GAMES } from './games/registry';
import { insights, type InsightPlay } from './insights';
import { setLang } from './lang';
import { MAX_LEVEL } from './levels';
import { DUEL_DIFFICULTIES, SESSION_REASONS } from './modes';
import { cheer, timedOutcome } from './outcome';
import { MEDAL_NAMES, MEDAL_ORDER, MEDAL_RULES, rankFor, TITLES, titleFor, TROPHIES, trophyStatuses } from './progression';
import { createRng } from './rng';
import type { GameId } from './types';

/** Noms officiels du glossaire (docs/TRADUCTION.md). */
const GLOSSARY: Record<GameId, string> = {
  calcul: 'Flash Math',
  stroop: 'Color Trap',
  schulte: 'Schulte Table',
  matrice: 'Grid Memory',
  nback: 'Look Back',
  total: 'Running Total',
  intrus: 'Odd One Out',
  anagrammes: 'Anagrams',
  boutique: 'The Shop',
  diable: 'Tricky Sums',
  ordre: 'Smallest to Largest',
  monnaie: 'Small Change',
  pluie: 'Number Rain',
  correspondance: 'Quick Match',
  fleches: 'Arrows',
  reflexe: 'Reflex',
  rotation: 'Mental Rotation',
  sudoku: 'Mini Sudoku',
  balance: 'Scales',
  horloges: 'Clocks',
  mots: 'Word Recall',
  lettre: 'Missing Letter',
  categories: 'Categories',
  paires: 'Pairs',
  coupdoeil: 'At a Glance',
  quiestqui: "Who's Who?",
  lecture: 'Speed Reading',
  itineraire: 'Route Finder',
  filature: 'Keep Track',
  lucioles: 'Fireflies',
  contraires: 'Opposites',
  motsmeles: 'Word Search',
  combien: 'Cube Count',
  code: 'Secret Code',
  miroir: 'Mirror',
  echo: 'Echo',
  compte: 'Hit the Number',
  suites: 'Number Series',
};

/** Jeux dont les libellés de niveau sont traduits ici (les autres le sont avec leurs contenus). */
const TRANSLATED_LABELS: readonly GameId[] = [
  'calcul',
  'balance',
  'boutique',
  'correspondance',
  'coupdoeil',
  'diable',
  'fleches',
  'horloges',
  'intrus',
  'itineraire',
  'matrice',
  'monnaie',
  'nback',
  'ordre',
  'pluie',
  'quiestqui',
  'reflexe',
  'rotation',
  'schulte',
  'sudoku',
  'total',
];

/** Ce qui trahit un reste de français dans un texte anglais. */
const FRENCH_MARKS = /[àâçéèêëîïôûùœ«»]|\b(le|la|les|des|du|une|et|pour|par|chaque|jusqu)\b/i;

const inFrench = <T>(read: () => T): T => {
  setLang('fr');
  try {
    return read();
  } finally {
    setLang('en');
  }
};

describe('Version anglaise du cœur', () => {
  beforeEach(() => setLang('en'));
  afterEach(() => setLang('fr'));

  it('change de langue à la lecture, sans réimporter les modules', () => {
    expect(GAMES.calcul.name).toBe('Flash Math');
    expect(inFrench(() => GAMES.calcul.name)).toBe('Calcul éclair');
    expect(DOMAINS.memoire.name).toBe('Memory');
    expect(inFrench(() => DOMAINS.memoire.name)).toBe('Mémoire');
  });

  it('donne à chaque jeu son nom officiel du glossaire', () => {
    for (const id of GAME_ORDER) expect(GAMES[id].name).toBe(GLOSSARY[id]);
    expect(new Set(GAME_ORDER.map((id) => GAMES[id].name)).size).toBe(GAME_ORDER.length);
  });

  it('nomme les domaines en anglais', () => {
    expect(DOMAIN_ORDER.map((d) => DOMAINS[d].name)).toEqual(['Math', 'Memory', 'Attention', 'Speed', 'Language', 'Logic']);
  });

  it('écrit les règles des 20 niveaux en anglais', () => {
    for (const id of GAME_ORDER) {
      const game = GAMES[id];
      expect(game.duration).not.toMatch(FRENCH_MARKS);
      for (let level = 1; level <= MAX_LEVEL; level++) {
        const rule = game.rule(level);
        expect(rule.length).toBeGreaterThan(10);
        expect(rule, `${id} niveau ${level}`).not.toMatch(FRENCH_MARKS);
        expect(rule).not.toBe(inFrench(() => game.rule(level)));
        expect(game.levelLabel(level).length).toBeGreaterThan(2);
      }
    }
  });

  it('traduit les libellés de niveau', () => {
    for (const id of TRANSLATED_LABELS) {
      for (let level = 1; level <= MAX_LEVEL; level++) {
        const label = GAMES[id].levelLabel(level);
        expect(label, `${id} niveau ${level}`).not.toMatch(FRENCH_MARKS);
        // Un libellé fait seulement de chiffres et de symboles (« 5 × 5 · 1-A-2-B… ») reste le même.
        if (!/^[\d\s×·A-Z…-]+$/.test(label)) expect(label, `${id} niveau ${level}`).not.toBe(inFrench(() => GAMES[id].levelLabel(level)));
      }
    }
  });

  it('dit la règle de Réflexe et les directions en anglais', () => {
    expect(describeRule({ go: ['circle'], filledOnly: true, inverted: false })).toBe('Tap the filled circles');
    expect(describeRule({ go: ['star'], filledOnly: false, inverted: true })).toBe('Tap everything except the stars');
    expect(describeRule({ go: ['star', 'cross'], filledOnly: false, inverted: false })).toBe('Tap the stars and the crosses');
    expect(Object.values(DIRS).map((d) => d.label)).toEqual(['up', 'down', 'left', 'right']);
  });

  it('écrit les heures, les durées et les euros à l’anglaise', () => {
    expect(formatClock(135)).toBe('2:15');
    expect(formatClock(0)).toBe('12:00');
    expect(formatDuration(45)).toBe(`45${NBSP}min`);
    expect(formatDuration(60)).toBe(`1${NBSP}hr`);
    expect(formatDuration(85)).toBe(`1${NBSP}hr${NBSP}25${NBSP}min`);
    expect(formatEuros(1200)).toBe('€12');
    expect(formatEuros(1245)).toBe('€12.45');
    expect(denominationLabel(200)).toBe('€2');
    for (let level = 1; level <= MAX_LEVEL; level++) {
      for (const q of generateHorloges(createRng(level), level, 20)) expect(new Set(q.options).size).toBe(4);
    }
  });

  it('tire des prénoms anglais pour Qui est qui ?', () => {
    expect(new Set(QUI_NAMES_EN).size).toBe(QUI_NAMES_EN.length);
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const c = quiLevel(level);
      for (const round of generateQui(createRng(level * 11), level)) {
        expect(new Set(round.people.map((p) => p.name)).size).toBe(c.people);
        for (const p of round.people) expect(QUI_NAMES_EN).toContain(p.name);
        if (c.lookAlikeNames) expect(new Set(round.people.map((p) => p.name[0])).size).toBeLessThan(c.people);
      }
    }
  });

  it('traduit trophées, rangs, médailles et saisons', () => {
    const sameInBothLanguages = new Set(['etoiles-250']);
    for (const trophy of TROPHIES) {
      expect(trophy.name, trophy.id).not.toMatch(FRENCH_MARKS);
      expect(trophy.description, trophy.id).not.toMatch(FRENCH_MARKS);
      expect(trophy.description).not.toBe(inFrench(() => trophy.description));
      if (!sameInBothLanguages.has(trophy.id)) expect(trophy.name).not.toBe(inFrench(() => trophy.name));
    }
    expect(new Set(TROPHIES.map((t) => t.name)).size).toBe(TROPHIES.length);
    const empty = { plays: [], tests: [], bests: {}, sessions: [], marathons: 0, duels: 0, challenges: 0 };
    expect(trophyStatuses(empty)[0].name).toBe('First Steps');

    expect(titleFor(1)).toBe('Curious Mind');
    expect(titleFor(55)).toBe('Legendary Mind');
    expect(titleFor(80)).toBe('Cosmic Mind');
    expect(rankFor(0).title).toBe('Curious Mind');
    expect(new Set(TITLES.map(([min]) => titleFor(min))).size).toBe(TITLES.length);

    expect(MEDAL_ORDER.map((m) => MEDAL_NAMES[m])).toEqual(['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Legend']);
    for (const medal of MEDAL_ORDER) expect(MEDAL_RULES[medal]).not.toMatch(FRENCH_MARKS);

    expect(SEASONS.map((s) => s.name)).toEqual(['Halloween', 'Christmas', 'Spring', 'Summer']);
    for (const season of SEASONS) {
      expect(season.greeting).not.toMatch(FRENCH_MARKS);
      expect(season.greeting).toContain(season.trophy.name);
    }
  });

  it('traduit compagnons, séances, duels et défis', () => {
    expect(CHARACTERS.map((c) => c.name)).toEqual(['Vif', 'Apple', 'Orange', 'Lemon', 'Strawberry', 'Grape', 'Pear', 'Watermelon']);
    expect(characterName('pasteque')).toBe('Watermelon');
    expect(Object.values(SESSION_REASONS)).toEqual(['Your goal', 'Needs work', 'Something new', 'For variety']);
    expect(Object.values(DUEL_DIFFICULTIES).map((d) => d.label)).toEqual(['Easy', 'Medium', 'Hard']);
    expect(decodeChallenge(btoa(JSON.stringify({ v: 1, i: 'x', s: 1, l: 1, g: ['calcul', 'stroop', 'matrice'], n: '', r: null, d: '' })))?.from).toBe('A friend');
    for (let week = 0; week < 60; week++) {
      const label = weeklyChallenge(addDays('2026-01-05', week * 7)).label;
      expect(label).not.toMatch(/[àâçéèêëîïôûùœ«»]|\b(parties|jours|semaine|séances)\b/);
    }
  });

  it('écrit le résultat et les encouragements en anglais', () => {
    const outcome = timedOutcome({ score: 80, elapsedMs: 32_400, errors: 1, penaltyPerError: 3000 });
    expect(outcome.headline).toBe(`35.4${NBSP}s · 1${NBSP}error`);
    expect(outcome.lines.map((l) => l.label)).toEqual(['Time', 'Errors', 'Final time']);
    expect(timedOutcome({ score: 80, elapsedMs: 1000, errors: 0, penaltyPerError: 3000 }).headline).toBe(`1.0${NBSP}s · 0${NBSP}errors`);
    for (const score of [0, 40, 60, 80, 95]) expect(cheer(score)).not.toMatch(FRENCH_MARKS);
  });

  it('formule les constats en anglais', () => {
    const today = '2026-10-19';
    const play = (gameId: GameId, score: number, daysAgo: number): InsightPlay => {
      const day = addDays(today, -daysAgo);
      return { gameId, score, day, at: new Date(`${day}T10:00:00`).toISOString() };
    };
    const found = insights(
      Array.from({ length: 10 }, (_, i) => play('calcul', 60, i)),
      today,
    );
    expect(found.find((i) => i.id === 'regularity')?.text).toBe('10 training days out of the last 14: impressively consistent.');
    expect(found.find((i) => i.id === 'discovery')?.text).toBe('You haven’t tried Memory games yet: start with Grid Memory.');
  });
});
