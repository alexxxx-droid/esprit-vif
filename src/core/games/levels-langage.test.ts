import { afterEach, describe, expect, it } from 'vitest';
import { setLang, type Lang } from '../lang';
import { MAX_LEVEL } from '../levels';
import { createRng, hashSeed } from '../rng';
import { ANAGRAM_LEVELS, anagramDeck, anagramLevel, anagramLevelLabel, isAnagramAnswer, scoreAnagrammes } from './anagrammes';
import { CATEGORIES_LEVELS, categoriesLevel, categoriesLevelLabel, generateCategories, scoreCategories, twinCategories } from './categories';
import { generateLecture, LECTURE_LEVELS, lectureFlashMs, lectureLevel, lectureLevelLabel, scoreLecture, sentences } from './lecture';
import {
  generateLettre,
  LETTRE_LEVELS,
  lettreKnownWordsPlus,
  lettreLevel,
  lettreLevelLabel,
  lettreWords,
  LOOKALIKES,
  scoreLettre,
  type LettreQuestion,
} from './lettre';
import { categories, categoryOf } from './lexique';
import { GAMES } from './registry';
import { hasRudeWord, LONG_WORDS, LONG_WORDS_EN } from './words';

/**
 * Langage, niveaux 21 à 50 (Expert, Maître, Légende) : assez de contenu à chaque niveau dans les
 * deux langues, des énigmes valables, des générateurs rapides, et des niveaux 1 à 20 strictement
 * inchangés (records et test du jour en dépendent).
 */

const LANGS: readonly ('fr' | 'en')[] = ['fr', 'en'];
const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const NEW_LEVELS = LEVELS.filter((level) => level > 20);
const SEEDS = [3, 77, 1234];
const GAME_IDS = ['anagrammes', 'lettre', 'categories', 'lecture'] as const;
type LangGame = (typeof GAME_IDS)[number];

afterEach(() => setLang('fr'));

/** `fn` tourne dans chaque langue ; on revient toujours au français. */
function inEachLang(fn: (lang: 'fr' | 'en') => void) {
  for (const l of LANGS) {
    setLang(l);
    try {
      fn(l);
    } finally {
      setLang('fr');
    }
  }
}

function inLang<T>(l: Lang, fn: () => T): T {
  setLang(l);
  try {
    return fn();
  } finally {
    setLang('fr');
  }
}

/** Temps d'un appel, en millisecondes (après un premier appel qui remplit les caches). */
function timed(fn: () => unknown): number {
  fn();
  const start = performance.now();
  fn();
  return performance.now() - start;
}

/** Première lettre sans accent ni majuscule. */
const initial = (word: string) => word.normalize('NFD')[0].toLowerCase();

const VOWELS = 'AEIOUY';

describe('niveaux 1 à 20 inchangés', () => {
  // Empreintes relevées AVANT l'ajout des niveaux 21 à 50 : parties tirées (graines 1, 42, 2024),
  // réglages, libellés, règles et barèmes. La moindre différence change l'empreinte.
  const SNAP_SEEDS = [1, 42, 2024];
  const digest = (value: unknown) => hashSeed(JSON.stringify(value)).toString(16).padStart(8, '0');

  const BEFORE: Record<'fr' | 'en', Record<LangGame, Record<'1' | '10' | '20' | 'all', string>>> = {
    fr: {
      anagrammes: { 1: 'b9a120b7', 10: '8e12d01f', 20: 'b46870ed', all: 'c3708c39' },
      lettre: { 1: '8a0ba248', 10: '7301f5f6', 20: '07781cf4', all: '59d0382d' },
      categories: { 1: 'b5982b28', 10: '4f2b21be', 20: '77c36506', all: '6bdbfcbb' },
      lecture: { 1: '72d4f014', 10: 'f571aa6a', 20: '886d0084', all: '93a0c3e4' },
    },
    en: {
      anagrammes: { 1: '6d72fdc7', 10: '1b554b87', 20: '7433c499', all: '64ace9c1' },
      lettre: { 1: 'd0b0a470', 10: '2a24dd74', 20: '5906a262', all: 'c816d5f0' },
      categories: { 1: '21465996', 10: '046b03c8', 20: 'adf744ec', all: '6ee58a3f' },
      lecture: { 1: '431cba84', 10: '700a2229', 20: '87908ed2', all: '8a567e50' },
    },
  };

  const snapshot = (game: LangGame, level: number): unknown => {
    const pairs = [[0, 0], [5, 1], [8, 0], [13, 2], [20, 0]];
    switch (game) {
      case 'anagrammes':
        return {
          config: anagramLevel(level),
          label: anagramLevelLabel(level),
          rule: GAMES.anagrammes.rule(level),
          scores: [0, 1, 2, 3, 5, 8, 12].map((n) => scoreAnagrammes(n, level)),
          decks: SNAP_SEEDS.map((s) => anagramDeck(createRng(s), level)),
        };
      case 'lettre':
        return {
          config: lettreLevel(level),
          label: lettreLevelLabel(level),
          rule: GAMES.lettre.rule(level),
          scores: pairs.map(([c, e]) => scoreLettre(c, e, level)),
          questions: SNAP_SEEDS.map((s) => generateLettre(createRng(s), level)),
        };
      case 'categories':
        return {
          config: categoriesLevel(level),
          label: categoriesLevelLabel(level),
          rule: GAMES.categories.rule(level),
          scores: pairs.map(([c, e]) => scoreCategories(c, e, level)),
          questions: SNAP_SEEDS.map((s) =>
            generateCategories(createRng(s), level).map((q) => ({ words: q.words, answer: q.answer, main: q.main.id, intruder: q.intruder.id })),
          ),
        };
      case 'lecture':
        return {
          config: lectureLevel(level),
          label: lectureLevelLabel(level),
          rule: GAMES.lecture.rule(level),
          scores: pairs.map(([c, e]) => scoreLecture(c, e, level)),
          questions: SNAP_SEEDS.map((s) => generateLecture(createRng(s), level)),
        };
    }
  };

  it('tirent exactement les mêmes parties qu’avant, avec les mêmes libellés, règles et barèmes', () => {
    inEachLang((l) => {
      for (const game of GAME_IDS) {
        for (const level of [1, 10, 20] as const) expect(digest(snapshot(game, level)), `${l} ${game} niveau ${level}`).toBe(BEFORE[l][game][level]);
        expect(digest(LEVELS.slice(0, 20).map((level) => snapshot(game, level))), `${l} ${game} niveaux 1 à 20`).toBe(BEFORE[l][game].all);
      }
    });
  });
});

describe('tables de niveaux', () => {
  it('ont MAX_LEVEL niveaux, sans deux niveaux identiques', () => {
    for (const table of [ANAGRAM_LEVELS, LETTRE_LEVELS, CATEGORIES_LEVELS, LECTURE_LEVELS] as readonly (readonly unknown[])[]) {
      expect(table).toHaveLength(MAX_LEVEL);
      const configs = table.map((c) => JSON.stringify(c));
      expect(new Set(configs.slice(20)).size).toBe(30);
      for (const c of configs.slice(20)) expect(configs.slice(0, 20)).not.toContain(c);
    }
  });

  it('décrivent chaque nouveau niveau dans les deux langues, sans reste de français en anglais', () => {
    for (const id of GAME_IDS) {
      for (const level of NEW_LEVELS) {
        const fr = inLang('fr', () => [GAMES[id].rule(level), GAMES[id].levelLabel(level)]);
        const en = inLang('en', () => [GAMES[id].rule(level), GAMES[id].levelLabel(level)]);
        expect(en[0], `${id} ${level}`).not.toBe(fr[0]);
        expect(en[1], `${id} ${level}`).not.toBe(fr[1]);
        expect(en.join(' '), `${id} ${level}`).not.toMatch(/[àâçéèêëîïôûùœ«»]/);
        for (const text of [...fr, ...en]) expect(text).not.toMatch(/'/);
      }
    }
    // Les nouveautés se lisent à l'intro.
    expect(inLang('fr', () => GAMES.anagrammes.levelLabel(23))).toContain('sosie');
    expect(inLang('en', () => GAMES.anagrammes.rule(23))).toContain('copy the word’s own letters');
    expect(inLang('fr', () => GAMES.lettre.rule(23))).toContain('trois lettres');
    expect(inLang('fr', () => GAMES.lettre.rule(31))).toContain('Pas de catégorie');
    expect(inLang('en', () => GAMES.lettre.levelLabel(41))).toMatch(/^Words of 9 to 13 letters · 4 missing letters · 5 choices · no hint$/);
    expect(inLang('fr', () => GAMES.categories.rule(21))).toContain('famille d’à côté');
    expect(inLang('en', () => GAMES.categories.levelLabel(41))).toBe('10 words · camouflaged odd ones (first letter, length)');
    expect(inLang('fr', () => GAMES.lecture.rule(21))).toContain('à rallonge');
    expect(inLang('fr', () => GAMES.lecture.levelLabel(43))).toBe('négations, phrases à rallonge et logique · objectif 15 · phrases qui s’effacent');
    expect(inLang('en', () => GAMES.lecture.rule(41))).toContain('fades out');
  });
});

describe('Anagrammes, niveaux 21 à 50', () => {
  it('ajoutent des mots courants de 8 lettres dans les deux langues, sans accent ni doublon', () => {
    for (const list of [LONG_WORDS, LONG_WORDS_EN]) {
      expect(list.length).toBeGreaterThanOrEqual(200);
      expect(new Set(list).size).toBe(list.length);
      for (const word of list) expect(word).toMatch(/^[A-Z]{8}$/);
    }
    // Ni orthographe qui change d'un côté à l'autre de l'Atlantique, ni mot surtout d'un seul côté.
    for (const variant of ['NEIGHBOR', 'NEIGHBOUR', 'TRAVELER', 'FAVORITE', 'FAVOURITE', 'COLORFUL', 'DOUGHNUT', 'AIRPLANE', 'SIDEWALK', 'PAVEMENT', 'ZUCCHINI', 'PAJAMAS']) {
      expect(LONG_WORDS_EN).not.toContain(variant);
    }
    inLang('en', () => {
      for (const word of LONG_WORDS_EN) expect(hasRudeWord(word), word).toBe(false);
    });
  });

  it('font arriver les 8 lettres, puis les leurres sosies, puis le chrono serré', () => {
    const expert = ANAGRAM_LEVELS.slice(20, 30);
    const master = ANAGRAM_LEVELS.slice(30, 40);
    const legend = ANAGRAM_LEVELS.slice(40);
    expect(ANAGRAM_LEVELS.slice(0, 20).some((c) => c.lengths.includes(8) || c.twins)).toBe(false);
    expect(expert.filter((c) => c.lengths.includes(8)).length).toBeGreaterThanOrEqual(6);
    expect(expert.some((c) => c.twins)).toBe(true);
    expect(master.some((c) => c.decoys === 4)).toBe(true);
    expect(Math.max(...master.map((c) => c.durationMs))).toBeLessThanOrEqual(50_000);
    for (const c of legend) {
      expect(c.twins).toBe(true);
      expect(c.lengths.at(-1)).toBeGreaterThanOrEqual(7);
      expect(c.durationMs).toBeLessThanOrEqual(45_000);
    }
  });

  it('ont au moins 40 énigmes valables à chaque niveau, en français et en anglais', () => {
    inEachLang((l) => {
      for (const level of LEVELS) {
        const c = anagramLevel(level);
        for (const seed of SEEDS) {
          const deck = anagramDeck(createRng(seed + level), level);
          expect(deck.length, `${l} niveau ${level}`).toBeGreaterThanOrEqual(40);
          for (const puzzle of deck.slice(0, 25)) {
            expect(c.lengths).toContain(puzzle.word.length);
            expect(puzzle.letters).toHaveLength(puzzle.word.length + c.decoys);
            expect(isAnagramAnswer(puzzle.word, puzzle)).toBe(true);
            expect(hasRudeWord(puzzle.letters)).toBe(false);
            if (c.decoys === 0) expect(isAnagramAnswer(puzzle.letters, puzzle)).toBe(false);
            // Les leurres : ce qui reste des lettres proposées, une fois le mot retiré.
            const extra = [...puzzle.letters];
            for (const ch of puzzle.word) extra.splice(extra.indexOf(ch), 1);
            expect(extra).toHaveLength(c.decoys);
            if (c.twins) for (const ch of extra) expect(puzzle.word).toContain(ch);
          }
        }
      }
    });
  });

  it('gardent la première étoile à portée : 2 mots au moins, et 13 s ou plus par mot', () => {
    for (const level of NEW_LEVELS) {
      const { target, durationMs } = anagramLevel(level);
      const forStar = Math.ceil(0.6 * target);
      expect(scoreAnagrammes(forStar, level)).toBeGreaterThanOrEqual(60);
      expect(scoreAnagrammes(forStar - 1, level)).toBeLessThan(60);
      expect(forStar).toBeGreaterThanOrEqual(2);
      expect(durationMs / forStar).toBeGreaterThanOrEqual(13_000);
    }
  });

  it('tirent une partie en moins de 50 ms', () => {
    inEachLang(() => {
      for (const level of [21, 30, 40, 50]) expect(timed(() => anagramDeck(createRng(level), level))).toBeLessThan(50);
    });
  });
});

describe('Lettre manquante, niveaux 21 à 50', () => {
  it('font arriver les sosies et les 3 blancs, puis retirent l’indice, puis passent à 4 blancs', () => {
    const expert = LETTRE_LEVELS.slice(20, 30);
    expect(expert.some((c) => c.twins)).toBe(true);
    expect(expert.some((c) => c.missing === 3)).toBe(true);
    for (const c of LETTRE_LEVELS.slice(30)) expect(c.noHint).toBe(true);
    for (const c of LETTRE_LEVELS.slice(40)) expect(c.missing).toBe(4);
    for (const c of LETTRE_LEVELS.slice(0, 20)) expect(c.twins || c.noHint || c.missing > 2).toBeFalsy();
    // Sans indice, des mots assez longs pour se reconnaître seuls.
    for (const c of LETTRE_LEVELS) if (c.noHint) expect(c.minLength).toBeGreaterThanOrEqual(7);
  });

  it('ont de quoi piocher à chaque niveau, dans les deux langues', () => {
    inEachLang((l) => {
      for (const level of LEVELS) {
        const c = lettreLevel(level);
        const pool = lettreWords().filter(({ word }) => word.length >= c.minLength && word.length <= c.maxLength);
        expect(pool.length, `${l} niveau ${level}`).toBeGreaterThanOrEqual(30);
      }
    });
  });

  it('posent des questions valables : un seul choix forme un mot connu, voyelle pour voyelle', () => {
    inEachLang((l) => {
      const known = lettreKnownWordsPlus();
      for (const level of NEW_LEVELS) {
        const c = lettreLevel(level);
        const pool = lettreWords().filter(({ word }) => word.length >= c.minLength && word.length <= c.maxLength).length;
        let decoyLetters = 0;
        let lookalikes = 0;
        for (const seed of SEEDS) {
          const questions = generateLettre(createRng(seed * 31 + level), level);
          expect(questions, `${l} niveau ${level}`).toHaveLength(40);
          // On fait le tour de la réserve avant de revoir un mot.
          const firsts = questions.slice(0, Math.min(pool, 40)).map((q) => q.word);
          expect(new Set(firsts).size).toBe(firsts.length);
          for (const q of questions) {
            expect(q.word.length).toBeGreaterThanOrEqual(c.minLength);
            expect(q.word.length).toBeLessThanOrEqual(c.maxLength);
            expect(q.positions).toHaveLength(c.missing);
            expect(new Set(q.positions).size).toBe(c.missing);
            expect(q.options).toHaveLength(c.options);
            expect(new Set(q.options).size).toBe(c.options);
            expect(q.options[q.answer]).toBe(q.positions.map((p) => q.word[p]).join(''));
            q.options.forEach((letters, i) => {
              const chars = [...q.word];
              q.positions.forEach((p, k) => {
                chars[p] = letters[k];
                expect(VOWELS.includes(letters[k])).toBe(VOWELS.includes(q.word[p]));
                if (i !== q.answer && letters[k] !== q.word[p]) {
                  decoyLetters++;
                  if (LOOKALIKES[q.word[p]]?.includes(letters[k])) lookalikes++;
                }
              });
              const filled = chars.join('');
              expect(known.has(filled), `${l} ${q.word} → ${filled}`).toBe(i === q.answer);
              // Un leurre ne forme jamais de grossièreté (le mot lui-même peut en contenir une : PEACOCK).
              if (i !== q.answer) expect(hasRudeWord(filled)).toBe(false);
            });
          }
        }
        // Les sosies dominent parmi les lettres changées, et seulement aux niveaux qui les annoncent.
        if (c.twins) expect(lookalikes / decoyLetters, `${l} niveau ${level}`).toBeGreaterThan(0.65);
        else expect(lookalikes / decoyLetters, `${l} niveau ${level}`).toBeLessThan(0.35);
      }
    });
  });

  it('ne se laissent pas deviner sans lire le mot : ni la lettre majoritaire ni la lettre isolée', () => {
    /** Lettres de chaque colonne (un blanc) et leur nombre, sur l'ensemble des choix. */
    const columns = (q: LettreQuestion) =>
      q.positions.map((_, k) => {
        const counts = new Map<string, number>();
        for (const option of q.options) counts.set(option[k], (counts.get(option[k]) ?? 0) + 1);
        return counts;
      });
    const best = (scores: number[]) => scores.indexOf(Math.max(...scores));
    // Deux tricheries : prendre la lettre la plus fréquente de chaque colonne, ou celle qui y est seule.
    const majority = (q: LettreQuestion) => {
      const cols = columns(q);
      return best(q.options.map((o) => [...o].reduce((sum, ch, k) => sum + (cols[k].get(ch) ?? 0), 0)));
    };
    const loner = (q: LettreQuestion) => {
      const cols = columns(q);
      return best(q.options.map((o) => [...o].filter((ch, k) => cols[k].get(ch) === 1).length));
    };
    inEachLang((l) => {
      for (const level of NEW_LEVELS) {
        const c = lettreLevel(level);
        const questions = Array.from({ length: 10 }, (_, seed) => generateLettre(createRng(seed * 7 + level), level)).flat();
        const chance = 1 / c.options;
        for (const cheat of [majority, loner]) {
          const wins = questions.filter((q) => cheat(q) === q.answer).length / questions.length;
          expect(wins, `${l} niveau ${level} (${cheat === majority ? 'majorité' : 'lettre isolée'})`).toBeLessThan(chance + 0.08);
        }
      }
    });
  });

  it('gardent la première étoile à portée (au moins 7 s par mot complété)', () => {
    for (const level of NEW_LEVELS) {
      const { target } = lettreLevel(level);
      const forStar = Math.ceil(0.6 * target);
      expect(scoreLettre(forStar, 0, level)).toBeGreaterThanOrEqual(60);
      expect(60 / forStar).toBeGreaterThanOrEqual(7);
    }
  });

  it('tirent une partie en moins de 50 ms', () => {
    inEachLang(() => {
      for (const level of [21, 30, 31, 40, 41, 50]) expect(timed(() => generateLettre(createRng(level), level))).toBeLessThan(50);
    });
  });
});

describe('Catégories, niveaux 21 à 50', () => {
  it('ont des catégories jumelles de la même famille, et assez de mots pour 12 cases', () => {
    inEachLang(() => {
      const most = Math.max(...CATEGORIES_LEVELS.map((c) => c.words));
      let withTwins = 0;
      for (const cat of categories()) {
        expect(cat.words.length).toBeGreaterThanOrEqual(most - 1);
        const twins = twinCategories(cat);
        if (twins.length) withTwins++;
        for (const twin of twins) {
          expect(twin).not.toBe(cat);
          expect(twin.family).toBe(cat.family);
        }
      }
      expect(withTwins).toBeGreaterThanOrEqual(20);
    });
  });

  it('cachent un seul intrus, jumeau puis camouflé, dans les deux langues', () => {
    inEachLang((l) => {
      for (const level of NEW_LEVELS) {
        const c = categoriesLevel(level);
        let total = 0;
        let twinPossible = 0;
        let twinHits = 0;
        let sameInitial = 0;
        let sameShape = 0;
        for (const seed of SEEDS) {
          for (const q of generateCategories(createRng(seed + level), level)) {
            total++;
            expect(q.words).toHaveLength(c.words);
            expect(new Set(q.words).size).toBe(c.words);
            q.words.forEach((w, i) => expect(categoryOf(w)).toBe(i === q.answer ? q.intruder : q.main));
            expect(q.intruder.family).toBe(q.main.family);
            const twins = twinCategories(q.main);
            if (twins.length) {
              twinPossible++;
              if (twins.includes(q.intruder)) twinHits++;
            }
            const odd = q.words[q.answer];
            const others = q.words.filter((_, i) => i !== q.answer);
            if (others.some((w) => initial(w) === initial(odd))) sameInitial++;
            if (others.some((w) => initial(w) === initial(odd) && Math.abs(w.length - odd.length) <= 1)) sameShape++;
          }
        }
        if (c.twin === 1) expect(twinHits, `${l} niveau ${level}`).toBe(twinPossible);
        if (c.twin !== undefined) expect(twinHits / twinPossible, `${l} niveau ${level}`).toBeGreaterThan(c.twin - 0.2);
        // Grille camouflée : l'intrus a presque toujours un voisin de même initiale ; au palier Légende,
        // de même longueur aussi, environ 7 fois sur 10 (autant que les autres mots de la grille).
        if (c.camouflage) expect(sameInitial / total, `${l} niveau ${level}`).toBeGreaterThan(0.9);
        if (c.camouflage === 2) expect(sameShape / total, `${l} niveau ${level}`).toBeGreaterThan(0.55);
      }
    });
  });

  it('ne trahissent pas l’intrus par sa forme : chercher le mot « qui ressemble à un autre » ne sert à rien', () => {
    // Tricherie : choisir au hasard parmi les mots qui partagent leur initiale (et leur longueur) avec un autre.
    inEachLang((l) => {
      for (const level of NEW_LEVELS.filter((level) => categoriesLevel(level).camouflage)) {
        const c = categoriesLevel(level);
        const questions = Array.from({ length: 10 }, (_, seed) => generateCategories(createRng(seed * 7 + level), level)).flat();
        for (const shape of [false, true]) {
          let wins = 0;
          let paired = 0;
          for (const q of questions) {
            const alike = (a: string, b: string) => initial(a) === initial(b) && (!shape || Math.abs(a.length - b.length) <= 1);
            const suspects = q.words.filter((w, i) => q.words.some((o, j) => j !== i && alike(o, w)));
            paired += suspects.length / q.words.length;
            if (suspects.includes(q.words[q.answer])) wins += 1 / suspects.length;
          }
          expect(wins / questions.length, `${l} niveau ${level}${shape ? ' (longueur)' : ''}`).toBeLessThan(1 / c.words + 0.03);
          // Presque tous les mots vont par paires d'initiale ; au palier Légende, la plupart aussi par longueur.
          if (!shape) expect(paired / questions.length, `${l} niveau ${level}`).toBeGreaterThan(0.9);
          else if (c.camouflage === 2) expect(paired / questions.length, `${l} niveau ${level}`).toBeGreaterThan(0.6);
        }
      }
    });
  });

  it('gardent la première étoile à portée (au moins 7 s par intrus)', () => {
    for (const level of NEW_LEVELS) {
      const { target } = categoriesLevel(level);
      const forStar = Math.ceil(0.6 * target);
      expect(scoreCategories(forStar, 0, level)).toBeGreaterThanOrEqual(60);
      expect(60 / forStar).toBeGreaterThanOrEqual(7);
    }
  });

  it('tirent une partie en moins de 50 ms', () => {
    inEachLang(() => {
      for (const level of [21, 31, 41, 50]) expect(timed(() => generateCategories(createRng(level), level))).toBeLessThan(50);
    });
  });
});

describe('Lecture éclair, niveaux 21 à 50', () => {
  it('ont deux paliers de plus (à rallonge, logique) dans chaque langue', () => {
    inEachLang(() => {
      const all = sentences();
      expect(all).toHaveLength(5);
      const average = (tier: number) => all[tier - 1].flat().reduce((sum, s) => sum + s.length, 0) / (all[tier - 1].length * 2);
      // Le palier 4 est vraiment plus long que les autres.
      expect(average(4)).toBeGreaterThan(average(2) + 20);
      expect(average(4)).toBeGreaterThan(average(3) + 15);
      for (const tier of all.slice(3)) {
        expect(tier).toHaveLength(40);
        for (const [truth, lie] of tier) {
          expect(truth).not.toBe(lie);
          for (const s of [truth, lie]) {
            expect(s).toMatch(/\.$/);
            expect(s).not.toMatch(/'/);
            expect(s.length).toBeLessThanOrEqual(130);
          }
        }
      }
    });
  });

  it('tirent les phrases des nouveaux paliers à chaque niveau, sans repasser une idée avant la fin du tour', () => {
    inEachLang((l) => {
      const all = sentences();
      for (const level of NEW_LEVELS) {
        const c = lectureLevel(level);
        expect(c.tiers.some((t) => t >= 4), `${l} niveau ${level}`).toBe(true);
        const pool = new Set(c.tiers.flatMap((t) => all[t - 1].flat()));
        const questions = generateLecture(createRng(level), level);
        expect(questions).toHaveLength(c.tiers.length * 80);
        const first = questions.slice(0, c.tiers.length * 40);
        expect(new Set(first.map((q) => q.sentence)).size).toBe(first.length);
        for (const q of questions) expect(pool.has(q.sentence)).toBe(true);
      }
    });
  });

  it('effacent la phrase de plus en plus vite au palier Légende, et seulement là', () => {
    const sample = 'x'.repeat(80);
    for (const level of LEVELS) expect(lectureFlashMs(sample, level) === null, `niveau ${level}`).toBe(level <= 40);
    for (let level = 42; level <= MAX_LEVEL; level++) expect(lectureFlashMs(sample, level)).toBeLessThanOrEqual(lectureFlashMs(sample, level - 1) ?? 0);
    // Même au niveau 50, une phrase reste lisible : plus d'une seconde, et 40 ms par caractère au moins
    // (environ 300 mots par minute, la vitesse d'un bon lecteur).
    inEachLang(() => {
      for (const s of sentences().slice(2).flat(2)) expect(lectureFlashMs(s, MAX_LEVEL)).toBeGreaterThanOrEqual(Math.max(1000, s.length * 40));
    });
  });

  it('gardent la première étoile à portée (au moins 5 s par bonne réponse)', () => {
    for (const level of NEW_LEVELS) {
      const { target } = lectureLevel(level);
      const forStar = Math.ceil(0.6 * target);
      expect(scoreLecture(forStar, 0, level)).toBeGreaterThanOrEqual(60);
      expect(60 / forStar).toBeGreaterThanOrEqual(5);
    }
  });

  it('tirent une partie en moins de 50 ms', () => {
    inEachLang(() => {
      for (const level of [21, 31, 49, 50]) expect(timed(() => generateLecture(createRng(level), level))).toBeLessThan(50);
    });
  });
});
