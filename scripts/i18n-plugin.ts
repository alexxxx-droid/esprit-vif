import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import type { Plugin } from 'vite';
import type {} from 'vitest/config';

/**
 * Langues venues des dictionnaires : au build, chaque `tr('français', 'English')` reçoit un
 * troisième argument `{ es: …, de: … }`, et chaque objet `{ fr: …, en: … }` ses propriétés
 * `es`, `de`… Les dictionnaires `src/i18n/<langue>.json` associent le texte source de
 * l'argument français (guillemets compris, `${…}` et `plural(…)` compris) à sa traduction, écrite
 * de la même façon. Le code source ne change pas ; une langue de plus = un fichier de plus.
 */

export const EXTRA_LANGS = ['es', 'de', 'it', 'pt'] as const;

type Dictionary = Record<string, string>;

function loadDictionaries(root: string): Map<string, Dictionary> {
  const dicts = new Map<string, Dictionary>();
  for (const lang of EXTRA_LANGS) {
    const file = resolve(root, `src/i18n/${lang}.json`);
    if (existsSync(file)) dicts.set(lang, JSON.parse(readFileSync(file, 'utf8')) as Dictionary);
  }
  return dicts;
}

/** Les ajouts pour une clé : « es: …, de: … » (vide si aucune langue ne la traduit). */
function translations(dicts: Map<string, Dictionary>, key: string): string {
  return [...dicts]
    .filter(([, dict]) => key in dict)
    .map(([lang, dict]) => `${lang}: ${dict[key]}`)
    .join(', ');
}

const isText = (node: ts.Node) => ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node) || ts.isCallExpression(node);

export function translateSource(code: string, fileName: string, dicts: Map<string, Dictionary>): string | null {
  if (!dicts.size || (!code.includes('tr(') && !code.includes('fr:'))) return null;
  const source = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true, fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits: { at: number; text: string }[] = [];

  const visit = (node: ts.Node) => {
    // tr('…', '…') → tr('…', '…', { es: '…', … })
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'tr' && node.arguments.length === 2) {
      const added = translations(dicts, node.arguments[0].getText(source));
      if (added) edits.push({ at: node.arguments[1].getEnd(), text: `, { ${added} }` });
    }
    // { fr: '…', en: '…' } → { fr: '…', en: '…', es: '…', … }
    if (ts.isObjectLiteralExpression(node)) {
      const props = node.properties.filter(ts.isPropertyAssignment);
      const fr = props.find((p) => p.name.getText(source) === 'fr');
      const en = props.find((p) => p.name.getText(source) === 'en');
      const already = props.some((p) => (EXTRA_LANGS as readonly string[]).includes(p.name.getText(source)));
      if (fr && en && !already && isText(fr.initializer)) {
        const added = translations(dicts, fr.initializer.getText(source));
        if (added) edits.push({ at: node.properties[node.properties.length - 1].getEnd(), text: `, ${added}` });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (!edits.length) return null;
  let out = code;
  for (const edit of edits.sort((a, b) => b.at - a.at)) out = out.slice(0, edit.at) + edit.text + out.slice(edit.at);
  return out;
}

/** L'empreinte des dictionnaires : un module transformé avec d'autres traductions est à refaire. */
const fingerprint = (dicts: Map<string, Dictionary>) => createHash('sha1').update(JSON.stringify([...dicts])).digest('hex');

export function i18nPlugin(root: string): Plugin {
  let dicts = loadDictionaries(root);
  return {
    name: 'esprit-vif-i18n',
    enforce: 'pre',
    // Vitest garde les modules transformés d'une exécution à l'autre (fsModuleCache) : sa clé
    // ignore les dictionnaires et les modules de contenu présents (l'import.meta.glob de
    // src/core/content/index.ts), il faut donc y ajouter les deux.
    configureVitest(context) {
      const modules = EXTRA_LANGS.filter((lang) => existsSync(resolve(root, `src/core/content/${lang}.ts`)));
      const key = `${fingerprint(loadDictionaries(root))}:${modules.join(',')}`;
      context.defineCacheKeyGenerator(() => key);
    },
    buildStart() {
      dicts = loadDictionaries(root);
      for (const lang of EXTRA_LANGS) this.addWatchFile(resolve(root, `src/i18n/${lang}.json`));
    },
    transform(code, id) {
      const file = id.split('?')[0];
      if (!/[\\/]src[\\/].*\.tsx?$/.test(file) || /\.test\.tsx?$/.test(file)) return null;
      const out = translateSource(code, file, dicts);
      return out === null ? null : { code: out, map: null };
    },
  };
}
