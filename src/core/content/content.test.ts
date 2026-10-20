import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { COACH_TIPS, coachTip, coachTips } from '../coach';
import { anagramDeck, anagramDecoyLetters, anagramLevel, buildAnagramIndex, isAnagramAnswer, letterKey, scramble } from '../games/anagrammes';
import { categoriesLevel, generateCategories, twinCategories } from '../games/categories';
import { contrairesFamilies, contrairesLexicon } from '../games/contraires';
import { generateLecture, lectureLevel, lectureLevelLabel, sentences } from '../games/lecture';
import { generateLettre, lettreConsonants, lettreKnownWords, lettreKnownWordsPlus, lettreLevel, lettreLookalikes, lettreWords } from '../games/lettre';
import { categories, categoryOf, CATEGORIES, type Category } from '../games/lexique';
import { generateMots, motsLevel } from '../games/mots';
import { generateQui, quiLevel, quiNames } from '../games/quiestqui';
import { describeRule, fillOf, REFLEXE_LEVELS, reflexeLevelLabel, reflexeRule, type ReflexeRule } from '../games/reflexe';
import { GAME_ORDER, GAMES } from '../games/registry';
import { countShapes, describeShape, fillWord, SHAPE_NAMES, SHAPES, theShape } from '../games/shapes';
import { matchSpokenColor, spokenColors, STROOP_ALL_COLORS, STROOP_COLORS, STROOP_LABELS, stroopKeys } from '../games/stroop';
import { anagramWords, extraKnownWords, hasRudeWord, longAnagramWords, rudeSequences } from '../games/words';
import { LANG_NAMES, LANGS, lang, setLang, type ExtraLang, type Lang } from '../lang';
import { MAX_LEVEL } from '../levels';
import { createRng } from '../rng';
import { demoContent } from './demos';
import { contentOf, registerContent, type LangContent, type LangGrammar } from './index';

/**
 * Les contenus de chaque langue (voir `LangContent`) : pour le français, l'anglais et chaque autre
 * langue qui a son module `src/core/content/<langue>.ts`, ce fichier contrôle toutes les règles du
 * contenu, puis fait tourner chaque jeu de langage aux 50 niveaux avec plusieurs graines et vérifie
 * ce qui en sort. C'est le test que lance un traducteur pour valider sa langue :
 *
 *   npx vitest run src/core/content/content.test.ts
 *
 * Chaque message d'échec commence par [langue] et le champ concerné, puis liste tous les problèmes
 * trouvés (pas seulement le premier).
 */

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const SEEDS = [3, 77, 1234];
const VOWELS = 'AEIOUY';

const isExtra = (l: Lang): l is ExtraLang => l !== 'fr' && l !== 'en';

// Un module de langue tout juste créé peut manquer au registre : Vitest garde en cache la version
// transformée de index.ts, et son import.meta.glob, tant que index.ts ne change pas. On charge donc
// ici chaque module présent (chemin calculé : Vite n'en fait pas un glob, lui aussi mis en cache).
/** Les modules présents qui ne se chargent pas (erreur de syntaxe, pas d'export par défaut…). */
const BROKEN_MODULES: string[] = [];
for (const l of LANGS) {
  if (!isExtra(l) || contentOf(l)) continue;
  const path = ['.', `${l}.ts`].join('/');
  try {
    const content = ((await import(/* @vite-ignore */ path)) as { default?: LangContent }).default;
    if (content) registerContent(l, content);
    else BROKEN_MODULES.push(`[${l}] src/core/content/${l}.ts : pas d'export par défaut (export default content)`);
  } catch (error) {
    // Un module absent est normal (langue pas encore écrite) ; un module qui plante, non.
    if ((error as { code?: string }).code !== 'ERR_MODULE_NOT_FOUND') {
      BROKEN_MODULES.push(`[${l}] src/core/content/${l}.ts ne se charge pas : ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

describe('Modules de langue', () => {
  it('se chargent tous', () => {
    expect(BROKEN_MODULES).toEqual([]);
  });
});

/** Les langues qui ont leur contenu : le français, l'anglais et chaque module enregistré. */
const CONTENT_LANGS = LANGS.filter((l) => !isExtra(l) || contentOf(l));

/** « 1 à 4, 7, 9 à 50 ». */
function ranges(levels: readonly number[]): string {
  const sorted = [...levels].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    parts.push(j > i + 1 ? `${sorted[i]} à ${sorted[j]}` : sorted.slice(i, j + 1).join(', '));
    i = j;
  }
  return parts.join(', ');
}

/** Un même problème à plusieurs niveaux et graines tient en une ligne : « niveaux 1 à 20 : … ». */
function summarize(problems: readonly string[]): string[] {
  const groups = new Map<string, number[]>();
  for (const problem of problems) {
    const level = /^niveau (\d+)/.exec(problem);
    const key = problem.replace(/, graine \d+/, '').replace(/^niveau \d+/, 'niveau #');
    const levels = groups.get(key) ?? [];
    if (level && !levels.includes(Number(level[1]))) levels.push(Number(level[1]));
    groups.set(key, levels);
  }
  return [...groups].map(([key, levels]) => key.replace('niveau #', levels.length > 1 ? `niveaux ${ranges(levels)}` : `niveau ${levels[0]}`));
}

/** Tous les problèmes d'un coup (les 80 premiers) : le traducteur voit d'emblée ce qu'il doit corriger. */
function expectNone(problems: readonly string[], what: string) {
  const lines = summarize(problems);
  const shown = lines.length > 80 ? [...lines.slice(0, 80), `… et ${lines.length - 80} autres`] : lines;
  expect(shown, `${what} : ${problems.length} problème(s)`).toEqual([]);
}

/** `read` dans une autre langue, puis retour à la langue d'avant. */
function inLang<T>(l: Lang, read: () => T): T {
  const before = lang();
  setLang(l);
  try {
    return read();
  } finally {
    setLang(before);
  }
}

/** Le contenu de la langue en cours, lu par les accesseurs des jeux, comme les jeux le lisent. */
function currentContent(): Omit<LangContent, 'grammar'> {
  return {
    anagrams: { words: anagramWords(), longWords: longAnagramWords(), decoyLetters: anagramDecoyLetters() },
    lettre: { consonants: lettreConsonants(), lookalikes: lettreLookalikes() },
    knownWords: extraKnownWords(),
    rude: rudeSequences(),
    categories: categories(),
    sentences: sentences(),
    quiNames: quiNames(),
    coachTips: coachTips(),
    contraires: contrairesFamilies(),
    stroop: { keys: stroopKeys(), spoken: spokenColors() },
    demos: demoContent(),
  };
}

/** Sans accents ni majuscules (ß → ss) : « Rosé » → « rose ». */
const plain = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss');

/** Première lettre sans accent ni majuscule (comme le jeu Catégories). */
const initial = (word: string) => word.normalize('NFD')[0].toLowerCase();

const duplicates = (items: readonly string[]) => items.filter((x, i) => items.indexOf(x) !== i);

/** Lance un générateur ; s'il plante (contenu trop maigre ou mal formé), le note au lieu de tout arrêter. */
function attempt<T>(problems: string[], at: string, make: () => T): T | null {
  try {
    return make();
  } catch (error) {
    problems.push(`${at} : le jeu plante (${error instanceof Error ? error.message : String(error)}) ; corrigez d'abord les autres erreurs de ce contenu`);
    return null;
  }
}

/** Un texte affichable : ni vide, ni espace en trop, ni morceau manquant. */
function textProblem(text: unknown): string | null {
  if (typeof text !== 'string' || !text) return 'texte vide';
  if (text !== text.trim()) return 'espace au début ou à la fin';
  if (/ {2}/.test(text)) return 'deux espaces de suite';
  if (/undefined|null|NaN|\[object/.test(text)) return 'morceau manquant (undefined, null…)';
  return null;
}

/**
 * Écarts connus du français et de l'anglais, figés par les empreintes des niveaux 1 à 20 (leurs
 * listes ne peuvent plus bouger) : à ne pas reproduire dans une autre langue.
 */
const FROZEN_ANAGRAM_GAPS: Partial<Record<Lang, readonly string[]>> = { fr: ['HARPE'], en: ['CAUSE', 'CHINA'] };

/** Noms propres des catégories (pays, planètes) : jamais des réponses d'Anagrammes. */
const isProperNoun = (category: Category, word: string) =>
  category.id === 'pays' || (category.id === 'espace' && word[0] !== word[0].toLowerCase());

/** Les phrases du coach qui nomment un jeu : indice du conseil → identifiant du jeu (d'après le français). */
const GAME_TIPS = inLang('fr', () =>
  COACH_TIPS.flatMap((tip, i) => {
    const id = GAME_ORDER.find((g) => tip.startsWith(`${GAMES[g].name} :`));
    return id ? [[i, id] as const] : [];
  }),
);

for (const l of CONTENT_LANGS) {
  const where = `[${l}]`;

  describe(`Contenus en ${LANG_NAMES[l]} (${l})`, () => {
    beforeEach(() => setLang(l));
    afterEach(() => setLang('fr'));

    describe('Anagrammes', () => {
      it('anagrams.words et longWords : mots A à Z, longueurs, quantités, sans doublon', () => {
        const { words, longWords } = currentContent().anagrams;
        const problems: string[] = [];
        for (const w of words) if (!/^[A-Z]{5,7}$/.test(w)) problems.push(`anagrams.words : « ${w} » doit être en MAJUSCULES A à Z, de 5 à 7 lettres`);
        for (const w of longWords) if (!/^[A-Z]{8}$/.test(w)) problems.push(`anagrams.longWords : « ${w} » doit être en MAJUSCULES A à Z, de 8 lettres`);
        for (const w of duplicates([...words, ...longWords])) problems.push(`anagrams : « ${w} » apparaît deux fois (dans words ou longWords)`);
        for (const n of [5, 6, 7]) {
          const keys = new Set(words.filter((w) => w.length === n).map(letterKey)).size;
          if (keys < 100) problems.push(`anagrams.words : ${keys} jeux de lettres différents de ${n} lettres, il en faut au moins 100`);
        }
        if (longWords.length < 200) problems.push(`anagrams.longWords : ${longWords.length} mots, il en faut au moins 200`);
        expectNone(problems, `${where} Anagrammes, listes`);
      });

      it('anagrams : les mots courants qui ont les mêmes lettres qu’une réponse sont aussi des réponses', () => {
        const content = currentContent();
        const answers = new Set([...content.anagrams.words, ...content.anagrams.longWords]);
        const keys = new Set([...answers].map(letterKey));
        const frozen = FROZEN_ANAGRAM_GAPS[l] ?? [];
        const others = [
          ...content.knownWords,
          ...content.categories.flatMap((c) => c.words.filter((w) => /^[a-z]+$/i.test(w) && !isProperNoun(c, w)).map((w) => w.toUpperCase())),
        ];
        const problems = [...new Set(others)]
          .filter((w) => /^[A-Z]{5,8}$/.test(w) && !answers.has(w) && keys.has(letterKey(w)) && !frozen.includes(w))
          .map((w) => {
            const twins = [...answers].filter((a) => letterKey(a) === letterKey(w));
            return `« ${w} » (catégories ou knownWords) a les lettres de ${twins.join(', ')} : ajoutez-le à anagrams.${w.length === 8 ? 'longWords' : 'words'} (sinon un mélange pourrait l'afficher, et le jeu le refuserait)`;
          });
        expectNone(problems, `${where} Anagrammes, anagrammes complètes`);
      });

      it('anagrams.decoyLetters et rude : formats', () => {
        const { anagrams, rude } = currentContent();
        const problems: string[] = [];
        if (!/^[A-Z]{10,16}$/.test(anagrams.decoyLetters)) problems.push(`anagrams.decoyLetters : « ${anagrams.decoyLetters} » doit compter de 10 à 16 MAJUSCULES A à Z`);
        for (const x of duplicates([...anagrams.decoyLetters])) problems.push(`anagrams.decoyLetters : la lettre ${x} apparaît deux fois`);
        for (const r of rude) if (!/^[A-Z]{3,}$/.test(r)) problems.push(`rude : « ${r} » doit être en MAJUSCULES A à Z, 3 lettres au moins`);
        for (const r of duplicates(rude)) problems.push(`rude : « ${r} » apparaît deux fois`);
        expectNone(problems, `${where} Anagrammes, leurres et grossièretés`);
      });

      it('mélange chaque mot sans jamais retomber sur une réponse ni sur une grossièreté', () => {
        const words = [...anagramWords(), ...longAnagramWords()];
        const index = buildAnagramIndex(words);
        const problems: string[] = [];
        for (const seed of [1, 2]) {
          const rng = createRng(seed);
          for (const word of words) {
            const letters = scramble(rng, word, index);
            if (letterKey(letters) !== letterKey(word)) problems.push(`${word} → ${letters} : pas les mêmes lettres`);
            else if (index.get(letterKey(word))?.includes(letters)) problems.push(`${word} → ${letters} : le mélange est une réponse`);
            else if (hasRudeWord(letters)) problems.push(`${word} → ${letters} : le mélange contient une suite de rude`);
          }
        }
        expectNone(problems, `${where} Anagrammes, mélanges`);
      });

      it('tire au moins 40 énigmes valables à chaque niveau (1 à 50)', () => {
        const decoyLetters = anagramDecoyLetters();
        const problems: string[] = [];
        for (const level of LEVELS) {
          const c = anagramLevel(level);
          for (const seed of SEEDS) {
            const at = `niveau ${level}, graine ${seed}`;
            const deck = attempt(problems, at, () => anagramDeck(createRng(seed + level), level));
            if (!deck) continue;
            if (deck.length < 40) problems.push(`${at} : ${deck.length} énigmes (mots de ${c.lengths.join('/')} lettres), il en faut 40`);
            if (new Set(deck.map((p) => letterKey(p.word))).size !== deck.length) problems.push(`${at} : deux énigmes ont les mêmes lettres`);
            for (const puzzle of deck.slice(0, 25)) {
              const what = `${at} : ${puzzle.word} → ${puzzle.letters}`;
              if (!c.lengths.includes(puzzle.word.length)) problems.push(`${what} : mauvaise longueur`);
              if (puzzle.letters.length !== puzzle.word.length + c.decoys) problems.push(`${what} : ${c.decoys} leurre(s) attendu(s)`);
              if (!isAnagramAnswer(puzzle.word, puzzle)) problems.push(`${what} : la réponse est refusée`);
              if (hasRudeWord(puzzle.letters)) problems.push(`${what} : les lettres forment une grossièreté`);
              if (c.decoys === 0 && isAnagramAnswer(puzzle.letters, puzzle)) problems.push(`${what} : les lettres sont déjà une réponse`);
              const extra = [...puzzle.letters];
              for (const ch of puzzle.word) extra.splice(extra.indexOf(ch), 1);
              for (const ch of extra) {
                if (c.twins ? !puzzle.word.includes(ch) : !decoyLetters.includes(ch)) problems.push(`${what} : leurre ${ch} inattendu`);
              }
            }
          }
        }
        expectNone(problems, `${where} Anagrammes, parties`);
      });
    });

    describe('Lettre manquante', () => {
      it('lettre.consonants, lettre.lookalikes et knownWords : formats', () => {
        const { lettre, knownWords } = currentContent();
        const problems: string[] = [];
        if (!/^[A-Z]+$/.test(lettre.consonants)) problems.push(`lettre.consonants : « ${lettre.consonants} » doit être en MAJUSCULES A à Z`);
        if (lettre.consonants.length < 10) problems.push(`lettre.consonants : ${lettre.consonants.length} consonnes, il en faut au moins 10`);
        for (const x of [...lettre.consonants].filter((ch) => VOWELS.includes(ch))) problems.push(`lettre.consonants : ${x} est une voyelle (AEIOUY)`);
        for (const x of duplicates([...lettre.consonants])) problems.push(`lettre.consonants : ${x} apparaît deux fois`);
        for (const [letter, alikes] of Object.entries(lettre.lookalikes ?? {})) {
          if (!/^[A-Z]$/.test(letter) || !/^[A-Z]+$/.test(alikes)) problems.push(`lettre.lookalikes : ${letter} → « ${alikes} » : une lettre A à Z → des lettres A à Z`);
          for (const x of alikes) {
            if (x === letter) problems.push(`lettre.lookalikes : ${letter} est sa propre sosie`);
            if (VOWELS.includes(x) !== VOWELS.includes(letter)) problems.push(`lettre.lookalikes : ${letter} → ${x} : voyelle pour voyelle, consonne pour consonne`);
          }
        }
        for (const w of knownWords) if (!/^\p{Lu}+$/u.test(w)) problems.push(`knownWords : « ${w} » doit être en MAJUSCULES (lettres seulement)`);
        for (const w of duplicates(knownWords)) problems.push(`knownWords : « ${w} » apparaît deux fois`);
        expectNone(problems, `${where} Lettre manquante, lettres et mots connus`);
      });

      it('a au moins 30 mots A à Z (tirés des catégories) dans la fourchette de chaque niveau', () => {
        const problems: string[] = [];
        for (const level of LEVELS) {
          const c = lettreLevel(level);
          const pool = lettreWords().filter(({ word }) => word.length >= c.minLength && word.length <= c.maxLength).length;
          if (pool < 30) problems.push(`niveau ${level} : ${pool} mots de ${c.minLength} à ${c.maxLength} lettres sans accent ni trait d'union dans categories, il en faut 30`);
        }
        expectNone(problems, `${where} Lettre manquante, réserve`);
      });

      it('pose des questions valables à chaque niveau : un seul choix forme un mot connu, jamais une grossièreté', () => {
        const labels = new Map(categories().map((c) => [c.label, c]));
        const lookalikes = lettreLookalikes();
        const problems: string[] = [];
        for (const level of LEVELS) {
          const c = lettreLevel(level);
          // Garde-fou : sans réserve, le générateur des niveaux 1 à 20 chercherait sans fin.
          const pool = lettreWords().filter(({ word }) => word.length >= c.minLength && word.length <= c.maxLength).length;
          expect(pool, `${where} Lettre manquante, niveau ${level} : réserve trop petite (voir le test de réserve)`).toBeGreaterThanOrEqual(30);
          expect(lettreConsonants().length, `${where} Lettre manquante : trop peu de consonnes (voir le test des formats)`).toBeGreaterThanOrEqual(8);
          const known = level > 20 ? lettreKnownWordsPlus() : lettreKnownWords();
          let decoyLetters = 0;
          let alike = 0;
          for (const seed of SEEDS) {
            const at = `niveau ${level}, graine ${seed}`;
            const questions = attempt(problems, at, () => generateLettre(createRng(seed * 31 + level), level, level > 20 ? 40 : 20));
            if (!questions) continue;
            if (questions.length !== (level > 20 ? 40 : 20)) problems.push(`${at} : ${questions.length} questions seulement (trop de mots où tous les leurres forment un vrai mot ?)`);
            if (level > 20) {
              const firsts = questions.slice(0, Math.min(pool, 40)).map((q) => q.word);
              if (new Set(firsts).size !== firsts.length) problems.push(`${at} : un mot revient avant la fin de la réserve`);
            }
            for (const q of questions) {
              const what = `${at} : ${q.word}`;
              if (q.word.length < c.minLength || q.word.length > c.maxLength) problems.push(`${what} : longueur hors de ${c.minLength} à ${c.maxLength}`);
              if (new Set(q.positions).size !== c.missing) problems.push(`${what} : ${c.missing} blanc(s) attendu(s)`);
              if (q.options.length !== c.options || new Set(q.options).size !== c.options) problems.push(`${what} : ${c.options} choix différents attendus (${q.options.join(' ')})`);
              if (q.options[q.answer] !== q.positions.map((p) => q.word[p]).join('')) problems.push(`${what} : la bonne réponse n'est pas au bon endroit`);
              if (!c.noHint && !labels.get(q.hint)?.words.some((w) => w.toUpperCase() === q.word)) problems.push(`${what} : l'indice « ${q.hint} » n'est pas sa catégorie`);
              q.options.forEach((letters, i) => {
                const chars = [...q.word];
                q.positions.forEach((p, k) => {
                  chars[p] = letters[k];
                  if (VOWELS.includes(letters[k]) !== VOWELS.includes(q.word[p])) problems.push(`${what} : ${letters[k]} à la place de ${q.word[p]} (voyelle pour voyelle)`);
                  if (i !== q.answer && letters[k] !== q.word[p]) {
                    decoyLetters++;
                    if (lookalikes[q.word[p]]?.includes(letters[k])) alike++;
                  }
                });
                const filled = chars.join('');
                if (i !== q.answer && known.has(filled)) problems.push(`${what} : le leurre ${letters} forme le mot connu ${filled}`);
                if (i !== q.answer && hasRudeWord(filled)) problems.push(`${what} : le leurre ${letters} forme ${filled}, qui contient une suite de rude`);
              });
            }
          }
          // Les sosies dominent parmi les lettres changées, et seulement aux niveaux qui les annoncent.
          const share = decoyLetters ? alike / decoyLetters : 0;
          if (c.twins && share <= 0.65) problems.push(`niveau ${level} : ${Math.round(share * 100)} % de lettres sosies parmi les leurres, il en faut plus de 65 % (lettre.lookalikes, lettre.consonants)`);
          if (!c.twins && level > 20 && share >= 0.35) problems.push(`niveau ${level} : ${Math.round(share * 100)} % de lettres sosies sans leurres sosies annoncés, moins de 35 % attendus (lettre.lookalikes trop large ?)`);
        }
        expectNone(problems, `${where} Lettre manquante, parties`);
      });
    });

    describe('Catégories, Mots à retenir', () => {
      it('categories : les 34 catégories du français, mêmes id, familles et ordre', () => {
        expect(
          categories().map((c) => `${c.id} (${c.family})`),
          `${where} categories : mêmes id et familles que CATEGORIES (lexique.ts), dans le même ordre`,
        ).toEqual(CATEGORIES.map((c) => `${c.id} (${c.family})`));
      });

      it('categories : libellés, pluriels et mots bien écrits, chaque mot dans une seule catégorie', () => {
        const all = categories();
        const problems: string[] = [];
        for (const c of all) {
          for (const [field, text] of [['label', c.label], ['plural', c.plural]] as const) {
            const bad = textProblem(text);
            if (bad) problems.push(`${c.id}.${field} « ${text} » : ${bad}`);
            else if (/[.:;!?]$/.test(text)) problems.push(`${c.id}.${field} « ${text} » : pas de ponctuation finale`);
          }
          if (!/^\p{Lu}/u.test(c.label)) problems.push(`${c.id}.label « ${c.label} » : majuscule initiale`);
          if (c.words.length < 16) problems.push(`${c.id} : ${c.words.length} mots, il en faut au moins 16`);
          for (const w of c.words) {
            if (!/^\p{L}\p{Ll}*(-\p{L}\p{Ll}*)*$/u.test(w)) problems.push(`${c.id} : « ${w} » (des lettres et des traits d'union ; seule l'initiale peut être une majuscule)`);
          }
        }
        for (const field of ['label', 'plural'] as const) {
          for (const x of duplicates(all.map((c) => c[field]))) problems.push(`${field} « ${x} » : deux catégories l'ont`);
        }
        const seen = new Map<string, string>();
        for (const c of all) {
          for (const w of c.words) {
            const key = w.toLowerCase();
            if (seen.has(key)) problems.push(`« ${w} » est dans ${seen.get(key)} et dans ${c.id} : un mot, une seule catégorie`);
            seen.set(key, c.id);
          }
        }
        expectNone(problems, `${where} categories`);
      });

      it('Catégories : un seul intrus par grille, de la bonne famille, jumeau puis camouflé, à chaque niveau', () => {
        const problems: string[] = [];
        for (const level of LEVELS) {
          const c = categoriesLevel(level);
          let total = 0;
          let twinPossible = 0;
          let twinHits = 0;
          let sameInitial = 0;
          let sameShape = 0;
          for (const seed of SEEDS) {
            for (const q of attempt(problems, `niveau ${level}, graine ${seed}`, () => generateCategories(createRng(seed + level), level, level > 20 ? 40 : 10)) ?? []) {
              if (q.words.some((w) => typeof w !== 'string')) {
                problems.push(`niveau ${level}, graine ${seed} : il manque des mots (une catégorie a trop peu de mots)`);
                continue;
              }
              total++;
              const at = `niveau ${level}, graine ${seed} : ${q.words.join(' ')}`;
              if (q.words.length !== c.words || new Set(q.words).size !== c.words) problems.push(`${at} : ${c.words} mots différents attendus`);
              q.words.forEach((w, i) => {
                const found = categoryOf(w);
                const expected = i === q.answer ? q.intruder : q.main;
                if (found !== expected) problems.push(`${at} : « ${w} » devrait être dans ${expected.id}, il est dans ${found?.id ?? 'aucune catégorie'}`);
              });
              if (c.near === 0 && q.intruder.family === q.main.family) problems.push(`${at} : l'intrus devait venir d'une autre famille`);
              if (c.near === 1 && q.intruder.family !== q.main.family) problems.push(`${at} : l'intrus devait venir de la même famille`);
              const twins = twinCategories(q.main);
              if (c.twin !== undefined && twins.length) {
                twinPossible++;
                if (twins.includes(q.intruder)) twinHits++;
              }
              const odd = q.words[q.answer];
              const others = q.words.filter((_, i) => i !== q.answer);
              if (others.some((w) => initial(w) === initial(odd))) sameInitial++;
              if (others.some((w) => initial(w) === initial(odd) && Math.abs(w.length - odd.length) <= 1)) sameShape++;
            }
          }
          if (c.twin === 1 && twinHits !== twinPossible) problems.push(`niveau ${level} : l'intrus devait toujours venir de la catégorie jumelle`);
          // Grille camouflée : l'intrus a presque toujours un voisin de même initiale (et de même longueur au palier Légende).
          if (c.camouflage && sameInitial / total <= 0.9) {
            problems.push(`niveau ${level} : l'intrus partage son initiale avec un autre mot ${Math.round((sameInitial / total) * 100)} % du temps, il faut plus de 90 % (plus de paires d'initiale dans chaque catégorie)`);
          }
          if (c.camouflage === 2 && sameShape / total <= 0.55) {
            problems.push(`niveau ${level} : l'intrus a un voisin de même initiale et de même longueur ${Math.round((sameShape / total) * 100)} % du temps, il faut plus de 55 %`);
          }
        }
        expectNone(problems, `${where} Catégories, parties`);
      });

      it('Mots à retenir : des listes complètes, sans doublon, pièges de la même catégorie, à chaque niveau', () => {
        const problems: string[] = [];
        for (const level of LEVELS) {
          const c = motsLevel(level);
          for (const seed of SEEDS) {
            const at = `niveau ${level}, graine ${seed}`;
            const round = attempt(problems, at, () => generateMots(createRng(seed + level), level));
            if (!round) continue;
            const words = round.probes.map((p) => p.word);
            if (round.study.length !== c.count || round.probes.length !== c.count * 2) problems.push(`${at} : ${c.count} mots à retenir et ${c.count * 2} questions attendus`);
            if (words.some((w) => typeof w !== 'string')) problems.push(`${at} : il manque des mots (une catégorie trop courte ?)`);
            if (new Set(words).size !== words.length) problems.push(`${at} : un mot revient deux fois`);
            for (const p of round.probes) {
              if (round.study.includes(p.word) !== p.seen) problems.push(`${at} : « ${p.word} » mal classé (vu / pas vu)`);
              if (typeof p.word === 'string' && !categoryOf(p.word)) problems.push(`${at} : « ${p.word} » n'est dans aucune catégorie`);
            }
            if (round.sequence.filter((s) => s.forget).length !== c.decoys) problems.push(`${at} : ${c.decoys} mots barrés attendus`);
            if (c.lures === 'category') {
              const studied = new Set(round.study.map((w) => categoryOf(w)?.id));
              for (const p of round.probes) if (!studied.has(categoryOf(p.word)?.id)) problems.push(`${at} : le piège « ${p.word} » ne vient pas d'une catégorie étudiée`);
            }
          }
        }
        expectNone(problems, `${where} Mots à retenir, parties`);
      });
    });

    describe('Lecture éclair', () => {
      it('sentences : 5 paliers de 40 idées vraies / fausses, bien écrites et de longueurs équilibrées', () => {
        const all = currentContent().sentences;
        const problems: string[] = [];
        if (all.length !== 5) problems.push(`sentences : ${all.length} paliers, il en faut 5`);
        all.forEach((tier, t) => {
          if (tier.length !== 40) problems.push(`palier ${t + 1} : ${tier.length} idées, il en faut 40`);
          for (const pair of tier) {
            const [truth, lie] = pair;
            if (pair.length !== 2 || truth === lie) problems.push(`palier ${t + 1} : « ${truth} » : il faut [vraie, fausse], deux phrases différentes`);
            for (const s of [truth, lie]) {
              const bad = textProblem(s);
              if (bad) problems.push(`palier ${t + 1} : « ${s} » : ${bad}`);
              else {
                if (!/^\p{Lu}.*\.$/u.test(s)) problems.push(`palier ${t + 1} : « ${s} » : majuscule initiale et point final`);
                if (s.includes("'")) problems.push(`palier ${t + 1} : « ${s} » : apostrophe typographique ’ (pas ')`);
                if (l !== 'fr' && / [:;!?]/.test(s)) problems.push(`palier ${t + 1} : « ${s} » : pas d'espace avant : ; ! ?`);
                if (s.length < 10) problems.push(`palier ${t + 1} : « ${s} » : 10 caractères au moins`);
                if (t >= 3 && s.length > 130) problems.push(`palier ${t + 1} : « ${s} » : ${s.length} caractères, 130 au plus`);
              }
            }
          }
          const mean = (k: 0 | 1) => tier.reduce((sum, pair) => sum + (pair[k]?.length ?? 0), 0) / Math.max(1, tier.length);
          if (Math.abs(mean(0) - mean(1)) > 0.1 * Math.max(mean(0), mean(1))) {
            problems.push(`palier ${t + 1} : les phrases vraies font ${mean(0).toFixed(0)} caractères en moyenne, les fausses ${mean(1).toFixed(0)} : la longueur trahirait la réponse (écart de 10 % au plus)`);
          }
        });
        for (const s of duplicates(all.flat(2))) problems.push(`« ${s} » apparaît deux fois`);
        if (all.length === 5) {
          const average = (t: number) => all[t].flat().reduce((sum, s) => sum + s.length, 0) / (all[t].length * 2);
          if (average(3) <= average(1) + 20) problems.push(`palier 4 : ${average(3).toFixed(0)} caractères en moyenne, il en faut au moins 20 de plus que le palier 2 (${average(1).toFixed(0)})`);
          if (average(3) <= average(2) + 15) problems.push(`palier 4 : ${average(3).toFixed(0)} caractères en moyenne, il en faut au moins 15 de plus que le palier 3 (${average(2).toFixed(0)})`);
        }
        expectNone(problems, `${where} sentences`);
      });

      it('tire chaque idée une fois par tour, dans le bon palier et avec la bonne réponse, à chaque niveau', () => {
        const all = sentences();
        const truths = new Set(all.flatMap((tier) => tier.map(([truth]) => truth)));
        const problems: string[] = [];
        for (const level of LEVELS) {
          const c = lectureLevel(level);
          const pool = new Set(c.tiers.flatMap((t) => (all[t - 1] ?? []).flat()));
          for (const seed of SEEDS) {
            const at = `niveau ${level}, graine ${seed}`;
            const questions = attempt(problems, at, () => generateLecture(createRng(seed + level), level));
            if (!questions) continue;
            if (questions.length !== c.tiers.length * 80) problems.push(`${at} : ${questions.length} phrases au lieu de ${c.tiers.length * 80}`);
            const first = questions.slice(0, c.tiers.length * 40).map((q) => q.sentence);
            if (new Set(first).size !== first.length) problems.push(`${at} : une phrase revient avant la fin du tour`);
            for (const q of questions) {
              if (!pool.has(q.sentence)) problems.push(`${at} : « ${q.sentence} » ne vient pas des paliers ${c.tiers.join(', ')}`);
              if (truths.has(q.sentence) !== q.truth) problems.push(`${at} : « ${q.sentence} » mal jugée`);
            }
          }
          const bad = textProblem(lectureLevelLabel(level));
          if (bad) problems.push(`libellé du niveau ${level} « ${lectureLevelLabel(level)} » : ${bad}`);
        }
        expectNone(problems, `${where} Lecture éclair, parties`);
      });
    });

    describe('Qui est qui ?', () => {
      it('quiNames : au moins 60 prénoms différents, bien écrits, groupés par initiale', () => {
        const names = currentContent().quiNames;
        const problems: string[] = [];
        if (names.length < 60) problems.push(`quiNames : ${names.length} prénoms, il en faut au moins 60`);
        for (const name of names) if (!/^\p{Lu}\p{Ll}{1,7}$/u.test(name)) problems.push(`quiNames : « ${name} » (2 à 8 lettres, majuscule initiale puis minuscules)`);
        for (const name of duplicates(names)) problems.push(`quiNames : « ${name} » apparaît deux fois`);
        const groups = new Map<string, number>();
        for (const name of names) groups.set(name[0], (groups.get(name[0]) ?? 0) + 1);
        const big = [...groups].filter(([, n]) => n >= 5);
        if (big.length < 6) {
          problems.push(`quiNames : ${big.length} initiales portées par 5 prénoms ou plus (${big.map(([g, n]) => `${g} : ${n}`).join(', ')}), il en faut au moins 6`);
        }
        expectNone(problems, `${where} quiNames`);
      });

      it('donne des prénoms distincts, de la liste, et proches aux niveaux qui l’annoncent', () => {
        const names = new Set(quiNames());
        const problems: string[] = [];
        for (const level of LEVELS) {
          const c = quiLevel(level);
          for (const seed of SEEDS) {
            for (const round of attempt(problems, `niveau ${level}, graine ${seed}`, () => generateQui(createRng(seed * 13 + level), level)) ?? []) {
              const at = `niveau ${level}, graine ${seed}`;
              const given = round.people.map((p) => p.name);
              if (given.some((name) => typeof name !== 'string')) {
                problems.push(`${at} : il manque des prénoms (quiNames trop court, ou trop peu de prénoms par initiale)`);
                continue;
              }
              if (new Set(given).size !== c.people) problems.push(`${at} : ${c.people} prénoms différents attendus (${[...given].sort().join(', ')})`);
              for (const name of given) if (!names.has(name)) problems.push(`${at} : « ${name} » n'est pas dans quiNames`);
              if (c.lookAlikeNames && new Set(given.map((n) => n?.[0])).size >= c.people) problems.push(`${at} : les prénoms devaient se ressembler (même initiale)`);
            }
          }
        }
        expectNone(problems, `${where} Qui est qui ?, parties`);
      });
    });

    describe('Mot du coach', () => {
      it('coachTips : un conseil par conseil français, dans le même ordre, bien écrit', () => {
        const tips = currentContent().coachTips;
        const problems: string[] = [];
        if (GAME_TIPS.length < 15) problems.push(`(test) ${GAME_TIPS.length} conseils français repérés comme nommant un jeu, au moins 15 attendus`);
        if (tips.length !== COACH_TIPS.length) problems.push(`coachTips : ${tips.length} conseils, il en faut ${COACH_TIPS.length} (un par conseil français, même ordre)`);
        for (const tip of duplicates(tips)) problems.push(`« ${tip} » apparaît deux fois`);
        for (const tip of tips) {
          const bad = textProblem(tip);
          if (bad) problems.push(`« ${tip} » : ${bad}`);
          else {
            if (!/^[\p{Lu}0-9¿¡]/u.test(tip)) problems.push(`« ${tip} » : majuscule initiale`);
            if (!/[.!?…)]$/u.test(tip)) problems.push(`« ${tip} » : doit finir par . ! ? … ou )`);
            if (tip.includes("'")) problems.push(`« ${tip} » : apostrophe typographique ’ (pas ')`);
            if (l !== 'fr' && / [:;!?]/.test(tip)) problems.push(`« ${tip} » : pas d'espace avant : ; ! ?`);
          }
        }
        // Un conseil sur un jeu commence par le nom du jeu (quand le dictionnaire le traduit déjà).
        for (const [i, id] of GAME_TIPS) {
          const name = GAMES[id].name;
          const translated = l === 'fr' || l === 'en' || name !== inLang('en', () => GAMES[id].name);
          if (translated && tips[i] && !tips[i].startsWith(name)) problems.push(`conseil n° ${i + 1} « ${tips[i]} » : doit commencer par le nom du jeu, « ${name} »`);
        }
        const day = '2026-10-20';
        if (tips.indexOf(coachTip(day)) !== inLang('fr', () => COACH_TIPS.indexOf(coachTip(day)))) problems.push('le conseil du jour n’est pas le même qu’en français');
        expectNone(problems, `${where} coachTips`);
      });
    });

    describe('Couleurs piégées', () => {
      it('stroop.keys : une lettre par couleur de base, prise dans son nom', () => {
        const { keys } = currentContent().stroop;
        const problems: string[] = [];
        for (const [key, color] of Object.entries(keys)) {
          if (!/^[a-z]$/.test(key)) problems.push(`stroop.keys : « ${key} » doit être une lettre minuscule de a à z`);
          if (!(STROOP_COLORS as readonly string[]).includes(color)) problems.push(`stroop.keys : ${key} → ${color}, pas une couleur de base (${STROOP_COLORS.join(' ')})`);
          const label = STROOP_LABELS[color];
          const translated = l === 'fr' || l === 'en' || label !== inLang('en', () => STROOP_LABELS[color]);
          if (label && translated && !plain(label).includes(key)) problems.push(`stroop.keys : ${key} → ${color} : la lettre n'est pas dans le nom affiché « ${label} »`);
        }
        const colors = Object.values(keys);
        for (const color of STROOP_COLORS) {
          const count = colors.filter((c) => c === color).length;
          if (count !== 1) problems.push(`stroop.keys : ${color} a ${count} touche(s), il en faut exactement une`);
        }
        expectNone(problems, `${where} stroop.keys`);
      });

      it('stroop.spoken : chaque couleur se reconnaît à la voix, par son nom et ses formes', () => {
        const { spoken } = currentContent().stroop;
        const problems: string[] = [];
        for (const [word, color] of Object.entries(spoken)) {
          if (!/^[a-z]+$/.test(word)) problems.push(`stroop.spoken : « ${word} » doit être en minuscules de a à z, sans accent (ß → ss)`);
          if (!(STROOP_ALL_COLORS as readonly string[]).includes(color)) problems.push(`stroop.spoken : ${word} → ${color}, pas une couleur (${STROOP_ALL_COLORS.join(' ')})`);
          else if (matchSpokenColor(`euh ${word}`) !== color) problems.push(`stroop.spoken : « euh ${word} » n'est pas reconnu comme ${color}`);
        }
        for (const color of STROOP_ALL_COLORS) {
          if (!Object.values(spoken).includes(color)) problems.push(`stroop.spoken : aucun mot pour ${color}`);
          const label = STROOP_LABELS[color];
          const translated = l === 'fr' || l === 'en' || label !== inLang('en', () => STROOP_LABELS[color]);
          if (translated && matchSpokenColor(label) !== color) problems.push(`stroop.spoken : le nom affiché « ${label} » n'est pas reconnu comme ${color}`);
        }
        expectNone(problems, `${where} stroop.spoken`);
      });
    });

    describe('Grammaire des formes', () => {
      const ROTATIONS = [0, 90, 180, 270];

      it('décrit chaque carte, chaque forme avec son article, et compte les exemplaires', () => {
        const problems: string[] = [];
        const check = (what: string, text: string) => {
          const bad = textProblem(text);
          if (bad) problems.push(`${what} → « ${text} » : ${bad}`);
          else if (/\.$/.test(text)) problems.push(`${what} → « ${text} » : pas de point final`);
          return text;
        };
        const cards = SHAPES.flatMap((shape) => [true, false].flatMap((filled) => ROTATIONS.map((rotation) => ({ shape, filled, rotation }))));
        const described = cards.map((card) => check(`describeShape(${card.shape}, ${card.filled ? 'plein' : 'creux'}, ${card.rotation}°)`, describeShape(card)));
        for (const text of duplicates(described)) problems.push(`describeShape : « ${text} » décrit deux cartes différentes`);
        for (const shape of SHAPES) {
          const name = SHAPE_NAMES[shape];
          const the = check(`theShape(${shape})`, theShape(shape));
          if (!plain(the).includes(plain(name))) problems.push(`theShape(${shape}) → « ${the} » : le nom « ${name} » n'y est pas`);
          if (!plain(describeShape({ shape, filled: true, rotation: 0 })).includes(plain(name))) problems.push(`describeShape(${shape}) : le nom « ${name} » n'y est pas`);
          for (const plural of [false, true]) {
            const filled = check(`fillWord(${shape}, plein${plural ? ', pluriel' : ''})`, fillWord(shape, true, plural));
            const hollow = check(`fillWord(${shape}, creux${plural ? ', pluriel' : ''})`, fillWord(shape, false, plural));
            if (filled === hollow) problems.push(`fillWord(${shape}) : « plein » et « creux » se disent pareil (${filled})`);
          }
          for (let n = 2; n <= 6; n++) {
            const counted = check(`countShapes(${shape}, ${n})`, countShapes(shape, n));
            if (!counted.includes(String(n))) problems.push(`countShapes(${shape}, ${n}) → « ${counted} » : le nombre n'y est pas`);
          }
        }
        for (const text of duplicates(SHAPES.map(theShape))) problems.push(`theShape : « ${text} » pour deux formes`);
        for (const text of duplicates(SHAPES.map((s) => countShapes(s, 3)))) problems.push(`countShapes : « ${text} » pour deux formes`);
        expectNone(problems, `${where} grammar (formes)`);
      });

      it('dit chaque règle de Réflexe, deux règles différentes en deux phrases différentes', () => {
        const problems: string[] = [];
        const rules: ReflexeRule[] = [
          ...REFLEXE_LEVELS.flatMap((c) => c.rules),
          ...SHAPES.flatMap((shape) => [
            { go: [shape], filledOnly: false, inverted: false },
            { go: [shape], filledOnly: true, inverted: true },
            { go: [shape, shape === 'circle' ? 'square' : 'circle'], filledOnly: false, inverted: false, fill: ['hollow', 'filled'] },
          ] satisfies ReflexeRule[]),
        ];
        // Le sens d'une règle : ses formes, leur remplissage, inversée ou pas.
        const meaning = (rule: ReflexeRule) => `${rule.inverted ? 'sauf ' : ''}${rule.go.map((s, i) => `${s}:${fillOf(rule, i) ?? '*'}`).join(',')}`;
        const texts = new Map<string, string>();
        for (const rule of rules) {
          const text = describeRule(rule);
          const bad = textProblem(text);
          if (bad) problems.push(`describeRule(${meaning(rule)}) → « ${text} » : ${bad}`);
          const other = texts.get(text);
          if (other !== undefined && other !== meaning(rule)) problems.push(`describeRule : « ${text} » dit deux règles différentes (${other} et ${meaning(rule)})`);
          texts.set(text, meaning(rule));
        }
        for (const level of LEVELS) {
          for (const text of [reflexeLevelLabel(level), reflexeRule(level)]) {
            const bad = textProblem(text);
            if (bad) problems.push(`Réflexe, niveau ${level} : « ${text} » : ${bad}`);
          }
        }
        expectNone(problems, `${where} grammar (règles de Réflexe)`);
      });

      it.runIf(isExtra(l))('grammar.list : une énumération qui garde chaque élément, dans l’ordre', () => {
        const grammar = contentOf(l as ExtraLang)!.grammar;
        const problems: string[] = [];
        if (grammar.list(['alpha']) !== 'alpha') problems.push(`list(['alpha']) → « ${grammar.list(['alpha'])} », attendu « alpha »`);
        for (const items of [['alpha', 'beta'], ['alpha', 'beta', 'gamma'], ['alpha', 'beta', 'gamma', 'delta']]) {
          const text = grammar.list(items);
          const at = items.map((x) => text.indexOf(x));
          if (textProblem(text) || at.some((p, i) => p < 0 || (i > 0 && p < at[i - 1]))) problems.push(`list([${items.join(', ')}]) → « ${text} »`);
        }
        expectNone(problems, `${where} grammar.list`);
      });
    });

    describe('Démos', () => {
      it('demos : des contenus cohérents avec les listes et les légendes', () => {
        const { anagram, mots, lettre, categories: cats, qui, lecture } = currentContent().demos;
        const problems: string[] = [];
        // Anagrammes : 5 tuiles qui, dans l'ordre `order`, forment une réponse.
        if (anagram.tiles.length !== 5 || anagram.tiles.some((t) => !/^[A-Z]$/.test(t))) problems.push(`demos.anagram.tiles : 5 lettres majuscules A à Z attendues (${anagram.tiles.join(' ')})`);
        if ([...anagram.order].sort().join() !== '0,1,2,3,4') problems.push(`demos.anagram.order : une permutation de 0 à 4 attendue (${anagram.order.join(' ')})`);
        const word = anagram.order.map((i) => anagram.tiles[i]).join('');
        if (!anagramWords().includes(word)) problems.push(`demos.anagram : ${word} n'est pas dans anagrams.words`);
        if (anagramWords().includes(anagram.tiles.join(''))) problems.push(`demos.anagram : les tuiles mélangées ${anagram.tiles.join('')} forment déjà une réponse`);
        // Mots à retenir : un mot vu, un mot pas vu.
        if (mots.words.length !== 3 || new Set([...mots.words, mots.unseen]).size !== 4) problems.push('demos.mots : trois mots et un quatrième mot, tous différents');
        if (!mots.words.includes(mots.seen)) problems.push(`demos.mots.seen « ${mots.seen} » doit être dans la liste`);
        // Lettre manquante : l'indice est la catégorie du mot, les lettres hésitées ne forment pas d'autre mot.
        const category = categories().find((c) => c.label === lettre.hint);
        if (!/^[A-Z]+$/.test(lettre.word)) problems.push(`demos.lettre.word « ${lettre.word} » : MAJUSCULES A à Z`);
        if (lettre.word[lettre.position] !== lettre.letter) problems.push(`demos.lettre : la lettre n° ${lettre.position} (à partir de 0) de ${lettre.word} n'est pas ${lettre.letter}`);
        if (!category) problems.push(`demos.lettre.hint « ${lettre.hint} » n'est le label d'aucune catégorie`);
        else if (!category.words.some((w) => w.toUpperCase() === lettre.word)) problems.push(`demos.lettre : ${lettre.word} n'est pas dans la catégorie ${category.id}`);
        const guessed: string[] = lettre.guess.match(/(?<!\p{L})\p{Lu}(?!\p{L})/gu) ?? [];
        if (!guessed.includes(lettre.letter)) problems.push(`demos.lettre.guess « ${lettre.guess} » doit citer la bonne lettre, ${lettre.letter}`);
        for (const x of guessed.filter((g) => g !== lettre.letter)) {
          const filled = [...lettre.word].map((ch, i) => (i === lettre.position ? x : ch)).join('');
          if (lettreKnownWords().has(filled)) problems.push(`demos.lettre.guess : ${x} forme le mot ${filled}`);
        }
        if (!lettre.answer.includes(lettre.word) || !lettre.answer.includes(lettre.letter)) problems.push(`demos.lettre.answer « ${lettre.answer} » : la lettre et le mot complet`);
        // Catégories : le violon en troisième, trois fruits autour.
        if (cats.length !== 4 || new Set(cats).size !== 4) problems.push('demos.categories : quatre mots différents');
        if (categoryOf(cats[2])?.id !== 'instruments') problems.push(`demos.categories : le troisième mot « ${cats[2]} » doit être le violon de la catégorie instruments`);
        cats.forEach((w, i) => {
          const id = categoryOf(w)?.id;
          if (i !== 2 && id && id !== 'fruits') problems.push(`demos.categories : « ${w} » est dans ${id}, il faut un fruit`);
        });
        // Qui est qui ? et Lecture éclair.
        if (qui.length !== 3 || new Set(qui).size !== 3) problems.push('demos.qui : trois prénoms différents');
        for (const name of qui) if (!quiNames().includes(name)) problems.push(`demos.qui : « ${name} » n'est pas dans quiNames`);
        if (lecture.length !== 2 || lecture[0] === lecture[1]) problems.push('demos.lecture : [vraie, fausse], deux phrases différentes');
        for (const s of lecture) if (textProblem(s) || !/^\p{Lu}.*\.$/u.test(s)) problems.push(`demos.lecture : « ${s} » : majuscule initiale et point final`);
        expectNone(problems, `${where} demos`);
      });
    });
  });
}

describe('Aiguillage des contenus', () => {
  const marked = (text: string) => `«es» ${text}`;
  const grammar: LangGrammar = {
    fillWord: (_shape, filled, plural) => marked(`${filled ? 'lleno' : 'hueco'}${plural ? 's' : ''}`),
    theShape: (_shape, name) => marked(`el ${name}`),
    describeShape: (card, name) => marked(`${name} ${card.filled ? 'lleno' : 'hueco'}`),
    countShapes: (_shape, name, count) => marked(`${count} ${name}s`),
    describeRule: (parts, inverted) => marked(`${inverted ? 'todo menos ' : ''}${parts.map((p) => `${p.name}:${p.fill ?? '*'}`).join(' y ')}`),
    list: (items) => marked(items.join(' y ')),
  };

  /** Un faux espagnol, fait de l'anglais marqué : chaque accesseur doit le renvoyer tel quel. */
  function fakeContent(): LangContent {
    const en = inLang('en', currentContent);
    return {
      anagrams: { words: [...en.anagrams.words, 'ZQZQZ'], longWords: [...en.anagrams.longWords], decoyLetters: 'ZQXWVKJYBGPFMC' },
      lettre: { consonants: 'BCDFGHKLMNPRSTVWZ', lookalikes: { M: 'N' } },
      knownWords: [...en.knownWords, 'QWERTY'],
      rude: ['ZQZQ'],
      categories: en.categories.map((c) => ({ ...c, label: marked(c.label), plural: marked(c.plural), words: [...c.words] })),
      sentences: en.sentences.map((tier) => tier.map(([truth, lie]) => [marked(truth), marked(lie)] as const)),
      quiNames: en.quiNames.map((name) => `${name}a`),
      coachTips: en.coachTips.map(marked),
      contraires: [...en.contraires, { kind: 'adj', pairs: ['zqa/zqb', '', ''] }],
      stroop: { keys: { q: 'rouge', w: 'bleu', e: 'vert', t: 'jaune', u: 'orange', i: 'violet' }, spoken: { rojo: 'rouge', azul: 'bleu' } },
      grammar,
      demos: { ...en.demos, qui: ['Lucya', 'Jacka', 'Ninaa'] },
    };
  }

  let previous: LangContent | null = null;
  beforeEach(() => {
    previous = contentOf('es');
  });
  afterEach(() => {
    registerContent('es', previous);
    setLang('fr');
  });

  it('une autre langue enregistrée : chaque accesseur et chaque jeu passent à son contenu', () => {
    const fake = fakeContent();
    registerContent('es', fake);
    setLang('es');
    const now = currentContent();
    expect(now.anagrams.words).toBe(fake.anagrams.words);
    expect(now.anagrams.longWords).toBe(fake.anagrams.longWords);
    expect(now.anagrams.decoyLetters).toBe(fake.anagrams.decoyLetters);
    expect(now.lettre.consonants).toBe(fake.lettre.consonants);
    expect(now.lettre.lookalikes).toBe(fake.lettre.lookalikes);
    expect(now.knownWords).toBe(fake.knownWords);
    expect(now.rude).toBe(fake.rude);
    expect(now.categories).toBe(fake.categories);
    expect(now.sentences).toBe(fake.sentences);
    expect(now.quiNames).toBe(fake.quiNames);
    expect(now.coachTips).toBe(fake.coachTips);
    expect(now.contraires).toBe(fake.contraires);
    expect(now.stroop.keys).toBe(fake.stroop.keys);
    expect(now.stroop.spoken).toBe(fake.stroop.spoken);
    expect(now.demos).toBe(fake.demos);

    // Les lexiques calculés suivent : réponses, mots connus, grossièretés, indices.
    expect(isAnagramAnswer('ZQZQZ', { word: 'ZQZQZ', letters: 'QZZQZ' })).toBe(true);
    expect(hasRudeWord('AZQZQA')).toBe(true);
    expect(hasRudeWord('FUCK')).toBe(false);
    expect(lettreKnownWords().has('QWERTY')).toBe(true);
    expect(lettreWords().every(({ hint }) => hint.startsWith('«es»'))).toBe(true);
    expect(generateCategories(createRng(1), 25, 5).every((q) => fake.categories.includes(q.main))).toBe(true);
    expect(generateLecture(createRng(1), 1).every((q) => q.sentence.startsWith('«es»'))).toBe(true);
    expect(generateQui(createRng(1), 12).flatMap((r) => r.people).every((p) => fake.quiNames.includes(p.name))).toBe(true);
    expect(coachTip('2026-10-20')).toMatch(/^«es» /);
    expect(contrairesLexicon().familyOf.has('zqa')).toBe(true);
    expect(matchSpokenColor('rojo')).toBe('rouge');
    expect(matchSpokenColor('red')).toBeNull();

    // La grammaire.
    expect(fillWord('star', true)).toBe('«es» lleno');
    expect(theShape('star')).toBe(`«es» el ${SHAPE_NAMES.star}`);
    expect(describeShape({ shape: 'star', filled: false, rotation: 0 })).toBe(`«es» ${SHAPE_NAMES.star} hueco`);
    expect(countShapes('cross', 3)).toBe(`«es» 3 ${SHAPE_NAMES.cross}s`);
    expect(describeRule({ go: ['circle', 'square'], filledOnly: false, inverted: true, fill: ['hollow', 'filled'] })).toBe(
      `«es» todo menos ${SHAPE_NAMES.circle}:hollow y ${SHAPE_NAMES.square}:filled`,
    );
    expect(describeRule({ go: ['star'], filledOnly: true, inverted: false })).toBe(`«es» ${SHAPE_NAMES.star}:filled`);
    expect(lectureLevelLabel(10)).toContain('«es» ');
  });

  it('une autre langue sans contenu retombe sur l’anglais, lexiques compris', () => {
    registerContent('es', fakeContent());
    setLang('es');
    expect(isAnagramAnswer('ZQZQZ', { word: 'ZQZQZ', letters: 'QZZQZ' })).toBe(true);
    expect(contrairesLexicon().familyOf.has('zqa')).toBe(true);
    registerContent('es', null);
    const english = inLang('en', currentContent);
    expect(currentContent()).toEqual(english);
    expect(anagramWords()).toBe(english.anagrams.words);
    expect(categories()).toBe(english.categories);
    expect(sentences()).toBe(english.sentences);
    // Les lexiques déjà calculés pour le faux espagnol sont oubliés.
    expect(isAnagramAnswer('ZQZQZ', { word: 'ZQZQZ', letters: 'QZZQZ' })).toBe(false);
    expect(isAnagramAnswer('HEART', { word: 'HEART', letters: 'RATEH' })).toBe(true);
    expect(lettreKnownWords().has('QWERTY')).toBe(false);
    expect(contrairesLexicon().familyOf.has('zqa')).toBe(false);
    expect(hasRudeWord('XFUCKX')).toBe(true);
    expect(matchSpokenColor('red')).toBe('rouge');
    const rule: ReflexeRule = { go: ['star', 'cross'], filledOnly: false, inverted: false };
    expect(describeRule(rule)).toBe('Tap the stars and the crosses');
    expect(theShape('star')).toBe(inLang('en', () => theShape('star')));
    expect(countShapes('cross', 2)).toBe(inLang('en', () => countShapes('cross', 2)));
    expect(describeShape({ shape: 'flag', filled: true, rotation: 90 })).toBe(inLang('en', () => describeShape({ shape: 'flag', filled: true, rotation: 90 })));
    expect(lectureLevelLabel(10)).toBe(inLang('en', () => lectureLevelLabel(10)));
    expect(coachTip('2026-10-20')).toBe(inLang('en', () => coachTip('2026-10-20')));
  });

  it('le français et l’anglais ne bougent pas quand une autre langue s’enregistre', () => {
    const before = { fr: inLang('fr', currentContent), en: inLang('en', currentContent) };
    registerContent('es', fakeContent());
    expect(inLang('fr', currentContent)).toEqual(before.fr);
    expect(inLang('en', currentContent)).toEqual(before.en);
    expect(inLang('fr', () => describeRule({ go: ['circle'], filledOnly: true, inverted: false }))).toBe('Touche les ronds pleins');
    expect(inLang('fr', () => isAnagramAnswer('CHIEN', { word: 'CHIEN', letters: 'HCINE' }))).toBe(true);
    expect(inLang('en', () => isAnagramAnswer('ZQZQZ', { word: 'ZQZQZ', letters: 'QZZQZ' }))).toBe(false);
    expect(inLang('fr', coachTips)).toBe(COACH_TIPS);
  });
});
