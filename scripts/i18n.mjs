// Textes à traduire et contrôle des dictionnaires.
//   node scripts/i18n.mjs extract        → src/i18n/source.json (tous les textes français, avec l'anglais)
//   node scripts/i18n.mjs check es       → ce qui manque en espagnol, et les traductions invalides
//   node scripts/i18n.mjs todo es 150    → les 150 premiers textes manquants (numéro, clé, anglais, emplacement), en JSON
//   node scripts/i18n.mjs merge es lot.json → ajoute un lot { numéro ou clé: traduction } au dictionnaire (les invalides sont refusées)
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return e.name === 'i18n' ? [] : files(path);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts') ? [path] : [];
  });
}

const isText = (n) => ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateExpression(n) || ts.isCallExpression(n);

/** Du texte caché dans une variable (`${n > 1 ? 's' : ''}`, `${ok ? 'pareil' : 'différent'}`) : un dictionnaire ne peut pas le traduire. */
function hiddenWords(node) {
  const found = [];
  const deep = (n) => {
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && /\p{L}/u.test(n.text)) found.push(n.getText());
    ts.forEachChild(n, deep);
  };
  const scan = (n) => {
    if (ts.isTemplateExpression(n)) n.templateSpans.forEach((span) => deep(span.expression));
    else if (ts.isCallExpression(n)) n.arguments.forEach(scan);
  };
  scan(node);
  return found;
}

function extract() {
  const entries = new Map();
  const dynamic = [];
  const hidden = [];
  const apart = [];
  for (const file of files(SRC)) {
    const code = readFileSync(file, 'utf8');
    const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const where = (node) => `${relative(ROOT, file).replace(/\\/g, '/')}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;
    const add = (frNode, enNode) => {
      const key = frNode.getText(source);
      const entry = entries.get(key) ?? { key, en: enNode.getText(source), at: [] };
      entry.at.push(where(frNode));
      entries.set(key, entry);
      // Le français et l'anglais doivent glisser les mêmes variables (sinon `${back}` / `${backEn}` : une variable par langue).
      const fr = slots(key).found.filter((s) => !/^\{/.test(s));
      const en = slots(enNode.getText(source)).found.filter((s) => !/^\{/.test(s));
      if (isText(enNode) && fr.some((s) => !en.includes(s))) apart.push(`${where(frNode)}  ${fr.filter((s) => !en.includes(s)).join(' ')}`);
    };
    const visit = (node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'tr' && node.arguments.length >= 2) {
        if (isText(node.arguments[0])) {
          add(node.arguments[0], node.arguments[1]);
          const words = hiddenWords(node.arguments[0]);
          if (words.length) hidden.push(`${where(node)}  ${words.join(' ')}`);
        } else if (!file.endsWith('lang.ts')) dynamic.push(`${where(node)}  ${node.getText(source).slice(0, 80)}`);
      }
      if (ts.isObjectLiteralExpression(node)) {
        const props = node.properties.filter(ts.isPropertyAssignment);
        const fr = props.find((p) => p.name.getText(source) === 'fr');
        const en = props.find((p) => p.name.getText(source) === 'en');
        if (fr && en && isText(fr.initializer)) add(fr.initializer, en.initializer);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  mkdirSync(join(SRC, 'i18n'), { recursive: true });
  const list = [...entries.values()];
  writeFileSync(join(SRC, 'i18n', 'source.json'), JSON.stringify(list, null, 2) + '\n');
  console.log(`${list.length} textes → src/i18n/source.json`);
  if (dynamic.length) console.log(`${dynamic.length} appels tr() à arguments calculés (non traduisibles par dictionnaire) :\n  ${dynamic.join('\n  ')}`);
  if (hidden.length) console.log(`${hidden.length} textes avec des mots dans une variable (à sortir dans leur propre tr()) :\n  ${hidden.join('\n  ')}`);
  if (apart.length) console.log(`${apart.length} textes dont le français glisse une variable que l'anglais n'a pas :\n  ${apart.join('\n  ')}`);
}

/** Les expressions `${…}`, les appels et les `{morceaux}` (voir `rich()`) d'un texte source : une traduction doit garder les mêmes. */
function slots(text) {
  const found = [...(text.match(/(?<!\$)\{\w+\}/g) ?? [])];
  const source = ts.createSourceFile('x.ts', `const x = (${text});`, ts.ScriptTarget.Latest, true);
  let broken = source.parseDiagnostics?.length > 0;
  const visit = (node) => {
    if (ts.isTemplateSpan(node)) found.push(node.expression.getText(source));
    if (ts.isCallExpression(node)) node.arguments.slice(0, 1).forEach((a) => !isText(a) && found.push(a.getText(source)));
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { found: found.sort(), broken };
}

function check(lang) {
  const list = JSON.parse(readFileSync(join(SRC, 'i18n', 'source.json'), 'utf8'));
  const file = join(SRC, 'i18n', `${lang}.json`);
  const dict = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  const missing = list.filter((e) => !(e.key in dict));
  const invalid = [];
  for (const e of list) {
    if (!(e.key in dict)) continue;
    const a = slots(e.key);
    const b = slots(dict[e.key]);
    if (b.broken) invalid.push(`${e.key}\n    → syntaxe invalide : ${dict[e.key]}`);
    else if (JSON.stringify(a.found) !== JSON.stringify(b.found)) invalid.push(`${e.key}\n    → variables ${JSON.stringify(b.found)} au lieu de ${JSON.stringify(a.found)}`);
  }
  const extra = Object.keys(dict).filter((k) => !list.some((e) => e.key === k));
  console.log(`${lang} : ${list.length - missing.length}/${list.length} traduits, ${missing.length} manquants, ${invalid.length} invalides, ${extra.length} en trop`);
  for (const line of invalid.slice(0, 30)) console.log('  ✗ ' + line);
  if (process.argv.includes('--missing')) for (const e of missing) console.log('  … ' + e.key);
  process.exitCode = invalid.length ? 1 : 0;
}

const dictFile = (lang) => join(SRC, 'i18n', `${lang}.json`);
const readDict = (lang) => (existsSync(dictFile(lang)) ? JSON.parse(readFileSync(dictFile(lang), 'utf8')) : {});

/**
 * Les textes encore à traduire, par lots : `[{ id, key, en, at }]`. `id` = le rang dans source.json
 * (le lot peut s'en servir à la place de la clé : rien à recopier) ; `at` = le premier emplacement.
 */
function todo(lang, count) {
  const list = JSON.parse(readFileSync(join(SRC, 'i18n', 'source.json'), 'utf8'));
  const dict = readDict(lang);
  const missing = list.map((e, id) => ({ id, ...e })).filter((e) => !(e.key in dict));
  console.log(JSON.stringify(missing.slice(0, count).map((e) => ({ id: e.id, key: e.key, en: e.en, at: e.at[0] })), null, 1));
  console.error(`${missing.length} textes manquants en ${lang}, ${Math.min(count, missing.length)} affichés`);
}

/**
 * Ajoute au dictionnaire un lot `{ clé: traduction }` (ou `{ "12": traduction }`, le numéro donné
 * par `todo`, qui doit être celui de la source.json du moment) : chaque traduction doit garder les variables
 * de la clé et rester du code valide, sinon elle est refusée (et affichée). Le dictionnaire est
 * réécrit dans l'ordre de source.json ; les clés inconnues sont refusées.
 */
function merge(lang, file) {
  const list = JSON.parse(readFileSync(join(SRC, 'i18n', 'source.json'), 'utf8'));
  const known = new Set(list.map((e) => e.key));
  const dict = readDict(lang);
  const batch = JSON.parse(readFileSync(file, 'utf8'));
  let added = 0;
  const refused = [];
  for (const [given, value] of Object.entries(batch)) {
    const key = /^\d+$/.test(given) && list[Number(given)] ? list[Number(given)].key : given;
    if (!known.has(key)) {
      refused.push(`${key}\n    → clé inconnue (recopier la clé exacte de « todo »)`);
      continue;
    }
    const a = slots(key);
    const b = slots(value);
    if (b.broken) refused.push(`${key}\n    → syntaxe invalide : ${value}`);
    else if (JSON.stringify(a.found) !== JSON.stringify(b.found)) refused.push(`${key}\n    → variables ${JSON.stringify(b.found)} au lieu de ${JSON.stringify(a.found)}`);
    else {
      dict[key] = value;
      added++;
    }
  }
  const ordered = Object.fromEntries(list.filter((e) => e.key in dict).map((e) => [e.key, dict[e.key]]));
  writeFileSync(dictFile(lang), JSON.stringify(ordered, null, 2) + '\n');
  console.log(`${lang} : ${added} ajoutés, ${refused.length} refusés, ${Object.keys(ordered).length}/${list.length} traduits`);
  for (const line of refused) console.log('  ✗ ' + line);
  process.exitCode = refused.length ? 1 : 0;
}

const [command, lang, arg] = process.argv.slice(2);
if (command === 'extract') extract();
else if (command === 'check' && lang) check(lang);
else if (command === 'todo' && lang) todo(lang, Number(arg) || 100);
else if (command === 'merge' && lang && arg) merge(lang, arg);
else console.log('usage : node scripts/i18n.mjs extract | check <langue> [--missing] | todo <langue> [nombre] | merge <langue> <lot.json>');
