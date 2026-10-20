// Textes à traduire et contrôle des dictionnaires.
//   node scripts/i18n.mjs extract        → src/i18n/source.json (tous les textes français, avec l'anglais)
//   node scripts/i18n.mjs check es       → ce qui manque en espagnol, et les traductions invalides
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

function extract() {
  const entries = new Map();
  const dynamic = [];
  for (const file of files(SRC)) {
    const code = readFileSync(file, 'utf8');
    const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const where = (node) => `${relative(ROOT, file).replace(/\\/g, '/')}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;
    const add = (frNode, enNode) => {
      const key = frNode.getText(source);
      const entry = entries.get(key) ?? { key, en: enNode.getText(source), at: [] };
      entry.at.push(where(frNode));
      entries.set(key, entry);
    };
    const visit = (node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'tr' && node.arguments.length >= 2) {
        if (isText(node.arguments[0])) add(node.arguments[0], node.arguments[1]);
        else dynamic.push(`${where(node)}  ${node.getText(source).slice(0, 80)}`);
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
}

/** Les expressions `${…}` et les appels d'un texte source : une traduction doit garder les mêmes. */
function slots(text) {
  const found = [];
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

const [command, lang] = process.argv.slice(2);
if (command === 'extract') extract();
else if (command === 'check' && lang) check(lang);
else console.log('usage : node scripts/i18n.mjs extract | check <langue> [--missing]');
